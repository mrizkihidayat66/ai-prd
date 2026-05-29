import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get current plan
    const project = await prisma.project.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!project || !project.plan) {
      return NextResponse.json({ error: 'Project or plan not found' }, { status: 404 });
    }

    // Create snapshot before editing
    await prisma.planSnapshot.create({
      data: {
        planId: project.plan.id,
        version: project.plan.version,
        content: project.plan.content || '',
      },
    });

    // Update plan with new content
    await prisma.plan.update({
      where: { id: project.plan.id },
      data: {
        content,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving manual edit:', error);
    return NextResponse.json(
      { error: 'Failed to save manual edit' },
      { status: 500 }
    );
  }
}
