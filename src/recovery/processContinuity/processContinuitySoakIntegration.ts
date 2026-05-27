import type { ProcessContinuityTimelineEntry } from '../../types/processContinuityRecovery';
import { recordSoakTimeline } from '../../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetProcessContinuitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setProcessContinuitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordProcessContinuitySoakEvent(entry: ProcessContinuityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('recovery', `continuity ${entry.flow} · ${entry.detailJa}`);
}

export function simulateProcessDeathInjection(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'process death injection · observe-only');
}

export function simulatePersistenceCorruptionInjection(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'persistence corruption simulation');
}

export function simulateInterruptedExportInjection(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'interrupted export simulation');
}
