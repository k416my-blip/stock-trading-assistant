/**
 * buy + 出来高<1.2 — 52週安値距離 × ATR 2Dグリッド（n>=2表示・TOP/WORST20）
 * npx vitest run tests/unit/openAiBuyVol12Low52AtrGrid.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const VOL_MAX = 1.2;
const MIN_N = 2;

type OhlcBar = { date: string; high: number; low: number; close: number };

type GridRow = {
  date: string;
  symbol: string;
  pctFrom52wLow: number;
  atrPct: number;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

const LOW52_BANDS = [
  { id: '0_3', label: '安値距離0-3%', match: (p: number) => p >= 0 && p < 3 },
  { id: '3_5', label: '安値距離3-5%', match: (p: number) => p >= 3 && p < 5 },
  { id: '5_8', label: '安値距離5-8%', match: (p: number) => p >= 5 && p < 8 },
  { id: 'gte8', label: '安値距離8%以上', match: (p: number) => p >= 8 },
] as const;

const ATR_BANDS = [
  { id: 'lt15', label: 'ATR<1.5%', match: (a: number) => a < 1.5 },
  { id: '15_20', label: 'ATR1.5-2.0%', match: (a: number) => a >= 1.5 && a < 2.0 },
  { id: '20_25', label: 'ATR2.0-2.5%', match: (a: number) => a >= 2.0 && a < 2.5 },
  { id: 'gt25', label: 'ATR>2.5%', match: (a: number) => a >= 2.5 },
] as const;

type HorizonKey = 'return5d' | 'return10d' | 'return20d';

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

function horizonBlock(rows: GridRow[], key: HorizonKey) {
  const vals = rows.map((r) => r[key]).filter((v): v is number => v != null);
  return {
    count: vals.length,
    avgPct: mean(vals),
    medianPct: median(vals),
    winRatePct: winRatePct(vals),
    sharpe: sharpeRatio(vals),
  };
}

function cellMetrics(rows: GridRow[]) {
  return {
    count: rows.length,
    return5d: horizonBlock(rows, 'return5d'),
    return10d: horizonBlock(rows, 'return10d'),
    return20d: horizonBlock(rows, 'return20d'),
    samples: rows.map((r) => ({
      date: r.date,
      symbol: r.symbol,
      pctFrom52wLow: r.pctFrom52wLow,
      atrPct: r.atrPct,
      return5d: r.return5d,
      return10d: r.return10d,
      return20d: r.return20d,
    })),
  };
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

function pctFrom52wLowAt(bars: OhlcBar[], idx: number, lookback = 252): number | null {
  const start = Math.max(0, idx - lookback + 1);
  const window = bars.slice(start, idx + 1);
  if (window.length < 20) return null;
  const low52 = Math.min(...window.map((b) => b.low));
  if (low52 <= 0) return null;
  return Math.round((bars[idx]!.close / low52 - 1) * 10000) / 100;
}

function toYahooSymbol(symbol: string): string {
  if (symbol === '1023') return '1023.HK';
  if (/^\d+$/.test(symbol)) return `${symbol}.HK`;
  return symbol;
}

describe('buy vol<1.2 low52 x ATR grid', () => {
  it(
    'writes 2d grid JSON with top/worst20 (n>=2)',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        openAiAction: string;
        return5d: number | null;
        return10d: number | null;
        return20d: number | null;
      }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const barCache = new Map<string, OhlcBar[]>();
      const rows: GridRow[] = [];

      for (const o of obs) {
        if (o.openAiAction !== 'buy') continue;
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= VOL_MAX) continue;

        const yahoo = toYahooSymbol(o.symbol);
        if (!barCache.has(yahoo)) barCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const bars = barCache.get(yahoo)!;
        const idx = bars.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;
        const atrPct = computeAtrPctAt(bars, idx);
        const pctLow = pctFrom52wLowAt(bars, idx);
        if (atrPct == null || pctLow == null) continue;

        rows.push({
          date: o.date,
          symbol: o.symbol,
          pctFrom52wLow: pctLow,
          atrPct,
          return5d: o.return5d,
          return10d: o.return10d,
          return20d: o.return20d,
        });
      }

      const allCells = LOW52_BANDS.flatMap((low) =>
        ATR_BANDS.map((atr) => {
          const inCell = rows.filter((r) => low.match(r.pctFrom52wLow) && atr.match(r.atrPct));
          return {
            low52BandId: low.id,
            low52BandLabel: low.label,
            atrBandId: atr.id,
            atrBandLabel: atr.label,
            conditionLabel: `${low.label} × ${atr.label}`,
            ...cellMetrics(inCell),
          };
        }),
      );

      const cellsMinN = allCells.filter((c) => c.count >= MIN_N);
      const ranked = [...cellsMinN]
        .filter((c) => c.return10d.avgPct != null)
        .sort((a, b) => (b.return10d.avgPct as number) - (a.return10d.avgPct as number));

      const top20 = ranked.slice(0, 20).map((c, i) => ({ rank: i + 1, ...c }));
      const worst20 = [...ranked].reverse().slice(0, 20).map((c, i) => ({ worstRank: i + 1, ...c }));

      const grid2d = LOW52_BANDS.map((low) => ({
        low52BandId: low.id,
        low52BandLabel: low.label,
        atrRows: ATR_BANDS.map((atr) => {
          const cell = allCells.find((c) => c.low52BandId === low.id && c.atrBandId === atr.id)!;
          return cell.count >= MIN_N ? cell : { ...cell, hiddenReasonJa: `n=${cell.count} (<${MIN_N})` };
        }),
      }));

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・出来高<1.2固定',
          low52Bands: LOW52_BANDS.map((b) => b.label),
          atrBands: ATR_BANDS.map((b) => b.label),
          displayRule: `n>=${MIN_N} のセルのみグリッド表示・ランキング対象`,
          rankingMetric: '10営業日平均リターン',
          returns: '観測JSON（翌営業日エントリー→N営業日後）',
        },
        analyzedBuyCount: rows.length,
        grid2dDisplayed: grid2d.map((row) => ({
          ...row,
          atrRows: row.atrRows.filter((c) => c.count >= MIN_N),
        })),
        allCellCounts: allCells.map((c) => ({
          conditionLabel: c.conditionLabel,
          count: c.count,
          shown: c.count >= MIN_N,
        })),
        cellsMinN,
        top20Expectation: top20,
        worst20Expectation: worst20,
        rows,
        insightJa: [
          `分析${rows.length}件（1023）`,
          top20.length === 0
            ? `n>=${MIN_N}セルなし`
            : `TOP1: ${top20[0]!.conditionLabel} 10d平均${top20[0]!.return10d.avgPct}% (n=${top20[0]!.count})`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-vol12-low52-atr-grid.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== LOW52 x ATR GRID ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
