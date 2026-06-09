/**
 * 304観測 × 銘柄別・action別リターン + 銘柄内 buy 優位性
 * npx vitest run tests/unit/openAiSymbolActionReturnAnalysis.test.ts
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

const ACTIONS: AiSecondEvaluatorAction[] = ['buy', 'hold', 'watch', 'reduce'];

type Row = {
  symbol: string;
  date: string;
  action: AiSecondEvaluatorAction;
  ret5d: number | null;
  ret10d: number | null;
};

function forwardReturn(bars: DailyBar[], date: string, horizon: number): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function actionStats(rows: Row[], action: AiSecondEvaluatorAction) {
  const sub = rows.filter((r) => r.action === action);
  const r5 = sub.map((r) => r.ret5d).filter((v): v is number => v != null);
  const r10 = sub.map((r) => r.ret10d).filter((v): v is number => v != null);
  return {
    count: sub.length,
    avg5d: avg(r5),
    avg10d: avg(r10),
  };
}

type CompareResult = 'buy' | 'opponent' | 'tie' | 'n/a';

function compareMeans(buyAvg: number | null, otherAvg: number | null): CompareResult {
  if (buyAvg == null || otherAvg == null) return 'n/a';
  if (Math.abs(buyAvg - otherAvg) < 0.001) return 'tie';
  return buyAvg > otherAvg ? 'buy' : 'opponent';
}

describe('symbol x action returns and within-symbol buy dominance', () => {
  it('aggregates per symbol and builds win-loss table', async () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: AiSecondEvaluatorAction }>;

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

    const rows: Row[] = raw.map((r) => {
      const bars = barsBySymbol.get(r.symbol)!;
      return {
        symbol: r.symbol,
        date: r.date,
        action: r.openAiAction,
        ret5d: forwardReturn(bars, r.date, 5),
        ret10d: forwardReturn(bars, r.date, 10),
      };
    });

    const symbolSet = [...new Set(rows.map((r) => r.symbol))].sort();

    const symbolTable = symbolSet.map((sym) => {
      const symRows = rows.filter((r) => r.symbol === sym);
      const buy = actionStats(symRows, 'buy');
      const hold = actionStats(symRows, 'hold');
      const watch = actionStats(symRows, 'watch');
      const reduce = actionStats(symRows, 'reduce');

      const vsHold5 = compareMeans(buy.avg5d, hold.avg5d);
      const vsHold10 = compareMeans(buy.avg10d, hold.avg10d);
      const vsWatch5 = compareMeans(buy.avg5d, watch.avg5d);
      const vsWatch10 = compareMeans(buy.avg10d, watch.avg10d);
      const vsReduce5 = compareMeans(buy.avg5d, reduce.avg5d);
      const vsReduce10 = compareMeans(buy.avg10d, reduce.avg10d);

      const buyWins5d = [vsHold5, vsWatch5, vsReduce5].filter((v) => v === 'buy').length;
      const buyWins10d = [vsHold10, vsWatch10, vsReduce10].filter((v) => v === 'buy').length;
      const comparable5 = [vsHold5, vsWatch5, vsReduce5].filter((v) => v !== 'n/a').length;
      const comparable10 = [vsHold10, vsWatch10, vsReduce10].filter((v) => v !== 'n/a').length;

      return {
        symbol: sym,
        buyCount: buy.count,
        buyAvg5d: buy.avg5d,
        buyAvg10d: buy.avg10d,
        holdCount: hold.count,
        holdAvg5d: hold.avg5d,
        holdAvg10d: hold.avg10d,
        watchCount: watch.count,
        watchAvg5d: watch.avg5d,
        watchAvg10d: watch.avg10d,
        reduceCount: reduce.count,
        reduceAvg5d: reduce.avg5d,
        reduceAvg10d: reduce.avg10d,
        withinSymbolCompare: {
          buyVsHold: { d5: vsHold5, d10: vsHold10 },
          buyVsWatch: { d5: vsWatch5, d10: vsWatch10 },
          buyVsReduce: { d5: vsReduce5, d10: vsReduce10 },
        },
        buyDominant5d: comparable5 > 0 && buyWins5d === comparable5,
        buyDominant10d: comparable10 > 0 && buyWins10d === comparable10,
        buyWinScore5d: `${buyWins5d}/${comparable5}`,
        buyWinScore10d: `${buyWins10d}/${comparable10}`,
      };
    });

    const tally = (pair: 'hold' | 'watch' | 'reduce', horizon: 'd5' | 'd10') => {
      let buyWin = 0;
      let oppWin = 0;
      let tie = 0;
      let na = 0;
      for (const s of symbolTable) {
        const key =
          pair === 'hold'
            ? s.withinSymbolCompare.buyVsHold[horizon]
            : pair === 'watch'
              ? s.withinSymbolCompare.buyVsWatch[horizon]
              : s.withinSymbolCompare.buyVsReduce[horizon];
        if (key === 'buy') buyWin += 1;
        else if (key === 'opponent') oppWin += 1;
        else if (key === 'tie') tie += 1;
        else na += 1;
      }
      return { buyWin, opponentWin: oppWin, tie, na, symbols: symbolSet.length };
    };

    const winLossSummary = {
      buyVsHold5d: tally('hold', 'd5'),
      buyVsHold10d: tally('hold', 'd10'),
      buyVsWatch5d: tally('watch', 'd5'),
      buyVsWatch10d: tally('watch', 'd10'),
      buyVsReduce5d: tally('reduce', 'd5'),
      buyVsReduce10d: tally('reduce', 'd10'),
    };

    const symbolsWithBuy = symbolTable.filter((s) => s.buyCount > 0);
    const buyDominantSymbols5d = symbolsWithBuy.filter((s) => s.buyDominant5d).map((s) => s.symbol);
    const buyDominantSymbols10d = symbolsWithBuy.filter((s) => s.buyDominant10d).map((s) => s.symbol);

    const report = {
      methodologyJa:
        '銘柄固定比較。各銘柄でaction別の5d/10d平均（翌日エントリー→5/10営業日後）。buy優位=同一銘柄内でbuy平均が相手action平均を上回る。',
      observationCount: rows.length,
      symbolTable,
      winLossSummary,
      verdictJa: {
        buyDominantAllOpponents5d: `${buyDominantSymbols5d.length}/${symbolsWithBuy.length}銘柄`,
        buyDominantAllOpponents10d: `${buyDominantSymbols10d.length}/${symbolsWithBuy.length}銘柄`,
        buyDominantSymbolList5d: buyDominantSymbols5d,
        buyDominantSymbolList10d: buyDominantSymbols10d,
        overall:
          buyDominantSymbols5d.length === 0 && buyDominantSymbols10d.length === 0
            ? '銘柄内比較でも buy が hold/watch/reduce すべてに優位な銘柄はほぼない'
            : '一部銘柄のみ buy 優位（詳細は symbolTable）',
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-symbol-action-returns.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== SYMBOL ACTION RETURNS ===\n', JSON.stringify(report, null, 2));
  });
});
