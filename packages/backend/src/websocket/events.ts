/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: WebSocket event types and emitters for real-time updates
 */

import { ExecutionStatus } from '@/types';
import { log } from '@/utils/logger';

// ============================================================================
// Event Types
// ============================================================================

export type WebSocketEventType =
  | 'execution:started'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:progress'
  | 'node:started'
  | 'node:completed'
  | 'node:failed'
  | 'node:progress'
  | 'workflow:updated'
  | 'system:notification';

export interface IWebSocketEvent {
  type: WebSocketEventType;
  timestamp: Date;
  data: any;
}

// ============================================================================
// Execution Events
// ============================================================================

export interface IExecutionStartedEvent extends IWebSocketEvent {
  type: 'execution:started';
  data: {
    executionId: string;
    workflowId: string;
    startTime: Date;
    mode: string;
  };
}

export interface IExecutionCompletedEvent extends IWebSocketEvent {
  type: 'execution:completed';
  data: {
    executionId: string;
    workflowId: string;
    status: ExecutionStatus;
    startTime: Date;
    endTime: Date;
    duration: number;
  };
}

export interface IExecutionFailedEvent extends IWebSocketEvent {
  type: 'execution:failed';
  data: {
    executionId: string;
    workflowId: string;
    error: {
      message: string;
      stack?: string;
      node?: string;
    };
    startTime: Date;
    endTime: Date;
  };
}

export interface IExecutionProgressEvent extends IWebSocketEvent {
  type: 'execution:progress';
  data: {
    executionId: string;
    workflowId: string;
    status: ExecutionStatus;
    completedNodes: number;
    totalNodes: number;
    currentNode?: string;
  };
}

// ============================================================================
// Node Events
// ============================================================================

export interface INodeStartedEvent extends IWebSocketEvent {
  type: 'node:started';
  data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    startTime: Date;
  };
}

export interface INodeCompletedEvent extends IWebSocketEvent {
  type: 'node:completed';
  data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    outputItemsCount?: number;
  };
}

export interface INodeFailedEvent extends IWebSocketEvent {
  type: 'node:failed';
  data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    error: {
      message: string;
      stack?: string;
    };
    startTime: Date;
    endTime: Date;
  };
}

export interface INodeProgressEvent extends IWebSocketEvent {
  type: 'node:progress';
  data: {
    executionId: string;
    nodeId: string;
    nodeName: string;
    progress: number; // 0-100
    message?: string;
  };
}

// ============================================================================
// Other Events
// ============================================================================

export interface IWorkflowUpdatedEvent extends IWebSocketEvent {
  type: 'workflow:updated';
  data: {
    workflowId: string;
    version: number;
    updatedBy: string;
    updatedAt: Date;
  };
}

export interface ISystemNotificationEvent extends IWebSocketEvent {
  type: 'system:notification';
  data: {
    level: 'info' | 'warning' | 'error';
    message: string;
    details?: any;
  };
}

// ============================================================================
// Event Union Type
// ============================================================================

export type WebSocketEvent =
  | IExecutionStartedEvent
  | IExecutionCompletedEvent
  | IExecutionFailedEvent
  | IExecutionProgressEvent
  | INodeStartedEvent
  | INodeCompletedEvent
  | INodeFailedEvent
  | INodeProgressEvent
  | IWorkflowUpdatedEvent
  | ISystemNotificationEvent;

// ============================================================================
// Event Emitter Class
// ============================================================================

/**
 * Event emitter for WebSocket events
 * This is used to emit events that will be broadcast to connected clients
 */
class WebSocketEventEmitter {
  private listeners: Map<WebSocketEventType, Set<(event: WebSocketEvent) => void>> = new Map();

  /**
   * Register a listener for a specific event type
   */
  on(eventType: WebSocketEventType, listener: (event: WebSocketEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Register a listener for all event types
   */
  onAny(listener: (event: WebSocketEvent) => void): void {
    const allTypes: WebSocketEventType[] = [
      'execution:started',
      'execution:completed',
      'execution:failed',
      'execution:progress',
      'node:started',
      'node:completed',
      'node:failed',
      'node:progress',
      'workflow:updated',
      'system:notification',
    ];

    allTypes.forEach((type) => this.on(type, listener));
  }

  /**
   * Remove a listener for a specific event type
   */
  off(eventType: WebSocketEventType, listener: (event: WebSocketEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  emit(event: WebSocketEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          log.error(`Error in WebSocket event listener for ${event.type}`, { error });
        }
      });
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event type
   */
  listenerCount(eventType: WebSocketEventType): number {
    return this.listeners.get(eventType)?.size || 0;
  }
}

// ============================================================================
// Global Event Emitter Instance
// ============================================================================

export const wsEventEmitter = new WebSocketEventEmitter();

// ============================================================================
// Helper Functions to Emit Events
// ============================================================================

/**
 * Emit execution started event
 */
export function emitExecutionStarted(data: IExecutionStartedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'execution:started',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit execution completed event
 */
export function emitExecutionCompleted(data: IExecutionCompletedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'execution:completed',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit execution failed event
 */
export function emitExecutionFailed(data: IExecutionFailedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'execution:failed',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit execution progress event
 */
export function emitExecutionProgress(data: IExecutionProgressEvent['data']): void {
  wsEventEmitter.emit({
    type: 'execution:progress',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit node started event
 */
export function emitNodeStarted(data: INodeStartedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'node:started',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit node completed event
 */
export function emitNodeCompleted(data: INodeCompletedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'node:completed',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit node failed event
 */
export function emitNodeFailed(data: INodeFailedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'node:failed',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit node progress event
 */
export function emitNodeProgress(data: INodeProgressEvent['data']): void {
  wsEventEmitter.emit({
    type: 'node:progress',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit workflow updated event
 */
export function emitWorkflowUpdated(data: IWorkflowUpdatedEvent['data']): void {
  wsEventEmitter.emit({
    type: 'workflow:updated',
    timestamp: new Date(),
    data,
  });
}

/**
 * Emit system notification event
 */
export function emitSystemNotification(data: ISystemNotificationEvent['data']): void {
  wsEventEmitter.emit({
    type: 'system:notification',
    timestamp: new Date(),
    data,
  });
}
