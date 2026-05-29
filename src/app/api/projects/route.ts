import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { parseTags } from '@/lib/tags';
import { MAX_PROJECT_NAME_LENGTH, MAX_PROJECT_DESCRIPTION_LENGTH } from '@/constants/limits';
import { rateLimit } from '@/lib/rate-limit';

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(MAX_PROJECT_NAME_LENGTH),
  description: z.string().max(MAX_PROJECT_DESCRIPTION_LENGTH).nullable().optional(),
});

function isMissingTableError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2021';
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        plan: { select: { id: true, version: true } },
        _count: { select: { conversations: true } },
      },
    });
    
    // Parse tags from JSON string to array
    const projectsWithTags = projects.map((project) => ({
      ...project,
      tags: parseTags(project.tags),
    }));
    
    return NextResponse.json({ projects: projectsWithTags });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'Database schema is not initialized. Run `npm run db:push` or `npm run db:migrate`.' },
        { status: 503 }
      );
    }
    console.error('[projects] GET failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = await rateLimit(clientIp);
  
  if (!rateLimitResult.success) {
    return new Response('Too many requests', { 
      status: 429,
      headers: { 'Retry-After': rateLimitResult.retryAfter!.toString() }
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateProjectSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description } = parsed.data;

  try {
    const project = await prisma.project.create({
      data: { name, description: description || null },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'Database schema is not initialized. Run `npm run db:push` or `npm run db:migrate`.' },
        { status: 503 }
      );
    }
    console.error('[projects] POST failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
