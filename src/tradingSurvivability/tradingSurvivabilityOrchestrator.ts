import type {
  TradingSurvivabilityObserveInput,
  TradingSurvivabilityTimelineEntry,
} from '../types/tradingSurvivabilityOrchestration';
import { scoreAiConciergePressure } from './survivabilityAwareAiConcierge';
import { computeExecutionPacingFactor } from './tradingExecutionPacingEngine';
import { isTradingGateOpen, scoreRuntimeExecutionSafety } from './runtimeHealthTradingGate';
import {
  computeMarketPollingCost,
  shouldExtendPollingInterval,
} from './thermalAwareMarketPolling';
import {
  computeBridgeConversationDelayMs,
  shouldReduceProactiveAi,
} from './bridgeSafeAiConversationPacing';
import {
  isLowMemoryTradingDegraded,
  scoreHeavyAnalysisPressure,
} from './lowMemoryTradingDegradation';
import {
  computePortfolioRefreshCost,
  getPortfolioRefreshIntervalMultiplier,
} from './runtimeSafePortfolioRefreshScheduler';
import { shouldUseLightweightPolling } from './batteryAwareMarketObservation';
import { watchlistCompressionRatio, essentialSymbolsOnly } from './adaptiveWatchlistCompression';
import { computeWebsocketPressure } from './runtimeAwareWebsocketPacing';
import { computeAiLatencyBalance } from './aiResponseLatencyBalancer';
import {
  getConciergeSuppressionReport,
  selectHeavyAnalysisToSuppress,
  suppressHeavyAnalysis,
} from './heavyAnalysisSuppressionController';
import { computeNotificationPressure } from './runtimeSafePushScheduling';
import { resolveSurvivabilityTradingMode } from './marketSessionSurvivabilityMode';
import {
  scoreTradingHydrationStability,
  shouldPaceTradingHydration,
} from './tradingHydrationContinuity';
import { criticalAlertsOnly } from './runtimeAwareNotificationPacing';
import {
  computeRuntimeTradingFatigue,
  shouldReduceConciergeFrequency,
} from './aiConciergeFatigueController';
import {
  isLongSessionTrading,
  scoreLongSessionAdaptation,
} from './longSessionTradingSurvivabilityEngine';
import {
  isEmergencyLightweightActive,
  scoreEmergencyLightweight,
} from './emergencyLightweightTradingMode';
import { recordTradingSurvivabilityTimeline } from './tradingSurvivabilityTimeline';
import { computeTradingRuntimeHealth } from './runtimeAwareTradingCoordinator';

export type TradingSurvivabilityFlowResult = {
  flow: TradingSurvivabilityTimelineEntry['flow'];
  detailJa: string;
};

export function runTradingRuntimeFlow(input: TradingSurvivabilityObserveInput): TradingSurvivabilityFlowResult {
  const health = computeTradingRuntimeHealth(input);
  const mode = resolveSurvivabilityTradingMode(input);
  const pacing = computeExecutionPacingFactor(input);
  const gate = isTradingGateOpen(input);
  return {
    flow: 'trading_runtime',
    detailJa: `health ${health} · mode ${mode} · pacing ${pacing} · gate ${gate ? 'open' : 'restricted'}`,
  };
}

export function runAiConciergePacingFlow(input: TradingSurvivabilityObserveInput): TradingSurvivabilityFlowResult {
  const pressure = scoreAiConciergePressure(input);
  const delay = computeBridgeConversationDelayMs(input);
  const reduce = shouldReduceProactiveAi(input);
  const fatigue = shouldReduceConciergeFrequency(input);
  return {
    flow: 'ai_concierge_pacing',
    detailJa: `pressure ${pressure} · delay ${delay}ms · proactive ${reduce ? 'reduce' : 'normal'} · fatigue ${fatigue}`,
  };
}

export function runThermalTradingFlow(input: TradingSurvivabilityObserveInput): TradingSurvivabilityFlowResult {
  const extend = shouldExtendPollingInterval(input);
  const polling = computeMarketPollingCost(input);
  const heavy = scoreHeavyAnalysisPressure(input);
  const suppressed = suppressHeavyAnalysis(
    selectHeavyAnalysisToSuppress(heavy),
    'thermal trading',
  );
  return {
    flow: 'thermal_trading',
    detailJa: extend
      ? `thermal ↁEpolling ${polling} · suppress ${suppressed} · lightweight portfolio`
      : `thermal normalize · polling ${polling}`,
  };
}

export function runLowMemoryTradingFlow(input: TradingSurvivabilityObserveInput): TradingSurvivabilityFlowResult {
  const degraded = isLowMemoryTradingDegraded(input);
  const ratio = watchlistCompressionRatio(input);
  const essential = essentialSymbolsOnly(input);
  const refresh = getPortfolioRefreshIntervalMultiplier(input);
  return {
    flow: 'low_memory_trading',
    detailJa: degraded
      ? `memory ↁEwatchlist ${ratio} · essential ${essential} · refresh x${refresh.toFixed(1)}`
      : `memory ok · watchlist full`,
  };
}

export function runEmergencyLightweightFlow(input: TradingSurvivabilityObserveInput): TradingSurvivabilityFlowResult {
  const score = scoreEmergencyLightweight(input);
  const active = isEmergencyLightweightActive(input);
  const safety = scoreRuntimeExecutionSafety(input);
  return {
    flow: 'emergency_lightweight',
    detailJa: active
      ? `emergency ${score} · holdings/prices/alerts/manual only · safety ${safety}`
      : `emergency off · safety ${safety}`,
  };
}

export function runLongSessionSurvivabilityFlow(
  input: TradingSurvivabilityObserveInput,
): TradingSurvivabilityFlowResult {
  const long = isLongSessionTrading(input);
  const adaptation = scoreLongSessionAdaptation(input);
  const ws = computeWebsocketPressure(input);
  const hydration = scoreTradingHydrationStability(input);
  const paceHydration = shouldPaceTradingHydration(input);
  const lightweight = shouldUseLightweightPolling(input);
  const alerts = criticalAlertsOnly(input);
  void computePortfolioRefreshCost(input);
  void computeAiLatencyBalance(input);
  void computeNotificationPressure(input);
  void getConciergeSuppressionReport();
  return {
    flow: 'long_session_survivability',
    detailJa: long
      ? `120min+ · adaptation ${adaptation} · ws ${ws} · hydration ${hydration} · pace ${paceHydration} · poll ${lightweight} · alerts ${alerts}`
      : `session young · ws ${ws}`,
  };
}

export function runTradingSurvivabilityFlows(
  input: TradingSurvivabilityObserveInput,
): TradingSurvivabilityFlowResult[] {
  const results = [
    runTradingRuntimeFlow(input),
    runAiConciergePacingFlow(input),
    runThermalTradingFlow(input),
    runLowMemoryTradingFlow(input),
    runEmergencyLightweightFlow(input),
    runLongSessionSurvivabilityFlow(input),
  ];
  for (const r of results) recordTradingSurvivabilityTimeline(r.flow, r.detailJa);
  return results;
}
