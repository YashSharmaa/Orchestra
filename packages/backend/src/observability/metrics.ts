/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Metrics collection and Prometheus format export
 */

import { IMetric } from '@/types';
import logger from '@/utils/logger';
import pidusage from 'pidusage';

/**
 * Metric types for Prometheus
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Metric definition
 */
interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
}

/**
 * Counter metric
 */
class Counter {
  private value: number = 0;
  private labeledValues: Map<string, number> = new Map();

  increment(labels: Record<string, string> = {}, amount: number = 1): void {
    if (Object.keys(labels).length === 0) {
      this.value += amount;
    } else {
      const key = this.labelsToKey(labels);
      const current = this.labeledValues.get(key) || 0;
      this.labeledValues.set(key, current + amount);
    }
  }

  get(labels: Record<string, string> = {}): number {
    if (Object.keys(labels).length === 0) {
      return this.value;
    }
    const key = this.labelsToKey(labels);
    return this.labeledValues.get(key) || 0;
  }

  getAll(): Array<{ labels: Record<string, string>; value: number }> {
    const results: Array<{ labels: Record<string, string>; value: number }> = [];

    if (this.value > 0) {
      results.push({ labels: {}, value: this.value });
    }

    for (const [key, value] of this.labeledValues.entries()) {
      results.push({ labels: this.keyToLabels(key), value });
    }

    return results;
  }

  reset(): void {
    this.value = 0;
    this.labeledValues.clear();
  }

  private labelsToKey(labels: Record<string, string>): string {
    return JSON.stringify(labels);
  }

  private keyToLabels(key: string): Record<string, string> {
    return JSON.parse(key);
  }
}

/**
 * Gauge metric
 */
class Gauge {
  private value: number = 0;
  private labeledValues: Map<string, number> = new Map();

  set(value: number, labels: Record<string, string> = {}): void {
    if (Object.keys(labels).length === 0) {
      this.value = value;
    } else {
      const key = this.labelsToKey(labels);
      this.labeledValues.set(key, value);
    }
  }

  increment(labels: Record<string, string> = {}, amount: number = 1): void {
    const current = this.get(labels);
    this.set(current + amount, labels);
  }

  decrement(labels: Record<string, string> = {}, amount: number = 1): void {
    const current = this.get(labels);
    this.set(current - amount, labels);
  }

  get(labels: Record<string, string> = {}): number {
    if (Object.keys(labels).length === 0) {
      return this.value;
    }
    const key = this.labelsToKey(labels);
    return this.labeledValues.get(key) || 0;
  }

  getAll(): Array<{ labels: Record<string, string>; value: number }> {
    const results: Array<{ labels: Record<string, string>; value: number }> = [];

    results.push({ labels: {}, value: this.value });

    for (const [key, value] of this.labeledValues.entries()) {
      results.push({ labels: this.keyToLabels(key), value });
    }

    return results;
  }

  reset(): void {
    this.value = 0;
    this.labeledValues.clear();
  }

  private labelsToKey(labels: Record<string, string>): string {
    return JSON.stringify(labels);
  }

  private keyToLabels(key: string): Record<string, string> {
    return JSON.parse(key);
  }
}

/**
 * Histogram metric
 */
class Histogram {
  private buckets: number[];
  private counts: Map<number, number> = new Map();
  private sum: number = 0;
  private count: number = 0;
  private labeledData: Map<string, { counts: Map<number, number>; sum: number; count: number }> =
    new Map();

  constructor(buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    this.buckets = buckets.sort((a, b) => a - b);
    this.buckets.forEach((bucket) => this.counts.set(bucket, 0));
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    if (Object.keys(labels).length === 0) {
      this.sum += value;
      this.count++;

      for (const bucket of this.buckets) {
        if (value <= bucket) {
          this.counts.set(bucket, (this.counts.get(bucket) || 0) + 1);
        }
      }
    } else {
      const key = this.labelsToKey(labels);
      let data = this.labeledData.get(key);
      if (!data) {
        data = {
          counts: new Map(this.buckets.map((b) => [b, 0])),
          sum: 0,
          count: 0,
        };
        this.labeledData.set(key, data);
      }

      data.sum += value;
      data.count++;

      for (const bucket of this.buckets) {
        if (value <= bucket) {
          data.counts.set(bucket, (data.counts.get(bucket) || 0) + 1);
        }
      }
    }
  }

