/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: WebSocket client for real-time execution updates
 */

import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
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

export interface WebSocketEvent {
  type: WebSocketEventType;
  timestamp: string;
  data: any;
}

export interface ExecutionStartedEvent {
  executionId: string;
  workflowId: string;
  startTime: string;
  mode: string;
}

export interface ExecutionCompletedEvent {
  executionId: string;
  workflowId: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
}

export interface ExecutionFailedEvent {
  executionId: string;
  workflowId: string;
  error: {
    message: string;
    stack?: string;
    node?: string;
  };
  startTime: string;
  endTime: string;
}

export interface ExecutionProgressEvent {
  executionId: string;
  workflowId: string;
  status: string;
  completedNodes: number;
  totalNodes: number;
  currentNode?: string;
}

export interface NodeStartedEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startTime: string;
}

export interface NodeCompletedEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startTime: string;
  endTime: string;
  duration: number;
  outputItemsCount?: number;
}

export interface NodeFailedEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  error: {
    message: string;
    stack?: string;
  };
  startTime: string;
  endTime: string;
}

export interface NodeProgressEvent {
  executionId: string;
  nodeId: string;
  nodeName: string;
  progress: number;
  message?: string;
}

export interface WorkflowUpdatedEvent {
  workflowId: string;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export interface SystemNotificationEvent {
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: any;
}

export type EventCallback<T = any> = (data: T) => void;

export interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
}

// ============================================================================
// WebSocket Client Class
// ============================================================================

