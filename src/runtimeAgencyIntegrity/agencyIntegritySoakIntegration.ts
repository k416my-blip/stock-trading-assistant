import type { AgencyIntegrityTimelineEntry } from '../types/runtimeAgencyIntegrity';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetAgencyIntegritySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setAgencyIntegritySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordAgencyIntegritySoakEvent(entry: AgencyIntegrityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `agency integrity ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursiveAutonomyLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive autonomy loop replay');
}

export function simulateObserverAgencyFusionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer-agency fusion replay');
}

export function simulateGovernanceAutonomyCreepReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance autonomy creep replay');
}

export function simulateEquilibriumDependencyLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'equilibrium dependency lock replay');
}

export function simulateOrchestrationPersistenceSpiralReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration persistence spiral replay');
}

export function simulateRecursiveInterventionFixationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive intervention fixation replay');
}

export function simulateLongSessionAutonomyDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session autonomy drift replay');
}

export function simulateConstraintErosionCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'constraint erosion cascade replay');
}
