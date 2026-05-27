import type { HomeostasisGraphSnapshot, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { OSCILLATION_PAIRS } from '../constants/runtimeHomeostasis';

let lastMode = 'normal';
let flipCount = 0;

export function resetRuntimeOscillationNeutralizerForTest(): void {
  lastMode = 'normal';
  flipCount = 0;
}

export function noteModeTransition(mode: string): void {
  if (mode !== lastMode) {
    flipCount += 1;
    lastMode = mode;
  }
}

export function scoreStabilizationOscillationRisk(input: RuntimeHomeostasisObserveInput): number {
  let risk = Math.min(1, flipCount / 6) * 0.35;
  risk += input.runtimeEntropyScore * 0.25;
  risk += input.pacingDriftEstimate * 0.2;
  risk += input.compressionDriftEstimate * 0.12;
  if (input.runtimeLeanStability < 0.5 && input.simplificationIntegrity > 0.6) risk += 0.08;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function buildOscillationSuppressionMap(input: RuntimeHomeostasisObserveInput): HomeostasisGraphSnapshot {
  const risk = scoreStabilizationOscillationRisk(input);
  return {
    nodes: OSCILLATION_PAIRS.map((p) => ({ id: p, label: p, score: risk })),
    edges: OSCILLATION_PAIRS.map((p, i) => ({
      from: p,
      to: OSCILLATION_PAIRS[(i + 1) % OSCILLATION_PAIRS.length] ?? p,
      weight: risk,
    })),
    measuredAt: new Date().toISOString(),
  };
}
