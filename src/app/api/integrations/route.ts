import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { encrypt, safeDecrypt, maskApiKey } from '@/lib/crypto';

const ALLOWED_INTEGRATIONS = ['github', 'linear', 'jira'] as const;

const PutIntegrationSchema = z.object({
  id: z.enum(ALLOWED_INTEGRATIONS),
  enabled: z.boolean().optional(),
  token: z.string().min(1).max(500).nullable().optional(),
  baseUrl: z.string().url().max(500).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

// GET /api/integrations — List all integrations (tokens masked)
export async function GET() {
  try {
    const integrations = await prisma.integration.findMany();

    const masked = integrations.map((i) => ({
      ...i,
      token: i.token ? maskApiKey(safeDecrypt(i.token) || '') : null,
      metadata: i.metadata ? JSON.parse(i.metadata) : null,
    }));

    // Fill missing integrations with defaults
    const result = ALLOWED_INTEGRATIONS.map((id) => {
      const existing = masked.find((i) => i.id === id);
      return existing || { id, enabled: false, token: null, baseUrl: null, metadata: null };
    });

    return NextResponse.json({ integrations: result });
  } catch (error) {
    console.error('GET /api/integrations error:', error);
    return NextResponse.json({ error: 'Failed to load integrations' }, { status: 500 });
  }
}

// PUT /api/integrations — Create or update an integration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PutIntegrationSchema.parse(body);

    const data: Record<string, unknown> = {
      enabled: parsed.enabled ?? true,
      updatedAt: new Date(),
    };

    if (parsed.token !== undefined) {
      data.token = parsed.token ? encrypt(parsed.token) : null;
    }
    if (parsed.baseUrl !== undefined) {
      data.baseUrl = parsed.baseUrl;
    }
    if (parsed.metadata !== undefined) {
      data.metadata = parsed.metadata ? JSON.stringify(parsed.metadata) : null;
    }

    const integration = await prisma.integration.upsert({
      where: { id: parsed.id },
      update: data,
      create: {
        id: parsed.id,
        enabled: (data.enabled as boolean) ?? false,
        token: data.token as string | null,
        baseUrl: (data.baseUrl as string | null) ?? null,
        metadata: (data.metadata as string | null) ?? null,
      },
    });

    return NextResponse.json({
      integration: {
        ...integration,
        token: integration.token ? maskApiKey(safeDecrypt(integration.token) || '') : null,
        metadata: integration.metadata ? JSON.parse(integration.metadata) : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('PUT /api/integrations error:', error);
    return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
  }
}
