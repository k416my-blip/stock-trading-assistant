import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

const driftEvolution: { at: string; drift: number }[] = [];

export function resetRuntimeObjectiveDriftDetectorForTest(): void {
  driftEvolution.length = 0;
}

export function scoreStrategicDriftRisk(input: StrategicCoherenceObserveInput): number {
  let drift = input.stabilityDriftRisk * 0.3;
  drift += (1 - input.equilibriumIntegrity) * 0.25;
  drift += Math.abs(input.simplificationIntegrity - input.runtimeAuditCoverage) * 0.2;
  drift += input.observerSuppressionLoss * 0.15;
  if (input.sessionMinutes >= 120) drift += 0.1;
  const rounded = Math.round(Math.min(1, drift) * 1000) / 1000;
  driftEvolution.push({ at: new Date().toISOString(), drift: rounded });
  if (driftEvolution.length > 64) driftEvolution.shift();
  return rounded;
}

export function getStrategicDriftEvolution(): { at: string; drift: number }[] {
  return [...driftEvolution];
}
