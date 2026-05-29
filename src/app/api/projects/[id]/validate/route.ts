import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validatePRD } from '@/lib/ai/agents/orchestrator';

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
      { error: 'No PRD content to validate. Generate a PRD first.' },
      { status: 400 }
    );
  }

  // Truncate very long PRDs to avoid token limit issues during validation
  const MAX_PRD_LENGTH = 15000;
  const prdContent = project.plan.content.length > MAX_PRD_LENGTH
    ? project.plan.content.slice(0, MAX_PRD_LENGTH) + '\n\n[... content truncated for validation ...]'
    : project.plan.content;

  const result = await validatePRD(prdContent);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Validation failed' },
      { status: 500 }
    );
  }

  // If JSON extraction succeeded, we have structured data
  if (result.data) {
    // Get existing metadata to preserve other fields (e.g. taskBreakdown)
    const existingMeta = project.metadata
      ? JSON.parse(project.metadata as string)
      : {};

    // Store full validation result in project metadata (including issues array)
    await prisma.project.update({
      where: { id },
      data: {
        metadata: JSON.stringify({
          ...existingMeta,
          validation: {
            ...result.data,
            issueCount: result.data.issues.length,
            lastValidated: new Date().toISOString(),
          },
        }),
      },
    });

    return NextResponse.json({ validation: result.data });
  }

  // JSON extraction failed — return a user-friendly error with the raw response
  return NextResponse.json(
    {
      error: 'The AI returned an invalid response format. Please try again.',
      details: result.rawText?.slice(0, 500),
    },
    { status: 422 }
  );
}