class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private token: string | null = null;
  private connected: boolean = false;
  private subscriptions: Map<string, Set<string>> = new Map();
  private eventHandlers: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private options: Required<WebSocketOptions>;

  constructor(options: WebSocketOptions = {}) {
    this.url = options.url || import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    this.options = {
      url: this.url,
      autoConnect: options.autoConnect !== undefined ? options.autoConnect : false,
      reconnection: options.reconnection !== undefined ? options.reconnection : true,
      reconnectionAttempts: options.reconnectionAttempts || 5,
      reconnectionDelay: options.reconnectionDelay || 1000,
      reconnectionDelayMax: options.reconnectionDelayMax || 5000,
    };

    // Load token from localStorage if available
    this.loadToken();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  private loadToken(): void {
    const token = localStorage.getItem('orchestra_token');
    if (token) {
      this.token = token;
    }
  }

  connect(token?: string): void {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      console.warn('WebSocket: No token provided, connection may fail');
    }

    if (this.socket?.connected) {
      console.log('WebSocket: Already connected');
      return;
    }

    this.socket = io(this.url, {
      auth: {
        token: this.token,
      },
      reconnection: this.options.reconnection,
      reconnectionAttempts: this.options.reconnectionAttempts,
      reconnectionDelay: this.options.reconnectionDelay,
      reconnectionDelayMax: this.options.reconnectionDelayMax,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.subscriptions.clear();
    }
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // ============================================================================
  // Event Handlers Setup
  // ============================================================================

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket: Connected');
      this.connected = true;
      this.emit('connected', {});

      // Resubscribe to all previous subscriptions
      this.resubscribeAll();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket: Disconnected', reason);
      this.connected = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket: Connection error', error);
      this.emit('error', { error: error.message });
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('WebSocket: Reconnected after', attemptNumber, 'attempts');
      this.emit('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('WebSocket: Reconnection attempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket: Reconnection failed');
      this.emit('reconnect_failed', {});
    });

    // Execution events
    this.socket.on('execution:started', (data: ExecutionStartedEvent) => {
      this.emit('execution:started', data);
    });

    this.socket.on('execution:completed', (data: ExecutionCompletedEvent) => {
      this.emit('execution:completed', data);
    });

    this.socket.on('execution:failed', (data: ExecutionFailedEvent) => {
      this.emit('execution:failed', data);
    });

    this.socket.on('execution:progress', (data: ExecutionProgressEvent) => {
      this.emit('execution:progress', data);
    });

    // Node events
    this.socket.on('node:started', (data: NodeStartedEvent) => {
      this.emit('node:started', data);
    });

    this.socket.on('node:completed', (data: NodeCompletedEvent) => {
      this.emit('node:completed', data);
    });

    this.socket.on('node:failed', (data: NodeFailedEvent) => {
      this.emit('node:failed', data);
    });

    this.socket.on('node:progress', (data: NodeProgressEvent) => {
      this.emit('node:progress', data);
    });

    // Workflow events
    this.socket.on('workflow:updated', (data: WorkflowUpdatedEvent) => {
      this.emit('workflow:updated', data);
    });

    // System events
    this.socket.on('system:notification', (data: SystemNotificationEvent) => {
      this.emit('system:notification', data);
    });
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  subscribeToExecution(executionId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket: Cannot subscribe, not connected');
      return;
    }

    this.socket.emit('subscribe:execution', { executionId });

    // Track subscription
    if (!this.subscriptions.has('execution')) {
      this.subscriptions.set('execution', new Set());
    }
    this.subscriptions.get('execution')!.add(executionId);

    console.log('WebSocket: Subscribed to execution', executionId);
  }

  unsubscribeFromExecution(executionId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket: Cannot unsubscribe, not connected');
      return;
    }

    this.socket.emit('unsubscribe:execution', { executionId });

    // Remove from tracking
    const execSubs = this.subscriptions.get('execution');
    if (execSubs) {
      execSubs.delete(executionId);
    }

    console.log('WebSocket: Unsubscribed from execution', executionId);
  }

  subscribeToWorkflow(workflowId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket: Cannot subscribe, not connected');
      return;
    }

    this.socket.emit('subscribe:workflow', { workflowId });

    // Track subscription
    if (!this.subscriptions.has('workflow')) {
      this.subscriptions.set('workflow', new Set());
    }
    this.subscriptions.get('workflow')!.add(workflowId);

    console.log('WebSocket: Subscribed to workflow', workflowId);
  }

  unsubscribeFromWorkflow(workflowId: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket: Cannot unsubscribe, not connected');
      return;
    }

    this.socket.emit('unsubscribe:workflow', { workflowId });

    // Remove from tracking
    const wfSubs = this.subscriptions.get('workflow');
    if (wfSubs) {
      wfSubs.delete(workflowId);
    }

    console.log('WebSocket: Unsubscribed from workflow', workflowId);
  }

  private resubscribeAll(): void {
    // Resubscribe to all executions
    const execSubs = this.subscriptions.get('execution');
    if (execSubs) {
      execSubs.forEach((executionId) => {
        this.socket?.emit('subscribe:execution', { executionId });
      });
    }

    // Resubscribe to all workflows
    const wfSubs = this.subscriptions.get('workflow');
    if (wfSubs) {
      wfSubs.forEach((workflowId) => {
        this.socket?.emit('subscribe:workflow', { workflowId });
      });
    }
  }

  // ============================================================================
  // Event Emitter Pattern
  // ============================================================================

  on(event: WebSocketEventType | 'connected' | 'disconnected' | 'error' | 'reconnected' | 'reconnect_failed', callback: EventCallback): void {
    if (!this.eventHandlers.has(event as WebSocketEventType)) {
      this.eventHandlers.set(event as WebSocketEventType, new Set());
    }
    this.eventHandlers.get(event as WebSocketEventType)!.add(callback);
  }

  off(event: WebSocketEventType | 'connected' | 'disconnected' | 'error' | 'reconnected' | 'reconnect_failed', callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event as WebSocketEventType);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  once(event: WebSocketEventType | 'connected' | 'disconnected' | 'error' | 'reconnected' | 'reconnect_failed', callback: EventCallback): void {
    const wrappedCallback = (data: any) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event as WebSocketEventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`WebSocket: Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.eventHandlers.clear();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  setToken(token: string): void {
    this.token = token;
    if (this.connected) {
      // Reconnect with new token
      this.reconnect();
    }
  }

  clearToken(): void {
    this.token = null;
    this.disconnect();
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getSubscriptions(): Map<string, Set<string>> {
    return new Map(this.subscriptions);
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const ws = new WebSocketClient();
export default ws;
