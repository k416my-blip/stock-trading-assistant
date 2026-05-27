import type { RuntimeSemanticPhaseTimelineEntry } from '../types/runtimeSemanticPhaseTransition';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSemanticPhaseSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSemanticPhaseSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSemanticPhaseSoakEvent(entry: RuntimeSemanticPhaseTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime semantic phase ${entry.flow}`);
}

export const simulateSemanticCrystallizationStormReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic crystallization storm replay');
};
export const simulateOntologyStateCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology state collapse replay');
};
export const simulateRecursiveMeaningFreezingReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive meaning freezing replay');
};
export const simulateObserverSynchronizationCascadeReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'observer synchronization cascade replay');
};
export const simulateSemanticFluidTurbulenceReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic fluid turbulence replay');
};
export const simulateWorldviewPhaseLockingReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'worldview phase locking replay');
};
export const simulateSemanticRigidityExplosionReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic rigidity explosion replay');
};
export const simulateRecursiveOntologyCondensationReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'recursive ontology condensation replay');
};
export const simulateSemanticDiffusionRunawayReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'semantic diffusion runaway replay');
};
export const simulateOntologyElasticityCollapseReplay = (): void => {
  if (soakHookEnabled) recordSoakTimeline('checkpoint', 'ontology elasticity collapse replay');
};
