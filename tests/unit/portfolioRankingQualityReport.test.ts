/**
 * ランキング品質調査レポート（1155 vs 0820EA + 上位10）
 * npx vitest run tests/unit/portfolioRankingQualityReport.test.ts
 */
import { describe, it } from 'vitest';
import { buildPortfolioAiEvaluation } from '../../src/services/portfolioAiEvaluationBuilder';
import {
  breakdownFromRuleAndAi,
  breakdownFromStrategyAndAi,
  getComputeFinalHybridScoreFormulaJa,
} from '../../src/services/portfolioHybridScoreBreakdown';
import {
  actionConfidenceToDirectionScore,
  computeFinalHybridScore,
  ruleActionToDirectionScore,
} from '../../src/services/hybridStrategyScoreFusion';
import type { AiSecondEvaluatorSymbolInput } from '../../src/types/aiSecondEvaluator';
import type { AiSecondEvaluatorBatchResult } from '../../src/types/aiSecondEvaluator';

function log(title: string, obj: unknown) {
  // eslint-disable-next-line no-console
  console.log(`\n### ${title}\n`, JSON.stringify(obj, null, 2));
}

function inp(symbol: string, rsi14: number): AiSecondEvaluatorSymbolInput {
  return {
    symbol,
    market: 'bursa',
    displayLabelJa: symbol,
    currentPrice: 10,
    portfolioHolding: { shares: 100, averageBuyPrice: 9, unrealizedPnlPct: 5 },
    rsi14,
    rsiSource: 'yahoo_finance',
    priceHistoryBars: 120,
    volume: 1,
    volumeSurgeRatio: 1,
    newsSummaryJa: '中立',
    newsHeadlines: [],
    newsCount: 1,
    newsSource: 'Yahoo Finance RSS',
    newsApiCount: 0,
    newsApiTitles: [],
    xSentimentSummaryJa: '中立',
    xBullishPct: 0,
    xBearishPct: 0,
    xPostCount: 0,
    xSentimentDisplay: null,
    xFetchSource: 'skipped',
    volumeSource: 'evidence',
    quoteSource: 'yahoo_finance',
    priceAgeSeconds: 60,
    quoteIsStale: false,
  };
}

/** Bursa 4銘柄 — 前回診断と同じ AI/ルール（1155→42, 0820EA→51） */
const BURSA_BATCH: AiSecondEvaluatorBatchResult = {
  fetchedAt: new Date().toISOString(),
  source: 'openai',
  symbols: [
    { symbol: '1155', action: 'reduce', confidence: 55, rationaleJa: 'RSI高め・利確圧力' },
    { symbol: '1023', action: 'hold', confidence: 58, rationaleJa: '中立' },
    { symbol: '4707', action: 'hold', confidence: 52, rationaleJa: '中立' },
    { symbol: '0820EA', action: 'hold', confidence: 60, rationaleJa: 'RSI低め・ディフェンシブ' },
  ],
};

const BURSA_RULE: Record<string, number> = {
  '1155': 40,
  '1023': 48,
  '4707': 50,
  '0820EA': 50,
};

/** operational-ai-report.json 10銘柄 run（rankedTop5 + best/worst から再構成） */
const OP10_AI: Array<{
  symbol: string;
  action: 'hold' | 'reduce' | 'watch' | 'buy';
  confidence: number;
  rsi14: number;
  finalScoreReported: number;
}> = [
  { symbol: 'VYM', action: 'hold', confidence: 70, rsi14: 68, finalScoreReported: 52 },
  { symbol: '0820EA', action: 'hold', confidence: 55, rsi14: 32, finalScoreReported: 50 },
  { symbol: '4707', action: 'hold', confidence: 55, rsi14: 26, finalScoreReported: 50 },
  { symbol: '7103', action: 'watch', confidence: 50, rsi14: 39, finalScoreReported: 49 },
  { symbol: '1155', action: 'buy', confidence: 75, rsi14: 23, finalScoreReported: 42 },
  { symbol: '1023', action: 'hold', confidence: 55, rsi14: 50, finalScoreReported: 47 },
  { symbol: 'SCHD', action: 'hold', confidence: 58, rsi14: 45, finalScoreReported: 48 },
  { symbol: '5225', action: 'hold', confidence: 50, rsi14: 40, finalScoreReported: 36 },
  { symbol: '5183', action: 'watch', confidence: 48, rsi14: 35, finalScoreReported: 33 },
  { symbol: '5347', action: 'reduce', confidence: 65, rsi14: 31, finalScoreReported: 29 },
];

