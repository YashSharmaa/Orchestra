/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Database connection management
 */

import { DataSource } from 'typeorm';
import { getConfig } from '@/utils/config';
import logger from '@/utils/logger';
import * as entities from './entities';

let dataSource: DataSource | null = null;

/**
 * Initialize database connection
 */
export async function initDatabase(): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  const config = getConfig();
  const dbConfig = config.database;

  dataSource = new DataSource({
    type: dbConfig.type as any,
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbConfig.password,
    entities: Object.values(entities),
    synchronize: dbConfig.synchronize,
    logging: dbConfig.logging,
    migrations: [],
    subscribers: [],
  });

  try {
    await dataSource.initialize();
    logger.info('Database connection initialized successfully', {
      type: dbConfig.type,
      database: dbConfig.database,
    });
    return dataSource;
  } catch (error) {
    logger.error('Failed to initialize database connection', { error });
    throw error;
  }
}

/**
 * Get the current database connection
 */
export function getDatabase(): DataSource {
  if (!dataSource?.isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dataSource;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    logger.info('Database connection closed');
  }
}
