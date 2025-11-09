import { env } from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelPriority: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const shouldLog = (level: LogLevel) => levelPriority[level] <= levelPriority[currentLevel];

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const base = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  if (!meta || Object.keys(meta).length === 0) {
    return base;
  }
  return `${base} ${JSON.stringify(meta)}`;
}

export const logger = {
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(formatMessage('error', message, meta));
    }
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(formatMessage('warn', message, meta));
    }
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(formatMessage('info', message, meta));
    }
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage('debug', message, meta));
    }
  }
};
