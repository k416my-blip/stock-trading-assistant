/**
 * buy — 4月後半成功 vs 5月前半失敗 + マクロ指数比較
 * npx vitest run tests/unit/openAiBuyAprMayMacroAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const APRIL_LATE_START = '2026-04-16';
const APRIL_LATE_END = '2026-04-30';
const MAY_EARLY_START = '2026-05-01';
const MAY_EARLY_END = '2026-05-15';

const MACRO_INDICES = [
  { id: 'nikkei225', labelJa: '日経平均', yahooSymbol: '^N225' },
  { id: 'topix', labelJa: 'TOPIX', yahooSymbol: '1306.T' },
  { id: 'nasdaq100', labelJa: 'NASDAQ100', yahooSymbol: '^NDX' },
  { id: 'sp500', labelJa: 'S&P500', yahooSymbol: '^GSPC' },
  { id: 'vix', labelJa: 'VIX', yahooSymbol: '^VIX' },
] as const;

type Bar = { date: string; close: number };

type BuyEnriched = {
  date: string;
  symbol: string;
  cohort: 'aprilLateSuccess' | 'mayEarlyFailure';
  rsi14: number;
  confidence: number;
  volumeSurgeRatio: number | null;
  pctFrom20dHigh: number;
  dayChangePct: number;
  return10d: number | null;
  macroOnDay: Record<
    string,
    { close: number | null; dayChangePct: number | null }
  >;
  macroForward: Record<
    string,
    { return5d: number | null; return10d: number | null }
  >;
};

const STOCK_METRICS = [
  { key: 'rsi14' as const, labelJa: 'RSI14' },
  { key: 'confidence' as const, labelJa: 'confidence' },
  { key: 'volumeSurgeRatio' as const, labelJa: '出来高倍率' },
  { key: 'pctFrom20dHigh' as const, labelJa: '20日高値距離(%)' },
  { key: 'dayChangePct' as const, labelJa: '日中変化率(%)' },
];

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

function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function welchTTest(a: number[], b: number[]): { t: number; df: number; pTwoSided: number } | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a)!;
  const mb = mean(b)!;
  const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return null;
  const t = (ma - mb) / se;
  const df =
    (va / a.length + vb / b.length) ** 2 /
    ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  return {
    t: Math.round(t * 1000) / 1000,
    df: Math.round(df * 10) / 10,
    pTwoSided: Math.round(2 * (1 - normalCdf(Math.abs(t))) * 10000) / 10000,
  };
}

function compareNumeric(aprilVals: number[], mayVals: number[]) {
  return {
    aprilLate: { mean: mean(aprilVals), median: median(aprilVals), n: aprilVals.length },
    mayEarly: { mean: mean(mayVals), median: median(mayVals), n: mayVals.length },
    deltaAprilMinusMay:
      mean(aprilVals) != null && mean(mayVals) != null
        ? Math.round((mean(aprilVals)! - mean(mayVals)!) * 100) / 100
        : null,
    welch: welchTTest(aprilVals, mayVals),
  };
}

async function fetchYahooDaily(yahooSymbol: string): Promise<Bar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const bars: Bar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      close: c,
    });
  }
  return bars;
}

function dateIndex(bars: Bar[], date: string): number {
  return bars.findIndex((b) => b.date === date);
}

function forwardReturnPct(bars: Bar[], idx: number, horizon: number): number | null {
  const j = idx + horizon;
  if (idx < 0 || j >= bars.length) return null;
  const c0 = bars[idx]!.close;
  const c1 = bars[j]!.close;
  if (c0 <= 0) return null;
  return Math.round(((c1 / c0 - 1) * 100) * 100) / 100;
}

function dayChangePct(bars: Bar[], idx: number): number | null {
  if (idx < 1) return null;
  const prev = bars[idx - 1]!.close;
  const cur = bars[idx]!.close;
  if (prev <= 0) return null;
  return Math.round(((cur / prev - 1) * 100) * 100) / 100;
}

function cohortOf(date: string): BuyEnriched['cohort'] | null {
  if (date >= APRIL_LATE_START && date <= APRIL_LATE_END) return 'aprilLateSuccess';
  if (date >= MAY_EARLY_START && date <= MAY_EARLY_END) return 'mayEarlyFailure';
  return null;
}

function aggregateIndexHorizons(
  rows: BuyEnriched[],
  indexId: string,
  field: 'return5d' | 'return10d',
) {
  const vals = rows
    .map((r) => r.macroForward[indexId]?.[field])
    .filter((v): v is number => v != null);
  return {
    count: vals.length,
    avgPct: mean(vals),
    medianPct: median(vals),
    winRatePct: winRatePct(vals),
  };
}

describe('buy April success vs May failure macro', () => {
  it(
    'writes apr-may macro comparison JSON',
    async () => {
      const obs = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        rsi14: number;
        openAiAction: string;
        return10d: number | null;
      }>;

      const reg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
      ) as Array<{
        date: string;
        symbol: string;
        confidence: number;
        pctFrom20dHigh: number;
        dayChangePct: number;
        volumeSurgeRatio: number;
        openAiAction: string;
      }>;
      const regBuy = new Map(
        reg.filter((r) => r.openAiAction === 'buy').map((r) => [`${r.date}|${r.symbol}`, r] as const),
      );

      const hybrid = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
      ) as { allRows: Array<{ date: string; symbol: string; confidence: number }> };
      const confHybrid = new Map(hybrid.allRows.map((r) => [`${r.date}|${r.symbol}`, r.confidence]));

      const macroBars: Record<string, Bar[]> = {};
      for (const m of MACRO_INDICES) {
        macroBars[m.id] = await fetchYahooDaily(m.yahooSymbol);
      }

      const enriched: BuyEnriched[] = [];
      for (const o of obs) {
        if (o.openAiAction !== 'buy') continue;
        const cohort = cohortOf(o.date);
        if (!cohort) continue;
        const key = `${o.date}|${o.symbol}`;
        const feat = regBuy.get(key);
        const macroOnDay: BuyEnriched['macroOnDay'] = {};
        const macroForward: BuyEnriched['macroForward'] = {};

        for (const m of MACRO_INDICES) {
          const bars = macroBars[m.id]!;
          const idx = dateIndex(bars, o.date);
          if (idx < 0) {
            macroOnDay[m.id] = { close: null, dayChangePct: null };
            macroForward[m.id] = { return5d: null, return10d: null };
            continue;
          }
          macroOnDay[m.id] = {
            close: Math.round(bars[idx]!.close * 100) / 100,
            dayChangePct: dayChangePct(bars, idx),
          };
          macroForward[m.id] = {
            return5d: forwardReturnPct(bars, idx, 5),
            return10d: forwardReturnPct(bars, idx, 10),
          };
        }

        enriched.push({
          date: o.date,
          symbol: o.symbol,
          cohort,
          rsi14: o.rsi14,
          confidence: feat?.confidence ?? confHybrid.get(key) ?? 75,
          volumeSurgeRatio: feat?.volumeSurgeRatio ?? null,
          pctFrom20dHigh: feat?.pctFrom20dHigh ?? 0,
          dayChangePct: feat?.dayChangePct ?? 0,
          return10d: o.return10d,
          macroOnDay,
          macroForward,
        });
      }

      const april = enriched.filter((r) => r.cohort === 'aprilLateSuccess');
      const may = enriched.filter((r) => r.cohort === 'mayEarlyFailure');

      const stockComparison = Object.fromEntries(
        STOCK_METRICS.map((m) => {
          const aVals = april
            .map((r) => r[m.key])
            .filter((v): v is number => v != null && typeof v === 'number');
          const mVals = may
            .map((r) => r[m.key])
            .filter((v): v is number => v != null && typeof v === 'number');
          return [m.key, { labelJa: m.labelJa, ...compareNumeric(aVals, mVals) }];
        }),
      );

      const macroOnDayComparison = Object.fromEntries(
        MACRO_INDICES.map((m) => {
          const aVals = april
            .map((r) => r.macroOnDay[m.id]?.dayChangePct)
            .filter((v): v is number => v != null);
          const mVals = may
            .map((r) => r.macroOnDay[m.id]?.dayChangePct)
            .filter((v): v is number => v != null);
          return [
            m.id,
            {
              labelJa: m.labelJa,
              yahooSymbol: m.yahooSymbol,
              metric: 'シグナル当日の前日比(%)',
              ...compareNumeric(aVals, mVals),
            },
          ];
        }),
      );

      const macroForward5d = Object.fromEntries(
        MACRO_INDICES.map((m) => [
          m.id,
          {
            id: m.id,
            labelJa: m.labelJa,
            aprilLate: aggregateIndexHorizons(april, m.id, 'return5d'),
            mayEarly: aggregateIndexHorizons(may, m.id, 'return5d'),
            comparison: compareNumeric(
              april.map((r) => r.macroForward[m.id]?.return5d).filter((v): v is number => v != null),
              may.map((r) => r.macroForward[m.id]?.return5d).filter((v): v is number => v != null),
            ),
          },
        ]),
      );

      const macroForward10d = Object.fromEntries(
        MACRO_INDICES.map((m) => [
          m.id,
          {
            id: m.id,
            labelJa: m.labelJa,
            aprilLate: aggregateIndexHorizons(april, m.id, 'return10d'),
            mayEarly: aggregateIndexHorizons(may, m.id, 'return10d'),
            comparison: compareNumeric(
              april.map((r) => r.macroForward[m.id]?.return10d).filter((v): v is number => v != null),
              may.map((r) => r.macroForward[m.id]?.return10d).filter((v): v is number => v != null),
            ),
          },
        ]),
      );

      const april10d = april.map((r) => r.return10d).filter((v): v is number => v != null);
      const may10d = may.map((r) => r.return10d).filter((v): v is number => v != null);

      const report = {
        methodologyJa: {
          cohortAprilLate: `4月後半成功: ${APRIL_LATE_START}〜${APRIL_LATE_END} の buy`,
          cohortMayEarly: `5月前半失敗: ${MAY_EARLY_START}〜${MAY_EARLY_END} の buy`,
          note: '期間ラベルは観測上のクラスター（4月buyは10dほぼ全勝、5/5-5/14は10d全敗）',
          macroSource: 'Yahoo Finance daily close',
          topixProxy: '1306.T（TOPIX連動ETF）',
          nasdaq100: '^NDX',
          indexForwardReturn: 'シグナル当日終値→+5/+10営業日後終値（各指数の取引カレンダー）',
          stockReturn10d: '観測JSON（翌営業日エントリー→10営業日後）',
        },
        counts: {
          aprilLateBuy: april.length,
          mayEarlyBuy: may.length,
          aprilWithReturn10d: april10d.length,
          mayWithReturn10d: may10d.length,
          aprilReturn10dAvg: mean(april10d),
          mayReturn10dAvg: mean(may10d),
        },
        stockFeatureComparison: stockComparison,
        macroOnDayComparison,
        macroIndexForward5dByCohort: macroForward5d,
        macroIndexForward10dByCohort: macroForward10d,
        rows: enriched,
        marketEnvironmentConclusionJa: buildConclusion(april, may, macroForward5d, macroForward10d),
      };

      const out = path.join(process.cwd(), 'scripts', 'openai-buy-apr-may-macro-analysis.json');
      fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log('\n=== APR-MAY MACRO ===\n', JSON.stringify(report, null, 2));
    },
    120_000,
  );
});

function buildConclusion(
  april: BuyEnriched[],
  may: BuyEnriched[],
  fwd5: Record<string, { comparison: ReturnType<typeof compareNumeric> }>,
  fwd10: Record<string, { comparison: ReturnType<typeof compareNumeric> }>,
): string[] {
  const lines: string[] = [];
  const sig5 = Object.entries(fwd5).filter(([, v]) => v.comparison.welch?.pTwoSided != null && v.comparison.welch.pTwoSided < 0.1);
  const sig10 = Object.entries(fwd10).filter(([, v]) => v.comparison.welch?.pTwoSided != null && v.comparison.welch.pTwoSided < 0.1);
  lines.push(
    `4月後半${april.length}件・5月前半${may.length}件。個別銘柄10d: 4月平均${mean(april.map((r) => r.return10d).filter((v): v is number => v != null))}% vs 5月${mean(may.map((r) => r.return10d).filter((v): v is number => v != null))}%`,
  );
  if (sig5.length || sig10.length) {
    lines.push(`指数フォワードで差が大きい指標(参考p<0.1): 5d=${sig5.map(([k]) => k).join(',') || 'なし'} / 10d=${sig10.map(([k]) => k).join(',') || 'なし'}`);
  } else {
    lines.push('指数5d/10dの群間差はサンプル8件前後のため統計検定は参考程度。当日マクロとフォワード指数の方向性を重視。');
  }
  return lines;
}
