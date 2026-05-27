import type { RuntimeCivilizationalResilienceObserveInput } from '../types/runtimeCivilizationalResilience';

export function resetAuditCivilizationPersistenceMonitorForTest(): void {
  /* stateless */
}

export function scoreAuditCivilizationPersistence(
  input: RuntimeCivilizationalResilienceObserveInput,
): number {
  let score = input.runtimeAuditCoverage * 0.4;
  if (input.sessionMinutes > 90 && input.runtimeAuditCoverage > 0.7) score += 0.25;
  if (input.runtimeAuditCoverage > 0.75 && input.simplificationIntegrity < 0.55) score += 0.2;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
