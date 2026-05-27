import type { StrategicGraphSnapshot, StrategicCoherenceObserveInput } from '../types/strategicCoherence';

export function resetCrossLayerStrategicConsistencyTrackerForTest(): void {
  /* stateless */
}

export function scoreCrossLayerObjectiveConsistency(input: StrategicCoherenceObserveInput): number {
  const layerScores = [
    input.recoverySuccessRate,
    input.governanceConfidence,
    input.simplificationIntegrity,
    1 - input.runtimeTradingSuppression,
    input.continuityScore / 100,
    input.runtimeHomeostasisScore,
    input.runtimeAuditCoverage,
    input.metaCoordinationStability,
  ];
  const mean = layerScores.reduce((a, b) => a + b, 0) / layerScores.length;
  const spread = Math.max(...layerScores) - Math.min(...layerScores);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.45))) * 1000) / 1000;
}

export function buildCrossLayerConsistencyGraph(input: StrategicCoherenceObserveInput): StrategicGraphSnapshot {
  const consistency = scoreCrossLayerObjectiveConsistency(input);
  const layers = ['decisions', 'pacing', 'intervention', 'suppression', 'equilibrium'];
  return {
    nodes: layers.map((l) => ({ id: l, label: l, score: consistency })),
    edges: layers.slice(0, -1).map((l, i) => ({
      from: l,
      to: layers[i + 1] ?? l,
      weight: consistency,
    })),
    measuredAt: new Date().toISOString(),
  };
}
