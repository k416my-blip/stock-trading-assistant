import type { HomeostasisGraphSnapshot, RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { HOMEOSTASIS_LAYERS } from '../constants/runtimeHomeostasis';

export function resetCrossLayerEquilibriumTrackerForTest(): void {
  /* stateless */
}

export function scoreCrossLayerStabilityConsistency(input: RuntimeHomeostasisObserveInput): number {
  const layerScores = [
    input.recoverySuccessRate,
    input.governanceConfidence,
    input.simplificationIntegrity,
    1 - input.runtimeTradingSuppression,
    input.continuityScore / 100,
    input.metaCoordinationStability,
  ];
  const mean = layerScores.reduce((a, b) => a + b, 0) / layerScores.length;
  const spread = Math.max(...layerScores) - Math.min(...layerScores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.45))) * 1000) / 1000;
}

export function buildCrossLayerEquilibriumGraph(input: RuntimeHomeostasisObserveInput): HomeostasisGraphSnapshot {
  const consistency = scoreCrossLayerStabilityConsistency(input);
  const scores: Record<string, number> = {
    recovery: input.recoverySuccessRate,
    governance: input.governanceConfidence,
    compression: input.simplificationIntegrity,
    suppression: 1 - input.runtimeTradingSuppression,
    continuity: input.continuityScore / 100,
    orchestration: input.metaCoordinationStability,
  };
  return {
    nodes: HOMEOSTASIS_LAYERS.map((l) => ({
      id: l,
      label: l,
      score: scores[l] ?? consistency,
    })),
    edges: HOMEOSTASIS_LAYERS.slice(0, -1).map((l, i) => ({
      from: l,
      to: HOMEOSTASIS_LAYERS[i + 1] ?? l,
      weight: consistency,
    })),
    measuredAt: new Date().toISOString(),
  };
}
