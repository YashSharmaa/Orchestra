/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Cron-based workflow scheduler
 */

import { CronJob } from 'cron';
import { log } from '@/utils/logger';
import EventEmitter from 'events';

export interface ScheduleConfig {
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface ScheduledWorkflow {
  workflowId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  job: CronJob;
  nextExecution?: Date;
  lastExecution?: Date;
  metadata?: Record<string, any>;
}

/**
 * Manages cron-based workflow scheduling
 */
export class CronScheduler extends EventEmitter {
  private schedules: Map<string, ScheduledWorkflow>;
  private isRunning: boolean;

  constructor() {
    super();
    this.schedules = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      log.warn('CronScheduler is already running');
      return;
    }

    this.isRunning = true;
    log.info('CronScheduler started');

    // Start all enabled schedules
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        schedule.job.start();
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      log.warn('CronScheduler is not running');
      return;
    }

    this.isRunning = false;
    log.info('CronScheduler stopped');

    // Stop all schedules
    for (const schedule of this.schedules.values()) {
      schedule.job.stop();
    }
  }

  /**
   * Add a workflow schedule
   */
  addSchedule(config: ScheduleConfig): void {
    try {
      // Validate cron expression
      this.validateCronExpression(config.cronExpression);

      // Remove existing schedule if any
      this.removeSchedule(config.workflowId);

      // Create cron job
      const timezone = config.timezone || 'UTC';
      const job = new CronJob(
        config.cronExpression,
        () => this.onScheduleTrigger(config.workflowId),
        null,
        false,
        timezone
      );

      // Create scheduled workflow
      const scheduledWorkflow: ScheduledWorkflow = {
        workflowId: config.workflowId,
        cronExpression: config.cronExpression,
        timezone,
        enabled: config.enabled,
        job,
        nextExecution: this.getNextExecution(config.cronExpression, timezone),
        metadata: config.metadata,
      };

      // Add to schedules
      this.schedules.set(config.workflowId, scheduledWorkflow);

      // Start job if scheduler is running and schedule is enabled
      if (this.isRunning && config.enabled) {
        job.start();
      }

      log.info(`Schedule added for workflow: ${config.workflowId}`, {
        cronExpression: config.cronExpression,
        timezone,
        enabled: config.enabled,
        nextExecution: scheduledWorkflow.nextExecution,
      });

      this.emit('schedule:added', {
        workflowId: config.workflowId,
        cronExpression: config.cronExpression,
        nextExecution: scheduledWorkflow.nextExecution,
      });
    } catch (error: any) {
      log.error(`Failed to add schedule for workflow: ${config.workflowId}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Remove a workflow schedule
   */
  removeSchedule(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (schedule) {
      schedule.job.stop();
      this.schedules.delete(workflowId);

      log.info(`Schedule removed for workflow: ${workflowId}`);
      this.emit('schedule:removed', { workflowId });
    }
  }

  /**
   * Update a workflow schedule
   */
  updateSchedule(config: ScheduleConfig): void {
    const existingSchedule = this.schedules.get(config.workflowId);

    if (existingSchedule) {
      // If cron expression or timezone changed, recreate the schedule
      if (
        existingSchedule.cronExpression !== config.cronExpression ||
        existingSchedule.timezone !== (config.timezone || 'UTC')
      ) {
        this.addSchedule(config);
      } else {
        // Just update enabled state
        existingSchedule.enabled = config.enabled;
        existingSchedule.metadata = config.metadata;

        if (config.enabled && this.isRunning) {
          existingSchedule.job.start();
        } else {
          existingSchedule.job.stop();
        }

        log.info(`Schedule updated for workflow: ${config.workflowId}`, {
          enabled: config.enabled,
        });

        this.emit('schedule:updated', {
          workflowId: config.workflowId,
          enabled: config.enabled,
        });
      }
    } else {
      // Schedule doesn't exist, add it
      this.addSchedule(config);
    }
  }

  /**
   * Enable a workflow schedule
   */
  enableSchedule(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (schedule) {
      schedule.enabled = true;
      if (this.isRunning) {
        schedule.job.start();
      }

      log.info(`Schedule enabled for workflow: ${workflowId}`);
      this.emit('schedule:enabled', { workflowId });
    }
  }

  /**
   * Disable a workflow schedule
   */
  disableSchedule(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (schedule) {
      schedule.enabled = false;
      schedule.job.stop();

      log.info(`Schedule disabled for workflow: ${workflowId}`);
      this.emit('schedule:disabled', { workflowId });
    }
  }

  /**
   * Get a workflow schedule
   */
  getSchedule(workflowId: string): ScheduledWorkflow | undefined {
    return this.schedules.get(workflowId);
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): ScheduledWorkflow[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get enabled schedules
   */
  getEnabledSchedules(): ScheduledWorkflow[] {
    return Array.from(this.schedules.values()).filter((s) => s.enabled);
  }

  /**
   * Check if a workflow has a schedule
   */
  hasSchedule(workflowId: string): boolean {
    return this.schedules.has(workflowId);
  }

  /**
   * Handle schedule trigger
   */
  private onScheduleTrigger(workflowId: string): void {
    const schedule = this.schedules.get(workflowId);
    if (!schedule) {
      return;
    }

    const now = new Date();
    schedule.lastExecution = now;
    schedule.nextExecution = this.getNextExecution(
      schedule.cronExpression,
      schedule.timezone
    );

    log.info(`Schedule triggered for workflow: ${workflowId}`, {
      lastExecution: schedule.lastExecution,
      nextExecution: schedule.nextExecution,
    });

    // Emit trigger event
    this.emit('schedule:triggered', {
      workflowId,
      scheduledTime: now,
      nextExecution: schedule.nextExecution,
      metadata: schedule.metadata,
    });
  }

  /**
   * Validate cron expression
   */
  private validateCronExpression(expression: string): void {
    try {
      // Test create a cron job to validate
      new CronJob(expression, () => {}, null, false);
    } catch (error: any) {
      throw new Error(`Invalid cron expression: ${expression} - ${error.message}`);
    }
  }

  /**
   * Get next execution time for a cron expression
   */
  private getNextExecution(expression: string, timezone: string): Date {
    try {
      const job = new CronJob(expression, () => {}, null, false, timezone);
      return job.nextDate().toJSDate();
    } catch (error) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now
    }
  }

  /**
   * Parse cron expression into human-readable format
   */
  parseCronExpression(expression: string): string {
    try {
      const parts = expression.split(' ');
      if (parts.length < 5) {
        return 'Invalid cron expression';
      }

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      let description = 'Runs ';

      // Day of week
      if (dayOfWeek !== '*') {
        const days = this.parseDayOfWeek(dayOfWeek);
        description += `on ${days} `;
      }

      // Month
      if (month !== '*') {
        const months = this.parseMonth(month);
        description += `in ${months} `;
      }

      // Day of month
      if (dayOfMonth !== '*') {
        description += `on day ${dayOfMonth} `;
      }

      // Time
      if (hour === '*' && minute === '*') {
        description += 'every minute';
      } else if (hour === '*') {
        description += `every hour at minute ${minute}`;
      } else if (minute === '*') {
        description += `at hour ${hour}`;
      } else {
        description += `at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      }

      return description;
    } catch (error) {
      return 'Unable to parse cron expression';
    }
  }

  /**
   * Parse day of week
   */
  private parseDayOfWeek(dow: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const parts = dow.split(',');
    return parts.map((p) => days[parseInt(p)] || p).join(', ');
  }

  /**
   * Parse month
   */
  private parseMonth(month: string): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const parts = month.split(',');
    return parts.map((p) => months[parseInt(p) - 1] || p).join(', ');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    totalSchedules: number;
    enabledSchedules: number;
    disabledSchedules: number;
  } {
    const schedules = Array.from(this.schedules.values());
    return {
      running: this.isRunning,
      totalSchedules: schedules.length,
      enabledSchedules: schedules.filter((s) => s.enabled).length,
      disabledSchedules: schedules.filter((s) => !s.enabled).length,
    };
  }

  /**
   * Get schedule summary
   */
  getScheduleSummary(workflowId: string): {
    exists: boolean;
    enabled?: boolean;
    cronExpression?: string;
    timezone?: string;
    nextExecution?: Date;
    lastExecution?: Date;
    description?: string;
  } {
    const schedule = this.schedules.get(workflowId);

    if (!schedule) {
      return { exists: false };
    }

    return {
      exists: true,
      enabled: schedule.enabled,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      nextExecution: schedule.nextExecution,
      lastExecution: schedule.lastExecution,
      description: this.parseCronExpression(schedule.cronExpression),
    };
  }

  /**
   * Clear all schedules
   */
  clearAll(): void {
    for (const schedule of this.schedules.values()) {
      schedule.job.stop();
    }
    this.schedules.clear();

    log.info('All schedules cleared');
    this.emit('schedules:cleared');
  }
}
