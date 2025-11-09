import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env.js';
import { ClassifyInput } from '../schemas/classify.schema.js';
import { classifyText } from '../services/aiService.js';
import { addCase } from '../services/caseStore.js';
import { validateAndRegisterCase } from '../services/crmService.js';
import { logger } from '../utils/logger.js';
import { generateCaseId } from '../utils/id.js';

function sanitizeForPersistence(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

export async function classifyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ClassifyInput.parse(req.body);
    const aiResult = await classifyText(parsed.text, parsed.channel);
    const caseId = generateCaseId();
    const receivedAt = new Date().toISOString();

    const crm = await validateAndRegisterCase({
      text: parsed.text,
      intent: aiResult.intent,
      category: aiResult.category,
      tone: aiResult.tone,
      confidence: aiResult.confidence,
      channel: parsed.channel
    });

    const payload = {
      intent: aiResult.intent,
      category: aiResult.category,
      tone: aiResult.tone,
      confidence: aiResult.confidence,
      caseId,
      receivedAt,
      channel: parsed.channel ?? 'web',
      crm,
      rawModelOutput: aiResult.rawModelOutput
    };

    const sanitizedText = sanitizeForPersistence(parsed.text);

    addCase({
      caseId,
      text: sanitizedText,
      channel: payload.channel,
      intent: payload.intent,
      category: payload.category,
      tone: payload.tone,
      confidence: payload.confidence,
      receivedAt,
      crmStatus: crm.status,
      crmExistingOpenCaseId: crm.existingOpenCaseId,
      isCustomer: crm.isCustomer,
      rawModelOutput: env.nodeEnv !== 'production' ? payload.rawModelOutput : undefined
    });

    if (env.nodeEnv === 'production') {
      delete payload.rawModelOutput;
    }

    logger.info('Case classified', { caseId, channel: payload.channel, intent: payload.intent });

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}
