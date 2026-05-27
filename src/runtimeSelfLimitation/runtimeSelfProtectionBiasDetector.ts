import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { SELF_PROTECTION_BIASES } from '../constants/runtimeSelfLimitation';

export function resetRuntimeSelfProtectionBiasDetectorForTest(): void {
  /* stateless */
}

export function detectSelfProtectionBiases(input: RuntimeSelfLimitationObserveInput): string[] {
  const biases: string[] = [];
  if (input.observerOverheadRatio > 0.5 && input.simplificationIntegrity < 0.5) {
    biases.push('observer_reduction_refusal');
  }
  if (input.runtimeAuditCoverage > 0.78 && input.sessionMinutes > 60) {
    biases.push('audit_permanence');
  }
  if (input.runtimeTradingSuppression > 0.42 && input.equilibriumPersistence > 0.65) {
    biases.push('suppression_persistence');
  }
  if (input.orchestrationEdgeCount > 16 && input.metaCoordinationStability > 0.7) {
    biases.push('orchestration_self_maintenance');
  }
  if (input.recoverySuccessRate > 0.75 && input.recursiveStabilizationRisk > 0.4) {
    biases.push('recovery_infinite_continuation');
  }
  return biases.filter((b) => SELF_PROTECTION_BIASES.includes(b as (typeof SELF_PROTECTION_BIASES)[number]));
}

export function scoreRuntimeSelfProtectionBias(input: RuntimeSelfLimitationObserveInput): number {
  const biases = detectSelfProtectionBiases(input);
  return Math.round(Math.min(1, biases.length * 0.2 + input.interventionDensity * 0.15) * 1000) / 1000;
}
