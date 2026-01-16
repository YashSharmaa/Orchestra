/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Scheduler module exports
 */

export { CronScheduler, ScheduleConfig, ScheduledWorkflow } from './CronScheduler';

// Singleton instance
import { CronScheduler } from './CronScheduler';

let schedulerInstance: CronScheduler | null = null;

/**
 * Get singleton scheduler instance
 */
export function getScheduler(): CronScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new CronScheduler();
  }
  return schedulerInstance;
}

/**
 * Initialize and start the scheduler
 */
export function initializeScheduler(): CronScheduler {
  const scheduler = getScheduler();
  scheduler.start();
  return scheduler;
}
