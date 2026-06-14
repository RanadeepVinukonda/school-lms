import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClientInstance: any = null;

/**
 * Creates or retrieves a Redis connection instance.
 * Automatically falls back to 'ioredis-mock' if REDIS_URL is missing or connection fails.
 */
export function getRedisConnection() {
  if (redisClientInstance) {
    return redisClientInstance;
  }

  // Use mock in test environment
  if (env.NODE_ENV === 'test') {
    logger.info('Test env: using ioredis-mock for Redis connection.');
    const RedisMock = require('ioredis-mock');
    redisClientInstance = new RedisMock();
    return redisClientInstance;
  }

  const url = env.REDIS_URL || process.env.REDIS_URL;

  if (!url) {
    logger.warn('No REDIS_URL environment variable found. Falling back to in-memory ioredis-mock.');
    const RedisMock = require('ioredis-mock');
    redisClientInstance = new RedisMock();
    return redisClientInstance;
  }

  try {
    logger.info(`Initializing Redis connection at: ${url}`);
    // maxRetriesPerRequest must be null for compatibility with BullMQ
    const client = new Redis(url, {
      maxRetriesPerRequest: null,
      reconnectOnError: (err) => {
        logger.error('Redis connection reconnecting on error:', err);
        return true;
      },
    });

    client.on('error', (err) => {
      logger.error('Redis connection error:', { error: err.message });
    });

    redisClientInstance = client;
    return redisClientInstance;
  } catch (err) {
    logger.error('Exception during Redis connection setup, falling back to ioredis-mock', { err });
    const RedisMock = require('ioredis-mock');
    redisClientInstance = new RedisMock();
    return redisClientInstance;
  }
}
