/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Core type definitions for Orchestra platform
 */

// ============================================================================
// Workflow Types
// ============================================================================

export interface IWorkflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: INode[];
  connections: IConnection[];
  settings?: IWorkflowSettings;
  metadata: IWorkflowMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface INode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: INodePosition;
  disabled?: boolean;
  notes?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  waitBetweenRetries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
}

export interface INodePosition {
  x: number;
  y: number;
}

export interface IConnection {
  id: string;
  source: string; // source node id
  sourceOutput: string; // output port name
  target: string; // target node id
  targetInput: string; // input port name
}

export interface IWorkflowSettings {
  errorWorkflow?: string;
  timezone?: string;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: 'workflowsFromSameOwner' | 'workflowsFromAList' | 'any';
  executionTimeout?: number;
}

export interface IWorkflowMetadata {
  ownerId: string;
  teamId?: string;
  tags?: string[];
  isPublic?: boolean;
  isTemplate?: boolean;
  templateCategory?: string;
  verified?: boolean;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface IExecution {
  id: string;
  workflowId: string;
  mode: ExecutionMode;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  error?: IExecutionError;
  data: IExecutionData;
  metadata?: IExecutionMetadata;
}

export type ExecutionMode = 'manual' | 'trigger' | 'webhook' | 'scheduled' | 'internal';

export type ExecutionStatus =
  | 'new'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'canceled'
  | 'crashed';

export interface IExecutionData {
  startData?: IRunData;
  resultData?: IRunData;
  executionData?: IExecutionNodeData;
}

export interface IRunData {
  [nodeId: string]: INodeExecutionData[];
}

export interface INodeExecutionData {
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  source: string[];
  data: INodeData;
  error?: IExecutionError;
  metadata?: Record<string, any>;
}

export interface INodeData {
  main: INodeDataItem[][];
}

export interface INodeDataItem {
  json: Record<string, any>;
  binary?: Record<string, IBinaryData>;
  pairedItem?: {
    item: number;
    input?: number;
  } | {
    item: number;
    input?: number;
  }[];
}

export interface IBinaryData {
  data: string;
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: string;
}

export interface IExecutionNodeData {
  contextData: Record<string, any>;
  nodeExecutionStack: IExecutionNode[];
  waitingExecution: Record<string, any>;
  waitingExecutionSource: Record<string, any>;
}

export interface IExecutionNode {
  node: INode;
  data: INodeData;
  source: ISourceData | null;
}

export interface ISourceData {
  previousNode: string;
  previousNodeOutput?: number;
  previousNodeRun?: number;
}

export interface IExecutionError {
  message: string;
  stack?: string;
  name?: string;
  node?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface IExecutionMetadata {
  userId?: string;
  triggeredBy?: string;
  parentExecutionId?: string;
  retryOf?: string;
  retryCount?: number;
}

// ============================================================================
// Node Type Definitions
// ============================================================================

export interface INodeType {
  description: INodeTypeDescription;
  execute(context: INodeExecutionContext): Promise<INodeData>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: NodeGroup[];
  version: number;
  description: string;
  defaults: {
    name: string;
    color?: string;
  };
  inputs: string[];
  outputs: string[];
  credentials?: INodeCredentialDescription[];
  properties: INodeProperties[];
  webhooks?: IWebhookDescription[];
}

export type NodeGroup =
  | 'trigger'
  | 'action'
  | 'transform'
  | 'logic'
  | 'ai'
  | 'database'
  | 'integration'
  | 'notification';

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyType;
  default: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: INodePropertyOptions[];
  displayOptions?: IDisplayOptions;
  typeOptions?: INodePropertyTypeOptions;
}

export type NodePropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'collection'
  | 'fixedCollection'
  | 'json'
  | 'dateTime'
  | 'color'
  | 'notice'
  | 'hidden';

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface IDisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

export interface INodePropertyTypeOptions {
  rows?: number;
  password?: boolean;
  alwaysOpenEditWindow?: boolean;
  loadOptionsMethod?: string;
  maxValue?: number;
  minValue?: number;
  numberPrecision?: number;
  multipleValues?: boolean;
  multipleValueButtonText?: string;
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string | string[];
  responseMode?: 'onReceived' | 'lastNode';
  path: string;
}

export interface INodeExecutionContext {
  node: INode;
  workflow: IWorkflow;
  inputData: INodeData;
  executionId: string;
  mode: ExecutionMode;
  credentials?: Record<string, any>;
  helpers: INodeHelpers;
}

export interface INodeHelpers {
  request(options: any): Promise<any>;
  requestWithAuthentication(credentialType: string, options: any): Promise<any>;
  returnJsonArray(data: any[]): INodeDataItem[];
}

// ============================================================================
// Agent & AI Types
// ============================================================================

export interface IAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: IModelConfig;
  tools: ITool[];
  memory: IAgentMemory;
  settings: IAgentSettings;
}

