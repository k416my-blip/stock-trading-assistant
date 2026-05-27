import type { RuntimeCognitiveGovernanceTimelineEntry } from '../types/runtimeCognitiveGovernance';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetCognitiveGovernanceSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setCognitiveGovernanceSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordCognitiveGovernanceSoakEvent(
  entry: RuntimeCognitiveGovernanceTimelineEntry,
): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `cognitive governance ${entry.flow}`);
}

export function simulateDashboardOverloadFloodReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'dashboard overload flood replay');
}

export function simulateSemanticDuplicationStormReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic duplication storm replay');
}

export function simulateGovernanceAbstractionRecursionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance abstraction recursion replay');
}

export function simulateReplayNarrativeInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'replay narrative inflation replay');
}

export function simulateObserverContextFragmentationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer context fragmentation replay');
}

export function simulateSignalPriorityInversionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'signal priority inversion replay');
}

export function simulateOperatorAttentionCollapseReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'operator attention collapse replay');
}

export function simulateTimelineSemanticDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'timeline semantic drift replay');
}
