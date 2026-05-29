/**
 * 保有銘柄すべての AI 第二評価をランキング・ポートフォリオスコアに集約
 */
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
} from './hybridStrategyScoreFusion';
import {
  actionToDisplayTone,
  buildDataSourcesFromInput,
  formatEvaluatedAtJa,
} from './portfolioAiEvaluationDisplay';
import type { AiSecondEvaluatorBatchResult, AiSecondEvaluatorSymbolInput } from '../types/aiSecondEvaluator';
import type {
  PortfolioAiEvaluationBundle,
  PortfolioAiSymbolEvaluation,
} from '../types/portfolioAiEvaluation';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function resolveAiResult(
  symbol: string,
  batch: AiSecondEvaluatorBatchResult,
  input: AiSecondEvaluatorSymbolInput,
): { action: import('../types/aiSecondEvaluator').AiSecondEvaluatorAction; confidence: number; rationaleJa: string } {
  const hit = batch.symbols.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
  if (hit) return hit;
  const rsi = input.rsi14 ?? 50;
  let action: import('../types/aiSecondEvaluator').AiSecondEvaluatorAction = 'hold';
  let confidence = 52;
  if (rsi >= 70) {
    action = 'reduce';
    confidence = 58;
  } else if (rsi <= 30) {
    action = 'buy';
    confidence = 56;
  }
  return { action, confidence, rationaleJa: '評価データ一部未取得 — ルール参考' };
}

export type BuildPortfolioAiEvaluationInput = {
  enrichedInputs: AiSecondEvaluatorSymbolInput[];
  batch: AiSecondEvaluatorBatchResult;
  ruleScoresBySymbol: Record<string, number>;
  symbolWeightPct: Record<string, number>;
};

export function buildPortfolioAiEvaluation(
  input: BuildPortfolioAiEvaluationInput,
): PortfolioAiEvaluationBundle {
  const generatedAt = input.batch.fetchedAt || new Date().toISOString();
  const evaluations: PortfolioAiSymbolEvaluation[] = [];

  for (const inp of input.enrichedInputs) {
    const sym = inp.symbol.toUpperCase();
    const ai = resolveAiResult(sym, input.batch, inp);
    const ruleScore = input.ruleScoresBySymbol[sym] ?? 50;
    const aiScore = actionConfidenceToDirectionScore(ai.action, ai.confidence);
    const finalScore = computeFinalHybridScore(ruleScore, aiScore);
    const weightPct = input.symbolWeightPct[sym] ?? 0;

    evaluations.push({
      rank: 0,
      symbol: inp.symbol,
      displayLabelJa: inp.displayLabelJa,
      action: ai.action,
      confidence: ai.confidence,
      rsi14: inp.rsi14,
      rsiSource: inp.rsiSource,
      rationaleJa: ai.rationaleJa,
      finalScore,
      ruleScore,
      aiScore,
      displayTone: actionToDisplayTone(ai.action),
      dataSources: buildDataSourcesFromInput(inp),
      weightPct,
    });
  }

  const rankedHoldings = [...evaluations]
    .sort((a, b) => b.finalScore - a.finalScore || a.symbol.localeCompare(b.symbol))
    .map((e, i) => ({ ...e, rank: i + 1 }));

  let weightSum = 0;
  let scoreWeighted = 0;
  for (const e of rankedHoldings) {
    const w = e.weightPct > 0 ? e.weightPct : 100 / Math.max(rankedHoldings.length, 1);
    weightSum += w;
    scoreWeighted += e.finalScore * w;
  }
  const portfolioScore =
    rankedHoldings.length === 0 ? 50 : clamp(scoreWeighted / Math.max(weightSum, 1));

  const bestToday = rankedHoldings.slice(0, 3);
  const worstToday = [...rankedHoldings].reverse().slice(0, 3);

  const riskWarnings: string[] = [];
  for (const e of rankedHoldings) {
    if (e.action === 'reduce' || e.finalScore < 38) {
      riskWarnings.push(
        `${e.displayLabelJa}（${e.symbol}）— ${displayToneLabelFromEval(e)} · スコア${e.finalScore} — ${e.rationaleJa.slice(0, 100)}`,
      );
    }
  }
  if (riskWarnings.length === 0 && rankedHoldings.some((e) => e.rsi14 != null && e.rsi14 >= 72)) {
    const hot = rankedHoldings.find((e) => (e.rsi14 ?? 0) >= 72);
    if (hot) {
      riskWarnings.push(`${hot.displayLabelJa}（${hot.symbol}）— RSI ${hot.rsi14} 買われすぎ圏`);
    }
  }

  return {
    generatedAt,
    evaluatedAtJa: formatEvaluatedAtJa(generatedAt),
    portfolioScore,
    holdingCount: rankedHoldings.length,
    batchSource: input.batch.source,
    rankedHoldings,
    bestToday,
    worstToday,
    riskWarnings,
  };
}

function displayToneLabelFromEval(e: PortfolioAiSymbolEvaluation): string {
  if (e.displayTone === 'buy') return '買い';
  if (e.displayTone === 'sell') return '売り';
  return '保有';
}
