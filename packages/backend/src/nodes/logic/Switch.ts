/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Switch node for multi-way branching
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Switch extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Switch',
    name: 'switch',
    group: ['logic'],
    version: 1,
    description: 'Route items to different outputs based on conditions',
    defaults: {
      name: 'Switch',
      color: '#FF6B6B',
    },
    inputs: ['main'],
    outputs: ['main', 'main', 'main', 'main'], // 4 outputs by default
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        default: 'rules',
        description: 'How to determine the output',
        options: [
          { name: 'Rules', value: 'rules', description: 'Define rules for each output' },
          { name: 'Expression', value: 'expression', description: 'Use expression to determine output number' },
        ],
      },
      {
        displayName: 'Field to Switch On',
        name: 'field',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['rules'],
          },
        },
        description: 'The field name to check',
        placeholder: 'status',
      },
      {
        displayName: 'Output 0',
        name: 'output0',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['rules'],
          },
        },
        description: 'Comma-separated values that route to output 0',
        placeholder: 'pending,waiting',
      },
      {
        displayName: 'Output 1',
        name: 'output1',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['rules'],
          },
        },
        description: 'Comma-separated values that route to output 1',
        placeholder: 'approved,active',
      },
      {
        displayName: 'Output 2',
        name: 'output2',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['rules'],
          },
        },
        description: 'Comma-separated values that route to output 2',
        placeholder: 'rejected,cancelled',
      },
      {
        displayName: 'Output 3 (Default)',
        name: 'output3',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['rules'],
          },
        },
        description: 'Comma-separated values that route to output 3, or leave empty to make it the default output',
        placeholder: 'other',
      },
      {
        displayName: 'Expression',
        name: 'expression',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['expression'],
          },
        },
        required: true,
        typeOptions: {
          rows: 3,
        },
        description: 'Expression that returns the output index (0-3)',
        placeholder: '$json.priority === "high" ? 0 : 1',
      },
      {
        displayName: 'Fallback Output',
        name: 'fallbackOutput',
        type: 'number',
        default: 3,
        description: 'Output index for items that don\'t match any rule (0-3)',
        typeOptions: {
          minValue: 0,
          maxValue: 3,
        },
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const mode = this.getNodeParameter(context, 'mode', 'rules') as string;
    const fallbackOutput = this.getNodeParameter(context, 'fallbackOutput', 3) as number;

    // Initialize arrays for each output
    const output0: INodeDataItem[] = [];
    const output1: INodeDataItem[] = [];
    const output2: INodeDataItem[] = [];
    const output3: INodeDataItem[] = [];

    const outputs = [output0, output1, output2, output3];

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let targetOutput = fallbackOutput;

      try {
        if (mode === 'rules') {
          targetOutput = this.evaluateRules(context, item);
        } else if (mode === 'expression') {
          targetOutput = this.evaluateExpressionMode(context, item, i);
        }

        // Ensure output index is valid
        if (targetOutput < 0 || targetOutput > 3) {
          this.log(`Invalid output index ${targetOutput}, using fallback`);
          targetOutput = fallbackOutput;
        }

        // Add item to the appropriate output
        outputs[targetOutput].push(item);
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          outputs[fallbackOutput].push(item);
          this.log(`Error routing item ${i}: ${error.message}`);
        } else {
          this.handleError(error, `Failed to route item ${i}`);
        }
      }
    }

    this.log(
      `Routed items - Output 0: ${output0.length}, Output 1: ${output1.length}, ` +
      `Output 2: ${output2.length}, Output 3: ${output3.length}`
    );

    return {
      main: [output0, output1, output2, output3],
    };
  }

  private evaluateRules(context: INodeExecutionContext, item: INodeDataItem): number {
    const field = this.getNodeParameter(context, 'field', '') as string;

    if (!field) {
      throw new Error('Field name is required in rules mode');
    }

    // Get the field value
    const fieldValue = this.getNestedValue(item.json, field);
    const fieldValueStr = String(fieldValue).toLowerCase().trim();

    // Check each output's rules
    for (let outputIndex = 0; outputIndex < 4; outputIndex++) {
      const outputRules = this.getNodeParameter(context, `output${outputIndex}`, '') as string;

      // If no rules for this output, skip
      if (!outputRules || outputRules.trim() === '') {
        // Output 3 with no rules becomes the default
        if (outputIndex === 3) {
          return 3;
        }
        continue;
      }

      // Parse rules (comma-separated values)
      const rules = outputRules
        .split(',')
        .map(r => r.trim().toLowerCase())
        .filter(r => r !== '');

      // Check if field value matches any rule
      for (const rule of rules) {
        if (this.matchesRule(fieldValueStr, rule)) {
          return outputIndex;
        }
      }
    }

    // No match found, use fallback
    const fallbackOutput = this.getNodeParameter(context, 'fallbackOutput', 3) as number;
    return fallbackOutput;
  }

  private matchesRule(value: string, rule: string): boolean {
    // Support wildcards
    if (rule.includes('*')) {
      const regexPattern = rule.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(value);
    }

    // Exact match
    return value === rule;
  }

  private evaluateExpressionMode(
    context: INodeExecutionContext,
    item: INodeDataItem,
    itemIndex: number
  ): number {
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

      // Convert result to output index
      const outputIndex = Number(result);

      if (isNaN(outputIndex)) {
        throw new Error(`Expression returned non-numeric value: ${result}`);
      }

      return Math.floor(outputIndex);
    } catch (error: any) {
      throw new Error(`Failed to evaluate expression: ${error.message}`);
    }
  }
}
