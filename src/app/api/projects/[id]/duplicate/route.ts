import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseTags } from '@/lib/tags';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const source = await prisma.project.findUnique({
    where: { id },
    include: {
      plan: true,
    },
  });

  if (!source) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Create duplicated project
  const duplicate = await prisma.project.create({
    data: {
      name: `${source.name} (Copy)`,
      description: source.description,
      status: source.status,
      tags: source.tags, // JSON string preserved as-is
    },
  });

  // Duplicate the plan if exists
  if (source.plan) {
    await prisma.plan.create({
      data: {
        projectId: duplicate.id,
        version: 1,
        content: source.plan.content,
        snapshots: {
          create: {
            version: 1,
            content: source.plan.content ?? '',
          },
        },
      },
    });
  }

  return NextResponse.json({ project: { id: duplicate.id } }, { status: 201 });
}
