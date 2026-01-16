/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Set node for setting and transforming data
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Set extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Set',
    name: 'set',
    group: ['transform'],
    version: 1,
    description: 'Set, modify, or transform data fields',
    defaults: {
      name: 'Set',
      color: '#0080FF',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Keep Existing Data',
        name: 'keepExistingData',
        type: 'boolean',
        default: true,
        description: 'Whether to keep existing fields or start fresh',
      },
      {
        displayName: 'Fields to Set',
        name: 'fields',
        type: 'json',
        default: '{}',
        required: true,
        typeOptions: {
          rows: 10,
          alwaysOpenEditWindow: true,
        },
        description: 'Fields to set as JSON object. Use {{$json.field}} to reference input data',
        placeholder: '{\n  "newField": "value",\n  "calculated": "{{$json.price * 1.1}}",\n  "nested.field": "value"\n}',
      },
      {
        displayName: 'Data Type Conversion',
        name: 'typeConversion',
        type: 'boolean',
        default: true,
        description: 'Automatically convert string numbers to actual numbers',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    const keepExistingData = this.getNodeParameter(context, 'keepExistingData', true) as boolean;
    const fieldsParam = this.getNodeParameter(context, 'fields', '{}') as string;
    const typeConversion = this.getNodeParameter(context, 'typeConversion', true) as boolean;

    // Parse fields configuration
    let fieldsConfig: Record<string, any>;
    try {
      fieldsConfig = typeof fieldsParam === 'string' ? JSON.parse(fieldsParam) : fieldsParam;
    } catch (error) {
      this.handleError(error, 'Failed to parse fields configuration');
    }

    // Process each input item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Start with existing data or fresh object
        let newJson: Record<string, any> = keepExistingData
          ? this.cloneData(item.json)
          : {};

        // Process each field to set
        for (const [fieldPath, fieldValue] of Object.entries(fieldsConfig)) {
          const processedValue = this.processValue(fieldValue, context, i, typeConversion);
          this.setNestedValue(newJson, fieldPath, processedValue);
        }

        // Create the result item
        const resultItem: INodeDataItem = {
          json: newJson,
        };

        // Preserve binary data if it exists
        if (item.binary) {
          resultItem.binary = item.binary;
        }

        // Preserve paired item information
        if (item.pairedItem) {
          resultItem.pairedItem = item.pairedItem;
        }

        returnData.push(resultItem);
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          returnData.push({
            json: {
              error: error.message,
              originalData: item.json,
            },
          });
        } else {
          this.handleError(error, `Failed to process item ${i}`);
        }
      }
    }

    return this.returnData(returnData);
  }

  private processValue(
    value: any,
    context: INodeExecutionContext,
    itemIndex: number,
    typeConversion: boolean
  ): any {
    // If value is a string with variables, replace them
    if (typeof value === 'string') {
      const processedString = this.replaceVariables(value, context, itemIndex);

      // Handle expressions in double curly braces
      if (processedString.includes('{{') && processedString.includes('}}')) {
        return this.evaluateStringExpressions(processedString, context, itemIndex);
      }

      // Try type conversion if enabled
      if (typeConversion) {
        return this.convertType(processedString);
      }

      return processedString;
    }

    // If value is an object, recursively process it
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const processedObject: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        processedObject[key] = this.processValue(val, context, itemIndex, typeConversion);
      }
      return processedObject;
    }

    // If value is an array, process each element
    if (Array.isArray(value)) {
      return value.map(val => this.processValue(val, context, itemIndex, typeConversion));
    }

    // Return primitive values as-is
    return value;
  }

  private evaluateStringExpressions(
    text: string,
    context: INodeExecutionContext,
    itemIndex: number
  ): any {
    const inputItems = this.getInputData(context);
    const item = inputItems[itemIndex];

    if (!item) {
      return text;
    }

    // Check if the entire string is a single expression
    const singleExpressionMatch = text.match(/^\{\{(.+)\}\}$/);
    if (singleExpressionMatch) {
      const expression = singleExpressionMatch[1].trim();
      return this.evaluateSingleExpression(expression, item);
    }

    // Replace multiple expressions in the string
    return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        const result = this.evaluateSingleExpression(expression.trim(), item);
        return String(result);
      } catch (error) {
        return match;
      }
    });
  }

  private evaluateSingleExpression(expression: string, item: INodeDataItem): any {
    try {
      // Handle $json references
      if (expression.startsWith('$json.')) {
        const path = expression.substring(6);
        return this.getNestedValue(item.json, path);
      }

      // Handle simple arithmetic or comparisons
      if (/^[\d\s+\-*/().]+$/.test(expression)) {
        return eval(expression);
      }

      // Handle more complex expressions with $json
      const evalContext = {
        $json: item.json,
        $item: item,
      };

      return this.evaluateExpression(expression, evalContext);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }

  private convertType(value: string): any {
    // Try to convert to boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try to convert to null
    if (value.toLowerCase() === 'null') return null;

    // Try to convert to undefined
    if (value.toLowerCase() === 'undefined') return undefined;

    // Try to convert to number
    if (/^-?\d+\.?\d*$/.test(value)) {
      const num = Number(value);
      if (!isNaN(num)) return num;
    }

    // Return as string if no conversion applies
    return value;
  }

  protected setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) {
      return;
    }

    // Navigate to the parent object, creating nested objects as needed
    let current = obj;
    for (const key of keys) {
      // Handle array indices
      if (/^\d+$/.test(key)) {
        const index = parseInt(key, 10);
        if (!Array.isArray(current)) {
          throw new Error(`Cannot set array index on non-array at path: ${path}`);
        }
        if (!current[index]) {
          current[index] = {};
        }
        current = current[index];
      } else {
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
    }

    // Set the final value
    if (/^\d+$/.test(lastKey)) {
      const index = parseInt(lastKey, 10);
      if (!Array.isArray(current)) {
        throw new Error(`Cannot set array index on non-array at path: ${path}`);
      }
      current[index] = value;
    } else {
      current[lastKey] = value;
    }
  }
}
