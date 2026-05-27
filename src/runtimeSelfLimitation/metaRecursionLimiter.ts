import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetMetaRecursionLimiterForTest(): void {
  /* stateless */
}

export function suggestRecursionLimit(input: RuntimeSelfLimitationObserveInput): string {
  if (input.recursiveStabilizationRisk > 0.55) return 'suggest_recursion_break';
  if (input.orchestrationEdgeCount > 22) return 'suggest_orchestration_cycle_cap';
  return 'recursion_nominal';
}
