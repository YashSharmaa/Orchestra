/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Central export point for all Pinia stores
 */

export { useAuthStore } from './auth';
export { useWorkflowsStore } from './workflows';
export { useExecutionsStore } from './executions';
export { useCanvasStore } from './canvas';

// Re-export types for convenience
export type {
  User,
  UserRole,
  LoginCredentials,
  RegisterData,
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  CreateWorkflowData,
  UpdateWorkflowData,
  Execution,
  ExecutionStatus,
  ExecutionMode,
  StartExecutionData,
  ExecutionStats,
  NodePosition,
  CanvasState,
} from '../types';
