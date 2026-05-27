import type { RuntimeMetaLimitTimelineEntry } from '../types/runtimeMetaLimitGovernance';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetMetaLimitSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setMetaLimitSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordMetaLimitSoakEvent(entry: RuntimeMetaLimitTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `meta-limit ${entry.flow}`);
}

export function simulateInfiniteObserverRecursionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'infinite observer recursion replay');
}

export function simulateTopologySelfReferenceStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'topology self-reference storm replay');
}

export function simulateGovernanceMetaCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance meta cascade replay');
}

export function simulateSemanticSelfDefinitionLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic self-definition loop replay');
}

export function simulateReplayNarratingReplayNarratorsReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay narrating replay narrators replay');
}

export function simulateMonitoringChainExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'monitoring-chain explosion replay');
}

export function simulateRecursiveDashboardAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive dashboard amplification replay');
}

export function simulateEpistemicBoundaryErosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'epistemic boundary erosion replay');
}
