import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { EGO_SIGNALS } from '../constants/runtimeSelfLimitation';

export function resetRuntimeOrchestrationEgoDetectorForTest(): void {
  /* stateless */
}

export function detectEgoSignals(input: RuntimeSelfLimitationObserveInput): string[] {
  const signals: string[] = [];
  if (input.observerOverheadRatio > 0.45 && input.simplificationIntegrity < 0.55) {
    signals.push('observer_retention');
  }
  if (input.runtimeAuditCoverage > 0.72 && input.interventionDensity > 0.35) {
    signals.push('audit_overdensity');
  }
  if (input.interventionDensity > 0.48 && input.equilibriumPersistence > 0.7) {
    signals.push('intervention_persistence');
  }
  if (input.runtimeTradingSuppression > 0.4 && input.continuityScore > 75) {
    signals.push('suppression_self_justification');
  }
  if (input.orchestrationEdgeCount > 18 && input.metaCoordinationStability < 0.65) {
    signals.push('orchestration_inflation');
  }
  return signals.filter((s) => EGO_SIGNALS.includes(s as (typeof EGO_SIGNALS)[number]));
}

export function scoreRuntimeEgo(input: RuntimeSelfLimitationObserveInput): number {
  const signals = detectEgoSignals(input);
  let ego = signals.length * 0.18;
  ego += input.observerOverheadRatio * 0.15;
  ego += input.interventionDensity * 0.12;
  return Math.round(Math.min(1, ego) * 1000) / 1000;
}

export function suggestEgoSuppression(input: RuntimeSelfLimitationObserveInput): string[] {
  const suggestions: string[] = [];
  const signals = detectEgoSignals(input);
  if (signals.includes('observer_retention')) suggestions.push('suggest_observer_sampling_down');
  if (signals.includes('audit_overdensity')) suggestions.push('suggest_audit_throttle');
  if (signals.includes('intervention_persistence')) suggestions.push('suggest_intervention_cooldown');
  if (signals.includes('orchestration_inflation')) suggestions.push('suggest_orchestration_edge_cap');
  return suggestions;
}
