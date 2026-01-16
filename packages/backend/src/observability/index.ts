/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Observability module exports
 */

// Tracer
export { Tracer, getTracer } from './tracer';
export type { default as TracerType } from './tracer';

// Metrics
export {
  MetricsCollector,
  getMetrics,
  MetricType,
} from './metrics';
export type { default as MetricsType } from './metrics';

// Monitor
export {
  SystemMonitor,
  getMonitor,
  HealthStatus,
} from './monitor';
export type {
  ComponentHealth,
  SystemHealth,
} from './monitor';

// Re-export types from main types
export type {
  ITrace,
  ITraceEvent,
  TraceEventType,
  IMetric,
} from '@/types';

/**
 * Initialize all observability features
 */
export function initializeObservability(): {
  tracer: ReturnType<typeof import('./tracer').getTracer>;
  metrics: ReturnType<typeof import('./metrics').getMetrics>;
  monitor: ReturnType<typeof import('./monitor').getMonitor>;
} {
  const { getTracer } = require('./tracer');
  const { getMetrics } = require('./metrics');
  const { getMonitor } = require('./monitor');

  const tracer = getTracer();
  const metrics = getMetrics();
  const monitor = getMonitor();

  return {
    tracer,
    metrics,
    monitor,
  };
}

export default initializeObservability;
