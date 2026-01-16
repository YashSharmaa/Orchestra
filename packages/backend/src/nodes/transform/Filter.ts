/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Filter node for filtering array items
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Filter extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Filter',
    name: 'filter',
    group: ['transform'],
    version: 1,
    description: 'Filter items based on conditions',
    defaults: {
      name: 'Filter',
      color: '#00D1B2',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Filter Mode',
        name: 'filterMode',
        type: 'options',
        default: 'simple',
        description: 'How to filter items',
        options: [
          { name: 'Simple', value: 'simple', description: 'Filter based on field conditions' },
          { name: 'Expression', value: 'expression', description: 'Filter using custom expression' },
        ],
      },
      {
        displayName: 'Conditions',
        name: 'conditions',
        type: 'json',
        default: '[]',
        displayOptions: {
          show: {
            filterMode: ['simple'],
          },
        },
        required: true,
        typeOptions: {
          rows: 10,
          alwaysOpenEditWindow: true,
        },
        description: 'Array of filter conditions',
        placeholder: '[\n  {\n    "field": "status",\n    "operation": "equals",\n    "value": "active"\n  }\n]',
      },
      {
        displayName: 'Combine Conditions',
        name: 'combineConditions',
        type: 'options',
        default: 'and',
        displayOptions: {
          show: {
            filterMode: ['simple'],
          },
        },
        description: 'How to combine multiple conditions',
        options: [
          { name: 'AND (all must match)', value: 'and' },
          { name: 'OR (any can match)', value: 'or' },
        ],
      },
      {
        displayName: 'Expression',
        name: 'expression',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            filterMode: ['expression'],
          },
        },
        required: true,
        typeOptions: {
          rows: 5,
        },
        description: 'Expression that returns true to keep the item, false to filter it out',
        placeholder: '$json.price > 100 && $json.inStock === true',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    const filterMode = this.getNodeParameter(context, 'filterMode', 'simple') as string;

    let filteredCount = 0;

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        let shouldKeep = false;

        if (filterMode === 'simple') {
          shouldKeep = this.evaluateSimpleConditions(context, item);
        } else if (filterMode === 'expression') {
          shouldKeep = this.evaluateFilterExpression(context, item, i);
        }

        if (shouldKeep) {
          returnData.push(item);
        } else {
          filteredCount++;
        }
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          // On error, exclude the item but don't throw
          filteredCount++;
          this.log(`Error filtering item ${i}: ${error.message}`);
        } else {
          this.handleError(error, `Failed to filter item ${i}`);
        }
      }
    }

    this.log(`Kept ${returnData.length} items, filtered out ${filteredCount} items`);

    return this.returnData(returnData);
  }

  private evaluateSimpleConditions(
    context: INodeExecutionContext,
    item: INodeDataItem
  ): boolean {
    const conditionsParam = this.getNodeParameter(context, 'conditions', '[]') as string;
    const combineMode = this.getNodeParameter(context, 'combineConditions', 'and') as string;

    let conditions: any[];
    try {
      conditions = typeof conditionsParam === 'string'
        ? JSON.parse(conditionsParam)
        : conditionsParam;
    } catch (error) {
      throw new Error('Failed to parse conditions JSON');
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      // No conditions = keep all items
      return true;
    }

    // Evaluate each condition
    const results = conditions.map(condition => {
      return this.evaluateCondition(condition, item);
    });

    // Combine results based on mode
    if (combineMode === 'and') {
      return results.every(result => result === true);
    } else {
      return results.some(result => result === true);
    }
  }

  private evaluateCondition(condition: any, item: INodeDataItem): boolean {
    const { field, operation, value } = condition;

    if (!field || !operation) {
      throw new Error('Condition must have field and operation properties');
    }

    // Get field value from item
    const fieldValue = this.getNestedValue(item.json, field);

    // Evaluate based on operation
    switch (operation) {
      case 'equals':
        return this.compareValues(fieldValue, value);

      case 'notEquals':
        return !this.compareValues(fieldValue, value);

      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.includes(String(value));
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return false;

      case 'notContains':
        if (typeof fieldValue === 'string') {
          return !fieldValue.includes(String(value));
        }
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return true;

      case 'startsWith':
        return String(fieldValue).startsWith(String(value));

      case 'endsWith':
        return String(fieldValue).endsWith(String(value));

      case 'greaterThan':
        return Number(fieldValue) > Number(value);

      case 'lessThan':
        return Number(fieldValue) < Number(value);

      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(value);

      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(value);

      case 'isEmpty':
        return (
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0) ||
          (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)
        );

      case 'isNotEmpty':
        return !(
          fieldValue === null ||
          fieldValue === undefined ||
          fieldValue === '' ||
          (Array.isArray(fieldValue) && fieldValue.length === 0) ||
          (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)
        );

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'notExists':
        return fieldValue === undefined || fieldValue === null;

      case 'isTrue':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'isFalse':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      case 'regex':
        try {
          const regex = new RegExp(value);
          return regex.test(String(fieldValue));
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${value}`);
        }

      case 'in':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array for "in" operation');
        }
        return value.includes(fieldValue);

      case 'notIn':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array for "notIn" operation');
        }
        return !value.includes(fieldValue);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private compareValues(value1: any, value2: any): boolean {
    // Handle null/undefined
    if (value1 === null && value2 === null) return true;
    if (value1 === undefined && value2 === undefined) return true;
    if (value1 === null || value2 === null) return false;
    if (value1 === undefined || value2 === undefined) return false;

    // Try to compare as numbers if both can be converted
    const num1 = Number(value1);
    const num2 = Number(value2);

    if (!isNaN(num1) && !isNaN(num2)) {
      return num1 === num2;
    }

    // Try to compare as booleans
    if (typeof value1 === 'boolean' || typeof value2 === 'boolean') {
      return Boolean(value1) === Boolean(value2);
    }

    // Compare as strings
    return String(value1) === String(value2);
  }

  private evaluateFilterExpression(
    context: INodeExecutionContext,
    item: INodeDataItem,
    itemIndex: number
  ): boolean {
    const expression = this.getNodeParameter(context, 'expression') as string;

    if (!expression) {
      throw new Error('Expression is required in expression mode');
    }

    try {
      // Create evaluation context
      const evalContext = {
        $json: item.json,
        $item: item,
        $index: itemIndex,
      };

      // Evaluate the expression
      const result = this.evaluateExpression(expression, evalContext);

      // Ensure result is boolean
      return Boolean(result);
    } catch (error: any) {
      throw new Error(`Failed to evaluate filter expression: ${error.message}`);
    }
  }
}
