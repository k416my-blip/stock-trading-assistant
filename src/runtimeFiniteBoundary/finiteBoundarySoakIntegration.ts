import type { RuntimeFiniteBoundaryTimelineEntry } from '../types/runtimeFiniteBoundary';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetFiniteBoundarySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setFiniteBoundarySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordFiniteBoundarySoakEvent(entry: RuntimeFiniteBoundaryTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime finite boundary ${entry.flow}`);
}

export function simulateObserverMassExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer mass explosion replay');
}

export function simulateRecursionBudgetExhaustionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursion budget exhaustion replay');
}

export function simulateSemanticEntropyOverflowReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic entropy overflow replay');
}

export function simulateDashboardCognitiveSaturationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'dashboard cognitive saturation replay');
}

export function simulateOntologyGravityCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'ontology gravity collapse replay');
}

export function simulateReplayAmplificationRunawayReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay amplification runaway replay');
}

export function simulateTopologyInfiniteBranchingReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'topology infinite branching replay');
}

export function simulateCivilizationStackImplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'civilization stack implosion replay');
}
