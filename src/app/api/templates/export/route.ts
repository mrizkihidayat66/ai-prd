import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/templates/export — export templates as JSON
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body; // optional: specific template IDs to export

    const where = ids?.length ? { id: { in: ids } } : {};
    const templates = await prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const exportData = templates.map((t) => ({
      name: t.name,
      description: t.description,
      icon: t.icon,
      category: t.category,
      prompt: t.prompt,
      structure: t.structure ? JSON.parse(t.structure) : null,
    }));

    return NextResponse.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: exportData,
    });
  } catch (error) {
    console.error('Failed to export templates:', error);
    return NextResponse.json({ error: 'Failed to export templates' }, { status: 500 });
  }
}
