import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { safeDecrypt } from '@/lib/crypto';

const ALLOWED_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'ollama',
  'lmstudio',
  'agentrouter',
  'openai_compatible',
] as const;

const QuerySchema = z.object({
  provider: z.enum(ALLOWED_PROVIDERS),
  apiKey: z.string().max(500).optional(),
  baseUrl: z
    .string()
    .max(500)
    .refine((v) => /^https?:\/\//i.test(v), 'baseUrl must be http(s) URL')
    .optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    provider: searchParams.get('provider') ?? undefined,
    apiKey: searchParams.get('apiKey') ?? undefined,
    baseUrl: searchParams.get('baseUrl') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ models: [], error: 'Invalid query params' }, { status: 400 });
  }

  const { provider } = parsed.data;
  let { apiKey, baseUrl } = parsed.data;

  // If apiKey was not supplied (or is the masked placeholder from the UI),
  // fall back to the encrypted value stored in DB.
  if (!apiKey || apiKey.includes('•')) {
    try {
      const stored = await prisma.settings.findUnique({ where: { id: provider } });
      apiKey = safeDecrypt(stored?.apiKey) ?? undefined;
      baseUrl = baseUrl ?? stored?.baseUrl ?? undefined;
    } catch {
      // best-effort; continue without a stored key
    }
  }

  try {
    switch (provider) {
      case 'openai':
      case 'agentrouter': {
        const url =
          provider === 'agentrouter'
            ? (baseUrl || 'https://api.agentrouter.org/v1') + '/models'
            : 'https://api.openai.com/v1/models';

        const key = apiKey || process.env.OPENAI_API_KEY || process.env.AGENTROUTER_API_KEY || '';
        if (!key) return NextResponse.json({ models: [] });

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) throw new Error('Failed to fetch models');

        const data = (await res.json()) as { data?: { id: string }[] };
        const models = (data.data || []).map((m) => m.id).sort();
        return NextResponse.json({ models });
      }

      case 'google': {
        const key = apiKey || process.env.GOOGLE_API_KEY || '';
        if (!key) return NextResponse.json({ models: [] });

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        if (!res.ok) throw new Error('Failed to fetch Gemini models');

        const data = (await res.json()) as { models?: { name: string }[] };
        const models = (data.models || [])
          .map((m) => m.name.replace('models/', ''))
          .filter((name: string) => name.includes('gemini'));
        return NextResponse.json({ models });
      }

      case 'ollama':
      case 'lmstudio': {
        const defaultUrl = provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234';
        const url = baseUrl || defaultUrl;
        const tagsUrl = `${url.replace('/v1', '').replace('/api', '')}/api/tags`;
        const res = await fetch(tagsUrl);
        if (!res.ok) throw new Error(`Failed to fetch ${provider} models`);

        const data = (await res.json()) as { models?: { name: string }[] };
        const models = (data.models || []).map((m) => m.name);
        return NextResponse.json({ models });
      }

      case 'openai_compatible': {
        if (!baseUrl) return NextResponse.json({ models: [] });
        const key = apiKey || '';
        const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
          headers: key ? { Authorization: `Bearer ${key}` } : undefined,
        });
        if (!res.ok) return NextResponse.json({ models: [] });
        const data = (await res.json()) as { data?: { id: string }[] };
        const models = (data.data || []).map((m) => m.id).sort();
        return NextResponse.json({ models });
      }

      case 'anthropic': {
        return NextResponse.json({
          models: [
            'claude-sonnet-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
          ],
        });
      }

      default:
        return NextResponse.json({ models: [] });
    }
  } catch (error) {
    console.error('[models] fetch failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ models: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
