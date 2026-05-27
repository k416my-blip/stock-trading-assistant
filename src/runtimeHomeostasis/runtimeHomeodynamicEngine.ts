import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetRuntimeHomeodynamicEngineForTest(): void {
  /* stateless */
}

export function computeHomeodynamicState(input: RuntimeHomeostasisObserveInput): string {
  if (input.eventLoopLagMs < 150 && input.runtimeEntropyScore < 0.3 && input.interventionDensity < 0.25) {
    return 'calm';
  }
  if (input.interventionDensity > 0.55 || input.runtimeEntropyScore > 0.5) return 'active_regulation';
  if (input.recoverySuccessRate < 0.7) return 'recovery_tension';
  return 'balanced';
}

export function scoreHomeodynamicStability(input: RuntimeHomeostasisObserveInput): number {
  const state = computeHomeodynamicState(input);
  if (state === 'calm') return 0.9;
  if (state === 'balanced') return 0.75;
  if (state === 'recovery_tension') return 0.55;
  return 0.4;
}
