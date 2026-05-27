import type { AmplificationGraphSnapshot, AmplificationSuppressionObserveInput } from '../types/amplificationSuppression';

const equilibriumEvolution: { at: string; stability: number }[] = [];

export function resetAutonomousStabilizationEquilibriumEngineForTest(): void {
  equilibriumEvolution.length = 0;
}

export function scoreRuntimeEquilibriumStability(
  input: AmplificationSuppressionObserveInput,
  entropy: number,
  survivabilityCost: number,
): number {
  const balance = [
    1 - input.observerOverheadRatio,
    input.equilibriumScore,
    1 - scoreThermalComponent(input),
    1 - input.interventionDensity,
    1 - survivabilityCost,
  ];
  const mean = balance.reduce((a, b) => a + b, 0) / balance.length;
  const stability = mean * (1 - entropy * 0.35);
  const rounded = Math.round(Math.max(0, Math.min(1, stability)) * 1000) / 1000;
  equilibriumEvolution.push({ at: new Date().toISOString(), stability: rounded });
  if (equilibriumEvolution.length > 64) equilibriumEvolution.shift();
  return rounded;
}

function scoreThermalComponent(input: AmplificationSuppressionObserveInput): number {
  if (input.thermalState === 'none' || input.thermalState === 'light') return 0.1;
  return 0.5;
}

export function buildStabilizationEquilibriumGraph(
  propagation: AmplificationGraphSnapshot,
): AmplificationGraphSnapshot {
  return {
    nodes: propagation.nodes.map((n) => ({ ...n, density: 1 - n.density })),
    edges: propagation.edges.map((e) => ({ ...e, amplification: 1 - e.amplification })),
    measuredAt: new Date().toISOString(),
  };
}

export function getEquilibriumEvolution(): { at: string; stability: number }[] {
  return [...equilibriumEvolution];
}
