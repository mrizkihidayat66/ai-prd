import { NextRequest } from 'next/server';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSettings, getModel } from '@/lib/ai/provider';
import { CLARIFY_SYSTEM_PROMPT } from '@/lib/ai/prompts/clarify';

export async function POST(request: NextRequest) {
  const { messages, projectId } = await request.json();

  if (!projectId) {
    return new Response('projectId is required', { status: 400 });
  }

  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role === 'user') {
    const textContent = lastMsg.parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { text: string }) => p.text)
      .join('') || JSON.stringify(lastMsg.content ?? '');
    await prisma.conversation.create({
      data: { projectId, role: 'USER', content: textContent },
    });
  }

  const settings = await getSettings();
  const model = getModel(settings);

  const result = streamText({
    model,
    system: CLARIFY_SYSTEM_PROMPT,
    messages,
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
    onFinish: async ({ text }) => {
      if (text) {
        await prisma.conversation.create({
          data: { projectId, role: 'ASSISTANT', content: text },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
