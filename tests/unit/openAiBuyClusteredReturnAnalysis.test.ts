/**
 * OpenAI buy — 連続シグナル集約後のフォワードリターン
 * npx vitest run tests/unit/openAiBuyClusteredReturnAnalysis.test.ts
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

type Signal = { date: string; symbol: string };
type Streak = {
  symbol: string;
  firstDate: string;
  lastDate: string;
  rawDayCount: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

function clusterConsecutiveSignals(
  raw: Signal[],
  barsBySymbol: Map<string, DailyBar[]>,
): Streak[] {
  const bySymbol = new Map<string, string[]>();
  for (const s of raw) {
    const list = bySymbol.get(s.symbol) ?? [];
    list.push(s.date);
    bySymbol.set(s.symbol, list);
  }

  const streaks: Streak[] = [];
  for (const [symbol, dates] of bySymbol) {
    const sorted = [...dates].sort();
    const bars = barsBySymbol.get(symbol);
    if (!bars) continue;

    let streakStart = sorted[0]!;
    let streakEnd = sorted[0]!;
    let streakDays = 1;
    let prevIdx = bars.findIndex((b) => b.date === sorted[0]);

    for (let i = 1; i < sorted.length; i++) {
      const d = sorted[i]!;
      const idx = bars.findIndex((b) => b.date === d);
      const adjacent = prevIdx >= 0 && idx === prevIdx + 1;
      if (adjacent) {
        streakEnd = d;
        streakDays += 1;
        prevIdx = idx;
      } else {
        streaks.push({ symbol, firstDate: streakStart, lastDate: streakEnd, rawDayCount: streakDays });
        streakStart = d;
        streakEnd = d;
        streakDays = 1;
        prevIdx = idx;
      }
    }
    streaks.push({ symbol, firstDate: streakStart, lastDate: streakEnd, rawDayCount: streakDays });
  }

  return streaks.sort((a, b) => a.firstDate.localeCompare(b.firstDate) || a.symbol.localeCompare(b.symbol));
}

function forwardReturn(
  sig: Signal,
  barsBySymbol: Map<string, DailyBar[]>,
  horizon: number,
): number | null {
  const bars = barsBySymbol.get(sig.symbol);
  if (!bars) return null;
  const idx = bars.findIndex((b) => b.date === sig.date);
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

describe('OpenAI buy clustered forward returns', () => {
  it('aggregates consecutive same-symbol buys and recomputes horizons', async () => {
    const openAiJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    );
    const raw: Signal[] = openAiJson.allRows.map((r: { date: string; symbol: string }) => ({
      date: r.date,
      symbol: r.symbol,
    }));

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

    const streaks = clusterConsecutiveSignals(raw, barsBySymbol);
    const uniqueSignals: Signal[] = streaks.map((s) => ({ symbol: s.symbol, date: s.firstDate }));
    const symbolSet = new Set(streaks.map((s) => s.symbol));

    const rawBySymbol: Record<string, number> = {};
    for (const s of raw) rawBySymbol[s.symbol] = (rawBySymbol[s.symbol] ?? 0) + 1;

    const streaksBySymbol: Record<string, number> = {};
    for (const s of streaks) streaksBySymbol[s.symbol] = (streaksBySymbol[s.symbol] ?? 0) + 1;

    const horizons = [5, 10, 20];
    const byHorizon: Record<string, unknown> = {};

    for (const h of horizons) {
      const returns: number[] = [];
      const detail: Array<Signal & { returnPct: number; streakRawDays: number }> = [];
      let skipped = 0;
      for (const st of streaks) {
        const sig = { symbol: st.symbol, date: st.firstDate };
        const ret = forwardReturn(sig, barsBySymbol, h);
        if (ret == null) {
          skipped += 1;
          continue;
        }
        returns.push(ret);
        detail.push({
          ...sig,
          returnPct: Math.round(ret * 100) / 100,
          streakRawDays: st.rawDayCount,
        });
      }
      const wins = returns.filter((x) => x > 0).length;
      byHorizon[`${h}d`] = {
        horizonBusinessDays: h,
        sampleCount: returns.length,
        skipped,
        winRatePct: returns.length ? Math.round((wins / returns.length) * 1000) / 10 : 0,
        avgReturnPct: returns.length
          ? Math.round((returns.reduce((a, b) => a + b, 0) / returns.length) * 100) / 100
          : 0,
        medianReturnPct: returns.length ? Math.round(median(returns) * 100) / 100 : 0,
        maxProfitPct: returns.length ? Math.round(Math.max(...returns) * 100) / 100 : 0,
        maxLossPct: returns.length ? Math.round(Math.min(...returns) * 100) / 100 : 0,
        detail,
      };
    }

    const dep = (sym: string) => {
      const rawN = rawBySymbol[sym] ?? 0;
      const streakN = streaksBySymbol[sym] ?? 0;
      return {
        rawBuyDayCount: rawN,
        rawBuyDaySharePct: Math.round((rawN / raw.length) * 1000) / 10,
        uniqueStreakCount: streakN,
        uniqueStreakSharePct: Math.round((streakN / streaks.length) * 1000) / 10,
        avgStreakLength: streakN > 0 ? Math.round((rawN / streakN) * 10) / 10 : 0,
      };
    };

    const report = {
      methodologyJa:
        '同一銘柄で取引日カレンダー上隣接するbuy日を1ストリークにまとめ、エントリーはストリーク初日。翌営業日終値→N営業日後終値。',
      rawOpenAiBuyCount: raw.length,
      symbolCount: symbolSet.size,
      uniqueSignalCount: streaks.length,
      streaks,
      symbolDependency: {
        '1023': dep('1023'),
        VYM: dep('VYM'),
        '7103': dep('7103'),
      },
      horizons: byHorizon,
      comparisonToUnclustered: {
        note: '集約前24件→集約後ユニーク数。リターンは初日基準で重複カウントを除去。',
      },
    };

    const outPath = path.join(process.cwd(), 'scripts', 'openai-buy-clustered-returns.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI BUY CLUSTERED ===\n', JSON.stringify(report, null, 2));
  });
});
