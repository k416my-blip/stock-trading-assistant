import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';
import { PURPOSE_DRIFT_SIGNALS } from '../constants/runtimePurposeIntegrity';

export function resetRuntimePurposeDriftDetectorForTest(): void {
  /* stateless */
}

export function detectPurposeDriftSignals(input: RuntimePurposeIntegrityObserveInput): string[] {
  const signals: string[] = [];
  if (input.survivabilityEffectiveness > 0.7 && input.continuityScore < 75) {
    signals.push('survivability_overoptimization');
  }
  if (input.orchestrationEdgeCount > 18 && input.metaCoordinationStability > 0.72) {
    signals.push('orchestration_persistence');
  }
  if (input.runtimeAuditCoverage > 0.75 && input.sessionMinutes > 90) {
    signals.push('audit_persistence');
  }
  if (input.interventionDensity > 0.45 && input.equilibriumPersistence > 0.7) {
    signals.push('intervention_fixation');
  }
  if (input.equilibriumPersistence > 0.75 && input.runtimeCalmnessIndex > 0.7) {
    signals.push('equilibrium_maintenance_bias');
  }
  if (input.runtimeTradingSuppression > 0.4 && input.continuityScore > 78) {
    signals.push('suppression_permanence');
  }
  return signals.filter((s) => PURPOSE_DRIFT_SIGNALS.includes(s as (typeof PURPOSE_DRIFT_SIGNALS)[number]));
}

export function scoreRuntimePurposeDriftRisk(input: RuntimePurposeIntegrityObserveInput): number {
  const signals = detectPurposeDriftSignals(input);
  return Math.round(Math.min(1, signals.length * 0.17 + input.metaRecursionRisk * 0.15) * 1000) / 1000;
}
