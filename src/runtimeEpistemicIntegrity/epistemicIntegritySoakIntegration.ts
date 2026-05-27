import type { EpistemicIntegrityTimelineEntry } from '../types/runtimeEpistemicIntegrity';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetEpistemicIntegritySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setEpistemicIntegritySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordEpistemicIntegritySoakEvent(entry: EpistemicIntegrityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `epistemic integrity ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursiveBeliefLoopReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive belief loop replay');
}

export function simulateObserverConfirmationSpiralReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer confirmation spiral replay');
}

export function simulateUtilityRealityDistortionReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'utility reality distortion replay');
}

export function simulateGovernanceEpistemologyInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'governance epistemology inflation replay');
}

export function simulateEquilibriumHallucinationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'equilibrium hallucination replay');
}

export function simulateOrchestrationWorldviewLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'orchestration worldview lock replay');
}

export function simulateLongSessionEpistemicDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session epistemic drift replay');
}

export function simulateRecursiveCoherenceFixationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive coherence fixation replay');
}
