import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { prisma } from '@/lib/db';
import { getSettings, getModel } from '@/lib/ai/provider';
import { REFINE_SYSTEM_PROMPT } from '@/lib/ai/prompts/refine';
import { stripExtraPrdSections, PRD_COMPLETE_MARKER } from '@/lib/ai/prompts/structure';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { instructions } = await request.json();

  if (!instructions || typeof instructions !== 'string') {
    return new Response('instructions is required', { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: { plan: true },
  });

  if (!project || !project.plan?.content) {
    return new Response('Project or PRD not found', { status: 404 });
  }

  // Save current version as snapshot before refining
  await prisma.planSnapshot.create({
    data: {
      planId: project.plan.id,
      version: project.plan.version,
      content: project.plan.content,
    },
  });

  const settings = await getSettings();
  const model = getModel(settings);

  const prompt = `Here is the current PRD:\n\n${project.plan.content}\n\n---\n\nUser refinement request:\n${instructions}\n\nPlease update the PRD according to the user's request. Output the complete updated PRD in Markdown format.`;

  const result = streamText({
    model,
    system: REFINE_SYSTEM_PROMPT,
    prompt,
    temperature: settings.temperature,
    // Refine regenerates the ENTIRE PRD, so it needs the same large output budget
    // as generation. Without this the model hits its small default limit and the
    // document gets truncated mid-section (e.g. cut off at section 9).
    maxOutputTokens: settings.maxTokens || 65536,
    maxRetries: 3,
    onFinish: async ({ text, finishReason }) => {
      // Non-destructive completeness guard.
      //
      // The upstream proxy caps streamed output (~32KB) and unreliably reports
      // finishReason='stop' even when the document was cut off mid-section. So we
      // CANNOT trust finishReason. Instead we rely on the `<!-- PRD_COMPLETE -->`
      // marker that REFINE_SYSTEM_PROMPT requires at the end of a complete PRD.
      //
      // If the marker is missing, the refined PRD is incomplete (truncated). Never
      // overwrite the good document with a truncated one — a snapshot exists and the
      // original content stays intact. This turns a data-loss bug into a safe no-op.
      const isComplete = text.includes(PRD_COMPLETE_MARKER);
      if (!isComplete) {
        console.error(
          `[PRD Refine] Incomplete output (no completion marker, finishReason=${finishReason}, ${text.length} chars) — skipping save to avoid data loss`
        );
        return;
      }
      // Defensive safety net: strip any out-of-range sections the model may have
      // appended (e.g. "18. Glossary") despite the structure-lock prompt.
      const cleaned = stripExtraPrdSections(text);
      await prisma.plan.update({
        where: { id: project.plan!.id },
        data: { content: cleaned, version: { increment: 1 } },
      });
    },
  });

  return result.toTextStreamResponse();
}
