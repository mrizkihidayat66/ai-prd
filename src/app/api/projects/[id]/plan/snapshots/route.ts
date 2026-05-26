import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const plan = await prisma.plan.findUnique({ where: { projectId: id } });
  if (!plan) return NextResponse.json({ snapshots: [] });

  const rows = await prisma.planSnapshot.findMany({
    where: { planId: plan.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, version: true, createdAt: true, content: true },
  });

  const snapshots = rows.map((row) => ({
    id: row.id,
    version: row.version,
    createdAt: row.createdAt,
    content: row.content,
  }));

  return NextResponse.json({ snapshots });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { snapshotId } = body;

  if (!snapshotId) {
    return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 });
  }

  const snapshot = await prisma.planSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });

  const plan = await prisma.plan.findUnique({ where: { projectId: id } });
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const updated = await prisma.plan.update({
    where: { projectId: id },
    data: { content: snapshot.content, version: { increment: 1 } },
  });

  return NextResponse.json({ plan: updated, restoredFromVersion: snapshot.version });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const snapshotId = new URL(request.url).searchParams.get('snapshotId');

  if (!snapshotId) {
    return NextResponse.json({ error: 'snapshotId query param is required' }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { projectId: id } });
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const snapshot = await prisma.planSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snapshot || snapshot.planId !== plan.id) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  await prisma.planSnapshot.delete({ where: { id: snapshotId } });
  return NextResponse.json({ deleted: true });
}
