/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Observability and monitoring API routes
 */

import { Router, Request, Response } from 'express';
import { getTracer, getMetrics, getMonitor } from '@/observability';
import logger from '@/utils/logger';
import { getConfig } from '@/utils/config';

const router = Router();
const config = getConfig();

/**
 * GET /api/observability/metrics
 * Get metrics in Prometheus format
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // Check if metrics are enabled
    if (!config.features.metricsEnabled) {
      return res.status(403).json({
        error: 'Metrics disabled',
        message: 'Metrics collection is disabled in configuration',
      });
    }

    const metrics = getMetrics();
    const prometheusFormat = metrics.toPrometheus();

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusFormat);
  } catch (error: any) {
    logger.error('Failed to get metrics', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics',
    });
  }
});

/**
 * GET /api/observability/metrics/json
 * Get metrics in JSON format
 */
router.get('/metrics/json', async (req: Request, res: Response) => {
  try {
    if (!config.features.metricsEnabled) {
      return res.status(403).json({
        error: 'Metrics disabled',
        message: 'Metrics collection is disabled in configuration',
      });
    }

    const metrics = getMetrics();
    const jsonFormat = metrics.toJSON();

    res.json(jsonFormat);
  } catch (error: any) {
    logger.error('Failed to get metrics JSON', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics',
    });
  }
});

/**
 * GET /api/observability/health
 * Get system health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const monitor = getMonitor();
    const health = await monitor.checkHealth();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      message: 'Health check failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/observability/ready
 * Readiness probe for orchestration platforms
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const monitor = getMonitor();
    const ready = await monitor.isReady();

    if (ready) {
      res.status(200).json({
        ready: true,
        timestamp: new Date(),
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date(),
      });
    }
  } catch (error: any) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      ready: false,
      timestamp: new Date(),
      error: error.message,
    });
  }
});

/**
 * GET /api/observability/live
 * Liveness probe for orchestration platforms
 */
router.get('/live', (req: Request, res: Response) => {
  const monitor = getMonitor();
  const alive = monitor.isAlive();

  if (alive) {
    res.status(200).json({
      alive: true,
      timestamp: new Date(),
    });
  } else {
    res.status(503).json({
      alive: false,
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/observability/diagnostics
 * Get comprehensive system diagnostics
 */
router.get('/diagnostics', async (req: Request, res: Response) => {
  try {
    const monitor = getMonitor();
    const diagnostics = await monitor.getDiagnostics();

    res.json(diagnostics);
  } catch (error: any) {
    logger.error('Failed to get diagnostics', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve diagnostics',
    });
  }
});

/**
 * GET /api/observability/traces
 * Get all traces
 */
router.get('/traces', (req: Request, res: Response) => {
  try {
    const tracer = getTracer();
    const traces = tracer.getAllTraces();

    res.json({
      count: traces.length,
      traces,
    });
  } catch (error: any) {
    logger.error('Failed to get traces', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve traces',
    });
  }
});

/**
 * GET /api/observability/traces/:traceId
 * Get a specific trace by ID
 */
router.get('/traces/:traceId', (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const tracer = getTracer();
    const trace = tracer.getTrace(traceId);

    if (!trace) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Trace not found: ${traceId}`,
      });
    }

    res.json(trace);
  } catch (error: any) {
    logger.error('Failed to get trace', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve trace',
    });
  }
});

/**
 * GET /api/observability/traces/execution/:executionId
 * Get traces for a specific execution
 */
router.get('/traces/execution/:executionId', (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const tracer = getTracer();
    const traces = tracer.getTracesByExecution(executionId);

    res.json({
      executionId,
      count: traces.length,
      traces,
    });
  } catch (error: any) {
    logger.error('Failed to get execution traces', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve execution traces',
    });
  }
});

/**
 * GET /api/observability/traces/:traceId/export
 * Export a trace as JSON
 */
router.get('/traces/:traceId/export', (req: Request, res: Response) => {
  try {
    const { traceId } = req.params;
    const tracer = getTracer();
    const exportData = tracer.exportTrace(traceId);

    if (!exportData) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Trace not found: ${traceId}`,
      });
    }

    res.set('Content-Type', 'application/json');
    res.set('Content-Disposition', `attachment; filename="trace-${traceId}.json"`);
    res.send(exportData);
  } catch (error: any) {
    logger.error('Failed to export trace', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export trace',
    });
  }
});

/**
 * DELETE /api/observability/traces
 * Clear all traces (admin only)
 */
router.delete('/traces', (req: Request, res: Response) => {
  try {
    // In production, add authentication/authorization middleware here
    const tracer = getTracer();
    tracer.clearTraces();

    res.json({
      message: 'All traces cleared successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error('Failed to clear traces', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear traces',
    });
  }
});

/**
 * POST /api/observability/metrics/reset
 * Reset all metrics (admin only)
 */
router.post('/metrics/reset', (req: Request, res: Response) => {
  try {
    // In production, add authentication/authorization middleware here
    const metrics = getMetrics();
    metrics.reset();

    res.json({
      message: 'All metrics reset successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    logger.error('Failed to reset metrics', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset metrics',
    });
  }
});

export default router;
