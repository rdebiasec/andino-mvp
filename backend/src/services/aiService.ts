import OpenAI from 'openai';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const ALLOWED_INTENTS = ['cancelacion', 'devolucion', 'soporte_tecnico', 'facturacion', 'otro'] as const;
const ALLOWED_CATEGORIES = ['producto', 'servicio', 'logistica', 'pago', 'otro'] as const;
const ALLOWED_TONES = ['enojado', 'neutral', 'frustrado', 'positivo', 'urgente'] as const;

export type ClassificationResult = {
  intent: (typeof ALLOWED_INTENTS)[number];
  category: (typeof ALLOWED_CATEGORIES)[number];
  tone: (typeof ALLOWED_TONES)[number];
  confidence: number;
  rawModelOutput?: unknown;
};

type OpenAIClient = OpenAI;

const SYSTEM_PROMPT = `
Eres un clasificador de reclamos de postventa. Devuelve ÚNICAMENTE un JSON con:
{ "intent": "...", "category": "...", "tone": "...", "confidence": 0.0 }
Intents: cancelacion, devolucion, soporte_tecnico, facturacion, otro.
Categorías: producto, servicio, logistica, pago, otro.
Tono: enojado, neutral, frustrado, positivo, urgente.
Si dudas, usa "otro" y confidence <= 0.4.
`;

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_API_RETRIES = 1;
const MAX_PARSE_RETRIES = 1;

let client: OpenAIClient | null = null;

function ensureClient() {
  if (client) {
    return client;
  }
  if (!env.openai.apiKey) {
    throw new Error('OpenAI API key is not configured');
  }
  client = new OpenAI({ apiKey: env.openai.apiKey });
  return client;
}

export function setOpenAIClient(mock: OpenAIClient | null) {
  client = mock;
}

function sanitizeText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim();
}

function normaliseEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T[number]) : fallback;
}

function normaliseConfidence(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0.4;
  }
  return Math.max(0, Math.min(1, numeric));
}

function buildMessages(text: string, channel?: string) {
  return [
    {
      role: 'system' as const,
      content: SYSTEM_PROMPT.trim()
    },
    {
      role: 'user' as const,
      content: `Texto del reclamo:\n${text}\nCanal: ${channel ?? 'web'}\n`
    }
  ];
}

async function createCompletion(messages: ReturnType<typeof buildMessages>, attempt = 0) {
  const activeClient = ensureClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await activeClient.chat.completions.create(
      {
        model: env.openai.model,
        messages,
        temperature: 0.2,
        max_tokens: 256,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0,
        response_format: { type: 'json_object' }
      },
      {
        signal: controller.signal
      }
    );
    return response;
  } catch (error: unknown) {
    const statusCode = (error as { status?: number }).status;
    const isRetryable = statusCode ? statusCode >= 500 : true;
    if (attempt < MAX_API_RETRIES && isRetryable) {
      logger.warn('OpenAI request failed, retrying', {
        attempt,
        statusCode,
        message: (error as Error).message
      });
      return createCompletion(messages, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(raw: string) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw err;
  }
}

export async function classifyText(text: string, channel?: string): Promise<ClassificationResult> {
  const sanitized = sanitizeText(text);
  const messages = buildMessages(sanitized, channel);

  let rawContent = '{}';
  let lastParseError: unknown;

  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt += 1) {
    const completion = await createCompletion(messages);
    rawContent = completion.choices?.[0]?.message?.content ?? '{}';
    try {
      const parsed = extractJson(rawContent);
      const intent = normaliseEnum(parsed.intent, ALLOWED_INTENTS, 'otro');
      const category = normaliseEnum(parsed.category, ALLOWED_CATEGORIES, 'otro');
      const tone = normaliseEnum(parsed.tone, ALLOWED_TONES, 'neutral');
      const confidence = normaliseConfidence(parsed.confidence);

      return {
        intent,
        category,
        tone,
        confidence,
        rawModelOutput: env.nodeEnv !== 'production' ? parsed : undefined
      };
    } catch (parseError) {
      lastParseError = parseError;
      logger.warn('Failed to parse OpenAI response as JSON', {
        attempt,
        rawContent
      });
    }
  }

  throw new Error(`Unable to parse OpenAI response: ${(lastParseError as Error | undefined)?.message ?? 'unknown error'}`);
}
