import { NextRequest } from 'next/server';
import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings, getModel } from '@/lib/ai/provider';
import { CLARIFY_SYSTEM_PROMPT } from '@/lib/ai/prompts/clarify';
import { extractReferences, mergeReferences } from '@/lib/references';
import { safeJsonParse } from '@/lib/json';
import { rateLimitChat } from '@/lib/rate-limit';
import { RATE_LIMIT_MAX_CHAT_REQUESTS, RATE_LIMIT_WINDOW_MS } from '@/constants/limits';
import type { ProjectReference } from '@/types';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = await rateLimitChat(clientIp);

  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: 'Too many chat requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_CHAT_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(rateLimitResult.retryAfter),
        },
      }
    );
  }

  const body = await request.json();
  const { messages, projectId } = body;

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === 'user') {
    const textContent = lastMsg.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { text: string }) => p.text)
      .join('') || '';
    if (textContent) {
      // Extract references from user message
      const newRefs = extractReferences(textContent);
      
      // Save conversation
      await prisma.conversation.create({
        data: {
          projectId,
          role: 'USER',
          content: textContent,
          parts: JSON.stringify(lastMsg.parts || []),
        },
      });

      // Update project references if any found
      if (newRefs.length > 0) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { references: true },
        });
        
        const existingRefs: ProjectReference[] = safeJsonParse<ProjectReference[]>(
          project?.references ?? null,
          []
        );
        
        const mergedRefs = mergeReferences(existingRefs, newRefs);
        
        await prisma.project.update({
          where: { id: projectId },
          data: { references: JSON.stringify(mergedRefs) },
        });
      }
    }
  }

  const settings = await getSettings();
  const model = getModel(settings);

  const modelMessages = await convertToModelMessages(messages);

  // Flatten tool-call/tool-result messages for proxies that don't support OpenAI
  // tool_calls format in conversation history. Instead of dropping tool context,
  // we convert tool-call + tool-result pairs into plain text so the AI retains
  // awareness of what it previously asked/did.
  type ContentPart = { type: string; toolName?: string; toolCallId?: string; args?: unknown; input?: unknown; result?: unknown; output?: unknown; text?: string };
  type ModelMessage = { role: string; content: ContentPart[] | string };

  // First pass: collect tool results by toolCallId
  const toolResultMap = new Map<string, unknown>();
  for (const msg of modelMessages as ModelMessage[]) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'tool-result' && part.toolCallId) {
          toolResultMap.set(part.toolCallId, part.result ?? part.output ?? null);
        }
      }
    }
  }

  // Second pass: flatten messages
  const flattenedMessages = (modelMessages as ModelMessage[]).reduce<ModelMessage[]>((acc, msg) => {
    if (msg.role === 'tool') {
      // Skip standalone tool messages - their content is merged into assistant text
      return acc;
    }
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const newContent: ContentPart[] = [];
      for (const part of msg.content) {
        if (part.type === 'text') {
          newContent.push(part);
        } else if (part.type === 'tool-call') {
          // Convert tool-call into a text summary so AI knows what it did
          const toolResult = part.toolCallId ? toolResultMap.get(part.toolCallId) : undefined;
          const args = part.args ?? part.input ?? {};
          let summary = `[Called tool: ${part.toolName}]\nInput: ${JSON.stringify(args, null, 2)}`;
          if (toolResult !== undefined) {
            summary += `\nResult: ${JSON.stringify(toolResult, null, 2)}`;
          }
          newContent.push({ type: 'text', text: summary });
        }
      }
      if (newContent.length > 0) {
        acc.push({ ...msg, content: newContent });
      }
      return acc;
    }
    acc.push(msg);
    return acc;
  }, []);

  // Count clarification rounds (assistant messages with tool calls) for adaptive depth
  const clarificationRounds = flattenedMessages.filter((msg) =>
    msg.role === 'assistant' &&
    Array.isArray(msg.content) &&
    (msg.content as Array<{ text?: string }>).some((p) => typeof p.text === 'string' && p.text.includes('[Called tool: ask_clarification'))
  ).length;

  // Add tool-usage reminder if flattened messages contain prior tool-call summaries.
  // This prevents the model from skipping tools on retry because it sees
  // "[Called tool: ...]" text and assumes it already acted.
  const hasToolHistory = flattenedMessages.some((msg) =>
    msg.role === 'assistant' &&
    Array.isArray(msg.content) &&
    (msg.content as Array<{ text?: string }>).some((p) => typeof p.text === 'string' && p.text.includes('[Called tool:'))
  );

  // Build system prompt with round context and tool-history reminder
  let systemPrompt = CLARIFY_SYSTEM_PROMPT;
  if (clarificationRounds > 0) {
    const roundContext = clarificationRounds >= 6
      ? `\n\n[ROUND ${clarificationRounds + 1}/7 — You MUST wrap up now. Consolidate what you have and call mark_requirements_complete.]`
      : clarificationRounds >= 4
        ? `\n\n[ROUND ${clarificationRounds + 1}/7 — Getting close to the limit. Start wrapping up unless critical gaps remain.]`
        : `\n\n[ROUND ${clarificationRounds + 1}/7]`;
    systemPrompt += roundContext;
  }
  if (hasToolHistory) {
    systemPrompt += `\n\nIMPORTANT: The "[Called tool: ...]" entries in the conversation are summaries of PREVIOUS tool calls. You MUST still use your tools (ask_clarification, mark_requirements_complete) for the CURRENT response when appropriate. Do NOT respond with plain text if a tool call is needed.`;
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: flattenedMessages as typeof modelMessages,
    tools: {
      ask_clarification: tool({
        description: 'Ask the user clarification questions with selectable options. Use this when you need structured input.',
        inputSchema: z.object({
          questions: z.array(z.object({
            id: z.string().describe('Unique question identifier'),
            dimension: z.string().describe('Which requirement dimension this covers'),
            question: z.string().describe('The question to ask'),
            options: z.array(z.string()).describe('Selectable options for the user'),
            recommendation: z.string().describe('Your recommendation and why'),
          })),
        }),
        execute: async () => {
          // This tool is for UI rendering only, no server-side action needed
          return { success: true };
        },
      }),
      mark_requirements_complete: tool({
        description: 'Signal that all requirements are gathered. Use this when all 8 dimensions are covered and the user has confirmed.',
        inputSchema: z.object({
          summary: z.object({
            projectName: z.string(),
            problemStatement: z.string(),
            targetAudience: z.string(),
            coreFeatures: z.array(z.string()),
            techStack: z.object({
              frontend: z.string(),
              backend: z.string(),
              database: z.string(),
              hosting: z.string(),
            }),
            dataModel: z.array(z.string()),
            auth: z.object({
              required: z.boolean(),
              method: z.string(),
              roles: z.array(z.string()),
            }),
            integrations: z.array(z.string()),
            deployment: z.string(),
            designNotes: z.string(),
          }),
        }),
        execute: async (input) => {
          try {
            // Only overwrite name if the current name is a default/empty placeholder
            const currentProject = await prisma.project.findUnique({
              where: { id: projectId },
              select: { name: true },
            });
            const hasUserProvidedName = currentProject?.name &&
              currentProject.name !== 'Untitled Project' &&
              currentProject.name !== 'New Project' &&
              currentProject.name.trim().length > 0;

            // Update project status to REQUIREMENTS_LOCKED
            await prisma.project.update({
              where: { id: projectId },
              data: {
                status: 'REQUIREMENTS_LOCKED',
                // Keep user's original name if they provided one
                ...(hasUserProvidedName ? {} : { name: input.summary.projectName }),
                description: input.summary.problemStatement,
              },
            });
            return { 
              success: true, 
              message: 'Requirements locked successfully',
              projectName: input.summary.projectName,
            };
          } catch (error) {
            console.error('Failed to mark requirements complete:', error);
            return { 
              success: false, 
              error: 'Failed to update project status',
            };
          }
        },
      }),
      web_search: tool({
        description: 'Search the web for technical information, best practices, or reference material relevant to the project.',
        inputSchema: z.object({
          query: z.string().describe('Search query'),
        }),
        execute: async (input) => {
          try {
            const res = await fetch(
              `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`,
              { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ai-prd/1.0)' } }
            );
            const html = await res.text();
            const results: { title: string; snippet: string; url: string }[] = [];
            const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
            let match;
            while ((match = regex.exec(html)) !== null && results.length < 5) {
              results.push({
                url: decodeURIComponent(match[1].replace(/.*uddg=/, '').split('&')[0]),
                title: match[2].replace(/<[^>]*>/g, ''),
                snippet: match[3].replace(/<[^>]*>/g, ''),
              });
            }
            return { results };
          } catch {
            return { results: [], error: 'Search failed' };
          }
        },
      }),
    },
    temperature: settings.temperature,
    stopWhen: stepCountIs(5), // Allow up to 5 tool execution round-trips (suitable for Claude-class models)
    onError: (error) => {
      console.error('[chat/onError] Stream error:', error);
    },
    onFinish: async ({ text, response }) => {
      try {
        // Convert response.messages to UI-compatible parts format
        // AI SDK internal format: [{role:'assistant', content:[{type:'tool-call',...}]}, {role:'tool', content:[{type:'tool-result',...}]}, {role:'assistant', content:[{type:'text',...}]}]
        // UI format: [{type:'text', text}, {type:'tool-{toolName}', toolCallId, input, output}]
        const uiParts: Array<Record<string, unknown>> = [];
        let fullText = '';

        // Collect all tool calls and their results from response messages
        const toolResults = new Map<string, unknown>();
        
        for (const msg of response.messages || []) {
          if (msg.role === 'tool' && Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'tool-result') {
                toolResults.set(part.toolCallId, part.output);
              }
            }
          }
        }

        // Now build UI parts from assistant messages
        for (const msg of response.messages || []) {
          if (msg.role === 'assistant' && Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text' && part.text) {
                uiParts.push({ type: 'text', text: part.text });
                fullText += part.text;
              } else if (part.type === 'tool-call') {
                uiParts.push({
                  type: `tool-${part.toolName}`,
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  state: 'output-available',
                  input: part.input,
                  output: toolResults.get(part.toolCallId) ?? null,
                });
              }
            }
          }
        }

        // Fallback: if no parts were extracted but text exists, use text directly
        if (uiParts.length === 0 && text) {
          uiParts.push({ type: 'text', text });
          fullText = text;
        }

        // Always save if we have any parts (text OR tool calls)
        if (uiParts.length > 0) {
          await prisma.conversation.create({
            data: {
              projectId,
              role: 'ASSISTANT',
              content: fullText || '[tool call]',
              parts: JSON.stringify(uiParts),
            },
          });
        }
      } catch (error) {
        console.error('[chat/onFinish] Failed to persist assistant message:', error);
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

// DELETE: Remove the last user message (rollback for retry)
export async function DELETE(request: NextRequest) {
  const { projectId } = await request.json();

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  try {
    // Find the last user message for this project
    const lastUserMsg = await prisma.conversation.findFirst({
      where: { projectId, role: 'USER' },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastUserMsg) {
      return Response.json({ success: false, error: 'No user message to rollback' }, { status: 404 });
    }

    // Delete all messages after (and including) this user message
    // This handles the case where there might be a partial/failed assistant response too
    await prisma.conversation.deleteMany({
      where: {
        projectId,
        createdAt: { gte: lastUserMsg.createdAt },
      },
    });

    return Response.json({ success: true, deletedFrom: lastUserMsg.id });
  } catch (error) {
    console.error('[chat/DELETE] Failed to rollback message:', error);
    return Response.json({ success: false, error: 'Failed to rollback' }, { status: 500 });
  }
}
