import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';
import { RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN } from '../constants/runtimeNarrativeIntegrity';

export function resetSemanticDriftAccumulationEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeSemanticDriftRisk(input: RuntimeNarrativeIntegrityObserveInput): number {
  let risk = 0;
  if (input.sessionMinutes >= RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN) {
    risk += input.runtimeEpistemicDriftRisk * 0.28;
    risk += input.runtimePurposeDriftRisk * 0.22;
    risk += input.runtimeSelfModelDriftRisk * 0.2;
  }
  if (input.layerConflictRisk > 0.38) risk += 0.18;
  if (input.runtimeRealityDistortionRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
