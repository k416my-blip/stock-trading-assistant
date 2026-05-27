import type { NarrativeIntegrityTimelineEntry } from '../types/runtimeNarrativeIntegrity';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetNarrativeIntegritySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setNarrativeIntegritySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordNarrativeIntegritySoakEvent(entry: NarrativeIntegrityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `narrative integrity ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursiveNarrativeInflationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive narrative inflation replay');
}

export function simulateSemanticDriftAccumulationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic drift accumulation replay');
}

export function simulateExplanationLoopFixationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'explanation loop fixation replay');
}

export function simulateNarrativeLockInReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'narrative lock-in replay');
}

export function simulateCoherenceMythologyReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'coherence mythology replay');
}

export function simulateStorylineSelfReinforcementReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'storyline self-reinforcement replay');
}

export function simulateLongSessionNarrativeDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session narrative drift replay');
}

export function simulateSemanticHallucinationPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'semantic hallucination persistence replay');
}
