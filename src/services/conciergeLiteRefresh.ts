/**
 * AI Action Center 軽量モード — strategy + portfolio 評価のみ（Metro OOM / 実機負荷切り分け）
 */
import type { AppState } from '../types';
import type { AiPreferences } from '../types/aiStrategy';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import { getActivePortfolio } from './portfolioPriceUpdate';
import { logAppMemorySnapshot } from '../utils/appMemoryDiagnostics';

export type ConciergeLiteRefreshInput = {
  state: AppState;
  aiPreferences: AiPreferences;
  setStrategyBundle: (b: StrategyExecutionBundle | null) => void;
  clearHeavyConciergeBundles: () => void;
};

/** 巨大エンジン（reality / risk / reactive 等）をスキップし strategy のみ構築 */
export async function runConciergeLiteProactiveRefresh(
  input: ConciergeLiteRefreshInput,
): Promise<void> {
  logAppMemorySnapshot('lite_refresh_start');

  input.clearHeavyConciergeBundles();

  const holdings = getActivePortfolio(input.state);
  const { buildConciergeEvidenceForProactive } = await import('./conciergeEvidenceBuilder');
  const { loadAnalysisApiKeys } = await import('./analysisApiKeys');
  const apiKeys = await loadAnalysisApiKeys();
  const proactiveEvidence = await buildConciergeEvidenceForProactive(
    input.state,
    apiKeys,
    input.aiPreferences.aiAnalysisMode,
    {
      isPractice: input.state.appMode === 'practice',
      symbolScope: input.aiPreferences.aiAnalysisSymbolScope,
    },
  );

  logAppMemorySnapshot('lite_after_evidence', {
    symbolCount: proactiveEvidence.symbols.length,
    holdingCount: holdings.length,
  });

  const { loadStrategyExecutionState } = await import('./strategyExecutionStorage');
  const { buildStrategyExecutionBundle } = await import('./strategyExecutionEngine');
  const { buildSymbolWeightPctMap } = await import('./metaDecisionPortfolioWeights');
  const stratState = await loadStrategyExecutionState();
  const symbolWeightPct = buildSymbolWeightPctMap(holdings);
  const { buildGlobalMarketAnalysis } = await import('./marketRegimeConciergeEngine');
  const globalMarketAnalysis = await buildGlobalMarketAnalysis();
  const { resolveStrategyTacticalMode } = await import('./macroIntelligenceIntegration');

  const tacticalMode = resolveStrategyTacticalMode(
    input.aiPreferences.strategyTacticalMode,
    null,
  );
  const regimeForStrategy = globalMarketAnalysis.regimeId;
  const { buildPortfolioIntelligenceBundle } = await import('./portfolioIntelligenceBuilder');
  const portfolioIntel = await buildPortfolioIntelligenceBundle({
    state: input.state,
    currentAnalysisMode: input.aiPreferences.aiAnalysisMode,
  });

  let strategy = buildStrategyExecutionBundle(
    {
      evidenceSymbols: proactiveEvidence.symbols,
      globalMarket: globalMarketAnalysis,
      portfolioIntel,
      symbolWeightPct,
      tacticalMode,
      regimeId: regimeForStrategy,
      cashRatioPctEstimate: 15,
    },
    stratState,
  );

  const { AI_ACTION_CENTER_LITE_SKIP_HYBRID } = await import('../constants/aiConciergeDevFlags');
  const { shouldPreferRealApiOverDegraded } = await import('../constants/realApiMode');
  const preferRealApi = shouldPreferRealApiOverDegraded();
  if (!AI_ACTION_CENTER_LITE_SKIP_HYBRID || preferRealApi) {
    try {
      const { enhanceStrategyBundleWithHybridEvaluator } = await import('./strategyHybridEnhancement');
      const hybridDegraded =
        input.aiPreferences.mockOnly || !input.aiPreferences.aiEnabled;
      strategy = await enhanceStrategyBundleWithHybridEvaluator(
        strategy,
        proactiveEvidence.symbols,
        {
          degradedMode: hybridDegraded,
          forceAi:
            input.aiPreferences.aiEnabled && !input.aiPreferences.mockOnly,
        },
      );
    } catch (err) {
      console.warn(
        '[concierge-lite] hybrid skipped',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  input.setStrategyBundle(strategy);

  logAppMemorySnapshot('lite_refresh_done', {
    symbolCount: proactiveEvidence.symbols.length,
    holdingCount: holdings.length,
    portfolioScore: strategy.portfolioAiEvaluation?.portfolioScore ?? null,
    rankedCount: strategy.portfolioAiEvaluation?.rankedHoldings.length ?? 0,
    hybridSkipped: AI_ACTION_CENTER_LITE_SKIP_HYBRID,
  });
}
