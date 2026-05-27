import type { RuntimeUnifiedUtilityObserveInput, UtilityGraphSnapshot } from '../types/runtimeUnifiedUtility';

export function resetLayerObjectiveDivergenceGraphBuilderForTest(): void {
  /* stateless */
}

export function buildLayerObjectiveDivergenceGraph(
  input: RuntimeUnifiedUtilityObserveInput,
): UtilityGraphSnapshot {
  const objectives = [
    { id: 'utility', score: input.continuityScore / 100 },
    { id: 'survivability', score: input.survivabilityEffectiveness },
    { id: 'simplicity', score: input.simplificationIntegrity },
    { id: 'audit', score: input.runtimeAuditCoverage },
    { id: 'orchestration', score: Math.min(1, input.orchestrationEdgeCount / 28) },
  ];
  const mean = objectives.reduce((a, o) => a + o.score, 0) / objectives.length;
  return {
    nodes: objectives.map((o) => ({ id: o.id, label: o.id, score: o.score })),
    edges: objectives.slice(0, -1).map((o, i) => ({
      from: o.id,
      to: objectives[i + 1]?.id ?? o.id,
      weight: Math.abs(o.score - mean),
    })),
    measuredAt: new Date().toISOString(),
  };
}
