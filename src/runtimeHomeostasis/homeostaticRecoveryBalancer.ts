import type { HomeostasisGraphSnapshot, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetHomeostaticRecoveryBalancerForTest(): void {
  /* stateless */
}

export function scoreHomeostaticRecoveryBalance(input: RuntimeHomeostasisObserveInput): number {
  let balance = input.recoverySuccessRate * 0.35;
  balance += (1 - scoreReboundPressure(input)) * 0.3;
  balance += (input.continuityScore / 100) * 0.2;
  balance += (1 - input.runtimeAmplificationRisk) * 0.15;
  return Math.round(Math.max(0, Math.min(1, balance)) * 1000) / 1000;
}

function scoreReboundPressure(input: RuntimeHomeostasisObserveInput): number {
  if (input.recoverySuccessRate < 0.65) return 0;
  return Math.min(1, input.telemetryAmplificationScore * 0.5 + input.observerOverheadRatio * 0.3);
}

export function buildHomeostaticRecoveryGraph(input: RuntimeHomeostasisObserveInput): HomeostasisGraphSnapshot {
  const nodes = [
    { id: 'recovery', label: 'recovery', score: input.recoverySuccessRate },
    { id: 'observer', label: 'observer_rebound', score: input.observerOverheadRatio },
    { id: 'telemetry', label: 'telemetry_surge', score: input.telemetryAmplificationScore },
    { id: 'orchestration', label: 'orchestration_inflation', score: input.interventionDensity },
  ];
  return {
    nodes,
    edges: [
      { from: 'recovery', to: 'observer', weight: input.observerOverheadRatio },
      { from: 'recovery', to: 'telemetry', weight: input.telemetryAmplificationScore },
      { from: 'recovery', to: 'orchestration', weight: input.interventionDensity },
    ],
    measuredAt: new Date().toISOString(),
  };
}
