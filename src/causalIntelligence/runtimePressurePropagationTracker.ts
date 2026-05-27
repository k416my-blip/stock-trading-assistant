import type { CausalGraphEdge, CausalIntelligenceObserveInput } from '../types/runtimeCausalIntelligence';

export function resetRuntimePressurePropagationTrackerForTest(): void {
  /* stateless */
}

export function buildPropagationEdges(input: CausalIntelligenceObserveInput): CausalGraphEdge[] {
  const edges: CausalGraphEdge[] = [];
  if (input.thermalState !== 'none') {
    edges.push({ from: 'thermal', to: 'render', weight: 0.6, correlationMs: 1200 });
  }
  if (input.renderStormRisk > 0.3) {
    edges.push({ from: 'render', to: 'bridge', weight: 0.55, correlationMs: 800 });
  }
  if (input.bridgeTrafficRate > 5) {
    edges.push({ from: 'bridge', to: 'websocket', weight: 0.45, correlationMs: 1500 });
  }
  if (input.reconnectPerMin > 2) {
    edges.push({ from: 'websocket', to: 'trading', weight: 0.4, correlationMs: 2000 });
  }
  if (input.miuiAggressiveReclaim) {
    edges.push({ from: 'reclaim', to: 'observer', weight: 0.7, correlationMs: 600 });
    edges.push({ from: 'reclaim', to: 'websocket', weight: 0.5, correlationMs: 900 });
  }
  if (input.screenOff) {
    edges.push({ from: 'reclaim', to: 'governance', weight: 0.35, correlationMs: 1100 });
  }
  return edges;
}

export function propagationFlowLabels(edges: CausalGraphEdge[]): string[] {
  return edges.map((e) => `${e.from}→${e.to}`);
}
