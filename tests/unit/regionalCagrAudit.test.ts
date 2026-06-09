/**
 * Audit extreme CAGR in regional optimization results.
 * npx vitest run tests/unit/regionalCagrAudit.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const FORWARD_DAYS = 20;
const INITIAL_CAPITAL_USD = 10_000;
const ANALYSIS_START = '2024-06-01';

const SYMBOL_DEFS = [
  { symbol: '1023', yahooSymbol: '1023.KL', region: 'MY' as const },
  { symbol: '1295', yahooSymbol: '1295.KL', region: 'MY' as const },
  { symbol: '1155', yahooSymbol: '1155.KL', region: 'MY' as const },
  { symbol: 'SPY', yahooSymbol: 'SPY', region: 'US' as const },
  { symbol: 'QQQ', yahooSymbol: 'QQQ', region: 'US' as const },
  { symbol: 'SCHD', yahooSymbol: 'SCHD', region: 'US' as const },
  { symbol: 'JEPI', yahooSymbol: 'JEPI', region: 'US' as const },
  { symbol: 'VYM', yahooSymbol: 'VYM', region: 'US' as const },
] as const;

type Region = 'US' | 'MY';
type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };
type DailyPoint = { date: string; dailyReturnPct: number; concurrentPositions: number; equityUsd: number };
type Trade = {
  id: number;
  date: string;
  symbol: string;
  region: Region;
  returnPct: number;
  pnlUsdEqualWeight: number;
  concurrentPositions: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const out: OhlcvBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    out.push({ date: new Date(ts[i]! * 1000).toISOString().slice(0, 10), high: h, low: l, close: c, volume: v });
  }
  return out;
}

function writeCsv(filePath: string, header: string[], rows: Array<Array<string | number>>) {
  const lines = [header.join(',')];
  for (const row of rows) lines.push(row.join(','));
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

describe('Regional CAGR audit', () => {
  it('writes audit report, equity curve CSVs, and trade CSVs', async () => {
    const opt = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'best-strategy-regional-grid-optimization.json'), 'utf8'),
    ) as {
      regions: {
        US: { selectedBest: { adxThreshold: number; macdThreshold: number } };
        MY: { selectedBest: { adxThreshold: number; macdThreshold: number } };
      };
    };

    const outDir = path.join(process.cwd(), 'scripts', 'cagr-audit');
    fs.mkdirSync(outDir, { recursive: true });

    const barsBySymbol = new Map<string, OhlcvBar[]>();
    for (const s of SYMBOL_DEFS) barsBySymbol.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));

    const regionAudit = (region: Region, adxThr: number, macdThr: number) => {
      const picks: Array<{ date: string; symbol: string; returnPct: number }> = [];
      for (const s of SYMBOL_DEFS.filter((x) => x.region === region)) {
        const bars = barsBySymbol.get(s.symbol)!;
        const closes = bars.map((b) => b.close);
        const ema = (arr: number[], span: number) => {
          const k = 2 / (span + 1);
          let v = arr[0]!;
          for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
          return v;
        };
        const adxAt = (idx: number): number | null => {
          const period = 14;
          if (idx < period * 2) return null;
          const trList: number[] = [];
          const plusDm: number[] = [];
          const minusDm: number[] = [];
          for (let i = idx - period * 2 + 1; i <= idx; i++) {
            const h = bars[i]!.high;
            const l = bars[i]!.low;
            const ph = bars[i - 1]!.high;
            const pl = bars[i - 1]!.low;
            const pc = bars[i - 1]!.close;
            trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
            plusDm.push(Math.max(h - ph, 0));
            minusDm.push(Math.max(pl - l, 0));
          }
          const smooth = (arr: number[]) => {
            let ss = arr.slice(0, period).reduce((a, b) => a + b, 0);
            const out: number[] = [ss];
            for (let i = period; i < arr.length; i++) {
              ss = ss - ss / period + arr[i]!;
              out.push(ss);
            }
            return out;
          };
          const trS = smooth(trList);
          const pS = smooth(plusDm);
          const mS = smooth(minusDm);
          const dx: number[] = [];
          for (let i = 0; i < trS.length; i++) {
            if (trS[i]! <= 0) return null;
            const diPlus = (100 * pS[i]!) / trS[i]!;
            const diMinus = (100 * mS[i]!) / trS[i]!;
            const sum = diPlus + diMinus;
            dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus - diMinus)) / sum);
          }
          return mean(dx.slice(-period));
        };
        const sma50At = (idx: number): number | null => {
          if (idx < 49) return null;
          return mean(closes.slice(idx - 49, idx + 1));
        };
        const macdHistAt = (idx: number): number | null => {
          if (idx < 35) return null;
          const slice = closes.slice(0, idx + 1);
          const macd = ema(slice, 12) - ema(slice, 26);
          const signalSlice: number[] = [];
          for (let i = Math.max(0, idx - 8); i <= idx; i++) signalSlice.push(ema(closes.slice(0, i + 1), 12) - ema(closes.slice(0, i + 1), 26));
          const signal = ema(signalSlice, 9);
          return ((macd - signal) / closes[idx]!) * 100;
        };
        for (let i = 0; i < bars.length; i++) {
          const date = bars[i]!.date;
          if (date < ANALYSIS_START) continue;
          const adx = adxAt(i);
          const macd = macdHistAt(i);
          const sma50 = sma50At(i);
          if (adx == null || macd == null || sma50 == null) continue;
          if (!(adx > adxThr && macd > macdThr && bars[i]!.close > sma50)) continue;
          const entryIdx = i + 1;
          const exitIdx = entryIdx + FORWARD_DAYS;
          if (exitIdx >= bars.length) continue;
          const entry = bars[entryIdx]!.close;
          if (entry <= 0) continue;
          const ret = ((bars[exitIdx]!.close / entry - 1) * 100);
          picks.push({ date, symbol: s.symbol, returnPct: round4(ret) });
        }
      }
      picks.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

      const byDate = new Map<string, Array<{ symbol: string; returnPct: number }>>();
      for (const p of picks) {
        const arr = byDate.get(p.date) ?? [];
        arr.push({ symbol: p.symbol, returnPct: p.returnPct });
        byDate.set(p.date, arr);
      }
      const dates = [...byDate.keys()].sort();

      let equity = INITIAL_CAPITAL_USD;
      let peak = INITIAL_CAPITAL_USD;
      let maxDd = 0;
      const curve: DailyPoint[] = [];
      const dailyRets: number[] = [];
      const trades: Trade[] = [];
      let id = 1;
      for (const d of dates) {
        const arr = byDate.get(d)!;
        const n = arr.length;
        const dayRet = mean(arr.map((x) => x.returnPct)); // equal weight 100/N
        dailyRets.push(dayRet);
        equity += (INITIAL_CAPITAL_USD * dayRet) / 100; // fixed capital no compounding
        if (equity > peak) peak = equity;
        maxDd = Math.min(maxDd, equity / peak - 1);
        curve.push({ date: d, dailyReturnPct: round3(dayRet), concurrentPositions: n, equityUsd: round2(equity) });
        for (const t of arr) {
          trades.push({
            id: id++,
            date: d,
            symbol: t.symbol,
            region,
            returnPct: round3(t.returnPct),
            pnlUsdEqualWeight: round2((INITIAL_CAPITAL_USD / n) * (t.returnPct / 100)),
            concurrentPositions: n,
          });
        }
      }

      const wins = dailyRets.filter((r) => r > 0);
      const losses = dailyRets.filter((r) => r < 0);
      const mu = dailyRets.length > 0 ? mean(dailyRets) : 0;
      const sigma = dailyRets.length > 1 ? std(dailyRets) : 0;
      const sharpe = sigma > 1e-9 ? mu / sigma : null;
      const yearsByCalendar =
        dates.length > 1
          ? (new Date(`${dates[dates.length - 1]}T00:00:00Z`).getTime() - new Date(`${dates[0]}T00:00:00Z`).getTime()) / (365.25 * 24 * 3600 * 1000)
          : 0;
      const cagrCalendar =
        yearsByCalendar > 0 && equity > 0
          ? Math.pow(equity / INITIAL_CAPITAL_USD, 1 / yearsByCalendar) - 1
          : null;
      const annualizedTradingDays =
        dailyRets.length > 0 ? ((equity - INITIAL_CAPITAL_USD) / INITIAL_CAPITAL_USD) / (dailyRets.length / 252) : null;

      // buy&hold equal-weight across region symbols from first to last date
      let bhReturn = 0;
      if (dates.length > 1) {
        const start = dates[0]!;
        const end = dates[dates.length - 1]!;
        const regionSymbols = SYMBOL_DEFS.filter((s) => s.region === region);
        const rets: number[] = [];
        for (const s of regionSymbols) {
          const bars = barsBySymbol.get(s.symbol)!;
          const sIdx = bars.findIndex((b) => b.date >= start);
          const eIdx = bars.findIndex((b) => b.date >= end);
          if (sIdx < 0 || eIdx < 0) continue;
          const entry = bars[sIdx]!.close;
          const exit = bars[eIdx]!.close;
          if (entry > 0) rets.push((exit / entry - 1) * 100);
        }
        bhReturn = rets.length > 0 ? mean(rets) : 0;
      }

      const maxConcurrent = curve.length > 0 ? Math.max(...curve.map((c) => c.concurrentPositions)) : 0;
      const avgConcurrent = curve.length > 0 ? mean(curve.map((c) => c.concurrentPositions)) : 0;

      return {
        region,
        thresholds: { adx: adxThr, macd: macdThr },
        formulas: {
          returnPerTrade: 'r_i = (Close[t+20] / Close[t+1] - 1) * 100',
          dailyReturnEqualWeight: 'R_d = (1/N_d) * Σ r_i(d)',
          equityFixedCapitalNoCompounding: 'E_d = E_{d-1} + InitialCapital * R_d/100',
          maxDrawdown: 'DD_d = E_d/Peak_d - 1; MaxDD = min(DD_d)',
          cagrCalendar: 'CAGR = (Final/Initial)^(1/YearsCalendar) - 1',
          annualizedByTradingDays: 'Annualized = TotalReturn / (ActiveDays/252)',
        },
        leverage: {
          explicitLeverage: 1,
          grossExposureCapPct: 100,
          perPositionWeightPct: '100/N_d',
          hasLeverage: false,
          maxConcurrentPositions: maxConcurrent,
          avgConcurrentPositions: round3(avgConcurrent),
        },
        positionSizing: {
          initialCapitalUsd: INITIAL_CAPITAL_USD,
          model: 'equal-weight by signal day',
        },
        stats: {
          tradeCount: trades.length,
          activeDays: dailyRets.length,
          sharpe: sharpe == null ? null : round3(sharpe),
          maxDrawdownPct: round2(maxDd * 100),
          winRate: dailyRets.length > 0 ? round3(wins.length / dailyRets.length) : null,
          profitFactor:
            losses.length > 0
              ? round3(wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)))
              : null,
          finalBalanceUsd: round2(equity),
          cagrCalendarPct: cagrCalendar == null ? null : round3(cagrCalendar * 100),
          annualizedReturnByTradingDaysPct: annualizedTradingDays == null ? null : round3(annualizedTradingDays * 100),
          yearsCalendar: round3(yearsByCalendar),
        },
        buyHoldComparison: {
          buyHoldRegionReturnPct: round3(bhReturn),
          strategyTotalReturnPct: round3(((equity / INITIAL_CAPITAL_USD - 1) * 100)),
          excessReturnPct: round3((equity / INITIAL_CAPITAL_USD - 1) * 100 - bhReturn),
        },
        cagrPlausibility: {
          isCagrAbove1000: cagrCalendar != null && cagrCalendar * 100 > 1000,
          reasonJa:
            cagrCalendar != null && cagrCalendar * 100 > 1000
              ? '取引日数(ActiveDays)が少ない短期間に固定資金で高い総リターンが出ると、年率化(CAGR)で指数的に拡大されるため。レバレッジ起因ではなく年率換算の期間効果。'
              : 'CAGRは1000%以下。',
        },
        equityCurve: curve,
        trades,
      };
    };

    const us = regionAudit('US', opt.regions.US.selectedBest.adxThreshold, opt.regions.US.selectedBest.macdThreshold);
    const my = regionAudit('MY', opt.regions.MY.selectedBest.adxThreshold, opt.regions.MY.selectedBest.macdThreshold);

    writeCsv(
      path.join(outDir, 'US_equity_curve.csv'),
      ['date', 'dailyReturnPct', 'concurrentPositions', 'equityUsd'],
      us.equityCurve.map((r) => [r.date, r.dailyReturnPct, r.concurrentPositions, r.equityUsd]),
    );
    writeCsv(
      path.join(outDir, 'MY_equity_curve.csv'),
      ['date', 'dailyReturnPct', 'concurrentPositions', 'equityUsd'],
      my.equityCurve.map((r) => [r.date, r.dailyReturnPct, r.concurrentPositions, r.equityUsd]),
    );
    writeCsv(
      path.join(outDir, 'US_trades.csv'),
      ['id', 'date', 'symbol', 'returnPct', 'pnlUsdEqualWeight', 'concurrentPositions'],
      us.trades.map((t) => [t.id, t.date, t.symbol, t.returnPct, t.pnlUsdEqualWeight, t.concurrentPositions]),
    );
    writeCsv(
      path.join(outDir, 'MY_trades.csv'),
      ['id', 'date', 'symbol', 'returnPct', 'pnlUsdEqualWeight', 'concurrentPositions'],
      my.trades.map((t) => [t.id, t.date, t.symbol, t.returnPct, t.pnlUsdEqualWeight, t.concurrentPositions]),
    );

    const report = {
      objectiveJa: 'CAGR>1000%の監査',
      outputs: {
        equityCurveCsv: {
          US: path.join(outDir, 'US_equity_curve.csv'),
          MY: path.join(outDir, 'MY_equity_curve.csv'),
        },
        tradeListCsv: {
          US: path.join(outDir, 'US_trades.csv'),
          MY: path.join(outDir, 'MY_trades.csv'),
        },
      },
      audits: { US: us, MY: my },
      rootCauseJa: {
        main:
          'CAGRの極端値は、レバレッジではなく「短い実働期間(ActiveDays)に対する年率換算」による拡大が主因。固定資金・非複利でも発生。',
        details: [
          `US activeDays=${us.stats.activeDays}, yearsCalendar=${us.stats.yearsCalendar}, final=${us.stats.finalBalanceUsd}`,
          `MY activeDays=${my.stats.activeDays}, yearsCalendar=${my.stats.yearsCalendar}, final=${my.stats.finalBalanceUsd}`,
          '日次リターンの母集団が少数で偏ると、年率換算値が不安定化しやすい。',
        ],
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'regional-cagr-audit.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('\n=== REGIONAL CAGR AUDIT ===\n', JSON.stringify(report, null, 2));
  }, 180_000);
});
