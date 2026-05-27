import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';
import type { RuntimeInterCivilizationTimelineEntry } from '../types/runtimeInterCivilizationResonance';

let soakHookEnabled = false;

export function resetInterCivilizationSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setInterCivilizationSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordInterCivilizationSoakEvent(entry: RuntimeInterCivilizationTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime inter-civilization ${entry.flow}`);
}

export const simulateOntologyCollisionStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology collision storm replay');
};
export const simulateRecursiveWorldviewResonanceReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive worldview resonance replay');
};
export const simulateSemanticPolarizationCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic polarization cascade replay');
};
export const simulateObserverSynchronizationCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer synchronization collapse replay');
};
export const simulateCivilizationDriftRunawayReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'civilization drift runaway replay');
};
export const simulateNarrativeConflictAmplificationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'narrative conflict amplification replay');
};
export const simulateRecursiveMeaningFragmentationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive meaning fragmentation replay');
};
export const simulateOntologyAuthorityWarReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology authority war replay');
};
export const simulateSemanticConvergenceImplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic convergence implosion replay');
};
export const simulateCivilizationIsolationCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'civilization isolation cascade replay');
};
