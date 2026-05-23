/** Catastrophic Cascade Breaker — stop recovery storms. */
import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';

export function detectCascadeRisk(snapshot: RuntimeStabilitySnapshot | null): number {
  if (!snapshot) return 0;
  const anomalyWeight = Math.min(1, snapshot.anomalies.length / 5);
  const health = 1 - snapshot.healthScore / 100;
  return Math.round(Math.min(1, anomalyWeight * 0.5 + health * 0.5) * 1000) / 1000;
}

export function shouldBreakCascade(cascadeRisk: number): boolean {
  return cascadeRisk >= 0.72;
}
