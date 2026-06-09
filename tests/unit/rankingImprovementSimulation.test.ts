/**
 * ランキング品質改善 — 調査レポート
 * npx vitest run tests/unit/rankingImprovementSimulation.test.ts
 */
import { describe, it } from 'vitest';
import {
  auditStrategyRuleScore,
  buildMaybank1155OperationalEvidence,
  explainAiRuleConflict,
} from '../../src/services/strategyRuleScoreAudit';
import {
  computeRsiDirectionScore,
  computePriceActionScore,
} from '../../src/services/strategyRuleScoreAudit';
import {
  computeEnhancedFinalScore,
  computeWeightedHybridScore,
  computeAlignedFinalScore,
  rankSymbols,
  buildEnhancedInputs,
} from '../../src/services/portfolioRankingSimulation';
import { actionConfidenceToDirectionScore } from '../../src/services/hybridStrategyScoreFusion';

const OP10 = [
  { symbol: 'VYM', ruleScore: 51, ai: 'hold' as const, conf: 70, rsi: 68 },
  { symbol: '0820EA', ruleScore: 50, ai: 'hold' as const, conf: 55, rsi: 32 },
  { symbol: '4707', ruleScore: 50, ai: 'hold' as const, conf: 55, rsi: 26 },
  { symbol: '7103', ruleScore: 51, ai: 'watch' as const, conf: 50, rsi: 39 },
  { symbol: 'SCHD', ruleScore: 46, ai: 'hold' as const, conf: 58, rsi: 45 },
  { symbol: '1023', ruleScore: 45, ai: 'hold' as const, conf: 55, rsi: 50 },
  { symbol: '1155', ruleScore: 28, ai: 'buy' as const, conf: 75, rsi: 23 },
  { symbol: '5225', ruleScore: 30, ai: 'hold' as const, conf: 50, rsi: 40 },
  { symbol: '5183', ruleScore: 28, ai: 'watch' as const, conf: 48, rsi: 35 },
  { symbol: '5347', ruleScore: 26, ai: 'reduce' as const, conf: 65, rsi: 31 },
];

function log(title: string, data: unknown) {
  // eslint-disable-next-line no-console
  console.log(`\n### ${title}\n`, JSON.stringify(data, null, 2));
}

