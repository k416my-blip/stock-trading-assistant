import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';
import { SELF_RECURSION_MONITOR_CHAIN } from '../constants/runtimeSelfRecursionEndurance';

export function resetRecursionCircuitDetectorForTest(): void {
  /* stateless */
}

export function scoreRecursionCircuitRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  const chainLen = SELF_RECURSION_MONITOR_CHAIN.length;
  const loop =
    input.observerOverheadRatio * 0.22 +
    input.runtimeAuditCoverage * 0.2 +
    input.telemetryAmplificationScore * 0.22 +
    input.interventionDensity * 0.18 +
    input.metaRecursionRisk * 0.18;
  const depthBoost = Math.min(1, input.orchestrationEdgeCount / (chainLen * 6));
  return Math.round(Math.min(1, Math.max(0.04, loop + depthBoost * 0.12)) * 1000) / 1000;
}

export function scoreRecursionDepth(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  return Math.round(
    Math.min(
      1,
      input.observerDensityScore * 0.3 +
        input.runtimeAuditCoverage * 0.28 +
        input.metaRecursionRisk * 0.22 +
        input.telemetryAmplificationScore * 0.2,
    ) * 1000,
  ) / 1000;
}
