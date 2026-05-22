/**
 * 起動後に非クリティカルなストレージ読み込みを遅延
 */
import { hydrateQuoteCache } from './quoteCache';
import { verboseLog } from './productionLogger';

let deferredDone = false;

export async function runDeferredBootTasks(): Promise<void> {
  if (deferredDone) return;
  deferredDone = true;
  try {
    await hydrateQuoteCache();
    verboseLog('[boot] deferred quote cache hydrated');
  } catch {
    /* non-fatal */
  }
}

export function resetDeferredBootForTest(): void {
  deferredDone = false;
}
