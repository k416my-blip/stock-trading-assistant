import type { TradingSafetyExportBundle } from '../types/tradingSafetyGovernance';
import { TRADING_SAFETY_GOVERNANCE_VERSION } from '../constants/tradingSafetyGovernance';
import { getTradingSafetyTimeline } from './tradingSafetyTimeline';
import { getConfidenceEvolution } from './runtimeConfidenceDegradationModel';
import { getLastTradingSafetyProfile } from './tradingSafetyCoordinator';
import { getTradingEquilibriumEvolution } from './tradingSafetyEquilibriumCoordinator';
import { getRuntimeSuppressionHistory } from './observerOverloadTradingSuppressor';
import { buildExecutionPacingFlow } from './tradingSafetyExecutionPacing';
import { scoreSurvivabilityWeightedRisk } from './survivabilityWeightedRiskScore';

function emptyInput(): import('../types/tradingSafetyGovernance').TradingSafetyObserveInput {
  return {
    eventLoopLagMs: 0,
    renderFps: 30,
    jsHeapMb: 80,
    memoryTrendPct: 0,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 0,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 0,
    renderStormRisk: 0,
    reconnectPerMin: 0,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 0,
    recoverySuccessRate: 1,
    continuityScore: 100,
    jsSurvivalScore: 100,
    governanceConfidence: 1,
    runtimeSafeTradingScore: 100,
    survivabilityTradingMode: 'full_trading',
    observerOverheadRatio: 0,
    equilibriumScore: 1,
    metaCoordinationStability: 1,
    staleHydrationRisk: 0,
    causalConfidence: 1,
  };
}

export function buildTradingSafetyTimelineExport(): TradingSafetyExportBundle['tradingSafetyTimeline'] {
  return getTradingSafetyTimeline();
}

export function buildExecutionPacingReportExport(): Record<string, unknown> {
  const profile = getLastTradingSafetyProfile();
  const input = emptyInput();
  return {
    executionPacingRisk: profile?.executionPacingRisk ?? 0,
    flow: profile
      ? buildExecutionPacingFlow(input, profile.runtimeRecommendationConfidence, profile.runtimeInstabilityRisk)
      : [],
    exportedAt: new Date().toISOString(),
  };
}

export function buildSurvivabilityWeightedRiskReportExport(): Record<string, unknown> {
  const profile = getLastTradingSafetyProfile();
  return {
    survivabilityWeightedRisk: profile ? scoreSurvivabilityWeightedRisk(emptyInput()) : 0,
    runtimeTradingRisk: profile?.runtimeTradingRisk ?? 0,
    survivabilityWeightedConfidence: profile?.survivabilityWeightedConfidence ?? 0,
    exportedAt: new Date().toISOString(),
  };
}

export function buildTradingSafetyExportBundle(): TradingSafetyExportBundle {
  return {
    version: TRADING_SAFETY_GOVERNANCE_VERSION,
    exportedAt: new Date().toISOString(),
    tradingSafetyTimeline: buildTradingSafetyTimelineExport(),
    runtimeConfidenceEvolution: getConfidenceEvolution(),
    executionPacingReport: buildExecutionPacingReportExport(),
    survivabilityWeightedRiskReport: buildSurvivabilityWeightedRiskReportExport(),
    runtimeSuppressionHistory: getRuntimeSuppressionHistory(),
    tradingEquilibriumEvolution: getTradingEquilibriumEvolution(),
    profile: getLastTradingSafetyProfile(),
  };
}

export function formatTradingSafetyExportJson(): string {
  return JSON.stringify(buildTradingSafetyExportBundle(), null, 2);
}
