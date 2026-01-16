/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Execution state manager for tracking workflow execution progress
 */

import { INode, INodeData, IRunData, IExecutionNodeData, IExecutionNode, ISourceData } from '@/types';
import EventEmitter from 'events';

export interface ExecutionStateOptions {
  executionId: string;
  workflowId: string;
}

export interface NodeExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: any;
  retryCount: number;
  outputData?: INodeData;
}

/**
 * Manages the state of a workflow execution
 */
export class ExecutionState extends EventEmitter {
  private executionId: string;
  private workflowId: string;
  private nodeStates: Map<string, NodeExecutionState>;
  private nodeOutputs: Map<string, INodeData>;
  private runData: IRunData;
  private executionData: IExecutionNodeData;
  private contextData: Record<string, any>;

  constructor(options: ExecutionStateOptions) {
    super();
    this.executionId = options.executionId;
    this.workflowId = options.workflowId;
    this.nodeStates = new Map();
    this.nodeOutputs = new Map();
    this.runData = {};
    this.contextData = {};

    this.executionData = {
      contextData: this.contextData,
      nodeExecutionStack: [],
      waitingExecution: {},
      waitingExecutionSource: {},
    };
  }

  /**
   * Initialize a node's execution state
   */
  initializeNode(nodeId: string): void {
    if (!this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        status: 'pending',
        retryCount: 0,
      });
    }
  }

  /**
   * Set a node's status to running
   */
  setNodeRunning(nodeId: string): void {
    const state = this.nodeStates.get(nodeId);
    if (state) {
      state.status = 'running';
      state.startTime = new Date();
      this.emit('node:running', { nodeId, executionId: this.executionId });
    }
  }

  /**
   * Set a node's status to completed with output data
   */
  setNodeCompleted(nodeId: string, outputData: INodeData, executionTime: number): void {
    const state = this.nodeStates.get(nodeId);
    if (state) {
      state.status = 'completed';
      state.endTime = new Date();
      state.outputData = outputData;
      this.nodeOutputs.set(nodeId, outputData);

      // Store in run data
      if (!this.runData[nodeId]) {
        this.runData[nodeId] = [];
      }

      this.runData[nodeId].push({
        startTime: state.startTime!,
        endTime: state.endTime,
        executionTime,
        source: this.getNodeSources(nodeId),
        data: outputData,
        metadata: {},
      });

      this.emit('node:completed', {
        nodeId,
        executionId: this.executionId,
        outputData,
        executionTime,
      });
    }
  }

  /**
   * Set a node's status to failed with error
   */
  setNodeFailed(nodeId: string, error: any): void {
    const state = this.nodeStates.get(nodeId);
    if (state) {
      state.status = 'failed';
      state.endTime = new Date();
      state.error = error;

      // Store error in run data
      if (!this.runData[nodeId]) {
        this.runData[nodeId] = [];
      }

      const executionTime = state.startTime
        ? state.endTime.getTime() - state.startTime.getTime()
        : 0;

      this.runData[nodeId].push({
        startTime: state.startTime || new Date(),
        endTime: state.endTime,
        executionTime,
        source: this.getNodeSources(nodeId),
        data: { main: [[]] },
        error: {
          message: error.message || String(error),
          stack: error.stack,
          name: error.name,
          node: nodeId,
          timestamp: new Date(),
        },
        metadata: {},
      });

      this.emit('node:failed', {
        nodeId,
        executionId: this.executionId,
        error,
      });
    }
  }

  /**
   * Set a node's status to skipped
   */
  setNodeSkipped(nodeId: string, reason: string): void {
    const state = this.nodeStates.get(nodeId);
    if (state) {
      state.status = 'skipped';
      this.emit('node:skipped', {
        nodeId,
        executionId: this.executionId,
        reason,
      });
    }
  }

  /**
   * Increment retry count for a node
   */
  incrementRetryCount(nodeId: string): void {
    const state = this.nodeStates.get(nodeId);
    if (state) {
      state.retryCount++;
    }
  }

  /**
   * Get a node's current state
   */
  getNodeState(nodeId: string): NodeExecutionState | undefined {
    return this.nodeStates.get(nodeId);
  }

  /**
   * Get a node's output data
   */
  getNodeOutput(nodeId: string): INodeData | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  /**
   * Get all run data
   */
  getRunData(): IRunData {
    return this.runData;
  }

  /**
   * Get execution data
   */
  getExecutionData(): IExecutionNodeData {
    return this.executionData;
  }

  /**
   * Check if a node has completed
   */
  isNodeCompleted(nodeId: string): boolean {
    const state = this.nodeStates.get(nodeId);
    return state?.status === 'completed';
  }

  /**
   * Check if a node has failed
   */
  isNodeFailed(nodeId: string): boolean {
    const state = this.nodeStates.get(nodeId);
    return state?.status === 'failed';
  }

  /**
   * Check if a node is running
   */
  isNodeRunning(nodeId: string): boolean {
    const state = this.nodeStates.get(nodeId);
    return state?.status === 'running';
  }

  /**
   * Check if a node is pending
   */
  isNodePending(nodeId: string): boolean {
    const state = this.nodeStates.get(nodeId);
    return state?.status === 'pending';
  }

  /**
   * Get all completed nodes
   */
  getCompletedNodes(): string[] {
    const completed: string[] = [];
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'completed') {
        completed.push(nodeId);
      }
    }
    return completed;
  }

  /**
   * Get all failed nodes
   */
  getFailedNodes(): string[] {
    const failed: string[] = [];
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'failed') {
        failed.push(nodeId);
      }
    }
    return failed;
  }

  /**
   * Get all pending nodes
   */
  getPendingNodes(): string[] {
    const pending: string[] = [];
    for (const [nodeId, state] of this.nodeStates.entries()) {
      if (state.status === 'pending') {
        pending.push(nodeId);
      }
    }
    return pending;
  }

  /**
   * Set context data
   */
  setContextData(key: string, value: any): void {
    this.contextData[key] = value;
    this.executionData.contextData = this.contextData;
  }

  /**
   * Get context data
   */
  getContextData(key: string): any {
    return this.contextData[key];
  }

  /**
   * Add node to execution stack
   */
  addToExecutionStack(node: INode, data: INodeData, source: ISourceData | null): void {
    this.executionData.nodeExecutionStack.push({
      node,
      data,
      source,
    });
  }

  /**
   * Set waiting execution
   */
  setWaitingExecution(nodeId: string, data: any): void {
    this.executionData.waitingExecution[nodeId] = data;
  }

  /**
   * Get waiting execution
   */
  getWaitingExecution(nodeId: string): any {
    return this.executionData.waitingExecution[nodeId];
  }

  /**
   * Remove from waiting execution
   */
  removeWaitingExecution(nodeId: string): void {
    delete this.executionData.waitingExecution[nodeId];
  }

  /**
   * Check if any nodes are waiting
   */
  hasWaitingNodes(): boolean {
    return Object.keys(this.executionData.waitingExecution).length > 0;
  }

  /**
   * Get node sources (for tracking data flow)
   */
  private getNodeSources(nodeId: string): string[] {
    // This could be enhanced to track actual input connections
    return [];
  }

  /**
   * Reset state (useful for retries)
   */
  reset(): void {
    this.nodeStates.clear();
    this.nodeOutputs.clear();
    this.runData = {};
    this.contextData = {};
    this.executionData = {
      contextData: this.contextData,
      nodeExecutionStack: [],
      waitingExecution: {},
      waitingExecutionSource: {},
    };
  }

  /**
   * Get execution summary
   */
  getSummary(): {
    executionId: string;
    workflowId: string;
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    pendingNodes: number;
    runningNodes: number;
  } {
    let completed = 0;
    let failed = 0;
    let pending = 0;
    let running = 0;

    for (const state of this.nodeStates.values()) {
      switch (state.status) {
        case 'completed':
          completed++;
          break;
        case 'failed':
          failed++;
          break;
        case 'pending':
          pending++;
          break;
        case 'running':
          running++;
          break;
      }
    }

    return {
      executionId: this.executionId,
      workflowId: this.workflowId,
      totalNodes: this.nodeStates.size,
      completedNodes: completed,
      failedNodes: failed,
      pendingNodes: pending,
      runningNodes: running,
    };
  }
}
