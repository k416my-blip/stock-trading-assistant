import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';
import type { RuntimeObserverRealityTimelineEntry } from '../types/runtimeObserverRealitySelection';

let soakHookEnabled = false;

export function resetObserverRealitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setObserverRealitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordObserverRealitySoakEvent(entry: RuntimeObserverRealityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime observer reality ${entry.flow}`);
}

export const simulateRecursiveInterpretationExplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive interpretation explosion replay');
};
export const simulateWorldviewConvergenceStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'worldview convergence storm replay');
};
export const simulateSemanticCausalityCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic causality collapse replay');
};
export const simulateObserverFixationCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer fixation cascade replay');
};
export const simulateNarrativeRealityInversionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'narrative-reality inversion replay');
};
export const simulateRecursiveBranchingRunawayReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive branching runaway replay');
};
export const simulateSemanticTimelineFragmentationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic timeline fragmentation replay');
};
export const simulateOntologyCausalityDistortionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology causality distortion replay');
};
export const simulateObserverNarrativeLockAmplificationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer narrative lock amplification replay');
};
export const simulateSemanticPossibilityImplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic possibility implosion replay');
};
