/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: If node for conditional branching
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class If extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'If',
    name: 'if',
    group: ['logic'],
    version: 1,
    description: 'Route items based on conditions (true/false branching)',
    defaults: {
      name: 'If',
      color: '#FFA500',
    },
    inputs: ['main'],
    outputs: ['main', 'main'], // true, false
    properties: [
      {
        displayName: 'Condition Type',
        name: 'conditionType',
        type: 'options',
        default: 'simple',
        description: 'How to evaluate the condition',
        options: [
          { name: 'Simple', value: 'simple' },
          { name: 'Expression', value: 'expression' },
        ],
      },
      {
        displayName: 'Field',
        name: 'field',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            conditionType: ['simple'],
          },
        },
        required: true,
        description: 'The field to check',
        placeholder: 'fieldName',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        default: 'equals',
        displayOptions: {
          show: {
            conditionType: ['simple'],
          },
        },
        description: 'The comparison operation',
        options: [
          { name: 'Equals', value: 'equals' },
          { name: 'Not Equals', value: 'notEquals' },
          { name: 'Contains', value: 'contains' },
          { name: 'Not Contains', value: 'notContains' },
          { name: 'Starts With', value: 'startsWith' },
          { name: 'Ends With', value: 'endsWith' },
          { name: 'Greater Than', value: 'greaterThan' },
          { name: 'Less Than', value: 'lessThan' },
          { name: 'Greater Than or Equal', value: 'greaterThanOrEqual' },
          { name: 'Less Than or Equal', value: 'lessThanOrEqual' },
          { name: 'Is Empty', value: 'isEmpty' },
          { name: 'Is Not Empty', value: 'isNotEmpty' },
          { name: 'Exists', value: 'exists' },
          { name: 'Not Exists', value: 'notExists' },
          { name: 'Is True', value: 'isTrue' },
          { name: 'Is False', value: 'isFalse' },
          { name: 'Regex Match', value: 'regex' },
        ],
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            conditionType: ['simple'],
            operation: [
              'equals',
              'notEquals',
              'contains',
              'notContains',
              'startsWith',
              'endsWith',
              'greaterThan',
              'lessThan',
              'greaterThanOrEqual',
              'lessThanOrEqual',
              'regex',
            ],
          },
        },
        description: 'The value to compare against',
      },
      {
        displayName: 'Expression',
        name: 'expression',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            conditionType: ['expression'],
          },
        },
        required: true,
        typeOptions: {
          rows: 3,
        },
        description: 'JavaScript expression that returns true or false',
        placeholder: '$json.age > 18 && $json.country === "US"',
      },
      {
        displayName: 'Combine Conditions',
        name: 'combineConditions',
        type: 'options',
        default: 'and',
        description: 'How to combine multiple conditions',
        options: [
          { name: 'AND (all must be true)', value: 'and' },
          { name: 'OR (any can be true)', value: 'or' },
        ],
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const trueItems: INodeDataItem[] = [];
    const falseItems: INodeDataItem[] = [];

    const conditionType = this.getNodeParameter(context, 'conditionType', 'simple') as string;

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let conditionMet = false;

      try {
        if (conditionType === 'simple') {
          conditionMet = this.evaluateSimpleCondition(context, item);
        } else if (conditionType === 'expression') {
          conditionMet = this.evaluateExpressionMode(context, item, i);
        }

        // Route item to appropriate output
        if (conditionMet) {
          trueItems.push(item);
        } else {
          falseItems.push(item);
        }
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          falseItems.push(item);
          this.log(`Error evaluating condition for item ${i}: ${error.message}`);
        } else {
          this.handleError(error, `Failed to evaluate condition for item ${i}`);
        }
      }
    }

    this.log(`Routed ${trueItems.length} items to TRUE, ${falseItems.length} items to FALSE`);

    return {
      main: [trueItems, falseItems],
    };
  }

  private evaluateSimpleCondition(
    context: INodeExecutionContext,
    item: INodeDataItem
  ): boolean {
    const field = this.getNodeParameter(context, 'field') as string;
    const operation = this.getNodeParameter(context, 'operation', 'equals') as string;
    const compareValue = this.getNodeParameter(context, 'value', '') as string;

    // Get field value from item
    const fieldValue = this.getNestedValue(item.json, field);

    // Evaluate based on operation
    switch (operation) {
      case 'equals':
        return this.compareValues(fieldValue, compareValue, '===');

      case 'notEquals':
        return this.compareValues(fieldValue, compareValue, '!==');

      case 'contains':
        return String(fieldValue).includes(String(compareValue));

      case 'notContains':
        return !String(fieldValue).includes(String(compareValue));

      case 'startsWith':
        return String(fieldValue).startsWith(String(compareValue));

      case 'endsWith':
        return String(fieldValue).endsWith(String(compareValue));

      case 'greaterThan':
        return Number(fieldValue) > Number(compareValue);

      case 'lessThan':
        return Number(fieldValue) < Number(compareValue);

      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(compareValue);

      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(compareValue);

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
          const regex = new RegExp(compareValue);
          return regex.test(String(fieldValue));
        } catch (error) {
          throw new Error(`Invalid regex pattern: ${compareValue}`);
        }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private compareValues(value1: any, value2: any, operator: string): boolean {
    // Try to compare as numbers if both can be converted
    const num1 = Number(value1);
    const num2 = Number(value2);

    if (!isNaN(num1) && !isNaN(num2)) {
      if (operator === '===') return num1 === num2;
      if (operator === '!==') return num1 !== num2;
    }

    // Compare as strings
    const str1 = String(value1);
    const str2 = String(value2);

    if (operator === '===') return str1 === str2;
    if (operator === '!==') return str1 !== str2;

    return false;
  }

  private evaluateExpressionMode(
    context: INodeExecutionContext,
    item: INodeDataItem,
    itemIndex: number
  ): boolean {
    const expression = this.getNodeParameter(context, 'expression') as string;

    if (!expression) {
      throw new Error('Expression is required when using expression mode');
    }

    try {
      // Create evaluation context with $json and other variables
      const evalContext = {
        $json: item.json,
        $item: item,
        $index: itemIndex,
      };

      // Replace $json. references in expression
      let processedExpression = expression;
      processedExpression = processedExpression.replace(/\$json\./g, '$json.');

      // Evaluate the expression using base class method
      const result = this.evaluateExpression(processedExpression, evalContext);

      // Ensure result is boolean
      return Boolean(result);
    } catch (error: any) {
      throw new Error(`Failed to evaluate expression: ${error.message}`);
    }
  }
}
