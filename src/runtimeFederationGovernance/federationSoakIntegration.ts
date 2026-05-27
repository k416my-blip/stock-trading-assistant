import type { RuntimeFederationTimelineEntry } from '../types/runtimeFederationGovernance';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetFederationSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setFederationSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordFederationSoakEvent(entry: RuntimeFederationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime federation ${entry.flow}`);
}

export function simulateMetricExplosionStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'metric explosion storm replay');
}

export function simulateDashboardSaturationFloodReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'federation dashboard saturation flood replay');
}

export function simulateFederationDriftCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'federation drift cascade replay');
}

export function simulateRecursiveOverlapAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive overlap amplification replay');
}

export function simulateObserverDependencyDeadlockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer dependency deadlock replay');
}

export function simulateSemanticRedundancyExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic redundancy explosion replay');
}

export function simulateReplayChainDuplicationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay chain duplication replay');
}

export function simulateGovernanceFederationFragmentationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance federation fragmentation replay');
}
