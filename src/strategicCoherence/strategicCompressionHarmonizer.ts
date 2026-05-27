import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetStrategicCompressionHarmonizerForTest(): void {
  /* stateless */
}

export function scoreStrategicCompressionIntegrity(input: StrategicCoherenceObserveInput): number {
  let integrity = input.simplificationIntegrity * 0.35;
  integrity += input.runtimeAuditCoverage * 0.25;
  integrity += (input.continuityScore / 100) * 0.25;
  integrity += input.runtimeEquilibriumStability * 0.15;
  if (input.simplificationIntegrity > 0.65 && input.runtimeAuditCoverage < 0.5) integrity -= 0.15;
  if (input.runtimeCompressionEfficiency > 0.7 && input.continuityScore < 70) integrity -= 0.12;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}

export function validateCompressionHarmony(input: StrategicCoherenceObserveInput): boolean {
  return scoreStrategicCompressionIntegrity(input) > 0.45;
}
