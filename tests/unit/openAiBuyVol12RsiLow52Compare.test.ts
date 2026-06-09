/**
 * buy + 出来高<1.2 — RSI55-60 vs RSI60-65 × 52週安値距離（n>=2）
 * npx vitest run tests/unit/openAiBuyVol12RsiLow52Compare.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const VOL_MAX = 1.2;
const MIN_N = 2;

type OhlcBar = { date: string; high: number; low: number; close: number };

type EnrichedBuy = {
  date: string;
  symbol: string;
  rsi14: number;
  rsiBand: 'RSI55-60' | 'RSI60-65';
  volumeSurgeRatio: number;
  pctFrom52wLow: number;
  low52Band: string;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

const RSI_COMPARE = [
  { id: '55_60', labelJa: '① RSI55-60', match: (r: number) => r >= 55 && r < 60 },
  { id: '60_65', labelJa: '② RSI60-65', match: (r: number) => r >= 60 && r < 65 },
] as const;

const LOW52_BANDS = [
  { id: '0_3', labelJa: '安値距離0-3%', match: (p: number) => p >= 0 && p < 3 },
  { id: '3_5', labelJa: '安値距離3-5%', match: (p: number) => p >= 3 && p < 5 },
  { id: '5_8', labelJa: '安値距離5-8%', match: (p: number) => p >= 5 && p < 8 },
  { id: 'gte8', labelJa: '安値距離8%以上', match: (p: number) => p >= 8 },
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

function horizonBlock(rows: EnrichedBuy[], key: HorizonKey) {
  const vals = rows.map((r) => r[key]).filter((v): v is number => v != null);
  return {
    count: vals.length,
    avgPct: mean(vals),
    medianPct: median(vals),
    winRatePct: winRatePct(vals),
    sharpe: sharpeRatio(vals),
  };
}

function cohortMetrics(rows: EnrichedBuy[]) {
  return {
    count: rows.length,
    return5d: horizonBlock(rows, 'return5d'),
    return10d: horizonBlock(rows, 'return10d'),
    return20d: horizonBlock(rows, 'return20d'),
    samples: rows.map((r) => ({
      date: r.date,
      symbol: r.symbol,
      rsi14: r.rsi14,
      pctFrom52wLow: r.pctFrom52wLow,
      return5d: r.return5d,
      return10d: r.return10d,
      return20d: r.return20d,
    })),
  };
}

function filterMinN<T extends { count: number }>(items: T[]): T[] {
  return items.filter((x) => x.count >= MIN_N);
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

function pctFrom52wLowAt(bars: OhlcBar[], idx: number, lookback = 252): number | null {
  const start = Math.max(0, idx - lookback + 1);
  const window = bars.slice(start, idx + 1);
  if (window.length < 20) return null;
  const low52 = Math.min(...window.map((b) => b.low));
  if (low52 <= 0) return null;
  return Math.round((bars[idx]!.close / low52 - 1) * 10000) / 100;
}

function low52Label(p: number): string {
  const b = LOW52_BANDS.find((x) => x.match(p));
  return b?.labelJa ?? 'unknown';
}

function toYahooSymbol(symbol: string): string {
  if (symbol === '1023') return '1023.HK';
  if (/^\d+$/.test(symbol)) return `${symbol}.HK`;
  return symbol;
}

describe('buy vol<1.2 RSI55-60 vs 60-65 low52 split', () => {
  it(
    'writes RSI low52 comparison JSON (n>=2 only)',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        rsi14: number;
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
      const enriched: EnrichedBuy[] = [];

      for (const o of obs) {
        if (o.openAiAction !== 'buy') continue;
        const vol = volMap.get(`${o.date}|${o.symbol}`);
        if (vol == null || vol >= VOL_MAX) continue;
        const rsiBand = RSI_COMPARE.find((b) => b.match(o.rsi14));
        if (!rsiBand) continue;

        const yahoo = toYahooSymbol(o.symbol);
        if (!barCache.has(yahoo)) barCache.set(yahoo, await fetchYahooOhlcv(yahoo));
        const bars = barCache.get(yahoo)!;
        const idx = bars.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;
        const pctLow = pctFrom52wLowAt(bars, idx);
        if (pctLow == null) continue;

        enriched.push({
          date: o.date,
          symbol: o.symbol,
          rsi14: o.rsi14,
          rsiBand: rsiBand.id === '55_60' ? 'RSI55-60' : 'RSI60-65',
          volumeSurgeRatio: vol,
          pctFrom52wLow: pctLow,
          low52Band: low52Label(pctLow),
          return5d: o.return5d,
          return10d: o.return10d,
          return20d: o.return20d,
        });
      }

      const rsiOverall = filterMinN(
        RSI_COMPARE.map((rsi) => ({
          rsiBandId: rsi.id,
          labelJa: rsi.labelJa,
          ...cohortMetrics(enriched.filter((r) => rsi.match(r.rsi14))),
        })),
      );

      const rsiByLow52 = RSI_COMPARE.flatMap((rsi) =>
        LOW52_BANDS.map((low) => {
          const rows = enriched.filter((r) => rsi.match(r.rsi14) && low.match(r.pctFrom52wLow));
          return {
            rsiBandId: rsi.id,
            rsiLabelJa: rsi.labelJa,
            low52BandId: low.id,
            low52LabelJa: low.labelJa,
            conditionLabel: `${rsi.labelJa} × ${low.labelJa}`,
            ...cohortMetrics(rows),
          };
        }),
      );

      const rsiByLow52MinN = filterMinN(rsiByLow52);

      const report = {
        methodologyJa: {
          scope: 'OpenAI buy・出来高<1.2固定・RSI55-60 vs RSI60-65',
          low52Bands: LOW52_BANDS.map((b) => b.labelJa),
          displayRule: `件数 n>=${MIN_N} のセルのみ表示`,
          returns: '観測JSON（翌営業日エントリー→N営業日後）',
          pctFrom52wLow: 'Yahoo OHLCV・直近252日',
        },
        analyzedCount: enriched.length,
        rsi55_60Count: enriched.filter((r) => r.rsiBand === 'RSI55-60').length,
        rsi60_65Count: enriched.filter((r) => r.rsiBand === 'RSI60-65').length,
        rsiOverallComparison: rsiOverall,
        rsiByLow52Split: rsiByLow52MinN,
        rsiByLow52AllCounts: rsiByLow52.map((c) => ({
          conditionLabel: c.conditionLabel,
          count: c.count,
          shown: c.count >= MIN_N,
        })),
        rows: enriched,
        insightJa: buildInsight(rsiOverall, rsiByLow52MinN, enriched),
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-vol12-rsi-low52-compare.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== RSI LOW52 COMPARE ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});

function buildInsight(
  overall: Array<{ labelJa: string; return10d: { avgPct: number | null } }>,
  split: Array<{ conditionLabel: string; count: number; return10d: { avgPct: number | null } }>,
  rows: EnrichedBuy[],
): string[] {
  const lines = [
    `対象${rows.length}件（1023中心、RSI55-65帯・出来高<1.2）`,
  ];
  if (overall.length >= 2) {
    lines.push(
      `${overall[0]!.labelJa} 10d平均${overall[0]!.return10d.avgPct}% vs ${overall[1]!.labelJa} ${overall[1]!.return10d.avgPct}%`,
    );
  }
  if (split.length === 0) lines.push(`n>=2の52週安値距離×RSIセルは0件`);
  return lines;
}
