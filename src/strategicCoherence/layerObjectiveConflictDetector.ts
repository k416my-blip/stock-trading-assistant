import type { StrategicGraphSnapshot, StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { LAYER_CONFLICT_PAIRS } from '../constants/strategicCoherence';

export function resetLayerObjectiveConflictDetectorForTest(): void {
  /* stateless */
}

export function scoreLayerConflictRisk(input: StrategicCoherenceObserveInput): number {
  let risk = 0;
  if (input.simplificationIntegrity > 0.55 && input.runtimeAuditCoverage > 0.7) risk += 0.25;
  if (input.runtimeTradingSuppression > 0.38 && input.continuityScore < 78) risk += 0.28;
  if (input.interventionDensity > 0.42 && input.runtimeCalmnessIndex > 0.65) risk += 0.22;
  if (input.recoverySuccessRate > 0.68 && input.equilibriumIntegrity < 0.58) risk += 0.18;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function detectLayerConflicts(input: StrategicCoherenceObserveInput): string[] {
  const conflicts: string[] = [];
  if (input.simplificationIntegrity > 0.5 && input.runtimeAuditCoverage > 0.65) {
    conflicts.push('compression_vs_audit');
  }
  if (input.runtimeTradingSuppression > 0.35 && input.continuityScore < 80) {
    conflicts.push('suppression_vs_continuity');
  }
  if (input.interventionDensity > 0.4 && input.runtimeCalmnessIndex > 0.6) {
    conflicts.push('orchestration_vs_calm_state');
  }
  if (input.recoverySuccessRate > 0.65 && input.equilibriumIntegrity < 0.6) {
    conflicts.push('recovery_vs_equilibrium');
  }
  return conflicts.filter((c) => LAYER_CONFLICT_PAIRS.includes(c as (typeof LAYER_CONFLICT_PAIRS)[number]));
}

export function buildLayerConflictMap(input: StrategicCoherenceObserveInput): StrategicGraphSnapshot {
  const conflicts = detectLayerConflicts(input);
  const risk = scoreLayerConflictRisk(input);
  return {
    nodes: conflicts.map((c) => ({ id: c, label: c, score: risk })),
    edges: conflicts.map((c, i) => ({
      from: c,
      to: conflicts[(i + 1) % Math.max(1, conflicts.length)] ?? c,
      weight: risk,
    })),
    measuredAt: new Date().toISOString(),
  };
}
