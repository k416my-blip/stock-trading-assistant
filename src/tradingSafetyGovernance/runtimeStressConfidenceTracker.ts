import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

const stressHistory: number[] = [];

export function resetRuntimeStressConfidenceTrackerForTest(): void {
  stressHistory.length = 0;
}

export function scoreRuntimeStressConfidence(input: TradingSafetyObserveInput): number {
  let conf = 0.85;
  if (input.eventLoopLagMs > 250) conf -= 0.12;
  if (input.bridgeTrafficRate > 10) conf -= 0.1;
  if (input.renderStormRisk > 0.5) conf -= 0.08;
  if (input.recoverySuccessRate < 0.7) conf -= 0.1;
  conf += input.causalConfidence * 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, conf)) * 1000) / 1000;
  stressHistory.push(rounded);
  if (stressHistory.length > 64) stressHistory.shift();
  return rounded;
}

export function getStressConfidenceHistory(): number[] {
  return [...stressHistory];
}
