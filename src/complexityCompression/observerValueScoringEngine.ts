import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

export function resetObserverValueScoringEngineForTest(): void {
  /* stateless */
}

export function scoreObserverValue(input: ComplexityCompressionObserveInput): number {
  let value = (input.continuityScore / 100) * 0.3;
  value += input.survivabilityEffectiveness * 0.25;
  value += input.runtimeEquilibriumStability * 0.2;
  value -= input.observerOverheadRatio * 0.15;
  value -= input.runtimeAmplificationRisk * 0.1;
  value -= (input.thermalState !== 'none' ? 0.08 : 0);
  value -= input.telemetryAmplificationScore * 0.07;
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

export function rankObserverLeanCandidates(input: ComplexityCompressionObserveInput): string[] {
  const candidates: string[] = [];
  if (scoreObserverValue(input) < 0.45) candidates.push('heavy_analytics_observer');
  if (input.observerOverheadRatio > 0.5) candidates.push('redundant_telemetry_observer');
  if (input.renderStormRisk > 0.4) candidates.push('dashboard_trace_observer');
  if (input.orchestrationEdgeCount > 18) candidates.push('graph_tracing_observer');
  return candidates;
}