  getAll(): Array<{
    labels: Record<string, string>;
    buckets: Map<number, number>;
    sum: number;
    count: number;
  }> {
    const results: Array<{
      labels: Record<string, string>;
      buckets: Map<number, number>;
      sum: number;
      count: number;
    }> = [];

    results.push({
      labels: {},
      buckets: this.counts,
      sum: this.sum,
      count: this.count,
    });

    for (const [key, data] of this.labeledData.entries()) {
      results.push({
        labels: this.keyToLabels(key),
        buckets: data.counts,
        sum: data.sum,
        count: data.count,
      });
    }

    return results;
  }

  reset(): void {
    this.buckets.forEach((bucket) => this.counts.set(bucket, 0));
    this.sum = 0;
    this.count = 0;
    this.labeledData.clear();
  }

  private labelsToKey(labels: Record<string, string>): string {
    return JSON.stringify(labels);
  }

  private keyToLabels(key: string): Record<string, string> {
    return JSON.parse(key);
  }
}

/**
 * Metrics collector
 */
export class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private startTime: Date = new Date();

  constructor() {
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default Orchestra metrics
   */
  private initializeDefaultMetrics(): void {
    // Workflow metrics
    this.registerCounter('workflow_executions_total', 'Total number of workflow executions', [
      'status',
      'mode',
    ]);
    this.registerCounter('workflow_errors_total', 'Total number of workflow errors', [
      'workflow_id',
      'error_type',
    ]);
    this.registerHistogram(
      'workflow_duration_seconds',
      'Workflow execution duration in seconds',
      ['workflow_id', 'status']
    );
    this.registerGauge('workflow_active', 'Number of currently active workflows');

    // Node metrics
    this.registerCounter('node_executions_total', 'Total number of node executions', [
      'node_type',
      'status',
    ]);
    this.registerCounter('node_errors_total', 'Total number of node errors', [
      'node_type',
      'error_type',
    ]);
    this.registerHistogram('node_duration_seconds', 'Node execution duration in seconds', [
      'node_type',
      'status',
    ]);

    // Agent metrics
    this.registerCounter('agent_executions_total', 'Total number of agent executions', [
      'agent_id',
      'status',
    ]);
    this.registerCounter('agent_messages_total', 'Total number of agent messages', [
      'sender',
      'receiver',
      'performative',
    ]);
    this.registerHistogram('agent_duration_seconds', 'Agent execution duration in seconds', [
      'agent_id',
    ]);

    // LLM metrics
    this.registerCounter('llm_requests_total', 'Total number of LLM requests', [
      'provider',
      'model',
      'status',
    ]);
    this.registerCounter('llm_tokens_total', 'Total number of tokens used', [
      'provider',
      'model',
      'type',
    ]);
    this.registerHistogram('llm_request_duration_seconds', 'LLM request duration in seconds', [
      'provider',
      'model',
    ]);

    // Tool metrics
    this.registerCounter('tool_calls_total', 'Total number of tool calls', [
      'tool_name',
      'status',
    ]);
    this.registerHistogram('tool_duration_seconds', 'Tool execution duration in seconds', [
      'tool_name',
    ]);

    // System metrics
    this.registerGauge('system_memory_usage_bytes', 'System memory usage in bytes');
    this.registerGauge('system_cpu_usage_percent', 'System CPU usage percentage');
    this.registerGauge('database_connections_active', 'Active database connections');
    this.registerGauge('redis_queue_depth', 'Redis queue depth', ['queue_name']);

    // HTTP metrics
    this.registerCounter('http_requests_total', 'Total number of HTTP requests', [
      'method',
      'path',
      'status',
    ]);
    this.registerHistogram('http_request_duration_seconds', 'HTTP request duration in seconds', [
      'method',
      'path',
    ]);

    logger.info('Initialized default metrics');
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, help: string, labels: string[] = []): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter());
      this.definitions.set(name, { name, type: MetricType.COUNTER, help, labels });
    }
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, help: string, labels: string[] = []): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge());
      this.definitions.set(name, { name, type: MetricType.GAUGE, help, labels });
    }
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string, help: string, labels: string[] = [], buckets?: number[]): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram(buckets));
      this.definitions.set(name, { name, type: MetricType.HISTOGRAM, help, labels });
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, amount: number = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.increment(labels, amount);
    } else {
      logger.warn(`Counter not found: ${name}`);
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(value, labels);
    } else {
      logger.warn(`Gauge not found: ${name}`);
    }
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name: string, labels: Record<string, string> = {}, amount: number = 1): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.increment(labels, amount);
    } else {
      logger.warn(`Gauge not found: ${name}`);
    }
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, labels: Record<string, string> = {}, amount: number = 1): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.decrement(labels, amount);
    } else {
      logger.warn(`Gauge not found: ${name}`);
    }
  }

  /**
   * Observe a histogram value
   */
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.observe(value, labels);
    } else {
      logger.warn(`Histogram not found: ${name}`);
    }
  }

  /**
   * Record workflow execution
   */
  recordWorkflowExecution(status: string, mode: string, duration: number, workflowId: string): void {
    this.incrementCounter('workflow_executions_total', { status, mode });
    this.observeHistogram('workflow_duration_seconds', duration / 1000, { workflow_id: workflowId, status });

    if (status === 'error') {
      this.incrementCounter('workflow_errors_total', { workflow_id: workflowId, error_type: 'execution' });
    }
  }

  /**
   * Record node execution
   */
  recordNodeExecution(nodeType: string, status: string, duration: number): void {
    this.incrementCounter('node_executions_total', { node_type: nodeType, status });
    this.observeHistogram('node_duration_seconds', duration / 1000, { node_type: nodeType, status });

    if (status === 'error') {
      this.incrementCounter('node_errors_total', { node_type: nodeType, error_type: 'execution' });
    }
  }

  /**
   * Record agent execution
   */
  recordAgentExecution(agentId: string, status: string, duration: number): void {
    this.incrementCounter('agent_executions_total', { agent_id: agentId, status });
    this.observeHistogram('agent_duration_seconds', duration / 1000, { agent_id: agentId });
  }

  /**
   * Record agent message
   */
  recordAgentMessage(sender: string, receiver: string, performative: string): void {
    this.incrementCounter('agent_messages_total', { sender, receiver, performative });
  }

  /**
   * Record LLM request
   */
  recordLLMRequest(
    provider: string,
    model: string,
    status: string,
    duration: number,
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    }
  ): void {
    this.incrementCounter('llm_requests_total', { provider, model, status });
    this.observeHistogram('llm_request_duration_seconds', duration / 1000, { provider, model });

    if (tokens) {
      this.incrementCounter('llm_tokens_total', { provider, model, type: 'prompt' }, tokens.prompt);
      this.incrementCounter('llm_tokens_total', { provider, model, type: 'completion' }, tokens.completion);
      this.incrementCounter('llm_tokens_total', { provider, model, type: 'total' }, tokens.total);
    }
  }

  /**
   * Record tool call
   */
  recordToolCall(toolName: string, status: string, duration: number): void {
    this.incrementCounter('tool_calls_total', { tool_name: toolName, status });
    this.observeHistogram('tool_duration_seconds', duration / 1000, { tool_name: toolName });
  }

  /**
   * Record HTTP request
   */
  recordHTTPRequest(method: string, path: string, status: number, duration: number): void {
    this.incrementCounter('http_requests_total', {
      method,
      path,
      status: status.toString(),
    });
    this.observeHistogram('http_request_duration_seconds', duration / 1000, { method, path });
  }

  /**
   * Update system metrics
   */
  async updateSystemMetrics(): Promise<void> {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('system_memory_usage_bytes', memUsage.heapUsed);
    this.setGauge('system_memory_rss_bytes', memUsage.rss);
    this.setGauge('system_memory_external_bytes', memUsage.external);

    // CPU usage
    try {
      const stats = await pidusage(process.pid);
      this.setGauge('system_cpu_usage_percent', stats.cpu);
      this.setGauge('system_memory_usage_percent', stats.memory);
    } catch (error) {
      logger.warn('Failed to get CPU usage statistics', { error });
    }
  }

  /**
   * Get all metrics as Prometheus format
   */
  toPrometheus(): string {
    let output = '';

    // Add metadata
    output += `# Orchestra Metrics\n`;
    output += `# Generated at ${new Date().toISOString()}\n\n`;

    // Counters
    for (const [name, counter] of this.counters.entries()) {
      const def = this.definitions.get(name);
      if (def) {
        output += `# HELP ${name} ${def.help}\n`;
        output += `# TYPE ${name} counter\n`;

        const values = counter.getAll();
        for (const { labels, value } of values) {
          const labelStr = this.formatLabels(labels);
          output += `${name}${labelStr} ${value}\n`;
        }
        output += '\n';
      }
    }

    // Gauges
    for (const [name, gauge] of this.gauges.entries()) {
      const def = this.definitions.get(name);
      if (def) {
        output += `# HELP ${name} ${def.help}\n`;
        output += `# TYPE ${name} gauge\n`;

        const values = gauge.getAll();
        for (const { labels, value } of values) {
          const labelStr = this.formatLabels(labels);
          output += `${name}${labelStr} ${value}\n`;
        }
        output += '\n';
      }
    }

    // Histograms
    for (const [name, histogram] of this.histograms.entries()) {
      const def = this.definitions.get(name);
      if (def) {
        output += `# HELP ${name} ${def.help}\n`;
        output += `# TYPE ${name} histogram\n`;

        const values = histogram.getAll();
        for (const { labels, buckets, sum, count } of values) {
          const labelStr = this.formatLabels(labels);

          // Buckets
          for (const [bucket, bucketCount] of buckets.entries()) {
            const bucketLabels = { ...labels, le: bucket.toString() };
            const bucketLabelStr = this.formatLabels(bucketLabels);
            output += `${name}_bucket${bucketLabelStr} ${bucketCount}\n`;
          }

          // +Inf bucket
          const infLabels = { ...labels, le: '+Inf' };
          const infLabelStr = this.formatLabels(infLabels);
          output += `${name}_bucket${infLabelStr} ${count}\n`;

          // Sum and count
          output += `${name}_sum${labelStr} ${sum}\n`;
          output += `${name}_count${labelStr} ${count}\n`;
        }
        output += '\n';
      }
    }

    // Add process metrics
    output += this.getProcessMetrics();

    return output;
  }

  /**
   * Get process metrics
   */
  private getProcessMetrics(): string {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    let output = '# HELP process_uptime_seconds Process uptime in seconds\n';
    output += '# TYPE process_uptime_seconds gauge\n';
    output += `process_uptime_seconds ${uptime}\n\n`;

    output += '# HELP process_memory_heap_bytes Process heap memory usage in bytes\n';
    output += '# TYPE process_memory_heap_bytes gauge\n';
    output += `process_memory_heap_bytes{type="used"} ${memUsage.heapUsed}\n`;
    output += `process_memory_heap_bytes{type="total"} ${memUsage.heapTotal}\n\n`;

    output += '# HELP process_memory_rss_bytes Process resident set size in bytes\n';
    output += '# TYPE process_memory_rss_bytes gauge\n';
    output += `process_memory_rss_bytes ${memUsage.rss}\n\n`;

    return output;
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }

    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `{${labelPairs}}`;
  }

  /**
   * Get metrics as JSON
   */
  toJSON(): Record<string, any> {
    const metrics: Record<string, any> = {
      timestamp: new Date().toISOString(),
      startTime: this.startTime.toISOString(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      counters: {},
      gauges: {},
      histograms: {},
    };

    // Counters
    for (const [name, counter] of this.counters.entries()) {
      metrics.counters[name] = counter.getAll();
    }

    // Gauges
    for (const [name, gauge] of this.gauges.entries()) {
      metrics.gauges[name] = gauge.getAll();
    }

    // Histograms
    for (const [name, histogram] of this.histograms.entries()) {
      metrics.histograms[name] = histogram.getAll().map((h) => ({
        labels: h.labels,
        buckets: Array.from(h.buckets.entries()).map(([bucket, count]) => ({ bucket, count })),
        sum: h.sum,
        count: h.count,
      }));
    }

    return metrics;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const gauge of this.gauges.values()) {
      gauge.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    logger.info('Reset all metrics');
  }
}

// Singleton instance
let metricsInstance: MetricsCollector | null = null;

/**
 * Get the metrics collector singleton instance
 */
export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

export default getMetrics;
