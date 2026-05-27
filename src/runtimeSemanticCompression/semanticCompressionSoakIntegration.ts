import type { RuntimeSemanticCompressionTimelineEntry } from '../types/runtimeSemanticCompression';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetSemanticCompressionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setSemanticCompressionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordSemanticCompressionSoakEvent(entry: RuntimeSemanticCompressionTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `runtime semantic compression ${entry.flow}`);
}

export function simulateMetricAliasExplosionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'metric alias explosion replay');
}

export function simulateSemanticDuplicationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic duplication storm replay');
}

export function simulateDashboardSemanticSaturationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'dashboard semantic saturation replay');
}

export function simulateRecursiveNamingCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive naming cascade replay');
}

export function simulateOntologyCompressionCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'ontology compression collapse replay');
}

export function simulateObserverDependencyDeadlockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer dependency deadlock replay');
}

export function simulateSemanticIdentityFragmentationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic identity fragmentation replay');
}

export function simulateCanonicalizationRecursionLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'canonicalization recursion loop replay');
}
