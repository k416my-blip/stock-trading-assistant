/**
 * AIコンシェルジュ — 応答速度優先のコンテキスト構築（深層ガバナンスレイヤは省略）
 */
import type { ConciergeSessionMemory } from '../types/aiConciergeSession';
import type { AiPreferences, AiStrategyContextPayload } from '../types/aiStrategy';
import type { AppState } from '../types';
import type { AnalysisApiKeys } from './analysisApiKeys';
import type { ConciergeEvidenceBundle } from '../types/conciergeEvidence';
import type { ApiHealthDashboard } from '../types/apiSetup';
import type { PortfolioPriceSyncState } from '../types/marketData';
import { buildAiStrategyContext, type BuildAiStrategyContextInput } from './aiContextBuilder';
import { buildConciergeEvidenceBundle } from './conciergeEvidenceBuilder';
import { buildXConciergeContextForMessage } from './xApiConciergeContext';
import { userMessageRequestsXInsight } from './xApiIntent';
import { markConciergeChatPerf, startConciergeChatPerf } from './conciergeChatPerfLog';
import { apiHealthSummaryForConcierge } from './apiHealthDashboard';

export type BuildConciergeChatContextInput = {
  userMessage: string;
  state: AppState;
  isPractice: boolean;
  analysisApiKeys: AnalysisApiKeys;
  aiPreferences: AiPreferences;
  marketRegime: BuildAiStrategyContextInput['marketRegime'];
  healthReport: BuildAiStrategyContextInput['healthReport'];
  degradedMode: boolean;
  bootMode: BuildAiStrategyContextInput['bootMode'];
  securityWarnings: BuildAiStrategyContextInput['securityWarnings'];
  recoveryRecommendations: BuildAiStrategyContextInput['recoveryRecommendations'];
  killSwitches: BuildAiStrategyContextInput['killSwitches'];
  priceSync: PortfolioPriceSyncState;
  diagnosticsSummary: string;
  diagnosticsSeverity: BuildAiStrategyContextInput['diagnosticsSeverity'];
  apiDash: ApiHealthDashboard;
  sessionMemory?: ConciergeSessionMemory;
};

export async function buildConciergeChatContext(
  input: BuildConciergeChatContextInput,
): Promise<{ context: AiStrategyContextPayload; evidenceData: ConciergeEvidenceBundle }> {
  startConciergeChatPerf(input.userMessage);

  const holdings = (input.isPractice ? input.state.practice.portfolio : input.state.portfolio)
    .filter((p) => (p.shares ?? 0) > 0)
    .map((p) => ({ symbol: p.symbol, market: p.market }));

  const fetchX = userMessageRequestsXInsight(input.userMessage);

  const xPromise = fetchX
    ? buildXConciergeContextForMessage(input.userMessage, holdings, input.analysisApiKeys)
    : Promise.resolve({ xSocialBriefJa: '', xApiUsageSummaryJa: '' });

  const evidencePromise = buildConciergeEvidenceBundle({
    state: input.state,
    userMessage: input.userMessage,
    apiKeys: input.analysisApiKeys,
    analysisMode: input.aiPreferences.aiAnalysisMode,
    symbolScope: input.aiPreferences.aiAnalysisSymbolScope,
    isPractice: input.isPractice,
  });

  const { buildGlobalMarketAnalysis } = await import('./marketRegimeConciergeEngine');
  const marketPromise = buildGlobalMarketAnalysis();

  const [xCtx, evidenceData, globalMarketAnalysis] = await Promise.all([
    xPromise,
    evidencePromise,
    marketPromise,
  ]);

  markConciergeChatPerf('market_data_ready');

  const { buildPortfolioIntelligenceBundle } = await import('./portfolioIntelligenceBuilder');
  const portfolioIntelligence = await buildPortfolioIntelligenceBundle({
    state: input.state,
    userMessage: input.userMessage,
    actionGuide: evidenceData.actionGuide,
    symbols: evidenceData.symbols.map((s) => ({
      symbol: s.symbol,
      market: s.market,
    })),
    currentAnalysisMode: input.aiPreferences.aiAnalysisMode,
  });

  const context = await buildAiStrategyContext({
    state: input.state,
    appMode: input.state.appMode,
    marketRegime: input.marketRegime,
    healthReport: input.healthReport,
    degradedMode: input.degradedMode,
    bootMode: input.bootMode,
    securityWarnings: input.securityWarnings,
    recoveryRecommendations: input.recoveryRecommendations,
    killSwitches: input.killSwitches,
    priceSync: input.priceSync,
    diagnosticsSummary: input.diagnosticsSummary,
    diagnosticsSeverity: input.diagnosticsSeverity,
    userMessage: input.userMessage,
    aiExplanationLevel: input.aiPreferences.aiExplanationLevel,
    apiHealthSummaryJa: apiHealthSummaryForConcierge(input.apiDash),
    apiHealthDegraded: input.apiDash.degradedByApis,
    apiHealthOpenAiStatusJa: input.apiDash.openAiLabelJa,
    apiHealthNewsStatusJa: input.apiDash.newsLabelJa,
    apiHealthAnyQuotaLimited: input.apiDash.anyQuotaLimited,
    apiHealthAnyStaleWarning: input.apiDash.anyStaleWarning,
    sessionMemory: input.sessionMemory,
    xSocialBriefJa: xCtx.xSocialBriefJa,
    xApiUsageSummaryJa: xCtx.xApiUsageSummaryJa,
    evidenceData,
    globalMarketAnalysis,
    portfolioIntelligence,
    aiAnalysisMode: input.aiPreferences.aiAnalysisMode,
    conciergeUxMode: input.aiPreferences.conciergeUxMode,
  });

  markConciergeChatPerf('context_built');

  return { context, evidenceData };
}
