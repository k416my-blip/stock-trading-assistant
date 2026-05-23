import { RN_BRIDGE_BATCH_MS } from '../../constants/rnBridgeSurvivability';

type Job = () => void;
const queue: Job[] = [];
let flushAt: ReturnType<typeof setTimeout> | null = null;

export function resetBatchedBridgeSchedulerForTest(): void {
  queue.length = 0;
  if (flushAt) clearTimeout(flushAt);
  flushAt = null;
}

export function scheduleBatchedBridgeJob(job: Job): void {
  queue.push(job);
  if (flushAt) return;
  flushAt = setTimeout(() => {
    flushAt = null;
    const batch = queue.splice(0, queue.length);
    for (const fn of batch) {
      try {
        fn();
      } catch {
        /* profile/export path only */
      }
    }
  }, RN_BRIDGE_BATCH_MS);
}
