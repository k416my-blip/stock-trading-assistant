import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';
import type { RuntimeGovernanceFreezeTimelineEntry } from '../types/runtimeGovernanceFreeze';

let soakHookEnabled = false;

export function resetGovernanceFreezeSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setGovernanceFreezeSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordGovernanceFreezeSoakEvent(entry: RuntimeGovernanceFreezeTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime governance freeze ${entry.flow}`);
}

export const simulateRecursiveExpansionRunawayReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive expansion runaway replay');
};
export const simulateObservabilityOverloadCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observability overload cascade replay');
};
export const simulateGovernanceSaturationStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'governance saturation storm replay');
};
export const simulateStackProliferationExplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'stack proliferation explosion replay');
};
export const simulateVerifyCongestionCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'verify congestion collapse replay');
};
export const simulateTelemetryOverloadAmplificationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'telemetry overload amplification replay');
};
export const simulateDashboardOperationalSaturationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'dashboard operational saturation replay');
};
export const simulateRecursiveInstrumentationRecursionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive instrumentation recursion replay');
};
export const simulateRuntimeStabilizationDeadlockReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'runtime stabilization deadlock replay');
};
export const simulateExpansionFreezeFailureLoopReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'expansion freeze failure loop replay');
};
