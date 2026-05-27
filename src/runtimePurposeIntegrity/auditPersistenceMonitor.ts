import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

export function resetAuditPersistenceMonitorForTest(): void {
  /* stateless */
}

export function detectAuditPersistenceSignals(input: RuntimePurposeIntegrityObserveInput): string[] {
  const signals: string[] = [];
  if (input.runtimeAuditCoverage > 0.72 && input.sessionMinutes > 60) signals.push('audit_creep');
  if (input.runtimeAuditCoverage > 0.78 && input.simplificationIntegrity < 0.55) {
    signals.push('audit_permanence');
  }
  if (input.runtimeAuditCoverage > 0.7 && input.interventionDensity > 0.4) {
    signals.push('audit_intervention_coupling');
  }
  return signals;
}

export function scoreAuditPersistenceRisk(input: RuntimePurposeIntegrityObserveInput): number {
  const signals = detectAuditPersistenceSignals(input);
  return Math.round(Math.min(1, signals.length * 0.22 + input.runtimeAuditCoverage * 0.35) * 1000) / 1000;
}
