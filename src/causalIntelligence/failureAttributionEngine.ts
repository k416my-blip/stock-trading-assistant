import type { CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export type RootCauseCandidate = { id: string; weight: number };

export function resetFailureAttributionEngineForTest(): void {
  /* stateless */
}

export function identifyRootCauseCandidates(input: CausalIntelligenceObserveInput): RootCauseCandidate[] {
  const candidates: RootCauseCandidate[] = [
    { id: 'thermal', weight: input.thermalState !== 'none' && input.thermalState !== 'light' ? 0.7 : 0.1 },
    { id: 'bridge', weight: Math.min(1, input.bridgeTrafficRate / 14) },
    { id: 'websocket', weight: Math.min(1, input.reconnectPerMin / 12 + input.wsDuplicateCount / 25) },
    { id: 'render', weight: input.renderStormRisk },
    { id: 'memory', weight: Math.min(1, input.memoryTrendPct / 100) },
    { id: 'reclaim', weight: input.miuiAggressiveReclaim ? 0.65 : 0.05 },
    { id: 'observer', weight: input.observerOverheadRatio * 0.8 },
  ];
  return candidates.sort((a, b) => b.weight - a.weight);
}

export function scoreRootCause(candidates: RootCauseCandidate[]): number {
  if (candidates.length === 0) return 0;
  return Math.round(candidates[0].weight * 1000) / 1000;
}
