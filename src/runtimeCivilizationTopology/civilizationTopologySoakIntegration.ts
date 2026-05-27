import type { RuntimeCivilizationTopologyTimelineEntry } from '../types/runtimeCivilizationTopology';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetCivilizationTopologySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setCivilizationTopologySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordCivilizationTopologySoakEvent(
  entry: RuntimeCivilizationTopologyTimelineEntry,
): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `civilization topology ${entry.flow}`);
}

export function simulateRecursiveWorldviewAmplificationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive worldview amplification replay');
}

export function simulateGovernanceMeaningCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance meaning collapse replay');
}

export function simulateSemanticCivilizationBifurcationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic civilization bifurcation replay');
}

export function simulateObserverPerspectiveDivergenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer perspective divergence replay');
}

export function simulateEpistemicInstabilityCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'epistemic instability cascade replay');
}

export function simulateReplayRealityInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay reality inflation replay');
}

export function simulateTopologyFragmentationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'topology fragmentation storm replay');
}

export function simulateNarrativeRealityDesynchronizationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'narrative-reality desynchronization replay');
}

export function simulateCivilizationContextCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'civilization context collapse replay');
}
