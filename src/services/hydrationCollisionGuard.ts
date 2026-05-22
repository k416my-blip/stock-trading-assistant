import { HYDRATION_PAUSE_WINDOW_MS } from '../constants/asyncRuntimeCoordinator';
import { scheduleDedupedTimer, markHydrationComplete } from './mobileRedmiRuntime';
import {
  noteHydrationCompleted,
  noteHydrationStarted,
} from './hydrationResumeTelemetry';
import { resolveAsyncBudgetDecision } from './asyncBudgetSystem';

let hydrationInFlight = false;
let orchestrationPausedUntil = 0;
let lastHydrationKey: string | null = null;
let lastHydrationAt = 0;

export function resetHydrationCollisionGuardForTest(): void {
  hydrationInFlight = false;
  orchestrationPausedUntil = 0;
  lastHydrationKey = null;
  lastHydrationAt = 0;
}

export function isOrchestrationPausedForHydration(): boolean {
  return Date.now() < orchestrationPausedUntil;
}

export function beginHydrationPauseWindow(): void {
  orchestrationPausedUntil = Date.now() + HYDRATION_PAUSE_WINDOW_MS;
}

export async function runSerializedHydration(
  key: string,
  fn: () => Promise<void>,
): Promise<boolean> {
  const { isRedmiFullHydrationBlocked } = await import('../runtime/orchestrator/redmiOrchestratorGuard');
  if (isRedmiFullHydrationBlocked()) return false;
  if (hydrationInFlight) return false;
  if (lastHydrationKey === key && Date.now() - lastHydrationAt < HYDRATION_PAUSE_WINDOW_MS) {
    return false;
  }
  const decision = resolveAsyncBudgetDecision('hydration');
  if (decision === 'defer' || decision === 'idle_schedule') return false;

  hydrationInFlight = true;
  beginHydrationPauseWindow();
  lastHydrationKey = key;
  noteHydrationStarted(key);
  void import('../native/runtime/lifecycleTimeline').then(({ recordLifecycleEvent }) => {
    recordLifecycleEvent('hydration_start', key, false);
  });
  const hydrationStarted = Date.now();
  try {
    await fn();
    markHydrationComplete();
    const hydrationMs = Date.now() - hydrationStarted;
    noteHydrationCompleted(hydrationMs);
    void import('../native/runtime/lifecycleTimeline').then(({ recordLifecycleEvent }) => {
      recordLifecycleEvent('hydration_end', `${hydrationMs}ms`, false);
    });
    if (hydrationMs > 800) {
      void import('../native/runtime/miuiReclaimDetector').then(({ noteMiuiHydrationResetSpike }) => {
        noteMiuiHydrationResetSpike();
      });
    }
    void import('./runtimeTelemetryEngine').then(({ recordHydrationDurationMs }) => {
      recordHydrationDurationMs(hydrationMs);
    });
    lastHydrationAt = Date.now();
    return true;
  } finally {
    hydrationInFlight = false;
  }
}

export function scheduleDelayedWebsocketRestore(delayMs: number, onReady: () => void): void {
  scheduleDedupedTimer('hydration-ws-restore', onReady, delayMs);
}

export function getHydrationCollisionRiskPct(queueSize: number, resumeSpike: boolean): number {
  let risk = hydrationInFlight ? 40 : 0;
  if (resumeSpike) risk += 25;
  if (queueSize > 40) risk += 15;
  return Math.min(100, risk);
}
