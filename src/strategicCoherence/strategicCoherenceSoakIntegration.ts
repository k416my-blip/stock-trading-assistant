import type { StrategicCoherenceTimelineEntry } from '../types/strategicCoherence';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetStrategicCoherenceSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setStrategicCoherenceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordStrategicCoherenceSoakEvent(entry: StrategicCoherenceTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `strategic coherence ${entry.flow} · ${entry.detailJa}`);
}

export function simulateObjectiveConflictReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'objective conflict replay');
}

export function simulateOrchestrationIdeologyDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration ideology drift replay');
}

export function simulateCompressionVsAuditReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'compression vs audit replay');
}

export function simulateSuppressionVsContinuityReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'suppression vs continuity replay');
}

export function simulateLongSessionCoherenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session coherence replay');
}

export function simulateUtilityImbalanceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'utility imbalance replay');
}

export function simulatePacingDivergenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'pacing divergence replay');
}

export function simulateEquilibriumCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'equilibrium collapse replay');
}
