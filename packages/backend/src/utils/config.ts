/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Configuration loader and validator
 */

import dotenv from 'dotenv';
import path from 'path';
import { IConfig } from '@/types';

// Load environment variables
dotenv.config();

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): IConfig {
  return {
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      corsCredentials: process.env.CORS_CREDENTIALS === 'true',
    },
    database: {
      type: (process.env.DATABASE_TYPE as any) || 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'orchestra',
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      synchronize: process.env.DATABASE_SYNC === 'true',
      logging: process.env.DATABASE_LOGGING === 'true',
    },
    redis: process.env.REDIS_ENABLED === 'true'
      ? {
          enabled: true,
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        }
      : undefined,
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'orchestra-secret-change-this',
      jwtExpiration: process.env.JWT_EXPIRATION || '24h',
      encryptionKey: process.env.ENCRYPTION_KEY || 'change-this-encryption-key-32-chars',
      ssoEnabled: process.env.SSO_ENABLED === 'true',
      ssoType: process.env.SSO_TYPE as 'saml' | 'oidc' | undefined,
      disableAuth: process.env.DISABLE_AUTH === 'true',
    },
    ai: {
      azureOpenAI:
        process.env.AZURE_OPENAI_ENABLED === 'true'
          ? {
              enabled: true,
              endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
              apiKey: process.env.AZURE_OPENAI_API_KEY || '',
              deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
              embeddingDeployment:
                process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
              apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
            }
          : undefined,
      openAI:
        process.env.OPENAI_ENABLED === 'true'
          ? {
              enabled: true,
              apiKey: process.env.OPENAI_API_KEY || '',
              model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
            }
          : undefined,
      vectorStore:
        process.env.VECTOR_STORE_ENABLED === 'true'
          ? {
              enabled: true,
              type: process.env.VECTOR_STORE_TYPE || 'qdrant',
              url: process.env.VECTOR_STORE_URL || 'http://localhost:6333',
              apiKey: process.env.VECTOR_STORE_API_KEY,
            }
          : undefined,
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json',
      fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs',
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30', 10),
    },
    execution: {
      maxConcurrentWorkflows: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '100', 10),
      workflowTimeout: parseInt(process.env.WORKFLOW_TIMEOUT_MS || '300000', 10),
      nodeTimeout: parseInt(process.env.NODE_TIMEOUT_MS || '60000', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      enableCheckpoints: process.env.ENABLE_CHECKPOINTS === 'true',
    },
    features: {
      marketplace: process.env.MARKETPLACE_ENABLED !== 'false',
      publicMarketplace: process.env.PUBLIC_MARKETPLACE_ENABLED === 'true',
      evaluation: process.env.EVALUATION_ENABLED !== 'false',
      redTeamTesting: process.env.RED_TEAM_TESTING_ENABLED !== 'false',
      agentMemory: process.env.ENABLE_AGENT_MEMORY !== 'false',
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    },
  };
}

/**
 * Validate required configuration
 */
export function validateConfig(config: IConfig): void {
  const errors: string[] = [];

  // Validate server config
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid server port');
  }

  // Validate database config
  if (!config.database.database) {
    errors.push('Database name is required');
  }

  if (config.database.type !== 'sqlite') {
    if (!config.database.host) {
      errors.push('Database host is required for non-SQLite databases');
    }
    if (!config.database.username) {
      errors.push('Database username is required for non-SQLite databases');
    }
  }

  // Validate auth config
  if (config.auth.jwtSecret.length < 32) {
    errors.push('JWT secret must be at least 32 characters');
  }

  if (config.auth.encryptionKey.length < 32) {
    errors.push('Encryption key must be at least 32 characters');
  }

  // Warn about Azure OpenAI config if enabled
  if (config.ai.azureOpenAI?.enabled) {
    if (!config.ai.azureOpenAI.endpoint || !config.ai.azureOpenAI.apiKey) {
      errors.push('Azure OpenAI endpoint and API key are required when Azure OpenAI is enabled');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get the current configuration (singleton)
 */
let cachedConfig: IConfig | null = null;

export function getConfig(): IConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
    validateConfig(cachedConfig);
  }
  return cachedConfig;
}

export default getConfig;
