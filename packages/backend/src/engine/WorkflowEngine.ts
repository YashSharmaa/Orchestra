/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Main workflow execution engine
 */

import {
  IWorkflow,
  INode,
  IConnection,
  ExecutionMode,
  ExecutionStatus,
  INodeData,
  IExecutionData,
  IExecutionError,
} from '@/types';
import { ExecutionRepository } from '@/database/repositories/ExecutionRepository';
import { WorkflowRepository } from '@/database/repositories/WorkflowRepository';
import { log } from '@/utils/logger';
import { ExecutionState } from './state/ExecutionState';
import { NodeExecutor } from './executor/NodeExecutor';
import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowEngineOptions {
  executionRepository: ExecutionRepository;
  workflowRepository: WorkflowRepository;
  maxConcurrentExecutions?: number;
  defaultNodeTimeout?: number;
}

export interface ExecutionOptions {
  mode: ExecutionMode;
  startData?: Record<string, any>;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  executionId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  error?: IExecutionError;
  data: IExecutionData;
}

/**
 * Main workflow execution engine
 */
export class WorkflowEngine extends EventEmitter {
  private executionRepository: ExecutionRepository;
  private workflowRepository: WorkflowRepository;
  private maxConcurrentExecutions: number;
  private defaultNodeTimeout: number;
  private activeExecutions: Map<string, ExecutionState>;
  private executionQueue: Array<() => Promise<void>>;

  constructor(options: WorkflowEngineOptions) {
    super();
    this.executionRepository = options.executionRepository;
    this.workflowRepository = options.workflowRepository;
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 10;
    this.defaultNodeTimeout = options.defaultNodeTimeout || 30000;
    this.activeExecutions = new Map();
    this.executionQueue = [];
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();

    try {
      log.info(`Starting workflow execution`, {
        executionId,
        workflowId,
        mode: options.mode,
      });

      // Load workflow
      const workflow = await this.loadWorkflow(workflowId);

      // Create execution record
      const execution = await this.createExecutionRecord(
        executionId,
        workflowId,
        options
      );

      // Create execution state
      const state = new ExecutionState({
        executionId,
        workflowId,
      });

      // Register event handlers
      this.registerStateEventHandlers(state, workflowId);

      // Store active execution
      this.activeExecutions.set(executionId, state);

      // Execute workflow
      const result = await this.executeWorkflowInternal(
        workflow,
        state,
        options
      );

      // Update execution record
      await this.updateExecutionRecord(executionId, result);

      // Remove from active executions
      this.activeExecutions.delete(executionId);

      log.info(`Workflow execution completed`, {
        executionId,
        workflowId,
        status: result.status,
      });

      return result;
    } catch (error: any) {
      log.error(`Workflow execution failed`, {
        executionId,
        workflowId,
        error: error.message,
        stack: error.stack,
      });

      // Update execution record with error
      await this.updateExecutionRecordError(executionId, error);

      // Remove from active executions
      this.activeExecutions.delete(executionId);

      throw error;
    }
  }

