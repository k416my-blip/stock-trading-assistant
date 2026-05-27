import type { RuntimeAgencyIntegrityObserveInput } from '../types/runtimeAgencyIntegrity';
import {
  AUTONOMY_DRIFT_SIGNALS,
  RUNTIME_AGENCY_INTEGRITY_LONG_SESSION_MIN,
} from '../constants/runtimeAgencyIntegrity';

export function resetLongSessionAutonomyDriftEngineForTest(): void {
  /* stateless */
}

export function detectAutonomyDriftSignals(input: RuntimeAgencyIntegrityObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_AGENCY_INTEGRITY_LONG_SESSION_MIN) return [];
  const signals: string[] = [];
  if (input.orchestrationEdgeCount > 18) signals.push('orchestration_persistence');
  if (input.observerDensityScore > 0.5) signals.push('observer_accumulation');
  if (input.runtimeSelfLimitationScore < 0.55 && input.governanceConfidence > 0.72) {
    signals.push('autonomy_stabilization');
  }
  if (input.simplificationIntegrity < 0.52 && input.interventionDensity > 0.42) {
    signals.push('constraint_decay');
  }
  if (input.equilibriumPersistence > 0.75 && input.interventionDensity < 0.22) {
    signals.push('equilibrium_dependency');
  }
  return signals.filter((s) =>
    AUTONOMY_DRIFT_SIGNALS.includes(s as (typeof AUTONOMY_DRIFT_SIGNALS)[number]),
  );
}

export function scoreRuntimeAutonomyDriftRisk(input: RuntimeAgencyIntegrityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_AGENCY_INTEGRITY_LONG_SESSION_MIN) return 0.1;
  const signals = detectAutonomyDriftSignals(input);
  let risk = signals.length * 0.17;
  risk += input.runtimeEpistemicDriftRisk * 0.22;
  risk += input.runtimeCivilizationDriftRisk * 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
