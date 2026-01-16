/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Wait node for introducing delays in workflows
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Wait extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Wait',
    name: 'wait',
    group: ['logic'],
    version: 1,
    description: 'Wait for a specified amount of time',
    defaults: {
      name: 'Wait',
      color: '#7B68EE',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Wait Mode',
        name: 'mode',
        type: 'options',
        default: 'duration',
        required: true,
        description: 'How to determine wait time',
        options: [
          { name: 'Fixed Duration', value: 'duration' },
          { name: 'Until Specific Time', value: 'until' },
          { name: 'Until Webhook', value: 'webhook' },
        ],
      },
      {
        displayName: 'Duration',
        name: 'duration',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            mode: ['duration'],
          },
        },
        required: true,
        description: 'How long to wait',
        typeOptions: {
          minValue: 0,
        },
      },
      {
        displayName: 'Unit',
        name: 'unit',
        type: 'options',
        default: 'seconds',
        displayOptions: {
          show: {
            mode: ['duration'],
          },
        },
        required: true,
        description: 'Time unit',
        options: [
          { name: 'Seconds', value: 'seconds' },
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
        ],
      },
      {
        displayName: 'Until Time',
        name: 'untilTime',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            mode: ['until'],
          },
        },
        required: true,
        description: 'Wait until this time (ISO 8601 format)',
        placeholder: '2025-12-31T23:59:59Z',
      },
      {
        displayName: 'Max Wait Time',
        name: 'maxWaitTime',
        type: 'number',
        default: 3600,
        description: 'Maximum time to wait in seconds (safety limit)',
        typeOptions: {
          minValue: 1,
        },
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    const mode = this.getNodeParameter(context, 'mode', 'duration') as string;
    const maxWaitTime = this.getNodeParameter(context, 'maxWaitTime', 3600) as number;

    try {
      let waitMs = 0;

      if (mode === 'duration') {
        const duration = this.getNodeParameter(context, 'duration', 1) as number;
        const unit = this.getNodeParameter(context, 'unit', 'seconds') as string;

        // Convert to milliseconds
        const multipliers: Record<string, number> = {
          seconds: 1000,
          minutes: 60 * 1000,
          hours: 60 * 60 * 1000,
          days: 24 * 60 * 60 * 1000,
        };

        waitMs = duration * (multipliers[unit] || 1000);

        // Apply max wait time safety limit
        const maxWaitMs = maxWaitTime * 1000;
        waitMs = Math.min(waitMs, maxWaitMs);

        this.log(`Waiting for ${duration} ${unit} (${waitMs}ms)`);
      } else if (mode === 'until') {
        const untilTime = this.getNodeParameter(context, 'untilTime') as string;
        const targetTime = new Date(untilTime);
        const now = new Date();

        waitMs = targetTime.getTime() - now.getTime();

        if (waitMs < 0) {
          waitMs = 0; // Time already passed
        }

        // Apply max wait time safety limit
        const maxWaitMs = maxWaitTime * 1000;
        waitMs = Math.min(waitMs, maxWaitMs);

        this.log(`Waiting until ${untilTime} (${waitMs}ms)`);
      } else if (mode === 'webhook') {
        // Webhook mode would require workflow state persistence
        // For now, just pass through with a note
        this.log('Webhook wait mode requires state persistence (not implemented in this execution)');
        waitMs = 0;
      }

      // Perform the wait
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      // Pass through input items
      for (const item of items) {
        returnData.push({
          json: {
            ...item.json,
            $waitedFor: waitMs,
            $waitMode: mode,
            $resumedAt: new Date().toISOString(),
          },
        });
      }

      return this.returnData(returnData);
    } catch (error: any) {
      this.handleError(error, 'Wait node failed');
      return this.returnData([]);
    }
  }
}