  /**
   * Execute workflow internally
   */
  private async executeWorkflowInternal(
    workflow: IWorkflow,
    state: ExecutionState,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const startTime = new Date();

    try {
      // Emit workflow start event
      this.emit('workflow:start', {
        executionId: state['executionId'],
        workflowId: workflow.id,
        mode: options.mode,
      });

      // Update execution status to running
      await this.executionRepository.updateStatus(
        state['executionId'],
        'running'
      );

      // Build execution graph
      const executionGraph = this.buildExecutionGraph(workflow);

      // Initialize all nodes in state
      for (const node of workflow.nodes) {
        state.initializeNode(node.id);
      }

      // Create node executor
      const executor = new NodeExecutor({
        executionId: state['executionId'],
        workflow,
        mode: options.mode,
        defaultTimeout: this.defaultNodeTimeout,
      });

      // Forward executor events
      this.forwardExecutorEvents(executor);

      // Start with trigger nodes or first nodes
      const startNodes = this.getStartNodes(workflow, executionGraph);

      // Create initial input data
      const initialData: INodeData = options.startData
        ? { main: [[{ json: options.startData }]] }
        : { main: [[{ json: {} }]] };

      // Execute nodes in order
      await this.executeNodes(
        startNodes,
        initialData,
        workflow,
        state,
        executor,
        executionGraph
      );

      // Check if any nodes failed
      const failedNodes = state.getFailedNodes();
      const endTime = new Date();

      if (failedNodes.length > 0) {
        // Execution failed
        const firstFailedNode = failedNodes[0];
        const nodeState = state.getNodeState(firstFailedNode);
        const error: IExecutionError = {
          message: nodeState?.error?.message || 'Node execution failed',
          node: firstFailedNode,
          timestamp: new Date(),
          stack: nodeState?.error?.stack,
        };

        this.emit('workflow:error', {
          executionId: state['executionId'],
          workflowId: workflow.id,
          error,
        });

        return {
          executionId: state['executionId'],
          status: 'error',
          startTime,
          endTime,
          error,
          data: {
            resultData: state.getRunData(),
            executionData: state.getExecutionData(),
          },
        };
      }

      // Execution succeeded
      this.emit('workflow:end', {
        executionId: state['executionId'],
        workflowId: workflow.id,
        status: 'success',
      });

      return {
        executionId: state['executionId'],
        status: 'success',
        startTime,
        endTime,
        data: {
          resultData: state.getRunData(),
          executionData: state.getExecutionData(),
        },
      };
    } catch (error: any) {
      const endTime = new Date();
      const executionError: IExecutionError = {
        message: error.message,
        timestamp: new Date(),
        stack: error.stack,
        name: error.name,
      };

      this.emit('workflow:error', {
        executionId: state['executionId'],
        workflowId: workflow.id,
        error: executionError,
      });

      return {
        executionId: state['executionId'],
        status: 'crashed',
        startTime,
        endTime,
        error: executionError,
        data: {
          resultData: state.getRunData(),
          executionData: state.getExecutionData(),
        },
      };
    }
  }

  /**
   * Execute nodes in the workflow
   */
  private async executeNodes(
    nodes: INode[],
    inputData: INodeData,
    workflow: IWorkflow,
    state: ExecutionState,
    executor: NodeExecutor,
    graph: Map<string, INode[]>
  ): Promise<void> {
    // Execute nodes in parallel if they have no dependencies
    const executionPromises: Promise<void>[] = [];

    for (const node of nodes) {
      const promise = this.executeNodeChain(
        node,
        inputData,
        workflow,
        state,
        executor,
        graph
      );
      executionPromises.push(promise);
    }

    // Wait for all parallel executions to complete
    await Promise.all(executionPromises);
  }

  /**
   * Execute a node and its downstream nodes
   */
  private async executeNodeChain(
    node: INode,
    inputData: INodeData,
    workflow: IWorkflow,
    state: ExecutionState,
    executor: NodeExecutor,
    graph: Map<string, INode[]>
  ): Promise<void> {
    // Skip if already completed or failed
    if (state.isNodeCompleted(node.id) || state.isNodeFailed(node.id)) {
      return;
    }

    // Skip if currently running (prevents duplicate execution in parallel branches)
    if (state.isNodeRunning(node.id)) {
      return;
    }

    // Set node to running
    state.setNodeRunning(node.id);

    try {
      // Execute node with retry logic
      const result = await executor.executeWithRetry(node, inputData);

      if (result.success && result.data) {
        // Mark node as completed
        state.setNodeCompleted(node.id, result.data, result.executionTime);

        // Get downstream nodes
        const downstreamNodes = graph.get(node.id) || [];

        if (downstreamNodes.length > 0) {
          // Execute downstream nodes with output data
          await this.executeNodes(
            downstreamNodes,
            result.data,
            workflow,
            state,
            executor,
            graph
          );
        }
      } else {
        // Mark node as failed
        state.setNodeFailed(node.id, result.error);

        // Don't execute downstream nodes if this node failed
        log.warn(`Node ${node.name} failed, skipping downstream nodes`, {
          executionId: state['executionId'],
          nodeId: node.id,
        });
      }
    } catch (error: any) {
      // Mark node as failed
      state.setNodeFailed(node.id, error);

      log.error(`Error executing node ${node.name}`, {
        executionId: state['executionId'],
        nodeId: node.id,
        error: error.message,
      });
    }
  }

