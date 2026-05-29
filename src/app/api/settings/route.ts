import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { encrypt, safeDecrypt, maskApiKey } from '@/lib/crypto';
import {
  MIN_TEMPERATURE,
  MAX_TEMPERATURE,
  MIN_API_KEY_LENGTH,
  MAX_API_KEY_LENGTH,
  MAX_BASE_URL_LENGTH,
} from '@/constants/limits';

const ALLOWED_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'ollama',
  'lmstudio',
  'agentrouter',
  'openai_compatible',
] as const;

const ProviderSchema = z.enum(ALLOWED_PROVIDERS);

const PutSettingsSchema = z.object({
  provider: ProviderSchema,
  model: z.string().min(1).max(200).optional(),
  customModels: z.string().max(2000).nullable().optional(),
  apiKey: z.string().min(MIN_API_KEY_LENGTH).max(MAX_API_KEY_LENGTH).nullable().optional(),
  baseUrl: z
    .union([z.string().url().max(MAX_BASE_URL_LENGTH), z.literal('')])
    .nullable()
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1024).max(200000).optional(),
  contextLength: z.number().int().min(1024).max(1000000).optional(),
  topP: z.number().min(0).max(1).optional(),
  makeActive: z.boolean().optional(),
});

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

// GET /api/settings - Get current LLM configuration (apiKey returned masked)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reqProvider = searchParams.get('provider');

    let activeProvider = 'openai';
    const defaultGlobal = await prisma.settings.findUnique({ where: { id: 'default' } });
    if (defaultGlobal) {
      activeProvider = defaultGlobal.provider;
    } else {
      await prisma.settings.create({
        data: { id: 'default', provider: 'openai', model: 'auto', temperature: 0 },
      });
    }

    const targetProvider = reqProvider || activeProvider;
    // Validate provider name to avoid arbitrary id lookups
    if (
      !ALLOWED_PROVIDERS.includes(targetProvider as typeof ALLOWED_PROVIDERS[number]) &&
      targetProvider !== 'default'
    ) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    let settings = await prisma.settings.findUnique({ where: { id: targetProvider } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: targetProvider,
          provider: targetProvider as typeof ALLOWED_PROVIDERS[number],
          model: defaultGlobal?.model || 'auto',
          temperature: defaultGlobal?.temperature ?? 0,
        },
      });
    }

    // Decrypt the stored apiKey, then mask for transport
    const decryptedKey = safeDecrypt(settings.apiKey);

    return NextResponse.json({
      settings: {
        ...settings,
        apiKey: maskApiKey(decryptedKey),
      },
      activeProvider,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'Database schema is not initialized. Run `npm run db:push` or `npm run db:migrate`.' },
        { status: 503 }
      );
    }
    console.error('[settings] GET failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT /api/settings - Update LLM configuration
export async function PUT(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = PutSettingsSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { provider, model, customModels, apiKey, baseUrl, temperature, maxTokens, contextLength, topP, makeActive } = parsed.data;

    // Encrypt apiKey before persisting; only update if explicitly provided
    const apiKeyUpdate =
      apiKey === undefined
        ? {}
        : apiKey === null || apiKey === ''
        ? { apiKey: null }
        : { apiKey: encrypt(apiKey) };

    const providerSettings = await prisma.settings.upsert({
      where: { id: provider },
      update: {
        ...(model && { model }),
        ...(customModels !== undefined && { customModels }),
        ...apiKeyUpdate,
        ...(baseUrl !== undefined && { baseUrl: baseUrl === '' ? null : baseUrl }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(contextLength !== undefined && { contextLength }),
        ...(topP !== undefined && { topP }),
      },
      create: {
        id: provider,
        provider: provider,
        model: model || 'auto',
        customModels: customModels || null,
        apiKey: apiKey ? encrypt(apiKey) : null,
        baseUrl: baseUrl || null,
        temperature: temperature ?? 0,
        maxTokens: maxTokens ?? 65536,
        contextLength: contextLength ?? 131072,
        topP: topP ?? 1,
      },
    });

    if (makeActive !== false) {
      await prisma.settings.upsert({
        where: { id: 'default' },
        update: {
          provider,
          ...(model && { model }),
          ...(temperature !== undefined && { temperature }),
        },
        create: {
          id: 'default',
          provider,
          model: model || 'auto',
          temperature: temperature ?? 0.7,
        },
      });
    }

    const decryptedKey = safeDecrypt(providerSettings.apiKey);

    return NextResponse.json({
      settings: {
        ...providerSettings,
        apiKey: maskApiKey(decryptedKey),
      },
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        { error: 'Database schema is not initialized. Run `npm run db:push` or `npm run db:migrate`.' },
        { status: 503 }
      );
    }
    console.error('[settings] PUT failed:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
