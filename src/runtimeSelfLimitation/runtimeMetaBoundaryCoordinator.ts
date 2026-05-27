import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

const boundaryEvolution: { at: string; integrity: number }[] = [];

export function resetRuntimeMetaBoundaryCoordinatorForTest(): void {
  boundaryEvolution.length = 0;
}

export function scoreRuntimeBoundaryIntegrity(input: RuntimeSelfLimitationObserveInput): number {
  const factors = [
    input.continuityScore / 100,
    input.survivabilityEffectiveness,
    input.simplificationIntegrity,
    input.runtimeEquilibriumStability,
    1 - input.interventionDensity,
    1 - input.observerOverheadRatio,
    1 - Math.min(1, input.orchestrationEdgeCount / 30),
    input.runtimeStrategicCoherence,
  ];
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length;
  const spread = Math.max(...factors) - Math.min(...factors);
  const integrity = mean * (1 - spread * 0.35);
  const rounded = Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
  boundaryEvolution.push({ at: new Date().toISOString(), integrity: rounded });
  if (boundaryEvolution.length > 64) boundaryEvolution.shift();
  return rounded;
}

export function scoreRuntimeMetaCognitivePressure(input: RuntimeSelfLimitationObserveInput): number {
  let pressure = input.interventionDensity * 0.25;
  pressure += input.observerOverheadRatio * 0.2;
  pressure += input.runtimeAuditCoverage * 0.15;
  pressure += input.recursiveStabilizationRisk * 0.15;
  pressure += (1 - input.simplificationIntegrity) * 0.1;
  pressure += input.layerConflictRisk * 0.1;
  pressure += Math.min(1, input.orchestrationEdgeCount / 28) * 0.05;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function scoreRuntimeSelfLimitationConfidence(input: RuntimeSelfLimitationObserveInput): number {
  const integrity = scoreRuntimeBoundaryIntegrity(input);
  const pressure = scoreRuntimeMetaCognitivePressure(input);
  return Math.round(Math.max(0, Math.min(1, integrity * (1 - pressure * 0.5))) * 1000) / 1000;
}

export function getMetaBoundaryEvolution(): { at: string; integrity: number }[] {
  return [...boundaryEvolution];
}