describe('portfolio ranking quality report', () => {
  it('prints full investigation for 1155, 0820EA, top10, formula', () => {
    // eslint-disable-next-line no-console
    console.log('\n========== 6. computeFinalHybridScore 計算式 ==========\n' + getComputeFinalHybridScoreFormulaJa());

    const b1155 = breakdownFromRuleAndAi('1155.KL', BURSA_RULE['1155']!, 'reduce', 55, {
      ruleAction: 'reduce',
      ruleConfidencePct: 72,
      rsi14: 68,
    });
  const b0820 = breakdownFromRuleAndAi('0820EA', BURSA_RULE['0820EA']!, 'hold', 60, {
      ruleAction: 'hold',
      ruleConfidencePct: 50,
      rsi14: 32,
    });

    log('1. 1155.KL finalScore 42 内訳（Bursa診断シナリオ: ルール40 + AI reduce 55）', {
      ...b1155,
      note: 'holdConfidence は aiAction=hold のときのみ。1155 は reduce のため holdConfidence=0',
    });
    log('2. 0820EA finalScore 51 内訳', b0820);

    const op1155 = breakdownFromRuleAndAi(
      '1155',
      Math.round((42 - 0.3 * actionConfidenceToDirectionScore('buy', 75)) / 0.7),
      'buy',
      75,
      { rsi14: 23 },
    );
    log('1b. operationalレポート再現 1155（buy 75 → final 42）逆算 ruleScore', {
      ...op1155,
      inferredRule: '約28 = 戦略ルールが売り寄り(reduce)相当',
    });

    const enriched = OP10_AI.map((r) => inp(r.symbol, r.rsi14));
    const batch: AiSecondEvaluatorBatchResult = {
      fetchedAt: new Date().toISOString(),
      source: 'openai',
      symbols: OP10_AI.map((r) => ({
        symbol: r.symbol,
        action: r.action,
        confidence: r.confidence,
        rationaleJa: 'operational-report',
      })),
    };
    const HYBRID_RULE_W = 0.7;
    const HYBRID_AI_W = 0.3;
    const ruleScores: Record<string, number> = {};
    for (const r of OP10_AI) {
      const aiScore = actionConfidenceToDirectionScore(r.action, r.confidence);
      ruleScores[r.symbol.toUpperCase()] = Math.round(
        (r.finalScoreReported - HYBRID_AI_W * aiScore) / HYBRID_RULE_W,
      );
    }

    const evalResult = buildPortfolioAiEvaluation({
      enrichedInputs: enriched,
      batch,
      ruleScoresBySymbol: ruleScores,
      symbolWeightPct: Object.fromEntries(OP10_AI.map((r) => [r.symbol.toUpperCase(), 10])),
    });

    const top10 = evalResult.rankedHoldings.slice(0, 10).map((r) => {
      const ai = batch.symbols.find((s) => s.symbol.toUpperCase() === r.symbol.toUpperCase())!;
      return {
        symbol: r.symbol,
        finalScore: r.finalScore,
        ruleScore: r.ruleScore,
        aiScore: r.aiScore,
        newsScore: null,
        riskPenalty: null,
        aiAction: ai.action,
        aiConfidence: ai.confidence,
      };
    });
    log('3. ランキング上位10（operational 10銘柄・ruleScoreはレポート final から逆算）', top10);

    log('4. なぜ1155が42点か（人間向け）', {
      scenarioBursa: b1155.humanJa,
      scenarioOperational: op1155.humanJa,
      summaryJa:
        'ハイブリッドは「AIの買い意見」だけでは上がらない。戦略ルールが reduce/低 ruleScore だと 70% の重みで足を引っ張る。1155 は RSI が高いと AI=reduce、低いと AI=buy でもルールが売り寄りなら 40 台に留まる。',
    });

    log('5. finalScore 寄与率（1155 / 0820EA）', {
      '1155.KL': b1155.contributionsPct,
      '0820EA': b0820.contributionsPct,
      note: 'ニュース・価格変動・ボラティリティは現行式では 0%。間接影響のみ（ルール推奨・AIプロンプト入力）',
    });

    const alt1155Buy = breakdownFromStrategyAndAi('1155.KL', 'buy', 65, 'buy', 75, { rsi14: 23 });
    log('参考: 1155 をルールも buy 65 に揃えた場合', {
      finalScore: alt1155Buy.finalScore,
      contributionsPct: alt1155Buy.contributionsPct,
      humanJa: alt1155Buy.humanJa,
    });
  });
});
