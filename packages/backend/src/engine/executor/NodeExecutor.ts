/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Node executor for executing individual workflow nodes
 */

import {
  INode,
  INodeData,
  INodeDataItem,
  IWorkflow,
  ExecutionMode,
  INodeExecutionContext,
  INodeHelpers,
} from '@/types';
import { log } from '@/utils/logger';
import { nodeRegistry } from '@/nodes/NodeRegistry';
import axios from 'axios';
import EventEmitter from 'events';

export interface NodeExecutorOptions {
  executionId: string;
  workflow: IWorkflow;
  mode: ExecutionMode;
  defaultTimeout?: number;
}

export interface NodeExecutionResult {
  success: boolean;
  data?: INodeData;
  error?: Error;
  executionTime: number;
}

/**
 * Executes individual workflow nodes
 */
export class NodeExecutor extends EventEmitter {
  private executionId: string;
  private workflow: IWorkflow;
  private mode: ExecutionMode;
  private defaultTimeout: number;

  constructor(options: NodeExecutorOptions) {
    super();
    this.executionId = options.executionId;
    this.workflow = options.workflow;
    this.mode = options.mode;
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 seconds default
  }

  /**
   * Execute a node with input data
   */
  async executeNode(
    node: INode,
    inputData: INodeData,
    credentials?: Record<string, any>
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      log.debug(`Executing node: ${node.name} (${node.id})`, {
        executionId: this.executionId,
        nodeId: node.id,
        nodeType: node.type,
      });

      // Check if node is disabled
      if (node.disabled) {
        log.debug(`Node ${node.name} is disabled, skipping`, {
          executionId: this.executionId,
          nodeId: node.id,
        });

        return {
          success: true,
          data: inputData, // Pass through input data
          executionTime: Date.now() - startTime,
        };
      }

      // Emit start event
      this.emit('node:start', {
        executionId: this.executionId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
      });

      // Execute the node with timeout
      const outputData = await this.executeWithTimeout(
        node,
        inputData,
        credentials,
        this.getNodeTimeout(node)
      );

      const executionTime = Date.now() - startTime;

      log.debug(`Node ${node.name} completed successfully`, {
        executionId: this.executionId,
        nodeId: node.id,
        executionTime,
      });

      // Emit end event
      this.emit('node:end', {
        executionId: this.executionId,
        nodeId: node.id,
        nodeName: node.name,
        executionTime,
      });

      return {
        success: true,
        data: outputData,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      log.error(`Node ${node.name} failed`, {
        executionId: this.executionId,
        nodeId: node.id,
        error: error.message,
        stack: error.stack,
      });

      // Emit error event
      this.emit('node:error', {
        executionId: this.executionId,
        nodeId: node.id,
        nodeName: node.name,
        error,
        executionTime,
      });

      return {
        success: false,
        error,
        executionTime,
      };
    }
  }

  /**
   * Execute node with retry logic
   */
  async executeWithRetry(
    node: INode,
    inputData: INodeData,
    credentials?: Record<string, any>
  ): Promise<NodeExecutionResult> {
    const maxRetries = node.retryOnFail ? node.maxRetries || 3 : 0;
    const waitBetweenRetries = node.waitBetweenRetries || 1000;

    let lastError: Error | undefined;
    let lastResult: NodeExecutionResult | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        log.info(`Retrying node ${node.name}, attempt ${attempt}/${maxRetries}`, {
          executionId: this.executionId,
          nodeId: node.id,
        });

        // Wait before retry
        await this.sleep(waitBetweenRetries);
      }

      const result = await this.executeNode(node, inputData, credentials);

      if (result.success) {
        if (attempt > 0) {
          log.info(`Node ${node.name} succeeded after ${attempt} retries`, {
            executionId: this.executionId,
            nodeId: node.id,
          });
        }
        return result;
      }

      lastError = result.error;
      lastResult = result;
    }

    // All retries failed
    log.error(`Node ${node.name} failed after ${maxRetries} retries`, {
      executionId: this.executionId,
      nodeId: node.id,
      error: lastError?.message,
    });

    return lastResult!;
  }

  /**
   * Execute node with timeout
   */
  private async executeWithTimeout(
    node: INode,
    inputData: INodeData,
    credentials: Record<string, any> | undefined,
    timeout: number
  ): Promise<INodeData> {
    return Promise.race([
      this.executeNodeImplementation(node, inputData, credentials),
      this.createTimeoutPromise(timeout, node),
    ]);
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number, node: INode): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Node "${node.name}" execution timed out after ${timeout}ms`
          )
        );
      }, timeout);
    });
  }

  /**
   * Get node timeout
   */
  private getNodeTimeout(node: INode): number {
    // Check workflow settings first
    if (this.workflow.settings?.executionTimeout) {
      return this.workflow.settings.executionTimeout;
    }

    // Use default timeout
    return this.defaultTimeout;
  }

  /**
   * Execute the actual node implementation
   */
  private async executeNodeImplementation(
    node: INode,
    inputData: INodeData,
    credentials?: Record<string, any>
  ): Promise<INodeData> {
    // Create execution context
    const context: INodeExecutionContext = {
      node,
      workflow: this.workflow,
      inputData,
      executionId: this.executionId,
      mode: this.mode,
      credentials,
      helpers: this.createHelpers(),
    };

    // Get node implementation from registry
    const nodeType = nodeRegistry.getNode(node.type);

    if (nodeType) {
      // Execute the actual node implementation
      try {
        const result = await nodeType.execute(context);
        return result;
      } catch (error) {
        log.error(`Node type "${node.type}" execution failed`, {
          executionId: this.executionId,
          nodeId: node.id,
          error,
        });
        throw error;
      }
    } else {
      // Node type not found in registry - log warning and pass through data
      log.warn(
        `Node type "${node.type}" not found in registry. Passing through data.`,
        {
          executionId: this.executionId,
          nodeId: node.id,
          availableTypes: nodeRegistry.getAllNodeNames(),
        }
      );

      // Return input data as fallback
      return inputData;
    }
  }

  /**
   * Create node helpers
   */
  private createHelpers(): INodeHelpers {
    return {
      request: async (options: any) => {
        // Implement HTTP request helper using axios
        try {
          const response = await axios(options);
          return {
            statusCode: response.status,
            headers: response.headers,
            body: response.data,
          };
        } catch (error: any) {
          if (error.response) {
            // Server responded with error status
            return {
              statusCode: error.response.status,
              headers: error.response.headers,
              body: error.response.data,
              error: error.message,
            };
          }
          throw error;
        }
      },
      requestWithAuthentication: async (credentialType: string, options: any) => {
        // Implement authenticated HTTP request helper
        // This would retrieve credentials and add authentication headers
        // For now, delegate to standard request
        return this.createHelpers().request(options);
      },
      returnJsonArray: (data: any[]) => {
        return data.map((item) => ({
          json: typeof item === 'object' ? item : { value: item },
        }));
      },
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Merge input data from multiple sources
   */
  mergeInputData(inputs: INodeData[]): INodeData {
    const merged: INodeData = { main: [] };

    for (const input of inputs) {
      merged.main.push(...input.main);
    }

    return merged;
  }

  /**
   * Create empty node data
   */
  static createEmptyData(): INodeData {
    return { main: [[]] };
  }

  /**
   * Create node data from JSON
   */
  static createDataFromJson(json: Record<string, any>): INodeData {
    return {
      main: [[{ json }]],
    };
  }
}
