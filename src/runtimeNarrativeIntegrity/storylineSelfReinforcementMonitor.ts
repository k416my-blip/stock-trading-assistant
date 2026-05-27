import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

export function resetStorylineSelfReinforcementMonitorForTest(): void {
  /* stateless */
}

export function scoreStorylineSelfReinforcementRisk(
  input: RuntimeNarrativeIntegrityObserveInput,
): number {
  let risk = 0;
  if (input.recursiveBeliefReinforcementRisk > 0.38 && input.longSessionPurposeIntegrity < 0.55) {
    risk += 0.28;
  }
  if (input.observerConfirmationLoopRisk > 0.38 && input.equilibriumPersistence > 0.72) risk += 0.24;
  if (recursiveNarrativeInflationProxy(input) > 0.35) risk += 0.2;
  if (input.runtimePurposeDriftRisk > 0.35) risk += 0.15;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}

function recursiveNarrativeInflationProxy(input: RuntimeNarrativeIntegrityObserveInput): number {
  return (
    input.runtimeAuditCoverage * 0.3 +
    input.recursiveBeliefReinforcementRisk * 0.35 +
    input.observerConfirmationLoopRisk * 0.35
  );
}
