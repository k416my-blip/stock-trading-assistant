import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetRuntimeStrategicEquilibriumGovernorForTest(): void {
  /* stateless */
}

export function scoreStrategicConsistency(input: StrategicCoherenceObserveInput): number {
  const factors = [
    input.metaCoordinationStability,
    input.equilibriumIntegrity,
    input.runtimeEquilibriumStability,
    input.governanceConfidence,
    input.runtimeHomeostasisScore,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const spread = Math.max(...factors) - Math.min(...factors);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.4))) * 1000) / 1000;
}

export function scoreRuntimeStrategicPersistence(input: StrategicCoherenceObserveInput): number {
  let persistence = scoreStrategicConsistency(input) * 0.5;
  persistence += input.equilibriumIntegrity * 0.25;
  persistence += (1 - input.stabilityDriftRisk) * 0.15;
  if (input.sessionMinutes >= 120) persistence -= 0.08;
  return Math.round(Math.max(0, Math.min(1, persistence)) * 1000) / 1000;
}
