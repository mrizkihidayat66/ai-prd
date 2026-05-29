import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { MAX_PROJECT_TAGS, MAX_TAG_LENGTH } from '@/constants/limits';

const UpdateTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(MAX_PROJECT_TAGS),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = UpdateTagsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tags } = parsed.data;

    const project = await prisma.project.update({
      where: { id },
      data: {
        tags: JSON.stringify(tags),
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('[projects/id/tags] PATCH failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
