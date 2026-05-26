import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { prisma } from '@/lib/db';
import { getSettings, getModel } from '@/lib/ai/provider';
import { GENERATE_PRD_SYSTEM_PROMPT, buildPrdUserPrompt } from '@/lib/ai/prompts/generate-prd';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  if (project.plan?.content) {
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

  const userPrompt = buildPrdUserPrompt(
    project.conversations.map((c) => ({ role: c.role, content: c.content }))
  );

  const result = streamText({
    model,
    system: GENERATE_PRD_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: settings.temperature,
    onFinish: async ({ text }) => {
      if (project.plan) {
        await prisma.plan.update({
          where: { id: project.plan.id },
          data: { content: text, version: { increment: 1 } },
        });
      } else {
        await prisma.plan.create({
          data: { projectId: id, content: text, version: 1 },
        });
      }

      await prisma.project.update({
        where: { id },
        data: { status: 'PLAN_GENERATED' },
      });
    },
  });

  return result.toTextStreamResponse();
}