  /**
   * Build execution graph from workflow connections
   */
  private buildExecutionGraph(workflow: IWorkflow): Map<string, INode[]> {
    const graph = new Map<string, INode[]>();

    // Initialize graph with all nodes
    for (const node of workflow.nodes) {
      if (!graph.has(node.id)) {
        graph.set(node.id, []);
      }
    }

    // Build connections
    for (const connection of workflow.connections) {
      const downstream = graph.get(connection.source) || [];
      const targetNode = workflow.nodes.find((n) => n.id === connection.target);

      if (targetNode && !downstream.find((n) => n.id === targetNode.id)) {
        downstream.push(targetNode);
        graph.set(connection.source, downstream);
      }
    }

    return graph;
  }

  /**
   * Get start nodes (nodes with no incoming connections)
   */
  private getStartNodes(
    workflow: IWorkflow,
    graph: Map<string, INode[]>
  ): INode[] {
    const nodesWithIncoming = new Set<string>();

    // Find all nodes that have incoming connections
    for (const connection of workflow.connections) {
      nodesWithIncoming.add(connection.target);
    }

    // Start nodes are those without incoming connections
    const startNodes = workflow.nodes.filter(
      (node) => !nodesWithIncoming.has(node.id)
    );

    // If no start nodes found (circular?), use trigger nodes or first node
    if (startNodes.length === 0) {
      const triggerNodes = workflow.nodes.filter((n) =>
        n.type.toLowerCase().includes('trigger')
      );
      if (triggerNodes.length > 0) {
        return triggerNodes;
      }
      return workflow.nodes.length > 0 ? [workflow.nodes[0]] : [];
    }

    return startNodes;
  }

  /**
   * Load workflow from repository
   */
  private async loadWorkflow(workflowId: string): Promise<IWorkflow> {
    const workflow = await this.workflowRepository.findById(workflowId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow as any as IWorkflow;
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(
    executionId: string,
    workflowId: string,
    options: ExecutionOptions
  ): Promise<any> {
    return this.executionRepository.create({
      id: executionId,
      workflowId,
      mode: options.mode,
      status: 'new',
      startTime: new Date(),
      data: {
        startData: options.startData ? { main: [[{ json: options.startData }]] } : undefined,
      },
      metadata: options.metadata,
    } as any);
  }

  /**
   * Update execution record with result
   */
  private async updateExecutionRecord(
    executionId: string,
    result: ExecutionResult
  ): Promise<void> {
    await this.executionRepository.updateStatus(
      executionId,
      result.status,
      result.error
    );

    await this.executionRepository.updateData(executionId, result.data);
  }

  /**
   * Update execution record with error
   */
  private async updateExecutionRecordError(
    executionId: string,
    error: any
  ): Promise<void> {
    const executionError: IExecutionError = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date(),
    };

    await this.executionRepository.updateStatus(
      executionId,
      'crashed',
      executionError
    );
  }

  /**
   * Register event handlers for execution state
   */
  private registerStateEventHandlers(
    state: ExecutionState,
    workflowId: string
  ): void {
    const executionId = state['executionId'];

    state.on('node:running', (data) => {
      this.emit('node:running', { ...data, workflowId });
    });

    state.on('node:completed', (data) => {
      this.emit('node:completed', { ...data, workflowId });
    });

    state.on('node:failed', (data) => {
      this.emit('node:failed', { ...data, workflowId });
    });

    state.on('node:skipped', (data) => {
      this.emit('node:skipped', { ...data, workflowId });
    });
  }

  /**
   * Forward executor events
   */
  private forwardExecutorEvents(executor: NodeExecutor): void {
    executor.on('node:start', (data) => {
      this.emit('node:start', data);
    });

    executor.on('node:end', (data) => {
      this.emit('node:end', data);
    });

    executor.on('node:error', (data) => {
      this.emit('node:error', data);
    });
  }

  /**
   * Stop an execution
   */
  async stopExecution(executionId: string): Promise<void> {
    const state = this.activeExecutions.get(executionId);

    if (state) {
      log.info(`Stopping execution: ${executionId}`);

      // Update status to canceled
      await this.executionRepository.updateStatus(executionId, 'canceled');

      // Remove from active executions
      this.activeExecutions.delete(executionId);

      this.emit('execution:stopped', { executionId });
    }
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Get execution state
   */
  getExecutionState(executionId: string): ExecutionState | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * Check if execution is active
   */
  isExecutionActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    activeExecutions: number;
    maxConcurrentExecutions: number;
    queuedExecutions: number;
  } {
    return {
      activeExecutions: this.activeExecutions.size,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      queuedExecutions: this.executionQueue.length,
    };
  }
}
