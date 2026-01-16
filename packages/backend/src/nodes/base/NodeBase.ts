/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Base class for all node types
 */

import {
  INodeType,
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
  IExecutionError,
} from '@/types';

/**
 * Abstract base class that all node types extend
 * Provides common functionality and enforces the INodeType interface
 */
export abstract class NodeBase implements INodeType {
  abstract description: INodeTypeDescription;

  /**
   * Execute the node logic
   * Must be implemented by each specific node type
   */
  abstract execute(context: INodeExecutionContext): Promise<INodeData>;

  /**
   * Helper method to get a parameter value from the node
   */
  protected getNodeParameter(
    context: INodeExecutionContext,
    parameterName: string,
    defaultValue?: any
  ): any {
    const value = context.node.parameters[parameterName];
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Helper method to get input data items
   */
  protected getInputData(context: INodeExecutionContext, inputIndex = 0): INodeDataItem[] {
    return context.inputData.main[inputIndex] || [];
  }

  /**
   * Helper method to return data in the standard format
   */
  protected returnData(items: INodeDataItem[]): INodeData {
    return {
      main: [items],
    };
  }

  /**
   * Helper method to create a data item
   */
  protected createDataItem(json: Record<string, any>): INodeDataItem {
    return {
      json,
    };
  }

  /**
   * Helper method to handle errors consistently
   */
  protected handleError(error: any, context?: string): never {
    const errorMessage = error.message || String(error);
    const executionError: IExecutionError = {
      message: context ? `${context}: ${errorMessage}` : errorMessage,
      stack: error.stack,
      name: error.name || 'NodeExecutionError',
      timestamp: new Date(),
      context: context ? { context } : undefined,
    };
    throw executionError;
  }

  /**
   * Helper to replace variables in strings using context data
   */
  protected replaceVariables(
    text: string,
    context: INodeExecutionContext,
    itemIndex = 0
  ): string {
    const inputItems = this.getInputData(context);
    const item = inputItems[itemIndex];

    if (!item) {
      return text;
    }

    // Replace {{$json.key}} patterns
    return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        const trimmed = expression.trim();

        // Handle $json references
        if (trimmed.startsWith('$json.')) {
          const path = trimmed.substring(6);
          return this.getNestedValue(item.json, path) ?? match;
        }

        // Handle $node references
        if (trimmed.startsWith('$node.')) {
          return match; // Node references require execution context
        }

        return match;
      } catch (error) {
        return match;
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  protected setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) {
      return;
    }

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Helper to evaluate simple expressions
   */
  protected evaluateExpression(expression: string, data: Record<string, any>): any {
    try {
      // Simple evaluation - in production, use a proper expression evaluator
      const func = new Function(...Object.keys(data), `return ${expression}`);
      return func(...Object.values(data));
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  /**
   * Helper to clone data deeply
   */
  protected cloneData<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Helper to merge objects
   */
  protected mergeObjects(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.mergeObjects(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Helper to validate required parameters
   */
  protected validateRequiredParameters(
    context: INodeExecutionContext,
    requiredParams: string[]
  ): void {
    for (const param of requiredParams) {
      const value = this.getNodeParameter(context, param);
      if (value === undefined || value === null || value === '') {
        throw new Error(`Required parameter '${param}' is missing`);
      }
    }
  }

  /**
   * Helper to log debug information
   */
  protected log(message: string, data?: any): void {
    // Use the global logger
    const logger = require('@/utils/logger').log;
    logger.debug(`[${this.description.name}] ${message}`, data);
  }
}
