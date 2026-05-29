import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTaskBreakdown } from '@/lib/ai/agents/orchestrator';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  // Get project with its plan
  const project = await prisma.project.findUnique({
    where: { id },
    include: { plan: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (!project.plan?.content) {
    return NextResponse.json(
      { error: 'No PRD content to break down. Generate a PRD first.' },
      { status: 400 }
    );
  }

  // Truncate very long PRDs to avoid token limit issues during task breakdown
  const MAX_PRD_LENGTH = 15000;
  const prdContent = project.plan.content.length > MAX_PRD_LENGTH
    ? project.plan.content.slice(0, MAX_PRD_LENGTH) + '\n\n[... content truncated for task breakdown ...]'
    : project.plan.content;

  const result = await generateTaskBreakdown(prdContent);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Task breakdown failed' },
      { status: 500 }
    );
  }

  // Store task breakdown in project metadata
  if (result.data) {
    // Get existing metadata
    const existingMeta = project.metadata
      ? JSON.parse(project.metadata as string)
      : {};

    await prisma.project.update({
      where: { id },
      data: {
        metadata: JSON.stringify({
          ...existingMeta,
          taskBreakdown: {
            ...result.data,
            lastGenerated: new Date().toISOString(),
          },
        }),
      },
    });
  }

  return NextResponse.json({
    taskBreakdown: result.data,
    ...(result.data ? {} : { error: 'The AI returned an unstructured response. Please try again.', rawText: result.rawText?.slice(0, 500) }),
  }, result.data ? { status: 200 } : { status: 422 });
}
