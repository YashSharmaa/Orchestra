/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: WebSocket module exports
 */

// Export WebSocket server
export {
  WebSocketServer,
  getWebSocketServer,
  initializeWebSocketServer,
} from './WebSocketServer';

// Export event types and emitters
export {
  // Event types
  WebSocketEventType,
  IWebSocketEvent,
  WebSocketEvent,

  // Execution events
  IExecutionStartedEvent,
  IExecutionCompletedEvent,
  IExecutionFailedEvent,
  IExecutionProgressEvent,

  // Node events
  INodeStartedEvent,
  INodeCompletedEvent,
  INodeFailedEvent,
  INodeProgressEvent,

  // Other events
  IWorkflowUpdatedEvent,
  ISystemNotificationEvent,

  // Event emitter
  wsEventEmitter,

  // Helper functions
  emitExecutionStarted,
  emitExecutionCompleted,
  emitExecutionFailed,
  emitExecutionProgress,
  emitNodeStarted,
  emitNodeCompleted,
  emitNodeFailed,
  emitNodeProgress,
  emitWorkflowUpdated,
  emitSystemNotification,
} from './events';
