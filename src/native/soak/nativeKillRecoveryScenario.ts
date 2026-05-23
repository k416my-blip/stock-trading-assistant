import { beginRecovery, completeRecovery } from './recoveryTimeTracker';
import { recordSoakTimeline } from './sessionTimelineRecorder';
import { fetchNativeRuntimeSnapshot } from '../runtime/nativeRuntimeBridge';

let lastNativeRecoveryMs = 0;

export function resetNativeKillRecoveryScenarioForTest(): void {
  lastNativeRecoveryMs = 0;
}

/** Observe-only: measures native snapshot refresh after reclaim (no storage reset). */
export async function runNativeKillRecoveryScenarioStep(): Promise<string> {
  beginRecovery('native_kill');
  const started = Date.now();
  await fetchNativeRuntimeSnapshot();
  lastNativeRecoveryMs = Date.now() - started;
  completeRecovery('native_kill', true, `native snapshot refresh ${lastNativeRecoveryMs}ms`);
  recordSoakTimeline('recovery', `native reclaim observe · ${lastNativeRecoveryMs}ms`);
  return `native recovery observe · ${lastNativeRecoveryMs}ms`;
}

export function getLastNativeRecoveryLatencyMs(): number {
  return lastNativeRecoveryMs;
}
