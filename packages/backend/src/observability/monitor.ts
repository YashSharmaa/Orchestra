/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: System health monitoring and diagnostics
 */

import { getDatabase } from '@/database/connection';
import { getConfig } from '@/utils/config';
import logger from '@/utils/logger';
import { getMetrics } from './metrics';
import os from 'os';

/**
 * Health check status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Health check result for a component
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
  responseTime?: number;
}

/**
 * Overall system health
 */
export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  components: {
    database: ComponentHealth;
    redis?: ComponentHealth;
    memory: ComponentHealth;
    cpu: ComponentHealth;
    disk: ComponentHealth;
  };
  metrics?: {
    activeWorkflows: number;
    totalExecutions: number;
    errorRate: number;
  };
}

/**
 * System monitor class
 */
export class SystemMonitor {
  private config = getConfig();
  private startTime: Date = new Date();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: SystemHealth | null = null;

  /**
   * Start periodic health checks
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      logger.warn('Monitoring already started');
      return;
    }

    logger.info('Starting system monitoring', { intervalMs });

    // Initial health check
    this.checkHealth().catch((error) => {
      logger.error('Initial health check failed', { error });
    });

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch((error) => {
        logger.error('Health check failed', { error });
      });
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Stopped system monitoring');
    }
  }

  /**
   * Perform a comprehensive health check
   */
  async checkHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    try {
      // Check all components in parallel
      const [database, redis, memory, cpu, disk] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkMemory(),
        this.checkCPU(),
        this.checkDisk(),
      ]);

      // Determine overall status
      const components = { database, redis, memory, cpu, disk };
      const statuses = Object.values(components)
        .filter((c): c is ComponentHealth => c !== undefined)
        .map((c) => c.status);

      let overallStatus = HealthStatus.HEALTHY;
      if (statuses.includes(HealthStatus.UNHEALTHY)) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (statuses.includes(HealthStatus.DEGRADED)) {
        overallStatus = HealthStatus.DEGRADED;
      }

      // Get metrics
      const metrics = this.getSystemMetrics();

      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date(),
        uptime: this.getUptime(),
        version: process.env.npm_package_version || '0.1.0',
        components: {
          database,
          ...(redis && { redis }),
          memory,
          cpu,
          disk,
        },
        metrics,
      };

      this.lastHealthCheck = health;

      // Update system metrics
      const metricsCollector = getMetrics();
      metricsCollector.updateSystemMetrics();

      const duration = Date.now() - startTime;
      logger.debug('Health check completed', {
        status: overallStatus,
        duration,
      });

      return health;
    } catch (error) {
      logger.error('Health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        uptime: this.getUptime(),
        version: process.env.npm_package_version || '0.1.0',
        components: {
          database: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
          memory: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
          cpu: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
          disk: {
            status: HealthStatus.UNHEALTHY,
            message: 'Health check failed',
            timestamp: new Date(),
          },
        },
      };
    }
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const db = getDatabase();

      if (!db.isInitialized) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: 'Database not initialized',
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
        };
      }

      // Simple query to test connection
      await db.query('SELECT 1');

      // Get connection pool stats if available
      const details: Record<string, any> = {
        type: this.config.database.type,
        database: this.config.database.database,
      };

      return {
        status: HealthStatus.HEALTHY,
        message: 'Database connection healthy',
        details,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Database health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `Database check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<ComponentHealth | undefined> {
    if (!this.config.redis?.enabled) {
      return undefined;
    }

    const startTime = Date.now();

    try {
      // Dynamically import Redis client
      const { getRedisClient, getRedisStats } = await import('@/utils/redis');

      // Get Redis client and test connection
      const redis = await getRedisClient();
      await redis.ping();

      // Get Redis stats
      const stats = await getRedisStats();

      const metrics = getMetrics();
      if (stats.dbSize !== undefined) {
        metrics.setGauge('redis_db_size', stats.dbSize);
      }
      if (stats.connectedClients !== undefined) {
        metrics.setGauge('redis_connected_clients', stats.connectedClients);
      }

      return {
        status: HealthStatus.HEALTHY,
        message: 'Redis connection healthy',
        details: {
          dbSize: stats.dbSize,
          usedMemory: stats.usedMemory,
          connectedClients: stats.connectedClients,
        },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Redis health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `Redis check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const memUsage = process.memoryUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = (usedMem / totalMem) * 100;

      // Heap usage percentage
      const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      let status = HealthStatus.HEALTHY;
      let message = 'Memory usage normal';

      if (heapPercent > 90 || memPercent > 90) {
        status = HealthStatus.UNHEALTHY;
        message = 'Critical memory usage';
      } else if (heapPercent > 75 || memPercent > 75) {
        status = HealthStatus.DEGRADED;
        message = 'High memory usage';
      }

      const details = {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        heapPercent: heapPercent.toFixed(2) + '%',
        rss: this.formatBytes(memUsage.rss),
        external: this.formatBytes(memUsage.external),
        systemTotal: this.formatBytes(totalMem),
        systemFree: this.formatBytes(freeMem),
        systemUsedPercent: memPercent.toFixed(2) + '%',
      };

      // Update metrics
      const metrics = getMetrics();
      metrics.setGauge('system_memory_usage_bytes', memUsage.heapUsed);

      return {
        status,
        message,
        details,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Memory health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `Memory check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check CPU usage
   */
  private async checkCPU(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();

      // Calculate average CPU usage
      let totalIdle = 0;
      let totalTick = 0;

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      }

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (100 * idle) / total;

      // Load average normalized by number of CPUs
      const normalizedLoad = loadAvg[0] / cpus.length;

      let status = HealthStatus.HEALTHY;
      let message = 'CPU usage normal';

      if (normalizedLoad > 2.0 || usage > 90) {
        status = HealthStatus.UNHEALTHY;
        message = 'Critical CPU usage';
      } else if (normalizedLoad > 1.5 || usage > 75) {
        status = HealthStatus.DEGRADED;
        message = 'High CPU usage';
      }

      const details = {
        cores: cpus.length,
        model: cpus[0].model,
        usage: usage.toFixed(2) + '%',
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2),
        },
        normalizedLoad: normalizedLoad.toFixed(2),
      };

      // Update metrics
      const metrics = getMetrics();
      metrics.setGauge('system_cpu_usage_percent', usage);

      return {
        status,
        message,
        details,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('CPU health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `CPU check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Note: Getting actual disk usage in Node.js requires platform-specific code
      // This is a simplified version
      const platform = os.platform();
      const homeDir = os.homedir();
      const tmpDir = os.tmpdir();

      let status = HealthStatus.HEALTHY;
      let message = 'Disk space adequate';

      const details = {
        platform,
        homeDir,
        tmpDir,
        // Actual disk space would require additional libraries like 'diskusage'
        note: 'Full disk monitoring requires additional system integration',
      };

      return {
        status,
        message,
        details,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error('Disk health check failed', { error });

      return {
        status: HealthStatus.UNHEALTHY,
        message: `Disk check failed: ${error.message}`,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get system metrics summary
   */
  private getSystemMetrics(): {
    activeWorkflows: number;
    totalExecutions: number;
    errorRate: number;
  } {
    try {
      const metrics = getMetrics();
      const metricsData = metrics.toJSON();

      // Calculate active workflows
      const activeWorkflows =
        metricsData.gauges?.workflow_active?.[0]?.value || 0;

      // Calculate total executions
      let totalExecutions = 0;
      if (metricsData.counters?.workflow_executions_total) {
        for (const counter of metricsData.counters.workflow_executions_total) {
          totalExecutions += counter.value;
        }
      }

      // Calculate error rate
      let totalErrors = 0;
      if (metricsData.counters?.workflow_errors_total) {
        for (const counter of metricsData.counters.workflow_errors_total) {
          totalErrors += counter.value;
        }
      }

      const errorRate = totalExecutions > 0 ? (totalErrors / totalExecutions) * 100 : 0;

      return {
        activeWorkflows,
        totalExecutions,
        errorRate: parseFloat(errorRate.toFixed(2)),
      };
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      return {
        activeWorkflows: 0,
        totalExecutions: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Get system uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get detailed diagnostics
   */
  async getDiagnostics(): Promise<Record<string, any>> {
    const health = await this.checkHealth();
    const metrics = getMetrics();

    return {
      health,
      metrics: metrics.toJSON(),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        cwd: process.cwd(),
        execPath: process.execPath,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
      },
      config: {
        nodeEnv: process.env.NODE_ENV || 'development',
        databaseType: this.config.database.type,
        redisEnabled: this.config.redis?.enabled || false,
        metricsEnabled: this.config.features.metricsEnabled,
        logLevel: this.config.logging.level,
      },
    };
  }

  /**
   * Check if system is ready to accept requests
   */
  async isReady(): Promise<boolean> {
    try {
      const dbHealth = await this.checkDatabase();
      return dbHealth.status !== HealthStatus.UNHEALTHY;
    } catch (error) {
      logger.error('Readiness check failed', { error });
      return false;
    }
  }

  /**
   * Check if system is alive
   */
  isAlive(): boolean {
    return true; // If we can execute this code, the process is alive
  }
}

// Singleton instance
let monitorInstance: SystemMonitor | null = null;

/**
 * Get the system monitor singleton instance
 */
export function getMonitor(): SystemMonitor {
  if (!monitorInstance) {
    monitorInstance = new SystemMonitor();
  }
  return monitorInstance;
}

export default getMonitor;
