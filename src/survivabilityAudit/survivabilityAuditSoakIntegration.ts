import type { SurvivabilityAuditTimelineEntry } from '../types/survivabilityAuditValidation';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSurvivabilityAuditSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSurvivabilityAuditSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSurvivabilityAuditSoakEvent(entry: SurvivabilityAuditTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `survivability audit ${entry.flow} · ${entry.detailJa}`);
}

export function simulateObserverSuppressionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer suppression replay');
}

export function simulateRecoveryReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recovery replay');
}

export function simulateWebsocketInstabilityAuditReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket instability replay');
}

export function simulateThermalAuditReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal replay');
}

export function simulateMiuiReclaimAuditReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'MIUI reclaim replay');
}

export function simulateLongSessionAuditReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session replay');
}

export function simulateEntropyDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'entropy drift replay');
}

export function simulatePacingDegradationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'pacing degradation replay');
}
