import type { StrategicGraphSnapshot, StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { GLOBAL_OBJECTIVE_LAYERS } from '../constants/strategicCoherence';

export function resetGlobalObjectiveAlignmentEngineForTest(): void {
  /* stateless */
}

export function scoreObjectiveAlignment(input: StrategicCoherenceObserveInput): number {
  const scores: Record<string, number> = {
    recovery: input.recoverySuccessRate,
    governance: input.governanceConfidence,
    orchestration: input.metaCoordinationStability,
    suppression: 1 - input.runtimeTradingSuppression,
    compression: input.simplificationIntegrity,
    continuity: input.continuityScore / 100,
    audit: input.runtimeAuditCoverage,
    homeostasis: input.runtimeHomeostasisScore,
  };
  const values = GLOBAL_OBJECTIVE_LAYERS.map((l) => scores[l] ?? 0.5);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const spread = Math.max(...values) - Math.min(...values);
  return Math.round(Math.max(0, Math.min(1, mean * (1 - spread * 0.35))) * 1000) / 1000;
}

export function buildObjectiveAlignmentGraph(input: StrategicCoherenceObserveInput): StrategicGraphSnapshot {
  const alignment = scoreObjectiveAlignment(input);
  return {
    nodes: GLOBAL_OBJECTIVE_LAYERS.map((l) => ({ id: l, label: l, score: alignment })),
    edges: GLOBAL_OBJECTIVE_LAYERS.slice(0, -1).map((l, i) => ({
      from: l,
      to: GLOBAL_OBJECTIVE_LAYERS[i + 1] ?? l,
      weight: alignment,
    })),
    measuredAt: new Date().toISOString(),
  };
}
