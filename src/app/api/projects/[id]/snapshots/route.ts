import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        plan: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                version: true,
                content: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!project || !project.plan) {
      return NextResponse.json(
        { error: 'Project or plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      snapshots: project.plan.snapshots,
    });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}
