import winston from 'winston';
import { env } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 10,
    }),
  );
}

const baseLogger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
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
