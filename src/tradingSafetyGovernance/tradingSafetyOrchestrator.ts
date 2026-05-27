import type {
  TradingSafetyMode,
  TradingSafetyObserveInput,
  TradingSafetyTimelineEntry,
} from '../types/tradingSafetyGovernance';
import { computeRuntimeTradingRisk } from './runtimeRiskGovernanceCoordinator';
import {
  scaleRecommendationConfidence,
  scaleSurvivabilityWeightedConfidence,
} from './survivabilityAwareConfidenceScaler';
import { scoreRuntimeInstabilityRisk } from './runtimeInstabilityRiskDetector';
import { scoreThermalTradingPressure } from './thermalRiskAwareExecutionPacing';
import { isLowMemorySafetyMode } from './lowMemoryTradingSafetyMode';
import { scoreWebsocketTradingRisk } from './websocketInstabilityRiskGuard';
import { shouldPaceRecommendations } from './runtimeSafeRecommendationPacing';
import { suppressTradingObservers } from './observerOverloadTradingSuppressor';
import {
  isEmergencyLightweightTrading,
  resolveEmergencyMode,
} from './runtimeAwareEmergencyTradingMode';
import { buildExecutionPacingFlow } from './tradingSafetyExecutionPacing';
import { isLongSessionFatigue } from './longSessionRiskFatigueDetector';
import { isContinuityProtectionActive } from './tradingContinuitySafetyMonitor';
import { recoveryExecutionLimitMultiplier } from './recoveryStateExecutionLimiter';
import { recordTradingSafetyTimeline } from './tradingSafetyTimeline';

export type TradingSafetyFlowResult = {
  flow: TradingSafetyTimelineEntry['flow'];
  detailJa: string;
};

function resolveSafetyMode(
  input: TradingSafetyObserveInput,
  emergencyRisk: number,
): TradingSafetyMode {
  if (isEmergencyLightweightTrading(emergencyRisk)) return 'emergency_lightweight_trading';
  if (input.screenOff) return 'screen_off_lightweight';
  if (input.miuiAggressiveReclaim) return 'reclaim_safe';
  if (isLongSessionFatigue(input)) return 'long_session_fatigue';
  if (isLowMemorySafetyMode(input)) return 'degraded_confidence';
  if (scoreThermalTradingPressure(input) > 0.5) return 'paced_execution';
  return 'full_safety';
}

export function runRuntimeRiskFlow(input: TradingSafetyObserveInput): TradingSafetyFlowResult {
  const risk = computeRuntimeTradingRisk(input);
  const weighted = scaleSurvivabilityWeightedConfidence(input);
  const instability = scoreRuntimeInstabilityRisk(input);
  const recConf = scaleRecommendationConfidence(weighted, instability);
  const pace = shouldPaceRecommendations(input, recConf);
  return {
    flow: 'runtime_risk',
    detailJa: `risk ${risk} · weighted ${weighted} · recConf ${recConf} · pace ${pace}`,
  };
}

export function runInstabilityDegradationFlow(input: TradingSafetyObserveInput): TradingSafetyFlowResult {
  const instability = scoreRuntimeInstabilityRisk(input);
  const bridge = input.bridgeTrafficRate > 8;
  const mem = input.memoryTrendPct > 70;
  const thermal = scoreThermalTradingPressure(input) > 0.4;
  const ws = scoreWebsocketTradingRisk(input) > 0.35;
  const weighted = scaleSurvivabilityWeightedConfidence(input);
  const degraded = scaleRecommendationConfidence(weighted, instability);
  return {
    flow: 'instability_degradation',
    detailJa: `instability ${instability} · conf ${degraded} · bridge ${bridge} · mem ${mem} · thermal ${thermal} · ws ${ws}`,
  };
}

export function runEmergencyLightweightFlow(
  input: TradingSafetyObserveInput,
  emergencyRisk: number,
): TradingSafetyFlowResult {
  const active = isEmergencyLightweightTrading(emergencyRisk);
  const mode = resolveEmergencyMode(input, emergencyRisk);
  const suppressed = active ? suppressTradingObservers(input.observerOverheadRatio) : 0;
  return {
    flow: 'emergency_lightweight',
    detailJa: active
      ? `emergency · mode ${mode} · suppress ${suppressed} · holdings/prices/alerts/manual`
      : `emergency off · risk ${emergencyRisk}`,
  };
}

export function runExecutionPacingFlow(
  input: TradingSafetyObserveInput,
  recConf: number,
  instability: number,
): TradingSafetyFlowResult {
  const flow = buildExecutionPacingFlow(input, recConf, instability);
  return {
    flow: 'execution_pacing',
    detailJa: flow.join(' · '),
  };
}

export function runLongSessionFatigueFlow(input: TradingSafetyObserveInput): TradingSafetyFlowResult {
  const fatigue = isLongSessionFatigue(input);
  const suppressed = fatigue ? suppressTradingObservers(input.observerOverheadRatio) : 0;
  return {
    flow: 'long_session_fatigue',
    detailJa: fatigue
      ? `120min+ · suppress ${suppressed} · thermal stabilize`
      : `session ok · minutes ${input.sessionMinutes}`,
  };
}

export function runContinuityProtectionFlow(input: TradingSafetyObserveInput): TradingSafetyFlowResult {
  const active = isContinuityProtectionActive(input);
  const limit = recoveryExecutionLimitMultiplier(input);
  return {
    flow: 'continuity_protection',
    detailJa: active
      ? `continuity lock · exec limit x${limit} · overlap ${input.hydrationOverlapCount}`
      : `continuity ok`,
  };
}

export function runTradingSafetyFlows(input: TradingSafetyObserveInput): TradingSafetyFlowResult[] {
  const instability = scoreRuntimeInstabilityRisk(input);
  const weighted = scaleSurvivabilityWeightedConfidence(input);
  const recConf = scaleRecommendationConfidence(weighted, instability);
  const tradingRisk = computeRuntimeTradingRisk(input);
  const continuityRisk = input.staleHydrationRisk * 0.5 + (input.hydrationOverlapCount > 0 ? 0.2 : 0);
  const emergencyRisk = tradingRisk * 0.5 + instability * 0.3 + continuityRisk * 0.2;

  const results = [
    runRuntimeRiskFlow(input),
    runInstabilityDegradationFlow(input),
    runEmergencyLightweightFlow(input, emergencyRisk),
    runExecutionPacingFlow(input, recConf, instability),
    runLongSessionFatigueFlow(input),
    runContinuityProtectionFlow(input),
  ];
  for (const r of results) recordTradingSafetyTimeline(r.flow, r.detailJa);
  void resolveSafetyMode(input, emergencyRisk);
  return results;
}

export { resolveSafetyMode };
