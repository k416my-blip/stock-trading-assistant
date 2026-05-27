import type { CausalGraphSnapshot } from '../types/runtimeCausalIntelligence';

const replayGraphs: CausalGraphSnapshot[] = [];

export function resetRuntimeIncidentReplayGraphForTest(): void {
  replayGraphs.length = 0;
}

export function recordIncidentGraph(graph: CausalGraphSnapshot): void {
  replayGraphs.push(graph);
  if (replayGraphs.length > 32) replayGraphs.shift();
}

export function scoreReplayConsistency(): number {
  if (replayGraphs.length < 2) return 0.85;
  const last = replayGraphs[replayGraphs.length - 1];
  const prev = replayGraphs[replayGraphs.length - 2];
  const lastIds = new Set(last.nodes.map((n) => n.id));
  const prevIds = new Set(prev.nodes.map((n) => n.id));
  let overlap = 0;
  for (const id of lastIds) {
    if (prevIds.has(id)) overlap += 1;
  }
  const union = new Set([...lastIds, ...prevIds]).size || 1;
  return Math.round((overlap / union) * 1000) / 1000;
}

export function getIncidentReplayGraphs(): CausalGraphSnapshot[] {
  return [...replayGraphs];
}
