/**
 * final buy が rule 緩和で増えない理由 — conflict / AI buy 分析
 * npx vitest run tests/unit/conflictDemotionAnalysis.test.ts
 */
import { describe, expect, it } from 'vitest';
import { AI_BUY_CONFLICT_MIN_CONFIDENCE } from '../../src/services/hybridRankingConflict';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  AUDIT_BUSINESS_DAYS,
  BACKTEST_HOLD_DAYS,
  RULE_PARAMS_BASELINE,
  RULE_PARAMS_RELAXED_BOTH,
  computeRsi14At,
  countFinalActions,
  countRuleActions,
  evaluateSymbolDayDetailed,
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type DetailedEvalRow,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';

function confidenceHistogram(rows: DetailedEvalRow[]): Record<string, number> {
  const h: Record<string, number> = {};
  for (const r of rows.filter((x) => x.aiAction === 'buy')) {
    const k = String(r.aiConfidence);
    h[k] = (h[k] ?? 0) + 1;
  }
  return h;
}

function forwardReturn5d(
  r: DetailedEvalRow,
  barsBySymbol: Map<string, DailyBar[]>,
): number | null {
  const bars = barsBySymbol.get(r.symbol);
  if (!bars) return null;
  const idx = bars.findIndex((b) => b.date === r.date);
  if (idx < 0 || idx + BACKTEST_HOLD_DAYS >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + BACKTEST_HOLD_DAYS]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function summarizeReturns(returns: number[]) {
  if (returns.length === 0) {
    return { n: 0, winRatePct: 0, avgReturnPct: 0, medianReturnPct: 0, maxLossPct: 0 };
  }
  const sorted = [...returns].sort((a, b) => a - b);
  const wins = returns.filter((x) => x > 0).length;
  return {
    n: returns.length,
    winRatePct: Math.round((wins / returns.length) * 1000) / 10,
    avgReturnPct: Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100,
    medianReturnPct: Math.round(sorted[Math.floor(sorted.length / 2)]! * 100) / 100,
    maxLossPct: Math.round(Math.min(...returns) * 100) / 100,
  };
}

function analyzeSet(label: string, rows: DetailedEvalRow[], barsBySymbol: Map<string, DailyBar[]>) {
  const aiBuyRows = rows.filter((r) => r.aiAction === 'buy');
  const conflictPairs = rows.filter((r) => r.conflictPair);
  const demoted = rows.filter((r) => r.demotedBuyToWatch);
  const finalBuy = rows.filter((r) => r.finalAction === 'buy');
  const aiBuyNotDemoted = aiBuyRows.filter((r) => r.finalAction === 'buy');

  const demotedReturns = demoted
    .map((r) => forwardReturn5d(r, barsBySymbol))
    .filter((x): x is number => x != null);
  const retainedBuyReturns = aiBuyNotDemoted
    .map((r) => forwardReturn5d(r, barsBySymbol))
    .filter((x): x is number => x != null);
  const allAiBuyReturns = aiBuyRows
    .map((r) => forwardReturn5d(r, barsBySymbol))
    .filter((x): x is number => x != null);

  return {
    label,
    rule: countRuleActions(rows),
    final: countFinalActions(rows),
    aiBuyCount: aiBuyRows.length,
    aiBuyConfidenceHist: confidenceHistogram(rows),
    aiBuyRsi: {
      min: aiBuyRows.length ? Math.min(...aiBuyRows.map((r) => r.rsi14 ?? 99)) : null,
      max: aiBuyRows.length ? Math.max(...aiBuyRows.map((r) => r.rsi14 ?? 0)) : null,
    },
    conflictPairCount: conflictPairs.length,
    conflictFlagCount: rows.filter((r) => r.conflict).length,
    demotedBuyToWatchCount: demoted.length,
    finalBuyCount: finalBuy.length,
    gapRuleBuyVsFinalBuy: countRuleActions(rows).buy - finalBuy.length,
    returns5d: {
      demotedConflict: summarizeReturns(demotedReturns),
      retainedFinalBuy: summarizeReturns(retainedBuyReturns),
      allAiBuyHypothetical: summarizeReturns(allAiBuyReturns),
    },
    demotedSamples: demoted.slice(0, 8).map((r) => ({
      date: r.date,
      symbol: r.symbol,
      rsi14: r.rsi14,
      dayChangePct: Math.round(r.dayChangePct * 100) / 100,
      ruleRaw: r.ruleRaw,
      aiConfidence: r.aiConfidence,
      ret5d: forwardReturn5d(r, barsBySymbol),
    })),
  };
}

describe('conflict demotion analysis', () => {
  it('reports AI buy, conflict, demotion, 5d returns', async () => {
    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const weightPct = 100 / symbols.length;
    const barsBySymbol = new Map<string, DailyBar[]>();
    const baseInputs: Parameters<typeof evaluateSymbolDayDetailed>[0][] = [];

    for (const s of symbols) {
      const bars = await fetchYahooDailyBars(s.yahooSymbol);
      barsBySymbol.set(s.symbol, bars);
      const closes = bars.map((b) => b.close);
      const window = bars.slice(-AUDIT_BUSINESS_DAYS - 1);
      for (let i = 1; i < window.length; i++) {
        const prev = window[i - 1]!;
        const cur = window[i]!;
        const globalIdx = bars.findIndex((b) => b.date === cur.date);
        baseInputs.push({
          date: cur.date,
          symbol: s.symbol,
          market: s.market,
          dayChangePct: ((cur.close - prev.close) / prev.close) * 100,
          rsi14: computeRsi14At(closes, globalIdx),
          close: cur.close,
          weightPct,
          ruleParams: RULE_PARAMS_BASELINE,
        });
      }
    }

    const proxyBaseline = baseInputs.map((b) =>
      evaluateSymbolDayDetailed({ ...b, ruleParams: RULE_PARAMS_BASELINE, productionLikeAiConflict: false }),
    );
    const proxyRelaxed = baseInputs.map((b) =>
      evaluateSymbolDayDetailed({ ...b, ruleParams: RULE_PARAMS_RELAXED_BOTH, productionLikeAiConflict: false }),
    );
    const liveLikeBaseline = baseInputs.map((b) =>
      evaluateSymbolDayDetailed({ ...b, ruleParams: RULE_PARAMS_BASELINE, productionLikeAiConflict: true }),
    );
    const liveLikeRelaxed = baseInputs.map((b) =>
      evaluateSymbolDayDetailed({ ...b, ruleParams: RULE_PARAMS_RELAXED_BOTH, productionLikeAiConflict: true }),
    );

    const newRuleBuyDays = proxyRelaxed.filter((r, i) => {
      const was = proxyBaseline[i]!;
      return r.ruleEffective === 'buy' && was.ruleEffective !== 'buy';
    });

    const crossTabNewRuleBuy = {
      count: newRuleBuyDays.length,
      aiBuy: newRuleBuyDays.filter((r) => r.aiAction === 'buy').length,
      aiHold: newRuleBuyDays.filter((r) => r.aiAction === 'hold').length,
      finalBuy: newRuleBuyDays.filter((r) => r.finalAction === 'buy').length,
      finalHold: newRuleBuyDays.filter((r) => r.finalAction === 'hold').length,
      finalWatch: newRuleBuyDays.filter((r) => r.finalAction === 'watch').length,
    };

    const latentReduceAiBuy = (rows: DetailedEvalRow[]) => {
      const subset = rows.filter((r) => r.ruleRaw === 'reduce' && r.aiAction === 'buy');
      return {
        count: subset.length,
        finalBuy: subset.filter((r) => r.finalAction === 'buy').length,
        finalWatch: subset.filter((r) => r.finalAction === 'watch').length,
        finalHold: subset.filter((r) => r.finalAction === 'hold').length,
        finalReduce: subset.filter((r) => r.finalAction === 'reduce').length,
        demoted: subset.filter((r) => r.demotedBuyToWatch).length,
        rsiGuardWatch: subset.filter(
          (r) => r.ruleEffective === 'watch' && r.ruleRaw === 'reduce' && !r.conflictPair,
        ).length,
        returns5d: summarizeReturns(
          subset.map((r) => forwardReturn5d(r, barsBySymbol)).filter((x): x is number => x != null),
        ),
        hypotheticalBuyIfNoBlock: summarizeReturns(
          subset.map((r) => forwardReturn5d(r, barsBySymbol)).filter((x): x is number => x != null),
        ),
      };
    };

    const aiBuyNotFinalBuy = (rows: DetailedEvalRow[]) => {
      const subset = rows.filter((r) => r.aiAction === 'buy' && r.finalAction !== 'buy');
      return {
        count: subset.length,
        byFinal: {
          watch: subset.filter((r) => r.finalAction === 'watch').length,
          hold: subset.filter((r) => r.finalAction === 'hold').length,
          reduce: subset.filter((r) => r.finalAction === 'reduce').length,
        },
        returns5d: summarizeReturns(
          subset.map((r) => forwardReturn5d(r, barsBySymbol)).filter((x): x is number => x != null),
        ),
      };
    };

    const report = {
      observationCount: baseInputs.length,
      conflictThreshold: AI_BUY_CONFLICT_MIN_CONFIDENCE,
      noteJa:
        'AI buy は RSI≤30 プロキシ（conf 56）。productionLike は buy 時 conf=75 で live の OpenAI 高信頼に近似。finalAction は AI 主導（conflict 時 watch）。',
      proxyAi: {
        baseline: analyzeSet('proxy·現行', proxyBaseline, barsBySymbol),
        relaxed: analyzeSet('proxy·緩和', proxyRelaxed, barsBySymbol),
      },
      productionLikeAi: {
        baseline: analyzeSet('live近似·現行', liveLikeBaseline, barsBySymbol),
        relaxed: analyzeSet('live近似·緩和', liveLikeRelaxed, barsBySymbol),
      },
      whyFinalBuyFlatWhenRuleBuyUp: {
        explanationJa:
          '増えた rule buy はほぼ momentum_buy（日中+2%以上）で RSI>30 → AI=hold。final は conflict 無しでも AI=hold のまま。final buy は RSI≤30 の AI buy のみ（最大16件）で、ルール緩和では AI 層が変わらないため件数不変。',
        newRuleBuyDaysCrossTab: crossTabNewRuleBuy,
      },
      latentConflictCohort: {
        proxyBaseline: latentReduceAiBuy(proxyBaseline),
        proxyRelaxed: latentReduceAiBuy(proxyRelaxed),
        liveLikeBaseline: latentReduceAiBuy(liveLikeBaseline),
        liveLikeRelaxed: latentReduceAiBuy(liveLikeRelaxed),
      },
      aiBuyBlockedFromFinalBuy: {
        proxyBaseline: aiBuyNotFinalBuy(proxyBaseline),
        liveLikeBaseline: aiBuyNotFinalBuy(liveLikeBaseline),
      },
      live1155StyleNote:
        '実機1155は日中-5.6%で ruleRaw=reduce・OpenAI buy≥65 → conflict→watch。30日×10では日中≤-5%かつRSI≤30が3件のみで、プロキシAI buyと重なっても ruleRaw reduce×conf≥65 は0件（多くはRSIガードで ruleEffective=watch）。',
    };

    // eslint-disable-next-line no-console
    console.log('\n=== CONFLICT DEMOTION ANALYSIS ===\n', JSON.stringify(report, null, 2));

    expect(proxyBaseline.length).toBe(300);
    expect(countFinalActions(proxyRelaxed).buy).toBe(countFinalActions(proxyBaseline).buy);
  }, 120_000);
});
