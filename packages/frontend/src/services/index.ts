/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Service exports for Orchestra frontend
 */

// Export API client
export { api, default as apiClient } from './api';
export type {
  ApiResponse,
  ApiError,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Workflow,
  Execution,
  ExecutionStats,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  StartExecutionRequest,
} from './api';

// Export WebSocket client
export { ws, default as wsClient } from './websocket';
export type {
  WebSocketEventType,
  WebSocketEvent,
  WebSocketOptions,
  ExecutionStartedEvent,
  ExecutionCompletedEvent,
  ExecutionFailedEvent,
  ExecutionProgressEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  NodeProgressEvent,
  WorkflowUpdatedEvent,
  SystemNotificationEvent,
  EventCallback,
} from './websocket';
