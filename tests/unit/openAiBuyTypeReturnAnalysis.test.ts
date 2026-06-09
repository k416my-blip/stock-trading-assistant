/**
 * OpenAI buy 4分類 × ホライズン別リターン + 期待値ランキング
 * npx vitest run tests/unit/openAiBuyTypeReturnAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = { date: string; symbol: string; openAiAction: AiSecondEvaluatorAction };
type BuySignal = { date: string; symbol: string; barIdx: number };

type HorizonDef = { id: string; labelJa: string; exitOffset: number; entryOffset: number };

const HORIZONS: HorizonDef[] = [
  { id: 'nextDay', labelJa: '翌営業日', exitOffset: 1, entryOffset: 0 },
  { id: 'd3', labelJa: '3営業日後', exitOffset: 3, entryOffset: 1 },
  { id: 'd5', labelJa: '5営業日後', exitOffset: 5, entryOffset: 1 },
  { id: 'd10', labelJa: '10営業日後', exitOffset: 10, entryOffset: 1 },
];

type BuyType = 'firstBuy' | 'consecutiveBuy' | 'buyCluster' | 'isolatedBuy';

const BUY_TYPES: { id: BuyType; labelJa: string }[] = [
  { id: 'firstBuy', labelJa: '初回buy（過去10営業日にbuyなし）' },
  { id: 'consecutiveBuy', labelJa: '連続buy（前営業日もbuy）' },
  { id: 'buyCluster', labelJa: 'buyクラスター（過去5営業日以内にbuy2回以上）' },
  { id: 'isolatedBuy', labelJa: '孤立buy（前後5営業日に他buyなし）' },
];

function forwardReturnPct(bars: DailyBar[], barIdx: number, h: HorizonDef): number | null {
  const entryIdx = barIdx + h.entryOffset;
  const exitIdx = barIdx + h.exitOffset;
  if (exitIdx >= bars.length || entryIdx >= bars.length || entryIdx < 0) return null;
  const entry = bars[entryIdx]!.close;
  const exit = bars[exitIdx]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round(((s[m - 1]! + s[m]!) / 2) * 100) / 100 : Math.round(s[m]! * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function classifyBuy(
  signal: BuySignal,
  buyDatesBySymbol: Map<string, Set<number>>,
  barsBySymbol: Map<string, DailyBar[]>,
): Record<BuyType, boolean> {
  const { symbol, barIdx } = signal;
  const buyIdxSet = buyDatesBySymbol.get(symbol)!;

  const hasBuyAt = (idx: number) => buyIdxSet.has(idx);

  let buysPast10 = 0;
  for (let i = Math.max(0, barIdx - 10); i < barIdx; i++) {
    if (hasBuyAt(i)) buysPast10 += 1;
  }
  const firstBuy = buysPast10 === 0;

  const consecutiveBuy = barIdx > 0 && hasBuyAt(barIdx - 1);

  let buysInPast5Inclusive = 0;
  for (let i = Math.max(0, barIdx - 4); i <= barIdx; i++) {
    if (hasBuyAt(i)) buysInPast5Inclusive += 1;
  }
  const buyCluster = buysInPast5Inclusive >= 2;

  let otherBuyInWindow = false;
  for (let i = barIdx - 5; i <= barIdx + 5; i++) {
    if (i === barIdx) continue;
    if (i < 0) continue;
    const bars = barsBySymbol.get(symbol)!;
    if (i >= bars.length) continue;
    if (hasBuyAt(i)) {
      otherBuyInWindow = true;
      break;
    }
  }
  const isolatedBuy = !otherBuyInWindow;

  return { firstBuy, consecutiveBuy, buyCluster, isolatedBuy };
}

describe('OpenAI buy type returns', () => {
  it('classifies buys and writes JSON report', async () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Obs[];

    const buys = raw.filter((r) => r.openAiAction === 'buy');

    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));
    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const buyDatesBySymbol = new Map<string, Set<number>>();
    const signals: BuySignal[] = [];

    for (const b of buys) {
      const bars = barsBySymbol.get(b.symbol);
      if (!bars) continue;
      const idx = bars.findIndex((bar) => bar.date === b.date);
      if (idx < 0) continue;
      signals.push({ date: b.date, symbol: b.symbol, barIdx: idx });
      const set = buyDatesBySymbol.get(b.symbol) ?? new Set<number>();
      set.add(idx);
      buyDatesBySymbol.set(b.symbol, set);
    }

    const classified = signals.map((sig) => {
      const flags = classifyBuy(sig, buyDatesBySymbol, barsBySymbol);
      const bars = barsBySymbol.get(sig.symbol)!;
      const returns = Object.fromEntries(
        HORIZONS.map((h) => [h.id, forwardReturnPct(bars, sig.barIdx, h)]),
      ) as Record<string, number | null>;
      return { ...sig, flags, returns };
    });

    const overlapMatrix: Record<string, number> = {};
    for (const a of BUY_TYPES) {
      for (const b of BUY_TYPES) {
        const key = `${a.id}_${b.id}`;
        overlapMatrix[key] = classified.filter((c) => c.flags[a.id] && c.flags[b.id]).length;
      }
    }

    const byType = BUY_TYPES.map((t) => {
      const rows = classified.filter((c) => c.flags[t.id]);
      const horizonStats = Object.fromEntries(
        HORIZONS.map((h) => {
          const rets = rows.map((r) => r.returns[h.id]).filter((v): v is number => v != null);
          return [
            h.id,
            {
              labelJa: h.labelJa,
              countWithReturn: rets.length,
              observationCount: rows.length,
              avgReturnPct: mean(rets),
              medianReturnPct: median(rets),
              winRatePct: winRatePct(rets),
            },
          ];
        }),
      );
      return {
        typeId: t.id,
        labelJa: t.labelJa,
        observationCount: rows.length,
        samples: rows.map((r) => ({ date: r.date, symbol: r.symbol, returns: r.returns })),
        byHorizon: horizonStats,
      };
    });

    const rankingByHorizon = HORIZONS.map((h) => {
      const scored = byType
        .map((t) => ({
          typeId: t.typeId,
          labelJa: t.labelJa,
          avg: t.byHorizon[h.id]?.avgReturnPct ?? null,
          median: t.byHorizon[h.id]?.medianReturnPct ?? null,
          winRate: t.byHorizon[h.id]?.winRatePct ?? null,
          n: t.byHorizon[h.id]?.countWithReturn ?? 0,
        }))
        .filter((x) => x.avg != null && x.n > 0)
        .sort((a, b) => (b.avg as number) - (a.avg as number));
      return {
        horizonId: h.id,
        horizonLabelJa: h.labelJa,
        rankingByAvgReturn: scored.map((x, i) => ({ rank: i + 1, ...x })),
      };
    });

    const compositeScore = byType.map((t) => {
      const avgs = HORIZONS.map((h) => t.byHorizon[h.id]?.avgReturnPct).filter((v): v is number => v != null);
      const composite = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100 : null;
      return { typeId: t.typeId, labelJa: t.labelJa, compositeAvgAcrossHorizons: composite, horizonsUsed: avgs.length };
    });
    compositeScore.sort((a, b) => (b.compositeAvgAcrossHorizons ?? -999) - (a.compositeAvgAcrossHorizons ?? -999));
    const expectationRanking = compositeScore.map((x, i) => ({ rank: i + 1, ...x }));

    const report = {
      methodologyJa: {
        source: '304観測のOpenAI buy24件',
        horizons: {
          nextDay: 'シグナル日終値→翌営業日終値',
          d3d5d10: 'シグナル翌日終値エントリー→3/5/10営業日後終値',
        },
        firstBuy: '同一銘柄・当日より前10営業日にbuyが0件',
        consecutiveBuy: '同一銘柄・前営業日（バーindex-1）もbuy',
        buyCluster: '同一銘柄・直近5営業日（当日含む）でbuyが2回以上',
        isolatedBuy: '同一銘柄・前後5営業日（当日除く）に他buyなし',
        overlapNote: '分類は重複可。件数は各カテゴリに属するbuyシグナル数。',
      },
      totalBuySignals: classified.length,
      overlapCounts: overlapMatrix,
      byBuyType: byType,
      expectationRanking,
      rankingByHorizon,
      profitSourceConclusionJa: (() => {
        const best = expectationRanking[0];
        const worst = expectationRanking[expectationRanking.length - 1];
        if (!best?.compositeAvgAcrossHorizons) {
          return 'リターン計算可能件数が少なく、明確な利益源は特定困難';
        }
        return `複合平均（計算可能ホライズンの単純平均）では「${best.labelJa}」が最も高く（${best.compositeAvgAcrossHorizons}%）、「${worst?.labelJa}」が最も低い（${worst?.compositeAvgAcrossHorizons}%）。buy全体ではなくタイプ別に期待値が異なる。`;
      })(),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-type-returns.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY TYPE RETURNS ===\n', JSON.stringify(report, null, 2));
  });
});
