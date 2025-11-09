import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '../utils/logger.js';
import { generateTraceId } from '../utils/id.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const traceId = generateTraceId();

  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.') || 'text',
      message: issue.message,
      code: issue.code
    }));

    logger.warn('Validation error', { traceId, issues });

    return res.status(400).type('application/problem+json').json({
      type: 'https://andino-postventa/errors/validation-error',
      title: 'Invalid request payload',
      status: 400,
      detail: 'One or more fields failed validation',
      traceId,
      errors: issues
    });
  }

  const status = (error as { status?: number }).status ?? 500;
  const detail = (error as Error).message || 'Unexpected error';

  logger.error('Unhandled error', {
    traceId,
    status,
    detail,
    stack: (error as Error).stack
  });

  return res.status(status >= 400 && status <= 599 ? status : 500).type('application/problem+json').json({
    type: 'https://andino-postventa/errors/internal-error',
    title: 'Internal Server Error',
    status: status >= 400 && status <= 599 ? status : 500,
    detail,
    traceId
  });
}
