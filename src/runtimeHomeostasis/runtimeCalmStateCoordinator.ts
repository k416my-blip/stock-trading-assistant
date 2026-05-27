import type { HomeostasisGraphSnapshot, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';

export function resetRuntimeCalmStateCoordinatorForTest(): void {
  /* stateless */
}

export function scoreRuntimeCalmnessIndex(input: RuntimeHomeostasisObserveInput): number {
  let calm = 0.7;
  if (input.eventLoopLagMs < 180) calm += 0.1;
  if (input.interventionDensity < 0.25) calm += 0.1;
  if (input.runtimeEntropyScore < 0.25) calm += 0.08;
  if (input.reconnectPerMin < 2) calm += 0.05;
  if (input.interventionDensity > 0.5) calm -= 0.15;
  if (input.renderStormRisk > 0.4) calm -= 0.1;
  if (input.runtimeAmplificationRisk > 0.45) calm -= 0.08;
  return Math.round(Math.max(0, Math.min(1, calm)) * 1000) / 1000;
}

export function resolveCalmState(input: RuntimeHomeostasisObserveInput): string {
  if (scoreRuntimeCalmnessIndex(input) > 0.75) return 'calm';
  if (scoreRuntimeCalmnessIndex(input) > 0.55) return 'settling';
  return 'active';
}

export function buildCalmStateTransitionGraph(input: RuntimeHomeostasisObserveInput): HomeostasisGraphSnapshot {
  const state = resolveCalmState(input);
  const states = ['active', 'settling', 'calm'];
  return {
    nodes: states.map((s) => ({ id: s, label: s, score: s === state ? 1 : 0.35 })),
    edges: states.slice(0, -1).map((s, i) => ({
      from: s,
      to: states[i + 1] ?? s,
      weight: scoreRuntimeCalmnessIndex(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}
