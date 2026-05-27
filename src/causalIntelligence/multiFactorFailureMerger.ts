import type { RootCauseCandidate } from './failureAttributionEngine';

export function resetMultiFactorFailureMergerForTest(): void {
  /* stateless */
}

export function mergeCorrelatedFactors(candidates: RootCauseCandidate[], threshold = 0.35): RootCauseCandidate[] {
  const merged = new Map<string, number>();
  for (const c of candidates) {
    if (c.weight < threshold) continue;
    merged.set(c.id, (merged.get(c.id) ?? 0) + c.weight);
  }
  return [...merged.entries()]
    .map(([id, weight]) => ({ id, weight: Math.round(Math.min(1, weight) * 1000) / 1000 }))
    .sort((a, b) => b.weight - a.weight);
}

export function assignWeightedRootCauses(candidates: RootCauseCandidate[]): RootCauseCandidate[] {
  const total = candidates.reduce((s, c) => s + c.weight, 0) || 1;
  return candidates.map((c) => ({
    id: c.id,
    weight: Math.round((c.weight / total) * 1000) / 1000,
  }));
}
