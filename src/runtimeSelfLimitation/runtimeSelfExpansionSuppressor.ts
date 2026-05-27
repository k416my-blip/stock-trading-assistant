import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetRuntimeSelfExpansionSuppressorForTest(): void {
  /* stateless */
}

export function suggestSelfExpansionSuppression(input: RuntimeSelfLimitationObserveInput): string[] {
  const suggestions: string[] = [];
  if (input.orchestrationEdgeCount > 18) suggestions.push('cap_orchestration_edges');
  if (input.observerDensityScore > 0.55) suggestions.push('dedupe_observers');
  if (input.telemetryAmplificationScore > 0.42) suggestions.push('compress_telemetry');
  if (input.runtimeAuditCoverage > 0.75) suggestions.push('thin_audit_sampling');
  return suggestions;
}
