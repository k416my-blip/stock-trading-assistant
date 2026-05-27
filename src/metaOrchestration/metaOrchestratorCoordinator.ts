import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

export function resetMetaOrchestratorCoordinatorForTest(): void {
  /* stateless */
}

export function computeOrchestrationPressure(input: MetaOrchestrationObserveInput): number {
  let pressure = 0.1;
  pressure += input.observerOverheadRatio * 0.25;
  pressure += (1 - input.governanceConfidence) * 0.2;
  pressure += (1 - input.recoverySuccessRate) * 0.15;
  pressure += Math.min(0.2, input.bridgeTrafficRate / 20);
  if (input.miuiAggressiveReclaim) pressure += 0.12;
  return Math.round(Math.min(1, pressure) * 1000) / 1000;
}

export function computeMetaCoordinationStability(
  conflict: number,
  equilibrium: number,
  balance: number,
): number {
  const raw = equilibrium * 0.4 + balance * 0.35 + (1 - conflict) * 0.25;
  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
}
