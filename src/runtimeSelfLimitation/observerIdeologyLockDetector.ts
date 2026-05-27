import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';

export function resetObserverIdeologyLockDetectorForTest(): void {
  /* stateless */
}

export function scoreObserverIdeologyLockRisk(input: RuntimeSelfLimitationObserveInput): number {
  let risk = 0;
  if (input.observerOverheadRatio > 0.4 && input.observerDensityScore > 0.55) risk += 0.28;
  if (input.runtimeAuditCoverage > 0.7 && input.governanceConfidence > 0.75) risk += 0.22;
  if (input.interventionDensity > 0.4 && input.equilibriumPersistence > 0.72) risk += 0.2;
  if (input.runtimeCalmnessIndex > 0.7 && input.interventionDensity > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

export function scoreObserverRigidity(input: RuntimeSelfLimitationObserveInput): number {
  return Math.round(
    Math.min(
      1,
      input.observerDensityScore * 0.4 +
        input.observerOverheadRatio * 0.35 +
        input.equilibriumPersistence * 0.25,
    ) * 1000,
  ) / 1000;
}
