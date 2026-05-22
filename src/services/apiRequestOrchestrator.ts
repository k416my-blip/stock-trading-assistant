/**
 * 汎用APIオーケストレータ — 同時実行上限・同一キーデデュープ
 * （Twelve Data キューとは別 — News/X/その他 fetch 用）
 */
import { API_ORCHESTRATOR_MAX_CONCURRENT } from '../constants/performanceCost';
import { verboseLog } from './productionLogger';

type Waiter<T> = {
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};

type PendingGroup = {
  key: string;
  run: () => Promise<unknown>;
  waiters: Waiter<unknown>[];
  running: boolean;
};

class ApiRequestOrchestrator {
  private fifo: PendingGroup[] = [];
  private pendingByKey = new Map<string, PendingGroup>();
  private inFlight = 0;
  private inflightByKey = new Map<string, Promise<unknown>>();

  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existingFlight = this.inflightByKey.get(key);
    if (existingFlight) {
      return existingFlight as Promise<T>;
    }

    const promise = new Promise<T>((resolve, reject) => {
      const waiter: Waiter<T> = {
        resolve: resolve as (v: unknown) => void,
        reject,
      };
      const existing = this.pendingByKey.get(key);
      if (existing && !existing.running) {
        existing.run = task as () => Promise<unknown>;
        existing.waiters.push(waiter as Waiter<unknown>);
        void this.pump();
        return;
      }
      const group: PendingGroup = {
        key,
        run: task as () => Promise<unknown>,
        waiters: [waiter as Waiter<unknown>],
        running: false,
      };
      this.pendingByKey.set(key, group);
      this.fifo.push(group);
      void this.pump();
    });

    const tracked = promise.finally(() => {
      if (this.inflightByKey.get(key) === tracked) {
        this.inflightByKey.delete(key);
      }
    });
    this.inflightByKey.set(key, tracked);
    return tracked;
  }

  private async pump(): Promise<void> {
    while (this.inFlight < API_ORCHESTRATOR_MAX_CONCURRENT && this.fifo.length > 0) {
      const group = this.fifo.find((g) => !g.running);
      if (!group) break;
      group.running = true;
      this.inFlight += 1;
      void this.runGroup(group);
    }
  }

  private async runGroup(group: PendingGroup): Promise<void> {
    try {
      verboseLog('[api-orchestrator] run', group.key);
      const result = await group.run();
      for (const w of group.waiters) w.resolve(result);
    } catch (e) {
      for (const w of group.waiters) w.reject(e);
    } finally {
      group.waiters = [];
      this.pendingByKey.delete(group.key);
      this.fifo = this.fifo.filter((g) => g !== group);
      this.inFlight = Math.max(0, this.inFlight - 1);
      void this.pump();
    }
  }

  getSnapshot(): { inFlight: number; pending: number } {
    return {
      inFlight: this.inFlight,
      pending: this.fifo.reduce((n, g) => n + g.waiters.length, 0),
    };
  }
}

export const apiRequestOrchestrator = new ApiRequestOrchestrator();

export function orchestrateApiRequest<T>(
  dedupeKey: string,
  task: () => Promise<T>,
): Promise<T> {
  return apiRequestOrchestrator.enqueue(dedupeKey, task);
}
