import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/templates/import — import templates from JSON
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { templates } = body;

    if (!Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json(
        { error: 'Templates array is required' },
        { status: 400 }
      );
    }

    const created = [];
    for (const t of templates) {
      if (!t.name || !t.prompt) continue;

      const template = await prisma.template.create({
        data: {
          name: t.name,
          description: t.description || null,
          icon: t.icon || 'FileText',
          category: 'custom',
          prompt: t.prompt,
          structure: t.structure ? JSON.stringify(t.structure) : null,
        },
      });
      created.push(template);
    }

    return NextResponse.json({
      imported: created.length,
      templates: created,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to import templates:', error);
    return NextResponse.json({ error: 'Failed to import templates' }, { status: 500 });
  }
}
