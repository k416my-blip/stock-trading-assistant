/**
 * Trading Safety Governance — runtime risk control only (no recommendation/trading logic changes).
 */
import type {
  TradingSafetyDashboard,
  TradingSafetyObserveInput,
  TradingSafetyProfile,
} from '../types/tradingSafetyGovernance';
import {
  TRADING_SAFETY_POLL_MS,
  TRADING_SAFETY_UI_JA,
} from '../constants/tradingSafetyGovernance';
import { computeRuntimeTradingRisk, resetRuntimeRiskGovernanceCoordinatorForTest } from './runtimeRiskGovernanceCoordinator';
import {
  scaleRecommendationConfidence,
  scaleSurvivabilityWeightedConfidence,
  resetSurvivabilityAwareConfidenceScalerForTest,
} from './survivabilityAwareConfidenceScaler';
import { scoreRuntimeInstabilityRisk, resetRuntimeInstabilityRiskDetectorForTest } from './runtimeInstabilityRiskDetector';
import { scoreThermalTradingPressure, resetThermalRiskAwareExecutionPacingForTest } from './thermalRiskAwareExecutionPacing';
import { resetLowMemoryTradingSafetyModeForTest } from './lowMemoryTradingSafetyMode';
import { scoreWebsocketTradingRisk, resetWebsocketInstabilityRiskGuardForTest } from './websocketInstabilityRiskGuard';
import { resetRuntimeSafeRecommendationPacingForTest } from './runtimeSafeRecommendationPacing';
import {
  buildSuppressionMap,
  scoreRuntimeTradingSuppression,
  suppressTradingObservers,
  resetObserverOverloadTradingSuppressorForTest,
} from './observerOverloadTradingSuppressor';
import {
  getConfidenceEvolution,
  noteConfidenceDegradation,
  resetRuntimeConfidenceDegradationModelForTest,
} from './runtimeConfidenceDegradationModel';
import { resetRecoveryStateExecutionLimiterForTest } from './recoveryStateExecutionLimiter';
import { resolveRiskEscalationLevel, resetRuntimeHealthWeightedAlertEngineForTest } from './runtimeHealthWeightedAlertEngine';
import { resetRuntimeSafeNotificationPacingForTest } from './runtimeSafeNotificationPacing';
import { scoreTradingContinuityRisk, resetTradingContinuitySafetyMonitorForTest } from './tradingContinuitySafetyMonitor';
import { scoreEmergencyTradingRisk, resetRuntimeAnomalyRiskEscalatorForTest } from './runtimeAnomalyRiskEscalator';
import { resetRuntimeAwareEmergencyTradingModeForTest } from './runtimeAwareEmergencyTradingMode';
import { scoreLongSessionTradingFatigue, resetLongSessionRiskFatigueDetectorForTest } from './longSessionRiskFatigueDetector';
import { resetRuntimeSafePollingGovernorForTest } from './runtimeSafePollingGovernor';
import { resetSurvivabilityWeightedRiskScoreForTest } from './survivabilityWeightedRiskScore';
import { scoreRuntimeStressConfidence, resetRuntimeStressConfidenceTrackerForTest } from './runtimeStressConfidenceTracker';
import {
  scoreTradingSafetyEquilibrium,
  resetTradingSafetyEquilibriumCoordinatorForTest,
} from './tradingSafetyEquilibriumCoordinator';
import { scoreExecutionPacingRisk, buildExecutionPacingFlow, resetTradingSafetyExecutionPacingForTest } from './tradingSafetyExecutionPacing';
import {
  getRiskEvolution,
  getTradingSafetyTimelineRecent,
  noteRiskEvolution,
  resetTradingSafetyTimelineForTest,
} from './tradingSafetyTimeline';
import { runTradingSafetyFlows, resolveSafetyMode } from './tradingSafetyOrchestrator';
import {
  recordTradingSafetySoakEvent,
  resetTradingSafetySoakIntegrationForTest,
  setTradingSafetySoakHook,
} from './tradingSafetySoakIntegration';

let lastProfile: TradingSafetyProfile | null = null;
let lastPacingFlow: string[] = [];
let lastSuppressionMap: Record<string, boolean> = {};
let lastThrottleAt = 0;

