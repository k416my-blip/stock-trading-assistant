import type { PurposeIntegrityTimelineEntry } from '../types/runtimePurposeIntegrity';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetPurposeIntegritySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setPurposeIntegritySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordPurposeIntegritySoakEvent(entry: PurposeIntegrityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `purpose integrity ${entry.flow} · ${entry.detailJa}`);
}

export function simulatePurposeDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'purpose drift replay');
}

export function simulateStabilityAddictionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'stability addiction replay');
}

export function simulateOrchestrationHollowingReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration hollowing replay');
}

export function simulateGovernanceInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance inflation replay');
}

export function simulateSurvivabilityDivergenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'survivability divergence replay');
}

export function simulateAuditPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'audit persistence replay');
}

export function simulateInterventionInefficiencyReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'intervention inefficiency replay');
}

export function simulateLongSessionValueErosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session value erosion replay');
}
