/**
 * Trading Survivability Orchestration  Eruntime-aware execution only (no trading logic changes).
 */
import type {
  TradingSurvivabilityDashboard,
  TradingSurvivabilityObserveInput,
  TradingSurvivabilityProfile,
  SurvivabilityTradingMode,
} from '../types/tradingSurvivabilityOrchestration';
import {
  TRADING_SURVIVABILITY_POLL_MS,
  TRADING_SURVIVABILITY_UI_JA,
} from '../constants/tradingSurvivabilityOrchestration';
import { computeTradingRuntimeHealth, resetRuntimeAwareTradingCoordinatorForTest } from './runtimeAwareTradingCoordinator';
import { scoreAiConciergePressure, resetSurvivabilityAwareAiConciergeForTest } from './survivabilityAwareAiConcierge';
import { resetTradingExecutionPacingEngineForTest } from './tradingExecutionPacingEngine';
import { resetRuntimeHealthTradingGateForTest, scoreRuntimeExecutionSafety } from './runtimeHealthTradingGate';
import { computeMarketPollingCost, resetThermalAwareMarketPollingForTest } from './thermalAwareMarketPolling';
import { resetBridgeSafeAiConversationPacingForTest } from './bridgeSafeAiConversationPacing';
import { scoreHeavyAnalysisPressure, resetLowMemoryTradingDegradationForTest } from './lowMemoryTradingDegradation';
import { computePortfolioRefreshCost, resetRuntimeSafePortfolioRefreshSchedulerForTest } from './runtimeSafePortfolioRefreshScheduler';
import { resetBatteryAwareMarketObservationForTest } from './batteryAwareMarketObservation';
import { resetAdaptiveWatchlistCompressionForTest } from './adaptiveWatchlistCompression';
import { computeWebsocketPressure, resetRuntimeAwareWebsocketPacingForTest } from './runtimeAwareWebsocketPacing';
import { computeAiLatencyBalance, resetAiResponseLatencyBalancerForTest } from './aiResponseLatencyBalancer';
import { resetHeavyAnalysisSuppressionControllerForTest } from './heavyAnalysisSuppressionController';
import { computeNotificationPressure, resetRuntimeSafePushSchedulingForTest } from './runtimeSafePushScheduling';
import { resolveSurvivabilityTradingMode, resetMarketSessionSurvivabilityModeForTest } from './marketSessionSurvivabilityMode';
import { scoreTradingHydrationStability, resetTradingHydrationContinuityForTest } from './tradingHydrationContinuity';
import { resetRuntimeAwareNotificationPacingForTest } from './runtimeAwareNotificationPacing';
import { computeRuntimeTradingFatigue, resetAiConciergeFatigueControllerForTest } from './aiConciergeFatigueController';
import { resetLongSessionTradingSurvivabilityEngineForTest } from './longSessionTradingSurvivabilityEngine';
import { scoreEmergencyLightweight, resetEmergencyLightweightTradingModeForTest } from './emergencyLightweightTradingMode';
import {
  getTradingSurvivabilityTimelineRecent,
  resetTradingSurvivabilityTimelineForTest,
} from './tradingSurvivabilityTimeline';
import { runTradingSurvivabilityFlows } from './tradingSurvivabilityOrchestrator';
import {
  recordTradingSurvivabilitySoakEvent,
  resetTradingSurvivabilitySoakIntegrationForTest,
  setTradingSurvivabilitySoakHook,
} from './tradingSurvivabilitySoakIntegration';

const pollingModeHistory: { at: string; cost: number; mode: SurvivabilityTradingMode }[] = [];

let lastProfile: TradingSurvivabilityProfile | null = null;
let lastThrottleAt = 0;

export function resetTradingSurvivabilityForTest(): void {
  lastProfile = null;
  lastThrottleAt = 0;
  pollingModeHistory.length = 0;
  resetRuntimeAwareTradingCoordinatorForTest();
  resetSurvivabilityAwareAiConciergeForTest();
  resetTradingExecutionPacingEngineForTest();
  resetRuntimeHealthTradingGateForTest();
  resetThermalAwareMarketPollingForTest();
  resetBridgeSafeAiConversationPacingForTest();
  resetLowMemoryTradingDegradationForTest();
  resetRuntimeSafePortfolioRefreshSchedulerForTest();
  resetBatteryAwareMarketObservationForTest();
  resetAdaptiveWatchlistCompressionForTest();
  resetRuntimeAwareWebsocketPacingForTest();
  resetAiResponseLatencyBalancerForTest();
  resetHeavyAnalysisSuppressionControllerForTest();
  resetRuntimeSafePushSchedulingForTest();
  resetMarketSessionSurvivabilityModeForTest();
  resetTradingHydrationContinuityForTest();
  resetRuntimeAwareNotificationPacingForTest();
  resetAiConciergeFatigueControllerForTest();
  resetLongSessionTradingSurvivabilityEngineForTest();
  resetEmergencyLightweightTradingModeForTest();
  resetTradingSurvivabilityTimelineForTest();
  resetTradingSurvivabilitySoakIntegrationForTest();
}

