import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';
import {
  CIVILIZATION_DRIFT_SIGNALS,
  RUNTIME_CIVILIZATIONAL_RESILIENCE_LONG_SESSION_MIN,
} from '../constants/runtimeCivilizationalResilience';

export function resetLongSessionCivilizationDriftEngineForTest(): void {
  /* stateless */
}

export function detectCivilizationDriftSignals(
  input: RuntimeCivilizationalResilienceObserveInput,
): string[] {
  if (input.sessionMinutes < RUNTIME_CIVILIZATIONAL_RESILIENCE_LONG_SESSION_MIN) return [];
  const signals: string[] = [];
  if (input.observerDensityScore > 0.5) signals.push('observer_accumulation');
  if (input.runtimeAuditCoverage > 0.72) signals.push('audit_persistence');
  if (input.runtimeGovernanceInflationRisk > 0.35) signals.push('governance_expansion');
  if (input.equilibriumPersistence > 0.75) signals.push('equilibrium_fixation');
  if (input.metaRecursionRisk > 0.45) signals.push('meta_recursion_creep');
  return signals.filter((s) =>
    CIVILIZATION_DRIFT_SIGNALS.includes(s as (typeof CIVILIZATION_DRIFT_SIGNALS)[number]),
  );
}

export function scoreRuntimeCivilizationDriftRisk(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  if (input.sessionMinutes < RUNTIME_CIVILIZATIONAL_RESILIENCE_LONG_SESSION_MIN) return 0.1;
  const signals = detectCivilizationDriftSignals(input);
  let risk = signals.length * 0.17;
  risk += input.runtimeExistentialDriftRisk * 0.25;
  risk += (1 - input.longSessionPurposeIntegrity) * 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
