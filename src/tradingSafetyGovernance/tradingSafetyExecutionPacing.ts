import type { TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';
import { thermalExecutionPacingMultiplier } from './thermalRiskAwareExecutionPacing';
import { recoveryExecutionLimitMultiplier } from './recoveryStateExecutionLimiter';
import { pollingIntervalMultiplier } from './runtimeSafePollingGovernor';
import { websocketReconnectPacingMs } from './websocketInstabilityRiskGuard';
import { notificationPacingMultiplier } from './runtimeSafeNotificationPacing';
import { recommendationFrequencyMultiplier } from './runtimeSafeRecommendationPacing';

export function resetTradingSafetyExecutionPacingForTest(): void {
  /* stateless */
}

export function scoreExecutionPacingRisk(input: TradingSafetyObserveInput): number {
  const poll = pollingIntervalMultiplier(input);
  const thermal = thermalExecutionPacingMultiplier(input);
  const recovery = recoveryExecutionLimitMultiplier(input);
  const normalized = Math.min(1, (poll + thermal + recovery) / 8);
  return Math.round(normalized * 1000) / 1000;
}

export function buildExecutionPacingFlow(
  input: TradingSafetyObserveInput,
  recConfidence: number,
  instabilityRisk: number,
): string[] {
  return [
    `poll x${pollingIntervalMultiplier(input)}`,
    `thermal x${thermalExecutionPacingMultiplier(input).toFixed(1)}`,
    `ws ${websocketReconnectPacingMs(input)}ms`,
    `notify x${notificationPacingMultiplier(input)}`,
    `rec x${recommendationFrequencyMultiplier(recConfidence, instabilityRisk)}`,
  ];
}