export function resetTradingSafetyGovernanceForTest(): void {
  lastProfile = null;
  lastPacingFlow = [];
  lastSuppressionMap = {};
  lastThrottleAt = 0;
  resetRuntimeRiskGovernanceCoordinatorForTest();
  resetSurvivabilityAwareConfidenceScalerForTest();
  resetRuntimeInstabilityRiskDetectorForTest();
  resetThermalRiskAwareExecutionPacingForTest();
  resetLowMemoryTradingSafetyModeForTest();
  resetWebsocketInstabilityRiskGuardForTest();
  resetRuntimeSafeRecommendationPacingForTest();
  resetObserverOverloadTradingSuppressorForTest();
  resetRuntimeConfidenceDegradationModelForTest();
  resetRecoveryStateExecutionLimiterForTest();
  resetRuntimeHealthWeightedAlertEngineForTest();
  resetRuntimeSafeNotificationPacingForTest();
  resetTradingContinuitySafetyMonitorForTest();
  resetRuntimeAnomalyRiskEscalatorForTest();
  resetRuntimeAwareEmergencyTradingModeForTest();
  resetLongSessionRiskFatigueDetectorForTest();
  resetRuntimeSafePollingGovernorForTest();
  resetSurvivabilityWeightedRiskScoreForTest();
  resetRuntimeStressConfidenceTrackerForTest();
  resetTradingSafetyEquilibriumCoordinatorForTest();
  resetTradingSafetyExecutionPacingForTest();
  resetTradingSafetyTimelineForTest();
  resetTradingSafetySoakIntegrationForTest();
}

export function initTradingSafetyGovernance(): void {
  lastThrottleAt = 0;
}

export function setTradingSafetySoakHookEnabled(enabled: boolean): void {
  setTradingSafetySoakHook(enabled);
}

export function shouldRunTradingSafetyGovernanceSample(
  _input: TradingSafetyObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < TRADING_SAFETY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

export function observeTradingSafetyGovernance(
  input: TradingSafetyObserveInput,
): TradingSafetyProfile {
  runTradingSafetyFlows(input);
  for (const entry of getTradingSafetyTimelineRecent(5)) {
    recordTradingSafetySoakEvent(entry);
  }

  const tradingRisk = computeRuntimeTradingRisk(input);
  const weighted = scaleSurvivabilityWeightedConfidence(input);
  const instability = scoreRuntimeInstabilityRisk(input);
  const recConf = scaleRecommendationConfidence(weighted, instability);
  const continuityRisk = scoreTradingContinuityRisk(input);
  const emergencyRisk = scoreEmergencyTradingRisk(tradingRisk, instability, continuityRisk);
  const suppressed = suppressTradingObservers(input.observerOverheadRatio);

  noteConfidenceDegradation(recConf, weighted);
  noteRiskEvolution(tradingRisk);

  lastPacingFlow = buildExecutionPacingFlow(input, recConf, instability);
  lastSuppressionMap = buildSuppressionMap(input.observerOverheadRatio);

  const profile: TradingSafetyProfile = {
    runtimeTradingRisk: tradingRisk,
    survivabilityWeightedConfidence: weighted,
    runtimeInstabilityRisk: instability,
    websocketTradingRisk: scoreWebsocketTradingRisk(input),
    executionPacingRisk: scoreExecutionPacingRisk(input),
    runtimeRecommendationConfidence: recConf,
    thermalTradingPressure: scoreThermalTradingPressure(input),
    observerOverheadTradingRisk: Math.round(input.observerOverheadRatio * 1000) / 1000,
    tradingContinuityRisk: continuityRisk,
    runtimeStressConfidence: scoreRuntimeStressConfidence(input),
    longSessionTradingFatigue: scoreLongSessionTradingFatigue(input),
    emergencyTradingRisk: emergencyRisk,
    riskEscalationLevel: resolveRiskEscalationLevel(tradingRisk),
    tradingSafetyEquilibrium: scoreTradingSafetyEquilibrium(input, tradingRisk, weighted),
    runtimeTradingSuppression: scoreRuntimeTradingSuppression(input.observerOverheadRatio, suppressed.length),
    mode: resolveSafetyMode(input, emergencyRisk),
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastTradingSafetyProfile(): TradingSafetyProfile | null {
  return lastProfile;
}

export function getTradingSafetyGovernanceDashboard(): TradingSafetyDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: TRADING_SAFETY_UI_JA.sectionTitle,
    safetyBannerJa: TRADING_SAFETY_UI_JA.safety,
    profile: lastProfile,
    riskEvolution: getRiskEvolution(),
    confidenceTimeline: getConfidenceEvolution(),
    executionPacingFlow: lastPacingFlow,
    suppressionMap: lastSuppressionMap,
    weightedConfidenceGraph: getConfidenceEvolution(),
    timelineRecent: getTradingSafetyTimelineRecent(6),
  };
}