export function initTradingSurvivability(): void {
  lastThrottleAt = 0;
}

export function setTradingSurvivabilitySoakHookEnabled(enabled: boolean): void {
  setTradingSurvivabilitySoakHook(enabled);
}

export function shouldRunTradingSurvivabilitySample(
  _input: TradingSurvivabilityObserveInput,
  now = Date.now(),
): boolean {
  if (now - lastThrottleAt < TRADING_SURVIVABILITY_POLL_MS) return false;
  lastThrottleAt = now;
  return true;
}

function computeRuntimeSafeTradingScore(
  health: number,
  safety: number,
  hydration: number,
  governanceConfidence: number,
): number {
  const raw = health * 0.4 + safety * 100 * 0.25 + hydration * 100 * 0.2 + governanceConfidence * 100 * 0.15;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function computeBridgeTradingOverhead(input: TradingSurvivabilityObserveInput): number {
  return Math.round(Math.min(1, input.bridgeTrafficRate / 15 + input.renderStormRisk * 0.3) * 1000) / 1000;
}

export function observeTradingSurvivability(
  input: TradingSurvivabilityObserveInput,
): TradingSurvivabilityProfile {
  runTradingSurvivabilityFlows(input);
  for (const entry of getTradingSurvivabilityTimelineRecent(5)) {
    recordTradingSurvivabilitySoakEvent(entry);
  }

  const health = computeTradingRuntimeHealth(input);
  const aiPressure = scoreAiConciergePressure(input);
  const pollingCost = computeMarketPollingCost(input);
  const wsPressure = computeWebsocketPressure(input);
  const refreshCost = computePortfolioRefreshCost(input);
  const aiBalance = computeAiLatencyBalance(input);
  const heavyPressure = scoreHeavyAnalysisPressure(input);
  const notifPressure = computeNotificationPressure(input);
  const fatigue = computeRuntimeTradingFatigue(input);
  const mode = resolveSurvivabilityTradingMode(input);
  const bridgeOverhead = computeBridgeTradingOverhead(input);
  const safety = scoreRuntimeExecutionSafety(input);
  const hydration = scoreTradingHydrationStability(input);
  const emergency = scoreEmergencyLightweight(input);
  const safeScore = computeRuntimeSafeTradingScore(health, safety, hydration, input.governanceConfidence);

  pollingModeHistory.push({ at: new Date().toISOString(), cost: pollingCost, mode });
  if (pollingModeHistory.length > 120) pollingModeHistory.shift();

  const profile: TradingSurvivabilityProfile = {
    tradingRuntimeHealth: health,
    aiConciergePressure: aiPressure,
    marketPollingCost: pollingCost,
    websocketPressure: wsPressure,
    portfolioRefreshCost: refreshCost,
    runtimeSafeTradingScore: safeScore,
    aiLatencyBalance: aiBalance,
    heavyAnalysisPressure: heavyPressure,
    notificationPressure: notifPressure,
    runtimeTradingFatigue: fatigue,
    survivabilityTradingMode: mode,
    bridgeTradingOverhead: bridgeOverhead,
    runtimeExecutionSafety: safety,
    tradingHydrationStability: hydration,
    emergencyLightweightScore: emergency,
    measuredAt: new Date().toISOString(),
  };

  lastProfile = profile;
  return profile;
}

export function getLastTradingSurvivabilityProfile(): TradingSurvivabilityProfile | null {
  return lastProfile;
}

export function getRuntimeAwarePollingHistory(): { at: string; cost: number; mode: SurvivabilityTradingMode }[] {
  return [...pollingModeHistory];
}

export function getTradingSurvivabilityDashboard(): TradingSurvivabilityDashboard | null {
  if (!lastProfile) return null;
  return {
    titleJa: TRADING_SURVIVABILITY_UI_JA.sectionTitle,
    safetyBannerJa: TRADING_SURVIVABILITY_UI_JA.safety,
    profile: lastProfile,
    timelineRecent: getTradingSurvivabilityTimelineRecent(6),
  };
}

export const observeTradingSurvivabilityOrchestration = observeTradingSurvivability;
export const initTradingSurvivabilityOrchestration = initTradingSurvivability;
export const resetTradingSurvivabilityOrchestrationForTest = resetTradingSurvivabilityForTest;
