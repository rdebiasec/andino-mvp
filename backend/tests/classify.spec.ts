import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { app } from '../src/app';
import { ClassifyInput } from '../src/schemas/classify.schema';
import { classifyText, setOpenAIClient } from '../src/services/aiService';
import * as aiService from '../src/services/aiService';
import * as crmService from '../src/services/crmService';

vi.mock('openai', () => {
  class MockClient {
    chat = {
      completions: {
        create: vi.fn()
      }
    };
  }
  return { default: MockClient };
});

afterEach(() => {
  vi.restoreAllMocks();
  setOpenAIClient(null);
});

describe('ClassifyInput schema', () => {
  it('accepts valid payloads', () => {
    const result = ClassifyInput.parse({ text: 'Necesito ayuda', channel: 'web' });
    expect(result).toEqual({ text: 'Necesito ayuda', channel: 'web' });
  });

  it('rejects empty text', () => {
    expect(() => ClassifyInput.parse({ text: '   ' })).toThrow(/text requerido/);
  });

  it('rejects too long text', () => {
    const longText = 'a'.repeat(2001);
    expect(() => ClassifyInput.parse({ text: longText })).toThrow(/máximo 2000 caracteres/);
  });
});

describe('classifyText', () => {
  it('returns normalized classification payload', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: 'cancelacion',
              category: 'producto',
              tone: 'enojado',
              confidence: 0.92
            })
          }
        }
      ]
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockResponse)
        }
      }
    } as any;

    setOpenAIClient(mockClient);

    const result = await classifyText('Quiero cancelar mi pedido', 'web');

    expect(result).toEqual(
      expect.objectContaining({
        intent: 'cancelacion',
        category: 'producto',
        tone: 'enojado',
        confidence: 0.92
      })
    );
    expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/v1/classify', () => {
  it('returns 200 and payload when classification succeeds', async () => {
    vi.spyOn(aiService, 'classifyText').mockResolvedValue({
      intent: 'facturacion',
      category: 'pago',
      tone: 'neutral',
      confidence: 0.7,
      rawModelOutput: { mock: true }
    });

    vi.spyOn(crmService, 'validateAndRegisterCase').mockResolvedValue({
      isCustomer: true,
      existingOpenCaseId: null,
      status: 'REGISTERED'
    });

    const response = await request(app)
      .post('/api/v1/classify')
      .send({ text: 'Necesito facturar nuevamente mi pedido', channel: 'email' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      intent: 'facturacion',
      category: 'pago',
      tone: 'neutral',
      confidence: 0.7,
      channel: 'email',
      crm: {
        status: 'REGISTERED',
        existingOpenCaseId: null,
        isCustomer: true
      }
    });
    expect(response.body.caseId).toMatch(/^AND-/);
  });

  it('returns 400 when payload is invalid', async () => {
    const response = await request(app).post('/api/v1/classify').send({ text: '' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 400,
      title: 'Invalid request payload'
    });
  });
});
