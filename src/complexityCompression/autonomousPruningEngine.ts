import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';
import { PRUNING_TARGETS } from '../constants/complexityCompression';

export function resetAutonomousPruningEngineForTest(): void {
  /* stateless */
}

export function scoreAutonomousPruningConfidence(input: ComplexityCompressionObserveInput): number {
  let conf = 0.5;
  if (input.continuityScore > 70) conf += 0.15;
  if (input.runtimeSafeTradingScore > 65) conf += 0.12;
  if (input.survivabilityEffectiveness > 0.5) conf += 0.1;
  if (input.observerOverheadRatio > 0.45) conf += 0.08;
  if (input.telemetryAmplificationScore > 0.4) conf += 0.05;
  return Math.round(Math.min(1, conf) * 1000) / 1000;
}

export function selectPruningTargets(input: ComplexityCompressionObserveInput): string[] {
  const targets: string[] = [];
  if (input.telemetryAmplificationScore > 0.3) targets.push('telemetry');
  if (input.observerOverheadRatio > 0.35) targets.push('observer');
  if (input.orchestrationEdgeCount > 14) targets.push('tracing');
  if (input.renderStormRisk > 0.4) targets.push('proactive_concierge');
  if (input.jsHeapMb > 140) targets.push('heavy_analytics');
  return targets.filter((t) => PRUNING_TARGETS.includes(t as (typeof PRUNING_TARGETS)[number]));
}
