import type { RuntimeUnifiedUtilityObserveInput, UtilityGraphSnapshot } from '../types/runtimeUnifiedUtility';
import { OBJECTIVE_FRAGMENTATION_PAIRS } from '../constants/runtimeUnifiedUtility';

export function resetGoalFragmentationDetectorForTest(): void {
  /* stateless */
}

function pairSpread(input: RuntimeUnifiedUtilityObserveInput, pair: string): number {
  switch (pair) {
    case 'compression_vs_audit':
      return Math.abs(input.runtimeCompressionEfficiency - (1 - input.runtimeAuditCoverage));
    case 'homeostasis_vs_adaptability':
      return Math.abs(input.runtimeHomeostasisScore - (1 - input.eventLoopLagMs / 500));
    case 'suppression_vs_continuity':
      return Math.abs(input.runtimeTradingSuppression - (1 - input.continuityScore / 100));
    case 'stability_vs_responsiveness':
      return Math.abs(input.runtimeCalmnessIndex - (1 - Math.min(1, input.eventLoopLagMs / 400)));
    case 'orchestration_vs_simplicity':
      return Math.abs(
        Math.min(1, input.orchestrationEdgeCount / 28) - input.simplificationIntegrity,
      );
    default:
      return 0;
  }
}

export function scoreObjectiveFragmentationRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  const spreads = OBJECTIVE_FRAGMENTATION_PAIRS.map((p) => pairSpread(input, p));
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  return Math.round(Math.min(1, mean + input.layerConflictRisk * 0.25) * 1000) / 1000;
}

export function buildObjectiveFragmentationGraph(
  input: RuntimeUnifiedUtilityObserveInput,
): UtilityGraphSnapshot {
  const nodes = OBJECTIVE_FRAGMENTATION_PAIRS.map((p) => ({
    id: p,
    label: p,
    score: pairSpread(input, p),
  }));
  return {
    nodes,
    edges: nodes.slice(0, -1).map((n, i) => ({
      from: n.id,
      to: nodes[i + 1]?.id ?? n.id,
      weight: scoreObjectiveFragmentationRisk(input),
    })),
    measuredAt: new Date().toISOString(),
  };
}
