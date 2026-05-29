import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parseTags } from '@/lib/tags';
import { MAX_PROJECT_NAME_LENGTH, MAX_PROJECT_DESCRIPTION_LENGTH } from '@/constants/limits';

const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(MAX_PROJECT_NAME_LENGTH).optional(),
  description: z.string().max(MAX_PROJECT_DESCRIPTION_LENGTH).nullable().optional(),
  status: z.enum(['CLARIFYING', 'REQUIREMENTS_LOCKED', 'GENERATING', 'PLAN_GENERATED', 'COMPLETED']).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      plan: { include: { snapshots: { orderBy: { createdAt: 'desc' } } } },
      conversations: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Parse tags from JSON string to array
  const projectWithTags = {
    ...project,
    tags: parseTags(project.tags),
  };

  return NextResponse.json({ project: projectWithTags });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateProjectSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, status } = parsed.data;

  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[projects/id] PATCH failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
