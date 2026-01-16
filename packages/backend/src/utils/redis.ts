/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Redis client singleton for connection management
 */

import { createClient, RedisClientType } from 'redis';
import { getConfig } from './config';
import logger from './logger';

let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const config = getConfig();

  if (!config.redis?.enabled) {
    throw new Error('Redis is not enabled in configuration');
  }

  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
    },
    password: config.redis.password,
    database: config.redis.db,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error', { error: err });
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  redisClient.on('end', () => {
    logger.info('Redis client connection ended');
  });

  await redisClient.connect();

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.isOpen;
}

/**
 * Get Redis client stats
 */
export async function getRedisStats(): Promise<{
  connected: boolean;
  dbSize?: number;
  usedMemory?: string;
  connectedClients?: number;
}> {
  if (!isRedisConnected() || !redisClient) {
    return { connected: false };
  }

  try {
    const info = await redisClient.info('stats');
    const dbSize = await redisClient.dbSize();

    // Parse info string for stats
    const lines = info.split('\r\n');
    const stats: Record<string, string> = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      connected: true,
      dbSize,
      usedMemory: stats['used_memory_human'],
      connectedClients: parseInt(stats['connected_clients'] || '0'),
    };
  } catch (error) {
    logger.error('Failed to get Redis stats', { error });
    return { connected: true };
  }
}

export default { getRedisClient, closeRedis, isRedisConnected, getRedisStats };
