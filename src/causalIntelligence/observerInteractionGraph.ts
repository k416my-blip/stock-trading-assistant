import type { CausalGraphEdge, CausalGraphNode } from '../types/runtimeCausalIntelligence';

const interactions: CausalGraphEdge[] = [];

export function resetObserverInteractionGraphForTest(): void {
  interactions.length = 0;
}

export function linkObserverInteraction(from: string, to: string, weight: number): void {
  interactions.push({ from, to, weight, correlationMs: 500 });
  if (interactions.length > 120) interactions.shift();
}

export function buildObserverNodes(overhead: number): CausalGraphNode[] {
  return [
    { id: 'obs_telemetry', kind: 'observer', label: 'telemetry', weight: overhead * 0.4 },
    { id: 'obs_soak', kind: 'observer', label: 'soak', weight: overhead * 0.25 },
    { id: 'obs_bridge', kind: 'observer', label: 'bridge_profiler', weight: overhead * 0.35 },
  ];
}

export function scoreObserverInteractionCost(overhead: number, edgeCount: number): number {
  return Math.round(Math.min(1, overhead * 0.6 + edgeCount * 0.02) * 1000) / 1000;
}

export function getObserverInteractionEdges(): CausalGraphEdge[] {
  return [...interactions];
}
