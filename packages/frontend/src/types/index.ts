/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: TypeScript type definitions for Orchestra frontend
 */

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = 'admin' | 'editor' | 'viewer' | 'developer';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  teamId?: string;
  settings?: Record<string, any>;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings?: WorkflowSettings;
  ownerId: string;
  teamId?: string;
  tags?: string[];
  isPublic: boolean;
  isTemplate: boolean;
  templateCategory?: string;
  verified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: NodePosition;
  disabled?: boolean;
  notes?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  waitBetweenRetries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

export interface WorkflowSettings {
  errorWorkflow?: string;
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: 'workflowsFromSameOwner' | 'workflowsFromAList' | 'any';
  executionTimeout?: number;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
}

// ============================================================================
// Execution Types
// ============================================================================

export type ExecutionMode = 'manual' | 'trigger' | 'webhook' | 'scheduled' | 'internal';

export type ExecutionStatus =
  | 'new'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'canceled'
  | 'crashed';

export interface Execution {
  id: string;
  workflowId: string;
  mode: ExecutionMode;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  error?: ExecutionError;
  data: ExecutionData;
  userId?: string;
  parentExecutionId?: string;
  retryCount: number;
  createdAt: Date;
}

export interface ExecutionError {
  message: string;
  stack?: string;
  name?: string;
  node?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ExecutionData {
  startData?: RunData;
  resultData?: RunData;
  executionData?: ExecutionNodeData;
}

export interface RunData {
  [nodeId: string]: NodeExecutionData[];
}

export interface NodeExecutionData {
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  source: string[];
  data: NodeData;
  error?: ExecutionError;
  metadata?: Record<string, any>;
}

export interface NodeData {
  main: NodeDataItem[][];
}

export interface NodeDataItem {
  json: Record<string, any>;
  binary?: Record<string, BinaryData>;
  pairedItem?: {
    item: number;
    input?: number;
  } | {
    item: number;
    input?: number;
  }[];
}

export interface BinaryData {
  data: string;
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: string;
}

export interface ExecutionNodeData {
  contextData: Record<string, any>;
  nodeExecutionStack: any[];
  waitingExecution: Record<string, any>;
  waitingExecutionSource: Record<string, any>;
}

export interface StartExecutionData {
  workflowId: string;
  mode?: ExecutionMode;
  startNodes?: string[];
  data?: Record<string, any>;
}

export interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  running: number;
  avgDuration?: number;
}

// ============================================================================
// Canvas Types
// ============================================================================

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface NodeSelection {
  nodeId: string;
  selected: boolean;
}

export interface ConnectionDraft {
  source: string;
  sourceOutput: string;
  target?: string;
  targetInput?: string;
}

// ============================================================================
// WebSocket Event Types
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
  timestamp: Date;
  data: any;
}

export interface ExecutionStartedEvent extends WebSocketEvent {
  type: 'execution:started';
  data: {
    executionId: string;
    workflowId: string;
    startTime: Date;
    mode: string;
  };
}

export interface ExecutionCompletedEvent extends WebSocketEvent {
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

export interface ExecutionFailedEvent extends WebSocketEvent {
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

export interface ExecutionProgressEvent extends WebSocketEvent {
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
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface WorkflowQueryParams {
  search?: string;
  tags?: string[];
  isTemplate?: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExecutionQueryParams {
  workflowId?: string;
  status?: ExecutionStatus;
  mode?: ExecutionMode;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
