/**
 * buy — 出来高×52週安値距離×ATR 3次元グリッド × 10d
 * npx vitest run tests/unit/openAiBuyVolLowAtrGridAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type OhlcBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type GridRow = {
  date: string;
  symbol: string;
  volumeSurgeRatio: number;
  pctFrom52wLow: number;
  atrPct: number;
  return10d: number;
};

const VOL_BANDS = [
  { id: 'lt08', label: 'vol<0.8', match: (v: number) => v < 0.8 },
  { id: '08_10', label: 'vol0.8-1.0', match: (v: number) => v >= 0.8 && v < 1.0 },
  { id: '10_12', label: 'vol1.0-1.2', match: (v: number) => v >= 1.0 && v < 1.2 },
] as const;

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
  { id: 'gte25', label: 'ATR2.5%以上', match: (a: number) => a >= 2.5 },
] as const;

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

function cellStats(rows: GridRow[]) {
  const rets = rows.map((r) => r.return10d);
  return {
    count: rows.length,
    avgReturn10d: mean(rets),
    medianReturn10d: median(rets),
    winRate10dPct: winRatePct(rets),
    sharpe10d: sharpeRatio(rets),
    samples: rows.map((r) => ({
      date: r.date,
      symbol: r.symbol,
      return10d: r.return10d,
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
          quote?: Array<{
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
          }>;
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
      open: c,
      high: h,
      low: l,
      close: c,
      volume: 0,
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
  const close = bars[idx]!.close;
  if (low52 <= 0) return null;
  return Math.round((close / low52 - 1) * 10000) / 100;
}

function toYahooSymbol(symbol: string): string {
  if (symbol === '1023') return '1023.HK';
  if (/^\d+$/.test(symbol)) return `${symbol}.HK`;
  return symbol;
}

describe('buy vol x 52wLow x ATR grid', () => {
  it(
    'writes 3d grid ranking JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        openAiAction: string;
        return10d: number | null;
      }>;
      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
      const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

      const barCache = new Map<string, OhlcBar[]>();
      const rows: GridRow[] = [];

      for (const o of obs) {
        if (o.openAiAction !== 'buy' || o.return10d == null) continue;
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= 1.2) continue;

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
          volumeSurgeRatio: vol,
          pctFrom52wLow: pctLow,
          atrPct,
          return10d: o.return10d,
        });
      }

      const flatCells: Array<{
        volBand: string;
        volBandId: string;
        low52Band: string;
        low52BandId: string;
        atrBand: string;
        atrBandId: string;
        conditionLabel: string;
        count: number;
        avgReturn10d: number | null;
        medianReturn10d: number | null;
        winRate10dPct: number | null;
        sharpe10d: number | null;
        samples: { date: string; symbol: string; return10d: number }[];
      }> = [];

      for (const vol of VOL_BANDS) {
        for (const low of LOW52_BANDS) {
          for (const atr of ATR_BANDS) {
            const inCell = rows.filter(
              (r) =>
                vol.match(r.volumeSurgeRatio) &&
                low.match(r.pctFrom52wLow) &&
                atr.match(r.atrPct),
            );
            const stats = cellStats(inCell);
            flatCells.push({
              volBand: vol.label,
              volBandId: vol.id,
              low52Band: low.label,
              low52BandId: low.id,
              atrBand: atr.label,
              atrBandId: atr.id,
              conditionLabel: `${vol.label} × ${low.label} × ${atr.label}`,
              count: stats.count,
              avgReturn10d: stats.avgReturn10d,
              medianReturn10d: stats.medianReturn10d,
              winRate10dPct: stats.winRate10dPct,
              sharpe10d: stats.sharpe10d,
              samples: stats.samples,
            });
          }
        }
      }

      const minN = 3;
      const ranked = flatCells
        .filter((c) => c.count >= minN && c.avgReturn10d != null)
        .sort((a, b) => (b.avgReturn10d as number) - (a.avgReturn10d as number));

      const top20 = ranked.slice(0, 20).map((c, i) => ({ rank: i + 1, ...c }));
      const worst20 = [...ranked]
        .reverse()
        .slice(0, 20)
        .map((c, i) => ({ worstRank: i + 1, ...c }));

      const grid3d = VOL_BANDS.map((vol) => ({
        volBandId: vol.id,
        volBandLabel: vol.label,
        low52Slices: LOW52_BANDS.map((low) => ({
          low52BandId: low.id,
          low52BandLabel: low.label,
          atrCells: ATR_BANDS.map((atr) => {
            const cell = flatCells.find(
              (c) => c.volBandId === vol.id && c.low52BandId === low.id && c.atrBandId === atr.id,
            )!;
            return {
              atrBandId: atr.id,
              atrBandLabel: atr.label,
              ...cell,
            };
          }),
        })),
      }));

      const report = {
        methodologyJa: {
          scope: 'OpenAI buyのみ・出来高<1.2・10d確定・52週安値距離・ATR算出可能',
          volumeBands: VOL_BANDS.map((b) => b.label),
          low52Bands: LOW52_BANDS.map((b) => b.label),
          atrBands: ATR_BANDS.map((b) => b.label),
          rankingMinCount: minN,
          rankingMetric: '10営業日平均リターン降順',
          sharpe: 'mean/std（取引単位、n≥2）',
        },
        analyzedBuyCount: rows.length,
        grid3d,
        flatCells,
        top20Expectation: top20,
        worst20Expectation: worst20,
        cellsWithNGe3: ranked.length,
        insightJa: [
          `分析対象buy: ${rows.length}件`,
          top20.length === 0
            ? `n>=${minN}のセルなし — TOP20/WORST20は空`
            : `TOP1: ${top20[0]?.conditionLabel} 平均${top20[0]?.avgReturn10d}% (n=${top20[0]?.count})`,
        ],
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-vol-low-atr-grid.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== VOL-LOW-ATR GRID ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});
