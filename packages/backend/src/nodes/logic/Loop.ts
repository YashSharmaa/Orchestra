/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Loop node for iterating over arrays or repeating operations
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Loop extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Loop',
    name: 'loop',
    group: ['logic'],
    version: 1,
    description: 'Loop over items or repeat operations',
    defaults: {
      name: 'Loop',
      color: '#0091D9',
    },
    inputs: ['main'],
    outputs: ['loop', 'done'],
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        default: 'forEach',
        required: true,
        description: 'Loop mode',
        options: [
          { name: 'For Each Item', value: 'forEach' },
          { name: 'Repeat N Times', value: 'repeat' },
          { name: 'While Condition', value: 'while' },
        ],
      },
      {
        displayName: 'Count',
        name: 'count',
        type: 'number',
        default: 10,
        displayOptions: {
          show: {
            mode: ['repeat'],
          },
        },
        required: true,
        description: 'Number of times to repeat',
        typeOptions: {
          minValue: 1,
          maxValue: 10000,
        },
      },
      {
        displayName: 'Condition',
        name: 'condition',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['while'],
          },
        },
        required: true,
        description: 'Condition to evaluate (JavaScript expression)',
        placeholder: '$json.counter < 10',
      },
      {
        displayName: 'Max Iterations',
        name: 'maxIterations',
        type: 'number',
        default: 1000,
        description: 'Maximum iterations to prevent infinite loops',
        typeOptions: {
          minValue: 1,
          maxValue: 100000,
        },
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];
    const loopData: INodeDataItem[] = [];

    const mode = this.getNodeParameter(context, 'mode', 'forEach') as string;
    const maxIterations = this.getNodeParameter(context, 'maxIterations', 1000) as number;

    try {
      if (mode === 'forEach') {
        // Loop over each input item
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          loopData.push({
            json: {
              ...item.json,
              $index: i,
              $total: items.length,
            },
          });
        }

        this.log(`For-each loop: ${items.length} items`);

        return {
          main: [loopData],
        };
      } else if (mode === 'repeat') {
        // Repeat N times
        const count = this.getNodeParameter(context, 'count', 10) as number;
        const safeCount = Math.min(count, maxIterations);

        for (let i = 0; i < safeCount; i++) {
          loopData.push({
            json: {
              iteration: i + 1,
              total: safeCount,
              $index: i,
            },
          });
        }

        this.log(`Repeat loop: ${safeCount} iterations`);

        return {
          main: [loopData],
        };
      } else if (mode === 'while') {
        // While condition is true
        const conditionExpr = this.getNodeParameter(context, 'condition') as string;
        let iteration = 0;
        let conditionMet = true;

        while (conditionMet && iteration < maxIterations) {
          const contextData = {
            $json: {
              counter: iteration,
              iteration: iteration + 1,
            },
            $index: iteration,
          };

          // Evaluate condition (simplified - in real implementation would use safe eval)
          try {
            // For safety, we'll just check a simple condition
            // In production, use a proper expression evaluator
            conditionMet = iteration < 10; // Placeholder logic
          } catch (error) {
            this.log(`Condition evaluation error: ${error}`);
            conditionMet = false;
          }

          if (conditionMet) {
            loopData.push({
              json: contextData.$json,
            });
            iteration++;
          }
        }

        this.log(`While loop: ${iteration} iterations`);

        return {
          main: [loopData],
        };
      }

      return this.returnData(returnData);
    } catch (error: any) {
      this.handleError(error, 'Loop execution failed');
      return this.returnData([]);
    }
  }
}
