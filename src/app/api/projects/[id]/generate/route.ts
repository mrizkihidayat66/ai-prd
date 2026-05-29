import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { prisma } from '@/lib/db';
import { getSettings, getModel } from '@/lib/ai/provider';
import { GENERATE_PRD_SYSTEM_PROMPT, buildPrdUserPrompt } from '@/lib/ai/prompts/generate-prd';
import { stripExtraPrdSections } from '@/lib/ai/prompts/structure';
import { runResearch, suggestArchitecture } from '@/lib/ai/agents/orchestrator';
import type { ProjectReference } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if this is a continuation request
  let continuationContent: string | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (body?.continueFrom) {
      continuationContent = body.continueFrom;
    }
  } catch {
    // No body or invalid JSON — fresh generation
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      conversations: { orderBy: { createdAt: 'asc' } },
      plan: true,
    },
  });

  if (!project) {
    return new Response('Project not found', { status: 404 });
  }

  // Only snapshot on fresh generation (not continuation)
  if (!continuationContent && project.plan?.content) {
    await prisma.planSnapshot.create({
      data: {
        planId: project.plan.id,
        version: project.plan.version,
        content: project.plan.content,
      },
    });
  }

  await prisma.project.update({
    where: { id },
    data: { status: 'GENERATING' },
  });

  const settings = await getSettings();
  const model = getModel(settings);

  // Parse references from project
  let references: ProjectReference[] = [];
  if (project.references) {
    try {
      references = JSON.parse(project.references);
    } catch {
      references = [];
    }
  }

  // Build prompt based on whether this is a continuation or fresh generation
  let systemPrompt: string;
  let userPrompt: string;

  if (continuationContent) {
    // Continuation: instruct LLM to continue from where it left off
    // Only send last 500 chars as overlap context to avoid token waste
    const overlapContext = continuationContent.slice(-500);
    systemPrompt = GENERATE_PRD_SYSTEM_PROMPT;
    const basePrompt = buildPrdUserPrompt(
      project.conversations.map((c) => ({ role: c.role, content: c.content })),
      references
    );
    userPrompt = `${basePrompt}\n\n---\n\nCONTINUATION INSTRUCTIONS:\nThe previous generation was cut off due to token limits. Below is the TAIL END of what was already generated (last 500 characters):\n\n"""${overlapContext}"""\n\nRULES:\n1. Continue writing from the EXACT character where the text above ends.\n2. Do NOT repeat ANY content — not even a single sentence or heading that already exists.\n3. Do NOT restart with a title, introduction, or section that was already written.\n4. Simply pick up mid-sentence or mid-section and complete all remaining sections.\n5. The total PRD has ${continuationContent.length} characters already written — you are extending it.`;
  } else {
    // Fresh generation: run research + architecture agents in parallel for enriched PRD
    let researchData: unknown = undefined;
    let architectureData: unknown = undefined;

    // Build a project summary from conversations for agent input
    const conversationSummary = project.conversations
      .map((c) => `${c.role}: ${c.content}`)
      .join('\n')
      .slice(0, 4000); // Cap to avoid token overflow

    try {
      const [researchResult, architectureResult] = await Promise.all([
        runResearch(project.description || conversationSummary).catch(() => null),
        suggestArchitecture(conversationSummary).catch(() => null),
      ]);

      if (researchResult?.success && researchResult.data) {
        researchData = researchResult.data;
      }
      if (architectureResult?.success && architectureResult.data) {
        architectureData = architectureResult.data;
      }
    } catch {
      // Graceful degradation: if agents fail, proceed without enrichment
    }

    systemPrompt = GENERATE_PRD_SYSTEM_PROMPT;
    userPrompt = buildPrdUserPrompt(
      project.conversations.map((c) => ({ role: c.role, content: c.content })),
      references,
      researchData,
      architectureData
    );
  }

  // Accumulate text server-side so onAbort can save partial content
  let accumulatedText = '';

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: settings.temperature,
    maxOutputTokens: settings.maxTokens || 65536,
    maxRetries: 3,
    // Abort if provider stops sending chunks for 30 seconds (stall detection)
    timeout: { chunkMs: 30000 },
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta') {
        accumulatedText += chunk.text;
      }
    },
    onError: ({ error }) => {
      console.error('[PRD Generate] Stream error:', error);
    },
    onFinish: async ({ text, finishReason }) => {
      // Combine content: if continuation, prepend existing content
      const rawContent = continuationContent
        ? continuationContent + text
        : text;

      // Only mark as complete if not truncated
      const isTruncated = finishReason === 'length';

      // Defensive safety net: when generation is complete, strip any out-of-range
      // sections (e.g. "18. Glossary") the model may have appended despite the
      // structure-lock prompt. Skip when truncated — the stream may continue later
      // and stripping a partially written section would corrupt the continuation.
      const fullContent = isTruncated ? rawContent : stripExtraPrdSections(rawContent);

      if (project.plan) {
        await prisma.plan.update({
          where: { id: project.plan.id },
          data: { content: fullContent, version: { increment: 1 } },
        });
      } else {
        await prisma.plan.create({
          data: { projectId: id, content: fullContent, version: 1 },
        });
      }

      await prisma.project.update({
        where: { id },
        data: { status: isTruncated ? 'GENERATING' : 'PLAN_GENERATED' },
      });
    },
  });

  // Handle abort (timeout or signal) — save partial content so Continue works
  Promise.resolve(result.text).catch(async () => {
    // This catch fires when the stream is aborted (e.g. chunkMs timeout)
    const partialText = accumulatedText;
    const fullContent = continuationContent
      ? continuationContent + partialText
      : partialText;

    if (fullContent.length > 0) {
      if (project.plan) {
        await prisma.plan.update({
          where: { id: project.plan.id },
          data: { content: fullContent, version: { increment: 1 } },
        });
      } else {
        await prisma.plan.create({
          data: { projectId: id, content: fullContent, version: 1 },
        });
      }
    }
    // Status stays GENERATING — client can Continue from saved content
  });

  // Stream the response using AI SDK's UIMessage stream protocol.
  // This sends typed SSE events (text-delta, finish, error) so the client
  // can reliably detect finishReason instead of guessing via heuristics.
  // onError ensures client receives an error event with a message before stream closes.
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      return error instanceof Error
        ? error.message
        : 'PRD generation failed unexpectedly';
    },
  });
}
