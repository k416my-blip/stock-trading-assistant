import type { RuntimeSemanticGravityTimelineEntry } from '../types/runtimeSemanticGravity';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSemanticGravitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSemanticGravitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSemanticGravitySoakEvent(entry: RuntimeSemanticGravityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime semantic gravity ${entry.flow}`);
}

export function simulateCanonicalTruthCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'canonical truth collapse replay');
}

export function simulateSemanticSingularityFormationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic singularity formation replay');
}

export function simulateOntologyCentralizationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'ontology centralization storm replay');
}

export function simulateRecursiveBeliefAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive belief amplification replay');
}

export function simulateObserverWorldviewConvergenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer worldview convergence replay');
}

export function simulateSemanticMonocultureCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic monoculture cascade replay');
}

export function simulateCanonicalMetricWorshipLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'canonical metric worship loop replay');
}

export function simulateAnchorDivergenceExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'anchor divergence explosion replay');
}

export function simulateRecursiveMeaningGravitationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive meaning gravitation replay');
}

export function simulateSemanticAuthorityCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic authority collapse replay');
}
