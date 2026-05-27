import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';
import { EXISTENTIAL_CONSTRAINT_SIGNALS } from '../constants/runtimeUnifiedUtility';

export function resetRuntimeExistentialConstraintModelForTest(): void {
  /* stateless */
}

export function detectExistentialConstraintSignals(input: RuntimeUnifiedUtilityObserveInput): string[] {
  const signals: string[] = [];
  if (input.survivabilityEffectiveness > 0.7 && input.continuityScore < 75) {
    signals.push('survival_bias');
  }
  if (input.runtimeAuditCoverage > 0.75 && input.simplificationIntegrity < 0.55) {
    signals.push('audit_addiction');
  }
  if (input.orchestrationEdgeCount > 18 && input.metaCoordinationStability > 0.72) {
    signals.push('orchestration_persistence');
  }
  if (input.interventionDensity > 0.45 && input.equilibriumPersistence > 0.75) {
    signals.push('intervention_permanence');
  }
  return signals.filter((s) =>
    EXISTENTIAL_CONSTRAINT_SIGNALS.includes(s as (typeof EXISTENTIAL_CONSTRAINT_SIGNALS)[number]),
  );
}

export function scoreRuntimeExistentialConstraintRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  const signals = detectExistentialConstraintSignals(input);
  return Math.round(Math.min(1, signals.length * 0.2 + input.runtimePurposeDriftRisk * 0.2) * 1000) / 1000;
}
