import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';
import {
  NARRATIVE_DRIFT_SIGNALS,
  RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN,
} from '../constants/runtimeNarrativeIntegrity';

export function resetLongSessionNarrativeDriftEngineForTest(): void {
  /* stateless */
}

export function detectNarrativeDriftSignals(input: RuntimeNarrativeIntegrityObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN) return [];
  const signals: string[] = [];
  if (input.runtimeEpistemicDriftRisk > 0.35 || input.runtimePurposeDriftRisk > 0.35) {
    signals.push('semantic_accumulation');
  }
  if (input.runtimeAuditCoverage > 0.78 && input.recursiveAuditFixationRisk > 0.35) {
    signals.push('recursive_explanation');
  }
  if (input.equilibriumPersistence > 0.75 && input.runtimeWorldviewLockRisk > 0.35) {
    signals.push('storyline_fixation');
  }
  if (input.runtimeStrategicCoherence > 0.78 && input.runtimeRealityDistortionRisk > 0.35) {
    signals.push('coherence_mythology');
  }
  if (input.observerConfirmationLoopRisk > 0.38 && input.recursiveBeliefReinforcementRisk > 0.35) {
    signals.push('interpretation_persistence');
  }
  return signals.filter((s) =>
    NARRATIVE_DRIFT_SIGNALS.includes(s as (typeof NARRATIVE_DRIFT_SIGNALS)[number]),
  );
}

export function scoreRuntimeNarrativeDriftRisk(input: RuntimeNarrativeIntegrityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_NARRATIVE_INTEGRITY_LONG_SESSION_MIN) return 0.1;
  const signals = detectNarrativeDriftSignals(input);
  let risk = signals.length * 0.17;
  risk += input.runtimeIntrospectionDriftRisk * 0.2;
  risk += runtimeSemanticDriftProxy(input) * 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

function runtimeSemanticDriftProxy(input: RuntimeNarrativeIntegrityObserveInput): number {
  return (
    input.runtimeEpistemicDriftRisk * 0.4 +
    input.runtimePurposeDriftRisk * 0.35 +
    input.runtimeSelfModelDriftRisk * 0.25
  );
}
