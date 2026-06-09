/**
 * buy — 暫定ルール通過案件の1〜20日目リターン曲線・最適利益確定日
 * npx vitest run tests/unit/openAiBuyProvisionalRuleDailyReturn.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { SAMPLE_STOCKS } from '../../src/data/sampleStocks';
import { toYahooSymbol, type DailyBar, type ProbeSymbol } from '../helpers/buyAction30dAudit';

const RULES = {
  volumeMax: 1.2,
  atrMinPct: 1.5,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
};

const HOLD_DAYS = Array.from({ length: 20 }, (_, i) => i + 1);

type OhlcBar = { date: string; high: number; low: number; close: number };

const MARKET_BY_SYMBOL = Object.fromEntries(
  SAMPLE_STOCKS.map((s) => [s.symbol, s.market as ProbeSymbol['market']]),
) as Record<string, ProbeSymbol['market']>;

function resolveMarket(symbol: string): ProbeSymbol['market'] {
  return MARKET_BY_SYMBOL[symbol] ?? (/^\d+$/.test(symbol) ? 'bursa' : 'us');
}

type FilteredCase = {
  date: string;
  symbol: string;
  volumeSurgeRatio: number;
  atrPct: number;
  consecutiveBuyNumber: number;
  dailyReturnsPct: Record<number, number | null>;
};

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

function sampleStd(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1));
}

function sharpeRatio(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = mean(vals)!;
  const sd = sampleStd(vals);
  if (sd == null || sd === 0) return null;
  return Math.round((m / sd) * 1000) / 1000;
}

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function forwardReturnPct(bars: DailyBar[], idx: number, day: number): number | null {
  if (idx < 0 || idx + day >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + day]!.close;
  if (entry <= 0) return null;
  return Math.round(((exit / entry - 1) * 100) * 10000) / 10000;
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=2y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    if (h == null || l == null || c == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
    });
  }
  return bars;
}

function computeAtrPctAt(bars: OhlcBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trs.reduce((a, b) => a + b, 0) / period;
  const close = bars[idx]!.close;
  if (close <= 0) return null;
  return Math.round((atr / close) * 10000) / 100;
}

function dayStats(cases: FilteredCase[], day: number) {
  const rets = cases.map((c) => c.dailyReturnsPct[day]).filter((v): v is number => v != null);
  return {
    day,
    countWithReturn: rets.length,
    avgPct: mean(rets),
    medianPct: median(rets),
    winRatePct: winRatePct(rets),
    sharpe: sharpeRatio(rets),
  };
}

function findPeakDayByAvg(curve: ReturnType<typeof dayStats>[]) {
  const eligible = curve.filter((d) => d.countWithReturn > 0 && d.avgPct != null);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, row) => ((row.avgPct ?? -999) > (best.avgPct ?? -999) ? row : best));
}

function findPeakDayBySharpe(curve: ReturnType<typeof dayStats>[]) {
  const eligible = curve.filter((d) => d.sharpe != null);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, row) => ((row.sharpe ?? -999) > (best.sharpe ?? -999) ? row : best));
}

function findFirstLocalPeak(curve: ReturnType<typeof dayStats>[]) {
  const eligible = curve.filter((d) => d.avgPct != null);
  for (let i = 1; i < eligible.length; i++) {
    const prev = eligible[i - 1]!;
    const cur = eligible[i]!;
    if ((cur.avgPct ?? 0) < (prev.avgPct ?? 0)) return prev;
  }
  return eligible[eligible.length - 1] ?? null;
}

describe('buy provisional rule daily return curve', () => {
  it(
    'writes day 1-20 stats and optimal exit day JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; openAiAction: string }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const buys = obs.filter((o) => o.openAiAction === 'buy').sort((a, b) => a.date.localeCompare(b.date));
      const consecMap = new Map<string, number>();
      const bySym = new Map<string, typeof buys>();
      for (const b of buys) {
        if (!bySym.has(b.symbol)) bySym.set(b.symbol, []);
        bySym.get(b.symbol)!.push(b);
      }
      for (const [sym, list] of bySym) {
        list.sort((a, b) => a.date.localeCompare(b.date));
        list.forEach((b, i) => consecMap.set(`${b.date}|${sym}`, i + 1));
      }

      const ohlcCache = new Map<string, OhlcBar[]>();
      const filtered: FilteredCase[] = [];

      for (const o of buys) {
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= RULES.volumeMax) continue;
        const consec = consecMap.get(`${o.date}|${o.symbol}`)!;
        if (consec > RULES.consecutiveBuyMax) continue;

        const yahoo = toYahooSymbol(o.symbol, resolveMarket(o.symbol));
        if (!ohlcCache.has(yahoo)) ohlcCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const ohlc = ohlcCache.get(yahoo)!;
        const daily: DailyBar[] = ohlc.map((b) => ({ date: b.date, close: b.close }));
        const idx = daily.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;

        const atrPct = computeAtrPctAt(ohlc, idx);
        if (atrPct == null) continue;
        if (atrPct < RULES.atrMinPct || atrPct >= RULES.atrMaxPct) continue;

        const dailyReturnsPct = {} as FilteredCase['dailyReturnsPct'];
        for (const day of HOLD_DAYS) {
          dailyReturnsPct[day] = forwardReturnPct(daily, idx, day);
        }

        filtered.push({
          date: o.date,
          symbol: o.symbol,
          volumeSurgeRatio: vol,
          atrPct,
          consecutiveBuyNumber: consec,
          dailyReturnsPct,
        });
      }

      const dailyCurve = HOLD_DAYS.map((day) => dayStats(filtered, day));
      const optimalByAvg = findPeakDayByAvg(dailyCurve);
      const optimalBySharpe = findPeakDayBySharpe(dailyCurve);
      const firstPeak = findFirstLocalPeak(dailyCurve);

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・暫定ルール通過案件のみ',
          provisionalRules: {
            volumeSurgeRatio: `< ${RULES.volumeMax}`,
            atrPct: `${RULES.atrMinPct}% <= ATR < ${RULES.atrMaxPct}%`,
            consecutiveBuy: `<= ${RULES.consecutiveBuyMax}回（銘柄内通算）`,
          },
          returnDefinition:
            'N日目 = シグナル翌営業日(idx+1)終値エントリー → シグナルからN営業日後(idx+N)終値決済（5/10/20d既存定義と同一）',
          noteDay1: '1日目はエントリー当日終値のためリターン0%',
          sharpe: 'mean/std（取引単位、n≥2）',
        },
        filteredCount: filtered.length,
        filteredCases: filtered,
        dailyCurve,
        optimalExitDay: {
          byAvgReturn: optimalByAvg,
          bySharpe: optimalBySharpe,
          firstLocalPeakAvg: firstPeak,
          recommendationJa:
            optimalByAvg && optimalBySharpe
              ? optimalByAvg.day === optimalBySharpe.day
                ? `${optimalByAvg.day}日目（平均${optimalByAvg.avgPct}%・Sharpe${optimalBySharpe.sharpe}で一致）`
                : `平均最大=${optimalByAvg.day}日目(${optimalByAvg.avgPct}%) / Sharpe最大=${optimalBySharpe.day}日目(Sharpe${optimalBySharpe.sharpe})`
              : null,
        },
        insightJa: [
          `暫定ルール通過: ${filtered.length}件`,
          optimalByAvg ? `平均リターン最大: ${optimalByAvg.day}日目 (${optimalByAvg.avgPct}%, 勝率${optimalByAvg.winRatePct}%)` : null,
          optimalBySharpe ? `Sharpe最大: ${optimalBySharpe.day}日目 (Sharpe ${optimalBySharpe.sharpe})` : null,
          firstPeak && firstPeak.day !== optimalByAvg?.day
            ? `平均の初回ピーク: ${firstPeak.day}日目 (${firstPeak.avgPct}%)`
            : null,
        ].filter(Boolean),
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-provisional-rule-daily-curve.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== PROVISIONAL RULE DAILY CURVE ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
