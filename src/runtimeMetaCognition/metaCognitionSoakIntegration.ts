import type { MetaCognitionTimelineEntry } from '../types/runtimeMetaCognition';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetMetaCognitionSoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setMetaCognitionSoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordMetaCognitionSoakEvent(entry: MetaCognitionTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `meta cognition ${entry.flow} · ${entry.detailJa}`);
}

export function simulateRecursiveSelfObservationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive self observation replay');
}

export function simulateObserverSelfReferenceLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'observer self-reference lock replay');
}

export function simulateCoherenceFixationSpiralReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'coherence fixation spiral replay');
}

export function simulateRecursiveAuditPersistenceReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'recursive audit persistence replay');
}

export function simulateIntrospectionDependencyLockReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'introspection dependency lock replay');
}

export function simulateSelfModelDriftCascadeReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'self-model drift cascade replay');
}

export function simulateLongSessionIntrospectionDriftReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session introspection drift replay');
}

export function simulateSelfExplanationHallucinationReplay(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'self-explanation hallucination replay');
}
