import type { CausalGraphSnapshot, CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

let lastGraph: CausalGraphSnapshot | null = null;

export function resetRuntimeCausalGraphCoordinatorForTest(): void {
  lastGraph = null;
}

export function setLastCausalGraph(graph: CausalGraphSnapshot): void {
  lastGraph = graph;
}

export function getLastCausalGraph(): CausalGraphSnapshot | null {
  return lastGraph;
}

export function buildBaseCausalNodes(input: CausalIntelligenceObserveInput): CausalGraphSnapshot['nodes'] {
  return [
    { id: 'thermal', kind: 'thermal', label: 'thermal', weight: input.thermalState === 'none' ? 0.1 : 0.6 },
    { id: 'bridge', kind: 'bridge', label: 'bridge', weight: Math.min(1, input.bridgeTrafficRate / 12) },
    { id: 'websocket', kind: 'websocket', label: 'websocket', weight: Math.min(1, input.reconnectPerMin / 15) },
    { id: 'render', kind: 'render', label: 'render', weight: input.renderStormRisk },
    { id: 'observer', kind: 'observer', label: 'observer', weight: input.observerOverheadRatio },
    { id: 'governance', kind: 'governance', label: 'governance', weight: 1 - input.governanceConfidence },
    { id: 'recovery', kind: 'recovery', label: 'recovery', weight: 1 - input.recoverySuccessRate },
    { id: 'reclaim', kind: 'reclaim', label: 'reclaim', weight: input.miuiAggressiveReclaim ? 0.75 : 0.05 },
    { id: 'trading', kind: 'trading', label: 'trading', weight: 1 - input.runtimeSafeTradingScore / 100 },
    { id: 'hydration', kind: 'hydration', label: 'hydration', weight: input.staleHydrationRisk },
  ];
}
