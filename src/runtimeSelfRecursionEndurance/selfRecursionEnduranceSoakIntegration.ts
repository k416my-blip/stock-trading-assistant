import type { SelfRecursionEnduranceTimelineEntry } from '../types/runtimeSelfRecursionEndurance';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSelfRecursionEnduranceSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSelfRecursionEnduranceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSelfRecursionEnduranceSoakEvent(entry: SelfRecursionEnduranceTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `self-recursion endurance ${entry.flow}`);
}

export function simulateObserverAuditLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer audit loop replay');
}

export function simulateTelemetryEchoLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'telemetry echo loop replay');
}

export function simulateRecursiveGovernanceFeedbackReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive governance feedback replay');
}

export function simulateDashboardPayloadGrowthReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'dashboard payload growth replay');
}

export function simulateLongSessionDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session drift replay');
}

export function simulateMiuiBackgroundStarvationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'MIUI background starvation replay');
}

export function simulateBatterySaverObserverDelayReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'battery saver observer delay replay');
}

export function simulateNarrativeRecursionAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'narrative recursion amplification replay');
}
