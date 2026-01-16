/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Execution tracing for workflow and agent execution monitoring
 */

import { ITrace, ITraceEvent, TraceEventType } from '@/types';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * In-memory trace storage with TTL
 */
class TraceStore {
  private traces: Map<string, ITrace> = new Map();
  private readonly maxTraces: number = 1000;
  private readonly ttlMs: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Cleanup old traces periodically
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Store a trace
   */
  set(trace: ITrace): void {
    this.traces.set(trace.traceId, trace);

    // Remove oldest traces if we exceed max
    if (this.traces.size > this.maxTraces) {
      const oldestKey = this.traces.keys().next().value;
      if (oldestKey) {
        this.traces.delete(oldestKey);
      }
    }
  }

  /**
   * Get a trace by ID
   */
  get(traceId: string): ITrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get traces by execution ID
   */
  getByExecutionId(executionId: string): ITrace[] {
    const traces: ITrace[] = [];
    for (const trace of this.traces.values()) {
      if (trace.executionId === executionId) {
        traces.push(trace);
      }
    }
    return traces;
  }

  /**
   * Get all traces
   */
  getAll(): ITrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Cleanup expired traces
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [traceId, trace] of this.traces.entries()) {
      // Check if the latest event is older than TTL
      if (trace.events.length > 0) {
        const latestEvent = trace.events[trace.events.length - 1];
        const eventTime = new Date(latestEvent.timestamp).getTime();
        if (now - eventTime > this.ttlMs) {
          this.traces.delete(traceId);
        }
      }
    }
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces.clear();
  }

  /**
   * Get storage stats
   */
  getStats(): { count: number; maxTraces: number } {
    return {
      count: this.traces.size,
      maxTraces: this.maxTraces,
    };
  }
}

/**
 * Tracer class for recording execution traces
 */
export class Tracer {
  private store: TraceStore;
  private activeTraces: Map<string, ITrace> = new Map();

  constructor() {
    this.store = new TraceStore();
  }