export interface IModelConfig {
  provider: 'azure-openai' | 'openai' | 'anthropic' | 'local';
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ITool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export interface IAgentMemory {
  shortTerm: IMessage[];
  longTerm?: IMemoryEntry[];
  blackboard?: Record<string, any>;
}

export interface IMessage {
  id: string;
  conversationId: string;
  sender: string;
  receiver: string;
  performative: MessagePerformative;
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export type MessagePerformative =
  | 'request'
  | 'inform'
  | 'question'
  | 'command'
  | 'result'
  | 'error'
  | 'ack'
  | 'propose'
  | 'accept'
  | 'reject';

export interface IMemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: Date;
  ttl?: Date;
}

export interface IAgentSettings {
  maxIterations?: number;
  timeout?: number;
  mode?: 'function-calling' | 'react';
  allowedDomains?: string[];
  maxToolCalls?: number;
}

export interface IAgentGroup {
  id: string;
  name: string;
  coordinator: IAgent;
  members: IAgent[];
  sharedMemory: Record<string, any>;
}

export interface ISystem1 {
  id: string;
  name: string;
  coordinator: IAgent;
  agentGroups: IAgentGroup[];
  sharedMemory: Record<string, any>;
}

export interface ISystem2 {
  id: string;
  name: string;
  coordinator: IAgent;
  system1Units: ISystem1[];
  sharedMemory: Record<string, any>;
}

export interface ISystem3 {
  id: string;
  name: string;
  orchestrator: IAgent;
  system2Units: ISystem2[];
  globalMemory: Record<string, any>;
}

// ============================================================================
// Authentication & Authorization Types
// ============================================================================

export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  teamId?: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'developer';

export interface ICredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  ownerId: string;
  teamId?: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPermission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'execute';
  granted: boolean;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface IMarketplaceListing {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  authorId: string;
  teamId?: string;
  visibility: 'private' | 'team' | 'organization' | 'public';
  verified: boolean;
  downloads: number;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Observability Types
// ============================================================================

export interface ITrace {
  traceId: string;
  executionId: string;
  events: ITraceEvent[];
  metadata: Record<string, any>;
}

export interface ITraceEvent {
  eventId: string;
  traceId: string;
  timestamp: Date;
  type: TraceEventType;
  nodeId?: string;
  agentId?: string;
  data: Record<string, any>;
  duration?: number;
}

export type TraceEventType =
  | 'workflow.start'
  | 'workflow.end'
  | 'node.start'
  | 'node.end'
  | 'node.error'
  | 'agent.start'
  | 'agent.end'
  | 'agent.message'
  | 'tool.call'
  | 'tool.result'
  | 'llm.request'
  | 'llm.response';

export interface IMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface IConfig {
  server: IServerConfig;
  database: IDatabaseConfig;
  redis?: IRedisConfig;
  auth: IAuthConfig;
  ai: IAIConfig;
  logging: ILoggingConfig;
  execution: IExecutionConfig;
  features: IFeatureFlags;
}

export interface IServerConfig {
  port: number;
  host: string;
  corsOrigin: string | string[];
  corsCredentials: boolean;
}

export interface IDatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite' | 'mssql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  synchronize: boolean;
  logging: boolean;
}

export interface IRedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface IAuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  encryptionKey: string;
  ssoEnabled: boolean;
  ssoType?: 'saml' | 'oidc';
  disableAuth?: boolean;
}

export interface IAIConfig {
  azureOpenAI?: {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    deployment: string;
    embeddingDeployment: string;
    apiVersion: string;
  };
  openAI?: {
    enabled: boolean;
    apiKey: string;
    model: string;
  };
  vectorStore?: {
    enabled: boolean;
    type: string;
    url: string;
    apiKey?: string;
  };
}

export interface ILoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  fileEnabled: boolean;
  filePath?: string;
  retentionDays: number;
}

export interface IExecutionConfig {
  maxConcurrentWorkflows: number;
  workflowTimeout: number;
  nodeTimeout: number;
  maxRetries: number;
  enableCheckpoints: boolean;
}

export interface IFeatureFlags {
  marketplace: boolean;
  publicMarketplace: boolean;
  evaluation: boolean;
  redTeamTesting: boolean;
  agentMemory: boolean;
  metricsEnabled: boolean;
}
