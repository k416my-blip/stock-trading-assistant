/**
 * portfolioAiEvaluation 未付与時に strategyBundle（hybrid 含む）から UI 用評価を復元
 */
import type { AiSecondEvaluatorAction } from '../types/aiSecondEvaluator';
import type {
  PortfolioAiEvaluationBundle,
  PortfolioAiSymbolEvaluation,
} from '../types/portfolioAiEvaluation';
import type { StrategyExecutionBundle, StrategySymbolRecommendation } from '../types/strategyExecution';
import { actionToDisplayTone, formatEvaluatedAtJa } from './portfolioAiEvaluationDisplay';

function mapHybridSourceForDisplay(source: string | undefined): string {
  if (!source) return MISSING_JA;
  if (source === 'mock_fallback') return 'rule_only';
  if (source === 'openai' || source === 'cache') return 'hybrid';
  return source;
}

const MISSING_JA = '未取得';

function strategyActionToAiAction(
  action: StrategySymbolRecommendation['action'],
): AiSecondEvaluatorAction {
  if (action === 'buy') return 'buy';
  if (action === 'reduce' || action === 'avoid') return 'reduce';
  return 'hold';
}

function evalFromRecommendation(rec: StrategySymbolRecommendation): PortfolioAiSymbolEvaluation {
  const hybrid = rec.hybrid;
  const action = hybrid?.aiAction ?? strategyActionToAiAction(rec.action);
  const confidence = hybrid?.aiConfidencePct ?? rec.confidencePct;
  const finalScore = hybrid?.finalScore ?? rec.opportunityScore;
  const ruleScore = hybrid?.ruleScore ?? rec.opportunityScore;
  const aiScore = hybrid?.aiScore ?? rec.confidencePct;
  const rsiSource = hybrid?.rsiSource ?? null;

  return {
    rank: 0,
    symbol: rec.symbol,
    displayLabelJa: rec.displayLabelJa,
    action,
    confidence,
    rsi14: hybrid?.rsi14 ?? null,
    rsiSource,
    rationaleJa: hybrid?.rationaleJa?.trim() || rec.whyProposedJa?.trim() || MISSING_JA,
    finalScore,
    ruleScore,
    aiScore,
    displayTone: actionToDisplayTone(action),
    dataSources: {
      quote: rsiSource ? (rsiSource.toLowerCase().includes('yahoo') ? 'Yahoo' : rsiSource) : null,
      rsi: rsiSource,
      news: null,
      x: null,
    },
    weightPct: 0,
  };
}

function uniqueRecommendations(bundle: StrategyExecutionBundle): StrategySymbolRecommendation[] {
  const map = new Map<string, StrategySymbolRecommendation>();
  for (const r of [
    ...bundle.todayRecommendations,
    ...bundle.dangerAvoid,
    ...bundle.watchList,
    ...bundle.highExpectancy,
  ]) {
    map.set(r.symbol.toUpperCase(), r);
  }
  return Array.from(map.values());
}

/** holdingCount と rankedHoldings の不整合を吸収（スコアが「未取得」になるのを防ぐ） */
export function normalizePortfolioAiEvaluation(
  evalBundle: PortfolioAiEvaluationBundle,
): PortfolioAiEvaluationBundle {
  const rankedHoldings = evalBundle.rankedHoldings ?? [];
  const holdingCount = Math.max(
    evalBundle.holdingCount ?? 0,
    rankedHoldings.length,
    evalBundle.bestToday?.length ?? 0,
    evalBundle.worstToday?.length ?? 0,
  );
  const portfolioScore =
    typeof evalBundle.portfolioScore === 'number' && Number.isFinite(evalBundle.portfolioScore)
      ? evalBundle.portfolioScore
      : holdingCount > 0
        ? Math.round(
            rankedHoldings.reduce((s, e) => s + e.finalScore, 0) / Math.max(rankedHoldings.length, 1),
          )
        : 50;
  return { ...evalBundle, holdingCount, portfolioScore, rankedHoldings };
}

/** portfolioAiEvaluation が無くても Action Center を満たす表示用データ */
export function resolvePortfolioAiEvaluation(
  bundle: StrategyExecutionBundle,
): PortfolioAiEvaluationBundle {
  if (bundle.portfolioAiEvaluation) {
    return normalizePortfolioAiEvaluation(bundle.portfolioAiEvaluation);
  }

  const generatedAt = bundle.hybridSecondEvaluator?.generatedAt ?? new Date().toISOString();
  const batchSource = mapHybridSourceForDisplay(bundle.hybridSecondEvaluator?.source);
  const evaluations = uniqueRecommendations(bundle).map(evalFromRecommendation);

  const rankedHoldings = [...evaluations]
    .sort((a, b) => b.finalScore - a.finalScore || a.symbol.localeCompare(b.symbol))
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const portfolioScore =
    rankedHoldings.length === 0
      ? 50
      : Math.round(
          rankedHoldings.reduce((s, e) => s + e.finalScore, 0) / rankedHoldings.length,
        );

  return {
    generatedAt,
    evaluatedAtJa: formatEvaluatedAtJa(generatedAt),
    portfolioScore,
    holdingCount: rankedHoldings.length,
    batchSource,
    rankedHoldings,
    bestToday: rankedHoldings.slice(0, 3),
    worstToday: [...rankedHoldings].reverse().slice(0, 3),
    riskWarnings: [],
  };
}
