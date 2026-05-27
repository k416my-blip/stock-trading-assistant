const weights: Record<string, number> = {
  recovery: 0.25,
  bridge: 0.2,
  render: 0.2,
  thermal: 0.15,
  hydration: 0.2,
};

export function resetStabilityWeightTuningEngineForTest(): void {
  weights.recovery = 0.25;
  weights.bridge = 0.2;
  weights.render = 0.2;
  weights.thermal = 0.15;
  weights.hydration = 0.2;
}

export function tuneWeight(key: keyof typeof weights, delta: number): void {
  weights[key] = Math.max(0.05, Math.min(0.45, weights[key] + delta));
}

export function getStabilityWeights(): Readonly<Record<string, number>> {
  return { ...weights };
}

export function weightedGovernanceConfidence(scores: Record<string, number>): number {
  let sum = 0;
  let w = 0;
  for (const [k, v] of Object.entries(scores)) {
    const weight = weights[k] ?? 0.1;
    sum += v * weight;
    w += weight;
  }
  return w > 0 ? Math.round((sum / w) * 1000) / 1000 : 0.5;
}
