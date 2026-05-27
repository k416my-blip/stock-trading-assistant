import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';
import {
  EPISTEMIC_DRIFT_SIGNALS,
  RUNTIME_EPISTEMIC_INTEGRITY_LONG_SESSION_MIN,
} from '../constants/runtimeEpistemicIntegrity';

export function resetLongSessionEpistemicDriftEngineForTest(): void {
  /* stateless */
}

export function detectEpistemicDriftSignals(
  input: RuntimeEpistemicIntegrityObserveInput,
): string[] {
  if (input.sessionMinutes < RUNTIME_EPISTEMIC_INTEGRITY_LONG_SESSION_MIN) return [];
  const signals: string[] = [];
  if (input.observerDensityScore > 0.5) signals.push('observer_accumulation');
  if (input.runtimeAuditCoverage > 0.72) signals.push('audit_persistence');
  if (input.observerDensityScore > 0.48 && input.equilibriumPersistence > 0.72) {
    signals.push('belief_reinforcement');
  }
  if (input.recursiveGovernanceEcologyRisk > 0.35) signals.push('governance_recursion');
  if (input.orchestrationEdgeCount > 18 && input.runtimeOrchestrationCivilizationRisk > 0.35) {
    signals.push('worldview_fixation');
  }
  return signals.filter((s) =>
    EPISTEMIC_DRIFT_SIGNALS.includes(s as (typeof EPISTEMIC_DRIFT_SIGNALS)[number]),
  );
}

export function scoreRuntimeEpistemicDriftRisk(input: RuntimeEpistemicIntegrityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_EPISTEMIC_INTEGRITY_LONG_SESSION_MIN) return 0.1;
  const signals = detectEpistemicDriftSignals(input);
  let risk = signals.length * 0.17;
  risk += input.runtimeCivilizationDriftRisk * 0.25;
  risk += input.runtimeExistentialDriftRisk * 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
