import type { MetaOrchestrationObserveInput, SurvivabilityLayerId } from '../types/metaRuntimeOrchestration';

export function resetCrossLayerPacingCoordinatorForTest(): void {
  /* stateless */
}

export const CROSS_LAYER_EXECUTION_ORDER: SurvivabilityLayerId[] = [
  'continuity',
  'recovery',
  'js_stabilization',
  'rn_bridge',
  'governance',
  'telemetry',
  'causal',
  'trading',
];

export function buildCrossLayerPacingPlan(input: MetaOrchestrationObserveInput): SurvivabilityLayerId[] {
  const plan = [...CROSS_LAYER_EXECUTION_ORDER];
  if (input.miuiAggressiveReclaim) {
    return plan.filter((l) => l !== 'causal' || input.sessionMinutes > 60);
  }
  if (input.screenOff) {
    return plan.filter((l) => !['trading', 'telemetry'].includes(l));
  }
  if (input.observerOverheadRatio > 0.55) {
    return plan.filter((l) => l !== 'telemetry');
  }
  return plan;
}

export function scoreCrossLayerPressure(input: MetaOrchestrationObserveInput): number {
  let pressure = 0.1;
  pressure += input.bridgeTrafficRate / 25;
  pressure += input.observerOverheadRatio * 0.3;
  pressure += (1 - input.jsSurvivalScore / 100) * 0.2;
  pressure += input.schedulerDriftMs / 200;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}