  /**
   * Start a new trace for an execution
   */
  startTrace(executionId: string, metadata: Record<string, any> = {}): string {
    const traceId = uuidv4();
    const trace: ITrace = {
      traceId,
      executionId,
      events: [],
      metadata: {
        ...metadata,
        startTime: new Date().toISOString(),
      },
    };

    this.activeTraces.set(traceId, trace);
    this.store.set(trace);

    logger.debug('Started trace', { traceId, executionId });

    return traceId;
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.metadata.endTime = new Date().toISOString();
      trace.metadata.duration = this.calculateTraceDuration(trace);
      this.store.set(trace);
      this.activeTraces.delete(traceId);

      logger.debug('Ended trace', {
        traceId,
        duration: trace.metadata.duration,
        eventCount: trace.events.length,
      });
    }
  }

  /**
   * Record a trace event
   */
  recordEvent(
    traceId: string,
    type: TraceEventType,
    data: Record<string, any>,
    options: {
      nodeId?: string;
      agentId?: string;
      duration?: number;
    } = {}
  ): ITraceEvent {
    const trace = this.activeTraces.get(traceId) || this.store.get(traceId);

    if (!trace) {
      logger.warn('Attempted to record event for non-existent trace', { traceId });
      throw new Error(`Trace not found: ${traceId}`);
    }

    const event: ITraceEvent = {
      eventId: uuidv4(),
      traceId,
      timestamp: new Date(),
      type,
      data,
      ...options,
    };

    trace.events.push(event);
    this.store.set(trace);

    logger.debug('Recorded trace event', {
      traceId,
      eventType: type,
      nodeId: options.nodeId,
      agentId: options.agentId,
    });

    return event;
  }

  /**
   * Record workflow start event
   */
  recordWorkflowStart(
    traceId: string,
    workflowId: string,
    workflowName: string,
    mode: string
  ): ITraceEvent {
    return this.recordEvent(traceId, 'workflow.start', {
      workflowId,
      workflowName,
      mode,
    });
  }

  /**
   * Record workflow end event
   */
  recordWorkflowEnd(
    traceId: string,
    workflowId: string,
    status: string,
    duration: number
  ): ITraceEvent {
    return this.recordEvent(traceId, 'workflow.end', {
      workflowId,
      status,
      duration,
    });
  }

  /**
   * Record node start event
   */
  recordNodeStart(
    traceId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'node.start',
      {
        nodeName,
        nodeType,
      },
      { nodeId }
    );
  }

  /**
   * Record node end event
   */
  recordNodeEnd(
    traceId: string,
    nodeId: string,
    duration: number,
    status: 'success' | 'error'
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'node.end',
      {
        status,
      },
      { nodeId, duration }
    );
  }

  /**
   * Record node error event
   */
  recordNodeError(
    traceId: string,
    nodeId: string,
    error: Error,
    duration?: number
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'node.error',
      {
        error: error.message,
        stack: error.stack,
        name: error.name,
      },
      { nodeId, duration }
    );
  }

  /**
   * Record agent start event
   */
  recordAgentStart(
    traceId: string,
    agentId: string,
    agentName: string,
    agentRole: string
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'agent.start',
      {
        agentName,
        agentRole,
      },
      { agentId }
    );
  }

  /**
   * Record agent end event
   */
  recordAgentEnd(traceId: string, agentId: string, duration: number): ITraceEvent {
    return this.recordEvent(traceId, 'agent.end', {}, { agentId, duration });
  }

  /**
   * Record agent message event
   */
  recordAgentMessage(
    traceId: string,
    agentId: string,
    message: {
      sender: string;
      receiver: string;
      performative: string;
      content: string;
    }
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'agent.message',
      {
        sender: message.sender,
        receiver: message.receiver,
        performative: message.performative,
        contentLength: message.content.length,
        contentPreview: message.content.substring(0, 100),
      },
      { agentId }
    );
  }

  /**
   * Record tool call event
   */
  recordToolCall(
    traceId: string,
    agentId: string,
    toolName: string,
    parameters: Record<string, any>
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'tool.call',
      {
        toolName,
        parameters,
      },
      { agentId }
    );
  }

  /**
   * Record tool result event
   */
  recordToolResult(
    traceId: string,
    agentId: string,
    toolName: string,
    result: any,
    duration: number
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'tool.result',
      {
        toolName,
        result,
      },
      { agentId, duration }
    );
  }

  /**
   * Record LLM request event
   */
  recordLLMRequest(
    traceId: string,
    agentId: string,
    model: string,
    provider: string,
    prompt: string,
    options: Record<string, any>
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'llm.request',
      {
        model,
        provider,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 200),
        options,
      },
      { agentId }
    );
  }

  /**
   * Record LLM response event
   */
  recordLLMResponse(
    traceId: string,
    agentId: string,
    response: string,
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
    duration: number
  ): ITraceEvent {
    return this.recordEvent(
      traceId,
      'llm.response',
      {
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
        usage,
      },
      { agentId, duration }
    );
  }

  /**
   * Get a trace by ID
   */
  getTrace(traceId: string): ITrace | undefined {
    return this.store.get(traceId);
  }

  /**
   * Get traces by execution ID
   */
  getTracesByExecution(executionId: string): ITrace[] {
    return this.store.getByExecutionId(executionId);
  }

  /**
   * Get all traces
   */
  getAllTraces(): ITrace[] {
    return this.store.getAll();
  }

  /**
   * Get trace statistics
   */
  getStats(): { count: number; maxTraces: number } {
    return this.store.getStats();
  }

  /**
   * Clear all traces
   */
  clearTraces(): void {
    this.store.clear();
    this.activeTraces.clear();
    logger.info('Cleared all traces');
  }

  /**
   * Calculate total trace duration
   */
  private calculateTraceDuration(trace: ITrace): number {
    if (trace.events.length === 0) return 0;

    const firstEvent = trace.events[0];
    const lastEvent = trace.events[trace.events.length - 1];

    return (
      new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime()
    );
  }

  /**
   * Export trace as JSON
   */
  exportTrace(traceId: string): string | null {
    const trace = this.store.get(traceId);
    if (!trace) return null;

    return JSON.stringify(trace, null, 2);
  }

  /**
   * Export all traces as JSON
   */
  exportAllTraces(): string {
    const traces = this.store.getAll();
    return JSON.stringify(traces, null, 2);
  }
}

// Singleton instance
let tracerInstance: Tracer | null = null;

/**
 * Get the tracer singleton instance
 */
export function getTracer(): Tracer {
  if (!tracerInstance) {
    tracerInstance = new Tracer();
  }
  return tracerInstance;
}

export default getTracer;