describe('ranking improvement simulation', () => {
  it('prints rule audit, weight sims, enhanced formula, comparison table', () => {
    const sym = buildMaybank1155OperationalEvidence();
    const audit = auditStrategyRuleScore(sym, 'cautious', 25);

    log('1. ruleScore 28 の根拠（1155 operational 想定 evidence）', {
      ruleScore: audit.ruleScore,
      rawConfidencePct: audit.rawConfidencePct,
      directionScoreFormulaJa: audit.directionScoreFormulaJa,
      matchedDecision: audit.decisionChain.filter((s) => s.matched && s.wouldReturn === audit.resolvedAction),
      confidenceBreakdown: audit.confidenceLineItems,
      impactOnRuleScore: audit.ruleRows,
    });

    log('2. 1155 ruleScore 構成一覧 (rule name / score impact / reason)', audit.ruleRows);

    const conflict = explainAiRuleConflict(sym, 'cautious', 25, 'buy', 75, 23);
    log('3. AI BUY 75 vs rule REDUCE 矛盾', conflict);

    const rankAt = (ruleW: number, aiW: number) =>
      rankSymbols(
        OP10.map((r) => ({
          symbol: r.symbol,
          ruleScore: r.ruleScore,
          aiAction: r.ai,
          aiConfidence: r.conf,
          scoreFn: (rs, as) => computeWeightedHybridScore(rs, as, ruleW, aiW),
        })),
      ).map((x) => ({ rank: x.rank, symbol: x.symbol, finalScore: x.finalScore }));

    log('4. ウェイト別ランキング（上位10）', {
      '70% Rule / 30% AI (現行)': rankAt(0.7, 0.3),
      '50% Rule / 50% AI': rankAt(0.5, 0.5),
      '30% Rule / 70% AI': rankAt(0.3, 0.7),
    });

    const maybankEnhanced = buildEnhancedInputs(sym, 28, 'buy', 75, 23);
    const enhancedWeights = { rule: 0.35, ai: 0.35, news: 0.1, rsi: 0.1, price: 0.1, risk: 0.1 };

    const rankEnhanced = () =>
      rankSymbols(
        OP10.map((r) => {
          const inp = {
            ruleScore: r.ruleScore,
            aiScore: actionConfidenceToDirectionScore(r.ai, r.conf),
            newsScore: r.symbol === '1155' ? 30 : 18,
            rsiScore: computeRsiDirectionScore(r.rsi),
            priceActionScore: computePriceActionScore(r.symbol === '1155' ? -5.6 : r.symbol === '0820EA' ? 0.5 : -1),
            riskPenalty: 0,
          };
          return {
            symbol: r.symbol,
            ruleScore: r.ruleScore,
            aiAction: r.ai,
            aiConfidence: r.conf,
            scoreFn: () => computeEnhancedFinalScore(inp, enhancedWeights),
          };
        }),
      ).map((x) => ({ rank: x.rank, symbol: x.symbol, finalScore: x.finalScore }));

    log('5. news/RSI/price/risk 組み込みシミュレーション（重み 35/35/10/10/10/10）', {
      maybank1155Components: maybankEnhanced,
      top10: rankEnhanced(),
    });

    const current1155 = computeWeightedHybridScore(28, actionConfidenceToDirectionScore('buy', 75), 0.7, 0.3);
    const improved5050 = computeWeightedHybridScore(28, actionConfidenceToDirectionScore('buy', 75), 0.5, 0.5);
    const improved3070 = computeWeightedHybridScore(28, actionConfidenceToDirectionScore('buy', 75), 0.3, 0.7);
    const improvedAligned = computeAlignedFinalScore(
      28,
      actionConfidenceToDirectionScore('buy', 75),
      0.5,
      0.5,
      'buy',
      'reduce',
    );
    const improvedEnhanced = computeEnhancedFinalScore(maybankEnhanced, enhancedWeights);

    const currentRank = rankAt(0.7, 0.3).find((x) => x.symbol === '1155')!.rank;
    const w5050Rank = rankAt(0.5, 0.5).find((x) => x.symbol === '1155')!.rank;
    const w3070Rank = rankAt(0.3, 0.7).find((x) => x.symbol === '1155')!.rank;
    const enhancedRank = rankEnhanced().find((x) => x.symbol === '1155')!.rank;
    const alignedRank = rankSymbols(
      OP10.map((r) => ({
        symbol: r.symbol,
        ruleScore: r.ruleScore,
        aiAction: r.ai,
        aiConfidence: r.conf,
        scoreFn: (rs, as) =>
          computeAlignedFinalScore(rs, as, 0.5, 0.5, r.ai, r.symbol === '1155' ? 'reduce' : 'hold'),
      })),
    ).find((x) => x.symbol === '1155')!.rank;

    log('6. 1155 / 0820EA 比較 — 現行 vs 改善案', {
      comparisonTable: [
        {
          scenario: '現行 70/30',
          '1155_finalScore': current1155,
          '1155_rank /10': currentRank,
          '0820EA_rank /10': rankAt(0.7, 0.3).find((x) => x.symbol === '0820EA')!.rank,
        },
        {
          scenario: '50/50 ウェイト',
          '1155_finalScore': improved5050,
          '1155_rank /10': w5050Rank,
          '0820EA_rank /10': rankAt(0.5, 0.5).find((x) => x.symbol === '0820EA')!.rank,
        },
        {
          scenario: '30/70 ウェイト',
          '1155_finalScore': improved3070,
          '1155_rank /10': w3070Rank,
          '0820EA_rank /10': rankAt(0.3, 0.7).find((x) => x.symbol === '0820EA')!.rank,
        },
        {
          scenario: '50/50 + 矛盾補正（buy×reduce）',
          '1155_finalScore': improvedAligned,
          '1155_rank /10': alignedRank,
        },
        {
          scenario: '拡張式+矛盾材料',
          '1155_finalScore': improvedEnhanced,
          '1155_rank /10': enhancedRank,
        },
      ],
      fullOrder_current: rankAt(0.7, 0.3),
      fullOrder_50_50: rankAt(0.5, 0.5),
      fullOrder_30_70: rankAt(0.3, 0.7),
      fullOrder_aligned_50_50: rankSymbols(
        OP10.map((r) => ({
          symbol: r.symbol,
          ruleScore: r.ruleScore,
          aiAction: r.ai,
          aiConfidence: r.conf,
          scoreFn: (rs, as) =>
            computeAlignedFinalScore(
              rs,
              as,
              0.5,
              0.5,
              r.ai,
              r.symbol === '1155' ? 'reduce' : 'hold',
            ),
        })),
      ).map((x) => ({ rank: x.rank, symbol: x.symbol, finalScore: x.finalScore })),
    });
  });
});
