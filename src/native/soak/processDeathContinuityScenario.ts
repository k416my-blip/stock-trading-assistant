import {
  simulateProcessDeathInjection,
  simulatePersistenceCorruptionInjection,
  simulateInterruptedExportInjection,
  observeProcessContinuity,
} from '../../recovery/processContinuity';
import { recordSoakTimeline } from './sessionTimelineRecorder';

export function resetProcessDeathContinuityScenarioForTest(): void {
  /* stateless */
}

/** Observe-only process death / cold start continuity simulation. */
export async function runProcessDeathContinuityScenarioStep(): Promise<string> {
  simulateProcessDeathInjection();
  simulatePersistenceCorruptionInjection();
  simulateInterruptedExportInjection();
  observeProcessContinuity({
    eventLoopLagMs: 120,
    jsHeapMb: 140,
    memoryTrendPct: 55,
    thermalState: 'moderate',
    appForeground: false,
    screenOff: true,
    batterySaver: false,
    miuiAggressiveReclaim: true,
    hydrationOverlapCount: 1,
    hydrationLockActive: true,
    recoveryAttemptCount: 1,
    asyncQueueDepth: 2,
    sessionMinutes: 0.5,
  });
  recordSoakTimeline('recovery', 'process continuity cold-start observe');
  return 'process death continuity observe';
}
