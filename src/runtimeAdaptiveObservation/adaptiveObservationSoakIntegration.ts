import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';
import type { RuntimeAdaptiveObservationTimelineEntry } from '../types/runtimeAdaptiveObservation';

let soakHookEnabled = false;

export function resetAdaptiveObservationSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setAdaptiveObservationSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordAdaptiveObservationSoakEvent(entry: RuntimeAdaptiveObservationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime adaptive observation ${entry.flow}`);
}

export const simulateRecursiveTelemetryFloodReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive telemetry flood replay');
};
export const simulateSemanticCongestionStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic congestion storm replay');
};
export const simulateObserverOverloadCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer overload cascade replay');
};
export const simulateDashboardSignalSaturationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'dashboard signal saturation replay');
};
export const simulateRecursiveAttentionFragmentationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive attention fragmentation replay');
};
export const simulateOntologyMonitoringDeadlockReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology monitoring deadlock replay');
};
export const simulateSemanticRoutingCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic routing collapse replay');
};
export const simulateReplayAmplificationCongestionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'replay amplification congestion replay');
};
export const simulateObserverFatigueExplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer fatigue explosion replay');
};
export const simulateTelemetryNoiseAvalancheReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'telemetry noise avalanche replay');
};
