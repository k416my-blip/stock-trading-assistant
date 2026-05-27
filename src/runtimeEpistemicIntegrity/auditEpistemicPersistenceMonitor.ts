import type { RuntimeEpistemicIntegrityObserveInput } from '../types/runtimeEpistemicIntegrity';

export function resetAuditEpistemicPersistenceMonitorForTest(): void {
  /* stateless */
}

export function scoreAuditEpistemicPersistence(input: RuntimeEpistemicIntegrityObserveInput): number {
  let score = input.runtimeAuditCoverage * 0.4;
  if (input.sessionMinutes > 90 && input.runtimeAuditCoverage > 0.72) score += 0.25;
  if (input.runtimeAuditCoverage > 0.75 && input.observerDensityScore > 0.5) score += 0.2;
  return Math.round(Math.min(1, score) * 1000) / 1000;
}
