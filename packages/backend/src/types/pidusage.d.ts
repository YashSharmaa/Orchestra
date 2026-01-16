/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Type declarations for pidusage
 */

declare module 'pidusage' {
  interface Stats {
    cpu: number;
    memory: number;
    ppid: number;
    pid: number;
    ctime: number;
    elapsed: number;
    timestamp: number;
  }

  function pidusage(pid: number): Promise<Stats>;
  function pidusage(pids: number[]): Promise<Record<number, Stats>>;

  export = pidusage;
}
