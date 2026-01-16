/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Schedule trigger node for cron-based workflow execution
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Schedule extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Schedule',
    name: 'schedule',
    group: ['trigger'],
    version: 1,
    description: 'Trigger workflow on a schedule using cron expressions',
    defaults: {
      name: 'Schedule',
      color: '#9370DB',
    },
    inputs: [],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Trigger Mode',
        name: 'triggerMode',
        type: 'options',
        default: 'cron',
        description: 'How to configure the schedule',
        options: [
          { name: 'Cron Expression', value: 'cron' },
          { name: 'Interval', value: 'interval' },
          { name: 'Simple', value: 'simple' },
        ],
      },
      {
        displayName: 'Cron Expression',
        name: 'cronExpression',
        type: 'string',
        default: '0 * * * *',
        displayOptions: {
          show: {
            triggerMode: ['cron'],
          },
        },
        required: true,
        description: 'Cron expression defining the schedule',
        placeholder: '0 * * * * (every hour)',
      },
      {
        displayName: 'Interval',
        name: 'interval',
        type: 'number',
        default: 60,
        displayOptions: {
          show: {
            triggerMode: ['interval'],
          },
        },
        required: true,
        description: 'Trigger interval',
        typeOptions: {
          minValue: 1,
        },
      },
      {
        displayName: 'Interval Unit',
        name: 'intervalUnit',
        type: 'options',
        default: 'minutes',
        displayOptions: {
          show: {
            triggerMode: ['interval'],
          },
        },
        description: 'Unit for the interval',
        options: [
          { name: 'Seconds', value: 'seconds' },
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
        ],
      },
      {
        displayName: 'Frequency',
        name: 'frequency',
        type: 'options',
        default: 'hour',
        displayOptions: {
          show: {
            triggerMode: ['simple'],
          },
        },
        description: 'How often to trigger',
        options: [
          { name: 'Every Minute', value: 'minute' },
          { name: 'Every Hour', value: 'hour' },
          { name: 'Every Day', value: 'day' },
          { name: 'Every Week', value: 'week' },
          { name: 'Every Month', value: 'month' },
        ],
      },
      {
        displayName: 'Minute',
        name: 'minute',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            triggerMode: ['simple'],
            frequency: ['hour', 'day', 'week', 'month'],
          },
        },
        description: 'Minute of the hour (0-59)',
        typeOptions: {
          minValue: 0,
          maxValue: 59,
        },
      },
      {
        displayName: 'Hour',
        name: 'hour',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            triggerMode: ['simple'],
            frequency: ['day', 'week', 'month'],
          },
        },
        description: 'Hour of the day (0-23)',
        typeOptions: {
          minValue: 0,
          maxValue: 23,
        },
      },
      {
        displayName: 'Day of Week',
        name: 'dayOfWeek',
        type: 'options',
        default: 1,
        displayOptions: {
          show: {
            triggerMode: ['simple'],
            frequency: ['week'],
          },
        },
        description: 'Day of the week',
        options: [
          { name: 'Monday', value: 1 },
          { name: 'Tuesday', value: 2 },
          { name: 'Wednesday', value: 3 },
          { name: 'Thursday', value: 4 },
          { name: 'Friday', value: 5 },
          { name: 'Saturday', value: 6 },
          { name: 'Sunday', value: 0 },
        ],
      },
      {
        displayName: 'Day of Month',
        name: 'dayOfMonth',
        type: 'number',
        default: 1,
        displayOptions: {
          show: {
            triggerMode: ['simple'],
            frequency: ['month'],
          },
        },
        description: 'Day of the month (1-31)',
        typeOptions: {
          minValue: 1,
          maxValue: 31,
        },
      },
      {
        displayName: 'Timezone',
        name: 'timezone',
        type: 'string',
        default: 'UTC',
        description: 'Timezone for the schedule (e.g., America/New_York, Europe/London)',
        placeholder: 'UTC',
      },
      {
        displayName: 'Include Data',
        name: 'includeData',
        type: 'boolean',
        default: true,
        description: 'Whether to include trigger timestamp in output',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    // Schedule nodes are trigger nodes that fire based on time
    // The actual scheduling is handled by the execution engine

    const includeData = this.getNodeParameter(context, 'includeData', true) as boolean;

    if (includeData) {
      const triggerData: INodeDataItem = {
        json: {
          timestamp: new Date().toISOString(),
          timezone: this.getNodeParameter(context, 'timezone', 'UTC'),
          mode: context.mode,
        },
      };

      return this.returnData([triggerData]);
    }

    // Return minimal data if includeData is false
    return this.returnData([this.createDataItem({})]);
  }

  /**
   * Convert node parameters to a cron expression
   * This is used by the scheduler to set up the cron job
   */
  getCronExpression(context: INodeExecutionContext): string {
    const triggerMode = this.getNodeParameter(context, 'triggerMode', 'cron') as string;

    if (triggerMode === 'cron') {
      return this.getNodeParameter(context, 'cronExpression', '0 * * * *') as string;
    }

    if (triggerMode === 'interval') {
      const interval = this.getNodeParameter(context, 'interval', 60) as number;
      const unit = this.getNodeParameter(context, 'intervalUnit', 'minutes') as string;

      return this.intervalToCron(interval, unit);
    }

    if (triggerMode === 'simple') {
      return this.simpleToCron(context);
    }

    return '0 * * * *'; // Default: every hour
  }

  /**
   * Convert interval to cron expression
   */
  private intervalToCron(interval: number, unit: string): string {
    switch (unit) {
      case 'seconds':
        if (interval < 60) {
          return `*/${interval} * * * * *`;
        }
        return `0 */${Math.floor(interval / 60)} * * * *`;

      case 'minutes':
        if (interval < 60) {
          return `*/${interval} * * * *`;
        }
        return `0 */${Math.floor(interval / 60)} * * *`;

      case 'hours':
        return `0 */${interval} * * *`;

      case 'days':
        return `0 0 */${interval} * *`;

      default:
        return '0 * * * *';
    }
  }

  /**
   * Convert simple schedule to cron expression
   */
  private simpleToCron(context: INodeExecutionContext): string {
    const frequency = this.getNodeParameter(context, 'frequency', 'hour') as string;

    switch (frequency) {
      case 'minute':
        return '* * * * *'; // Every minute

      case 'hour':
        const minute = this.getNodeParameter(context, 'minute', 0) as number;
        return `${minute} * * * *`; // Every hour at specified minute

      case 'day':
        const dayMinute = this.getNodeParameter(context, 'minute', 0) as number;
        const dayHour = this.getNodeParameter(context, 'hour', 0) as number;
        return `${dayMinute} ${dayHour} * * *`; // Every day at specified time

      case 'week':
        const weekMinute = this.getNodeParameter(context, 'minute', 0) as number;
        const weekHour = this.getNodeParameter(context, 'hour', 0) as number;
        const dayOfWeek = this.getNodeParameter(context, 'dayOfWeek', 1) as number;
        return `${weekMinute} ${weekHour} * * ${dayOfWeek}`; // Every week on specified day

      case 'month':
        const monthMinute = this.getNodeParameter(context, 'minute', 0) as number;
        const monthHour = this.getNodeParameter(context, 'hour', 0) as number;
        const dayOfMonth = this.getNodeParameter(context, 'dayOfMonth', 1) as number;
        return `${monthMinute} ${monthHour} ${dayOfMonth} * *`; // Every month on specified day

      default:
        return '0 * * * *';
    }
  }

  /**
   * Get the timezone for this schedule
   */
  getTimezone(context: INodeExecutionContext): string {
    return this.getNodeParameter(context, 'timezone', 'UTC') as string;
  }

  /**
   * Validate the cron expression
   */
  validateCronExpression(expression: string): boolean {
    // Basic validation - should be enhanced with a proper cron parser
    const parts = expression.trim().split(/\s+/);

    // Standard cron: 5 or 6 parts (with or without seconds)
    if (parts.length < 5 || parts.length > 6) {
      return false;
    }

    // Each part should be valid
    const validPart = /^(\*|[\d,-/]+)$/;
    return parts.every(part => validPart.test(part));
  }
}
