import type { RuntimeSemanticThermodynamicsTimelineEntry } from '../types/runtimeSemanticThermodynamics';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSemanticThermodynamicsSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSemanticThermodynamicsSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSemanticThermodynamicsSoakEvent(entry: RuntimeSemanticThermodynamicsTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime semantic thermodynamics ${entry.flow}`);
}

export const simulateSemanticHeatExplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic heat explosion replay');
};
export const simulateOntologyTurbulenceStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology turbulence storm replay');
};
export const simulateRecursiveEntropyAmplificationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive entropy amplification replay');
};
export const simulateDashboardThermalSaturationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'dashboard thermal saturation replay');
};
export const simulateObserverBurnoutCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer burnout cascade replay');
};
export const simulateSemanticNoiseFloodingReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic noise flooding replay');
};
export const simulateReplayHeatRunawayReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'replay heat runaway replay');
};
export const simulateOntologyConvectionCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology convection collapse replay');
};
export const simulateRecursiveMeaningOverheatingReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive meaning overheating replay');
};
export const simulateSemanticHeatDeathFormationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic heat death formation replay');
};
