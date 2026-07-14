import winston from 'winston';
import { env } from './env';

const service = 'lms-backend';

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const humanFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service: svc, requestId, ...meta }) => {
    const parts: string[] = [];
    if (timestamp) parts.push(String(timestamp));
    if (level) parts.push(String(level));
    if (svc) parts.push(`[${String(svc)}]`);
    if (requestId) parts.push(`[req:${String(requestId)}]`);
    parts.push(message as string);
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    return parts.join(' ') + metaStr;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === 'production' ? jsonFormat : humanFormat,
  }),
];

if (!process.env.VERCEL && env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10,
      format: jsonFormat,
    }),
  );
}

const baseLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service },
  format: jsonFormat,
  transports,
  exitOnError: false,
});

type LogLevels = 'error' | 'warn' | 'info' | 'debug';
type LogMethod = (message: string, meta?: Record<string, unknown>) => void;

export interface Logger {
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  debug: LogMethod;
  child: (context: Record<string, unknown>) => Logger;
}

function createLogger(winstonLogger: winston.Logger, defaultMeta: Record<string, unknown> = {}): Logger {
  const log = (level: LogLevels, message: string, meta?: Record<string, unknown>) => {
    winstonLogger.log(level, message, { ...defaultMeta, ...meta });
  };
  return {
    error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
    child: (context: Record<string, unknown>) => createLogger(winstonLogger, { ...defaultMeta, ...context }),
  };
}

export const logger = createLogger(baseLogger);
