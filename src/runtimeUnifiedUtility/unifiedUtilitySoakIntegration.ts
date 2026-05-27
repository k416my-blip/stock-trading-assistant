import type { UnifiedUtilityTimelineEntry } from '../types/runtimeUnifiedUtility';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetUnifiedUtilitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setUnifiedUtilitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordUnifiedUtilitySoakEvent(entry: UnifiedUtilityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `unified utility ${entry.flow} · ${entry.detailJa}`);
}

export function simulateUtilityIllusionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'utility illusion replay');
}

export function simulateObserverEmpireReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer empire replay');
}

export function simulateGovernanceInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance inflation replay');
}

export function simulateStabilityAddictionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'stability addiction replay');
}

export function simulateExistentialDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'existential drift replay');
}

export function simulateOrchestrationPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration persistence replay');
}

export function simulateContinuityDistortionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'continuity distortion replay');
}

export function simulateMetaEquilibriumLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'meta equilibrium lock replay');
}
