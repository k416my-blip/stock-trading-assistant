import type { ObserverRecursionTimelineEntry } from '../types/runtimeObserverRecursion';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetObserverRecursionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setObserverRecursionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordObserverRecursionSoakEvent(entry: ObserverRecursionTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `observer recursion ${entry.flow}`);
}

export function simulateRecursiveObserverCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive observer cascade replay');
}

export function simulateTelemetryEchoInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry echo inflation replay');
}

export function simulateCircularGovernanceAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'circular governance amplification replay');
}

export function simulateObserverDependencyLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer dependency lock replay');
}

export function simulateLongSessionRecursiveDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session recursive drift replay');
}
