import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/templates — list all custom templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/templates — create a new template
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, icon, prompt, structure, sourceProjectId } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    const template = await prisma.template.create({
      data: {
        name,
        description: description || null,
        icon: icon || 'FileText',
        category: 'custom',
        prompt,
        structure: structure ? JSON.stringify(structure) : null,
        sourceProjectId: sourceProjectId || null,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
