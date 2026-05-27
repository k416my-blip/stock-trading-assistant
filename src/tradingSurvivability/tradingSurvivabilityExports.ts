import type { TradingSurvivabilityExportBundle } from '../types/tradingSurvivabilityOrchestration';
import { TRADING_SURVIVABILITY_ORCHESTRATION_VERSION } from '../constants/tradingSurvivabilityOrchestration';
import { getTradingSurvivabilityTimeline } from './tradingSurvivabilityTimeline';
import {
  getLastTradingSurvivabilityProfile,
  getRuntimeAwarePollingHistory,
} from './tradingSurvivabilityCoordinator';
import { getConciergeSuppressionReport } from './heavyAnalysisSuppressionController';

export function buildTradingSurvivabilityTimelineExport(): TradingSurvivabilityExportBundle['survivabilityTimeline'] {
  return getTradingSurvivabilityTimeline();
}

export function buildAiPacingTransitionsExport(): TradingSurvivabilityExportBundle['aiPacingTransitions'] {
  return getTradingSurvivabilityTimeline().filter((e) => e.flow === 'ai_concierge_pacing');
}

export function buildLightweightModeTransitionsExport(): TradingSurvivabilityExportBundle['lightweightModeTransitions'] {
  return getTradingSurvivabilityTimeline().filter(
    (e) => e.flow === 'emergency_lightweight' || e.flow === 'low_memory_trading',
  );
}

export function buildRuntimeAwarePollingHistoryExport(): TradingSurvivabilityExportBundle['pollingHistory'] {
  return getRuntimeAwarePollingHistory();
}

export function buildConciergeSuppressionReportExport(): Record<string, unknown>[] {
  return getConciergeSuppressionReport();
}

export function buildTradingSurvivabilityExportBundle(): TradingSurvivabilityExportBundle {
  return {
    version: TRADING_SURVIVABILITY_ORCHESTRATION_VERSION,
    exportedAt: new Date().toISOString(),
    survivabilityTimeline: buildTradingSurvivabilityTimelineExport(),
    aiPacingTransitions: buildAiPacingTransitionsExport(),
    lightweightModeTransitions: buildLightweightModeTransitionsExport(),
    pollingHistory: buildRuntimeAwarePollingHistoryExport(),
    conciergeSuppressionReport: buildConciergeSuppressionReportExport(),
    profile: getLastTradingSurvivabilityProfile(),
  };
}

export function formatTradingSurvivabilityExportJson(): string {
  return JSON.stringify(buildTradingSurvivabilityExportBundle(), null, 2);
}
