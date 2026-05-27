import type { RuntimeOntologyTimelineEntry } from '../types/runtimeOntologyStabilization';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetOntologySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setOntologySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordOntologySoakEvent(entry: RuntimeOntologyTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime ontology ${entry.flow}`);
}

export function simulateSymbolicMeaningCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'symbolic meaning collapse replay');
}

export function simulateRecursiveOntologyAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive ontology amplification replay');
}

export function simulateObserverGeneratedUniverseLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer-generated universe loop replay');
}

export function simulateSemanticAnchorErosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic anchor erosion replay');
}

export function simulateNarrativeRealityInversionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'narrative-reality inversion replay');
}

export function simulateSymbolicClosedLoopExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'symbolic closed-loop explosion replay');
}

export function simulateOntologyFragmentationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'ontology fragmentation storm replay');
}

export function simulateSemanticGravityCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic gravity collapse replay');
}

export function simulateRecursiveSymbolicInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive symbolic inflation replay');
}
