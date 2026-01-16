/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Blackboard pattern for shared agent memory
 */

import { log } from '@/utils/logger';
import { EventEmitter } from 'events';

/**
 * Blackboard entry
 */
export interface BlackboardEntry {
  key: string;
  value: any;
  timestamp: Date;
  author: string;
  metadata?: Record<string, any>;
  version: number;
}

/**
 * Blackboard subscription callback
 */
type SubscriptionCallback = (entry: BlackboardEntry, oldValue?: any) => void;

/**
 * Blackboard for shared memory between agents
 * Implements the Blackboard architectural pattern
 */
export class Blackboard extends EventEmitter {
  private data: Map<string, BlackboardEntry>;
  private subscriptions: Map<string, SubscriptionCallback[]>; // key -> callbacks
  private history: Map<string, BlackboardEntry[]>; // key -> history
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    super();
    this.data = new Map();
    this.subscriptions = new Map();
    this.history = new Map();
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Write data to the blackboard
   */
  write(key: string, value: any, author: string, metadata?: Record<string, any>): void {
    const oldEntry = this.data.get(key);
    const oldValue = oldEntry?.value;
    const version = (oldEntry?.version || 0) + 1;

    const entry: BlackboardEntry = {
      key,
      value,
      timestamp: new Date(),
      author,
      metadata,
      version,
    };

    this.data.set(key, entry);

    // Add to history
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    const keyHistory = this.history.get(key)!;
    keyHistory.push(entry);
    if (keyHistory.length > this.maxHistorySize) {
      keyHistory.shift(); // Remove oldest
    }

    // Emit events
    this.emit('write', entry, oldValue);
    this.emit(`write:${key}`, entry, oldValue);

    // Notify subscribers
    this.notifySubscribers(key, entry, oldValue);

    log.debug('Blackboard write', { key, author, version });
  }

  /**
   * Read data from the blackboard
   */
  read(key: string): any {
    const entry = this.data.get(key);
    return entry?.value;
  }

  /**
   * Read full entry from the blackboard
   */
  readEntry(key: string): BlackboardEntry | undefined {
    return this.data.get(key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * Delete data from the blackboard
   */
  delete(key: string, author: string): boolean {
    const entry = this.data.get(key);
    if (!entry) {
      return false;
    }

    this.data.delete(key);

    // Emit events
    this.emit('delete', key, entry, author);
    this.emit(`delete:${key}`, entry, author);

    log.debug('Blackboard delete', { key, author });
    return true;
  }

  /**
   * Update data (merge with existing)
   */
  update(key: string, updates: any, author: string, metadata?: Record<string, any>): void {
    const current = this.read(key);
    const newValue =
      typeof current === 'object' && current !== null
        ? { ...current, ...updates }
        : updates;

    this.write(key, newValue, author, metadata);
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.data.keys());
  }

  /**
   * Get all entries
   */
  entries(): BlackboardEntry[] {
    return Array.from(this.data.values());
  }

  /**
   * Get all data as object
   */
  toObject(): Record<string, any> {
    const result: Record<string, any> = {};
    this.data.forEach((entry, key) => {
      result[key] = entry.value;
    });
    return result;
  }

  /**
   * Clear the blackboard
   */
  clear(): void {
    this.data.clear();
    this.history.clear();
    this.emit('clear');
    log.debug('Blackboard cleared');
  }

  /**
   * Subscribe to changes on a key
   */
  subscribe(key: string, callback: SubscriptionCallback): void {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(callback);
    log.debug('Subscribed to blackboard key', { key });
  }

  /**
   * Unsubscribe from changes
   */
  unsubscribe(key: string, callback?: SubscriptionCallback): void {
    if (!callback) {
      this.subscriptions.delete(key);
      log.debug('Unsubscribed from blackboard key (all)', { key });
    } else {
      const callbacks = this.subscriptions.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      log.debug('Unsubscribed from blackboard key', { key });
    }
  }

  /**
   * Get history for a key
   */
  getHistory(key: string, limit?: number): BlackboardEntry[] {
    const keyHistory = this.history.get(key) || [];
    if (limit) {
      return keyHistory.slice(-limit);
    }
    return keyHistory;
  }

  /**
   * Query entries by author
   */
  getByAuthor(author: string): BlackboardEntry[] {
    return Array.from(this.data.values()).filter((entry) => entry.author === author);
  }

  /**
   * Query entries by metadata
   */
  query(predicate: (entry: BlackboardEntry) => boolean): BlackboardEntry[] {
    return Array.from(this.data.values()).filter(predicate);
  }

  /**
   * Get entries with keys matching pattern
   */
  getByPattern(pattern: RegExp): BlackboardEntry[] {
    return Array.from(this.data.values()).filter((entry) => pattern.test(entry.key));
  }

  /**
   * Notify subscribers of changes
   */
  private notifySubscribers(key: string, entry: BlackboardEntry, oldValue?: any): void {
    const callbacks = this.subscriptions.get(key) || [];
    callbacks.forEach((callback) => {
      try {
        callback(entry, oldValue);
      } catch (error: any) {
        log.error('Blackboard subscription callback error', {
          key,
          error: error.message,
        });
      }
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    entryCount: number;
    subscriptionCount: number;
    totalHistorySize: number;
  } {
    let totalHistorySize = 0;
    this.history.forEach((hist) => {
      totalHistorySize += hist.length;
    });

    return {
      entryCount: this.data.size,
      subscriptionCount: this.subscriptions.size,
      totalHistorySize,
    };
  }

  /**
   * Export blackboard state
   */
  export(): {
    data: Record<string, BlackboardEntry>;
    timestamp: Date;
  } {
    const data: Record<string, BlackboardEntry> = {};
    this.data.forEach((entry, key) => {
      data[key] = entry;
    });

    return {
      data,
      timestamp: new Date(),
    };
  }

  /**
   * Import blackboard state
   */
  import(exported: { data: Record<string, BlackboardEntry> }): void {
    Object.entries(exported.data).forEach(([key, entry]) => {
      this.data.set(key, entry);
    });
    log.info('Blackboard state imported', { entryCount: Object.keys(exported.data).length });
  }
}

/**
 * Create a new blackboard instance
 */
export function createBlackboard(maxHistorySize?: number): Blackboard {
  return new Blackboard(maxHistorySize);
}
