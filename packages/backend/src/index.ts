/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Main entry point for Orchestra backend server
 */

import 'reflect-metadata';
import { createApp } from './app';
import { getConfig } from '@/utils/config';
import logger from '@/utils/logger';
import { initDatabase, closeDatabase } from './database/connection';
import { initializeWebSocketServer } from './websocket';
import { getMonitor } from './observability';

const config = getConfig();

/**
 * Start the server
 */
async function start() {
  try {
    logger.info('Starting Orchestra backend...');

    // Log configuration (mask sensitive values)
    logger.info('Configuration loaded', {
      server: {
        port: config.server.port,
        host: config.server.host,
      },
      database: {
        type: config.database.type,
        database: config.database.database,
      },
      features: config.features,
    });

    // Initialize database connection
    await initDatabase();
    logger.info('Database initialized');

    // Initialize Redis connection if enabled
    if (config.redis?.enabled) {
      logger.info('Redis is enabled but connection pooling will be lazy-initialized');
    }

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Orchestra backend listening on ${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://${config.server.host}:${config.server.port}/health`);
    });

    // Initialize WebSocket server
    initializeWebSocketServer(server);
    logger.info('WebSocket server initialized');

    // Start system monitoring if metrics enabled
    if (config.features.metricsEnabled) {
      const monitor = getMonitor();
      monitor.startMonitoring(60000); // Check every 60 seconds
      logger.info('System monitoring started');
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections
      await closeDatabase();

      // Stop monitoring
      if (config.features.metricsEnabled) {
        const monitor = getMonitor();
        monitor.stopMonitoring();
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
start();
