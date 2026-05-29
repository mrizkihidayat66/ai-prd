import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { z } from 'zod';
import { getModel, ProviderConfig } from '@/lib/ai/provider';
import { prisma } from '@/lib/db';
import { safeDecrypt } from '@/lib/crypto';

const TestSchema = z.object({
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(200),
  apiKey: z.string().max(500).nullable().optional(),
  baseUrl: z.string().max(500).nullable().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = TestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const config: ProviderConfig = {
      provider: parsed.data.provider,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey ?? null,
      baseUrl: parsed.data.baseUrl ?? null,
      temperature: parsed.data.temperature ?? 0,
      maxTokens: 65536,
      contextLength: 131072,
      topP: 1,
    };

    // If client did not supply a fresh apiKey (or sent the masked placeholder),
    // fall back to the encrypted value stored in DB and decrypt it.
    if (!config.apiKey || config.apiKey.includes('•')) {
      const dbSettings = await prisma.settings.findUnique({ where: { id: config.provider } });
      config.apiKey = safeDecrypt(dbSettings?.apiKey);
    }

    if (!config.baseUrl) {
      const dbSettings = await prisma.settings.findUnique({ where: { id: config.provider } });
      config.baseUrl = dbSettings?.baseUrl || null;
    }

    const model = getModel(config);

    const result = streamText({
      model,
      prompt: 'Reply with the exact word: "Connection Successful!". Do not say anything else.',
      temperature: 0,
    });

    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    return NextResponse.json({ success: true, text: text.trim() });
  } catch (error: unknown) {
    console.error('[settings/test] LLM Test Error:', error instanceof Error ? error.message : String(error));
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
