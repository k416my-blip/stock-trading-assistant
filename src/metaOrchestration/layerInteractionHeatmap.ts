import type {
  MetaInteractionEdge,
  MetaInteractionGraph,
  MetaInteractionNode,
  MetaOrchestrationObserveInput,
  SurvivabilityLayerId,
} from '../types/metaRuntimeOrchestration';

export function resetLayerInteractionHeatmapForTest(): void {
  /* stateless */
}

export function buildLayerInteractionHeatmap(input: MetaOrchestrationObserveInput): MetaInteractionGraph {
  const nodes: MetaInteractionNode[] = [
    { id: 'recovery', label: 'recovery', pressure: 1 - input.recoverySuccessRate },
    { id: 'continuity', label: 'continuity', pressure: 1 - input.continuityScore / 100 },
    { id: 'governance', label: 'governance', pressure: 1 - input.governanceConfidence },
    { id: 'telemetry', label: 'telemetry', pressure: input.observerOverheadRatio },
    { id: 'causal', label: 'causal', pressure: input.rootCauseScore },
    { id: 'trading', label: 'trading', pressure: 1 - input.runtimeSafeTradingScore / 100 },
    { id: 'rn_bridge', label: 'rn_bridge', pressure: Math.min(1, input.bridgeTrafficRate / 15) },
    { id: 'js_stabilization', label: 'js_stabilization', pressure: 1 - input.jsSurvivalScore / 100 },
  ];
  const edges: MetaInteractionEdge[] = [
    { from: 'telemetry', to: 'recovery', contention: input.observerOverheadRatio * (1 - input.recoverySuccessRate) },
    { from: 'recovery', to: 'governance', contention: (1 - input.recoverySuccessRate) * (1 - input.governanceConfidence) },
    { from: 'governance', to: 'telemetry', contention: input.observerOverheadRatio * (1 - input.governanceConfidence) },
    { from: 'continuity', to: 'recovery', contention: (1 - input.continuityScore / 100) * (1 - input.recoverySuccessRate) },
    { from: 'rn_bridge', to: 'js_stabilization', contention: Math.min(1, input.bridgeTrafficRate / 12) * (1 - input.jsSurvivalScore / 100) },
    { from: 'causal', to: 'governance', contention: input.rootCauseScore * (1 - input.governanceConfidence) },
  ];
  return { nodes, edges, measuredAt: new Date().toISOString() };
}

export function buildInterventionHeatmap(input: MetaOrchestrationObserveInput): Record<string, number> {
  const graph = buildLayerInteractionHeatmap(input);
  const heatmap: Record<string, number> = {};
  for (const n of graph.nodes) heatmap[n.id] = Math.round(n.pressure * 1000) / 1000;
  for (const e of graph.edges) {
    const key = `${e.from}_${e.to}`;
    heatmap[key] = Math.round(e.contention * 1000) / 1000;
  }
  return heatmap;
}

export function getContentionMap(graph: MetaInteractionGraph): MetaInteractionEdge[] {
  return [...graph.edges].sort((a, b) => b.contention - a.contention);
}
