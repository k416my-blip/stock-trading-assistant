/**
 * OpenAI buy日 vs 同一銘柄hold日 — 特徴量比較・RSI有意差
 * npx vitest run tests/unit/openAiBuyVsHoldFeatureAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import {
  computeRsi14At,
  toYahooSymbol,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type OhlcBar = { date: string; close: number; high: number; volume: number };

type ObsRow = {
  date: string;
  symbol: string;
  rsi14: number;
  openAiAction: AiSecondEvaluatorAction;
  return5d: number | null;
  return10d: number | null;
};

type Enriched = ObsRow & {
  dayChangePct: number | null;
  volumeSurgeRatio: number | null;
  pctFrom20dHigh: number | null;
  confidence: number | null;
};

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=6mo`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            close?: (number | null)[];
            high?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const closes = q?.close ?? [];
  const highs = q?.high ?? [];
  const volumes = q?.volume ?? [];
  const bars: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    const h = highs[i];
    const v = volumes[i];
    if (c == null || h == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      close: c,
      high: h,
      volume: v,
    });
  }
  return bars;
}

function volumeSurgeAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 9) return null;
  const slice = bars.slice(0, idx + 1);
  if (slice.length < 10) return null;
  const volumes = slice.map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return Math.round((recent / prior) * 100) / 100;
}

function pctFrom20dHighAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 19) return null;
  const window = bars.slice(idx - 19, idx + 1);
  const high20 = Math.max(...window.map((b) => b.high));
  const close = bars[idx]!.close;
  if (high20 <= 0) return null;
  return Math.round(((close / high20 - 1) * 100) * 100) / 100;
}

function dayChangeAt(bars: OhlcBar[], idx: number): number | null {
  if (idx < 1) return null;
  const prev = bars[idx - 1]!.close;
  const cur = bars[idx]!.close;
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100 * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function std(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const v = vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1);
  return Math.round(Math.sqrt(v) * 100) / 100;
}

/** Welch t-test (two-sided p-value, normal approx) */
function welchTTest(a: number[], b: number[]): { t: number; df: number; pTwoSided: number } | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  const va = a.reduce((s, x) => s + (x - ma) ** 2, 0) / (a.length - 1);
  const vb = b.reduce((s, x) => s + (x - mb) ** 2, 0) / (b.length - 1);
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se === 0) return null;
  const t = (ma - mb) / se;
  const df = (va / a.length + vb / b.length) ** 2 / ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  const p = 2 * (1 - normalCdf(Math.abs(t)));
  return { t: Math.round(t * 1000) / 1000, df: Math.round(df * 10) / 10, pTwoSided: Math.round(p * 10000) / 10000 };
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

/** Mann-Whitney U (normal approx z) */
function mannWhitneyU(a: number[], b: number[]): { u: number; z: number; pTwoSided: number } | null {
  if (a.length === 0 || b.length === 0) return null;
  const ranked = [...a.map((v) => ({ v, g: 1 })), ...b.map((v) => ({ v, g: 2 }))].sort((x, y) => x.v - y.v);
  let rank = 1;
  const ranks: number[] = [];
  for (let i = 0; i < ranked.length; i++) {
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1]!.v === ranked[i]!.v) j += 1;
    const avgRank = (rank + rank + (j - i)) / 2;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    rank += j - i + 1;
    i = j;
  }
  let r1 = 0;
  for (let i = 0; i < ranked.length; i++) {
    if (ranked[i]!.g === 1) r1 += ranks[i]!;
  }
  const n1 = a.length;
  const n2 = b.length;
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u = Math.min(u1, n1 * n2 - u1);
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sigma === 0) return null;
  const z = (u - mu) / sigma;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { u: Math.round(u), z: Math.round(z * 1000) / 1000, pTwoSided: Math.round(p * 10000) / 10000 };
}

function summarizeGroup(rows: Enriched[], label: string) {
  const pick = (fn: (r: Enriched) => number | null) =>
    rows.map(fn).filter((v): v is number => v != null);
  return {
    label,
    n: rows.length,
    rsi14: { mean: mean(pick((r) => r.rsi14)), std: std(pick((r) => r.rsi14)) },
    confidence: { mean: mean(pick((r) => r.confidence)), std: std(pick((r) => r.confidence)) },
    dayChangePct: { mean: mean(pick((r) => r.dayChangePct)), std: std(pick((r) => r.dayChangePct)) },
    volumeSurgeRatio: { mean: mean(pick((r) => r.volumeSurgeRatio)), std: std(pick((r) => r.volumeSurgeRatio)) },
    pctFrom20dHigh: { mean: mean(pick((r) => r.pctFrom20dHigh)), std: std(pick((r) => r.pctFrom20dHigh)) },
    return5d: { mean: mean(pick((r) => r.return5d)), std: std(pick((r) => r.return5d)) },
    return10d: { mean: mean(pick((r) => r.return10d)), std: std(pick((r) => r.return10d)) },
  };
}

function comparisonTable(buy: ReturnType<typeof summarizeGroup>, hold: ReturnType<typeof summarizeGroup>) {
  const metrics = [
    'rsi14',
    'confidence',
    'dayChangePct',
    'volumeSurgeRatio',
    'pctFrom20dHigh',
    'return5d',
    'return10d',
  ] as const;
  return Object.fromEntries(
    metrics.map((m) => [
      m,
      {
        buyMean: buy[m].mean,
        holdMean: hold[m].mean,
        deltaBuyMinusHold:
          buy[m].mean != null && hold[m].mean != null
            ? Math.round((buy[m].mean! - hold[m].mean!) * 100) / 100
            : null,
      },
    ]),
  );
}

describe('OpenAI buy vs hold feature comparison', () => {
  it('writes buy-vs-hold feature report with RSI significance', async () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as ObsRow[];

    const hybrid = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    ) as { allRows: Array<{ date: string; symbol: string; confidence: number }> };

    const confByKey = new Map(
      hybrid.allRows.map((r) => [`${r.date}|${r.symbol}`, r.confidence] as const),
    );

    const report30d = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-30d-report.json'), 'utf8'),
    ) as {
      buyCommonFeatures: { aiConfidenceMean: number };
      holdBaselineFeatures: { aiConfidenceMean: number };
      buyVsHoldDelta: { rsi14: number; aiConfidence: number; dayChangePct: number };
    };

    const state = buildProbeAppState(10, 'bursa-first');
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));

    const barsBySymbol = new Map<string, OhlcBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooOhlcv(s.yahooSymbol));
    }

    const enriched: Enriched[] = raw.map((r) => {
      const bars = barsBySymbol.get(r.symbol)!;
      const idx = bars.findIndex((b) => b.date === r.date);
      const conf = confByKey.get(`${r.date}|${r.symbol}`) ?? null;
      return {
        ...r,
        dayChangePct: idx >= 0 ? dayChangeAt(bars, idx) : null,
        volumeSurgeRatio: idx >= 0 ? volumeSurgeAt(bars, idx) : null,
        pctFrom20dHigh: idx >= 0 ? pctFrom20dHighAt(bars, idx) : null,
        confidence: conf,
        rsi14: r.rsi14,
      };
    });

    const buyAll = enriched.filter((r) => r.openAiAction === 'buy');
    const holdAll = enriched.filter((r) => r.openAiAction === 'hold');

    const symbolsWithBuy = [...new Set(buyAll.map((r) => r.symbol))];
    const buySameSym = buyAll;
    const holdSameSym = holdAll.filter((r) => symbolsWithBuy.includes(r.symbol));

    const buyRsi = buySameSym.map((r) => r.rsi14);
    const holdRsi = holdSameSym.map((r) => r.rsi14);

    const buyConf = buySameSym.map((r) => r.confidence).filter((v): v is number => v != null);
    const holdConfFrom30d = report30d.holdBaselineFeatures.aiConfidenceMean;

    const sumBuy = summarizeGroup(buySameSym, 'buy');
    const sumHold = summarizeGroup(holdSameSym, 'hold');

    const holdConfAugmented = {
      ...sumHold,
      confidence: {
        mean: holdConfFrom30d,
        std: null,
        noteJa:
          'holdのconfidenceは行単位キャッシュなし。同一304コホートのopenai-30d-report.json holdBaselineFeatures.aiConfidenceMeanを使用',
      },
    };

    const sumBuyConfAugmented = {
      ...sumBuy,
      confidence: {
        mean: mean(buyConf) ?? report30d.buyCommonFeatures.aiConfidenceMean,
        std: std(buyConf),
        noteJa: 'buyはopenai-buy-hybrid-analysis.jsonの24件から',
      },
    };

    const perSymbol = symbolsWithBuy.map((sym) => {
      const b = buySameSym.filter((r) => r.symbol === sym);
      const h = holdSameSym.filter((r) => r.symbol === sym);
      const bRsi = b.map((r) => r.rsi14);
      const hRsi = h.map((r) => r.rsi14);
      return {
        symbol: sym,
        buyCount: b.length,
        holdCount: h.length,
        buyRsiMean: mean(bRsi),
        holdRsiMean: mean(hRsi),
        rsiDelta: mean(bRsi) != null && mean(hRsi) != null ? Math.round((mean(bRsi)! - mean(hRsi)!) * 10) / 10 : null,
        welchRsi: welchTTest(bRsi, hRsi),
        table: comparisonTable(summarizeGroup(b, 'buy'), summarizeGroup(h, 'hold')),
      };
    });

    const report = {
      methodologyJa: {
        cohort: '304観測（openai-rsi-bucket-observations.json）',
        compare: 'OpenAI buy日 vs 同一銘柄群のhold日（buyが出た銘柄に限定したholdを含む）',
        returns: '翌営業日エントリー→5/10営業日後（観測JSONのreturn5d/10d）',
        pctFrom20dHigh: '終値/直近20営業日高値-1（%）。0=高値圏、負=高値からの下落距離',
        volumeSurgeRatio: '直近5日平均出来高 / その前5日平均（conciergeEvidenceBuilderと同式）',
        confidenceNote:
          'buy24件はhybrid JSON。hold162件のconfidence平均は30dレポート（API再実行なし）',
      },
      symbolsWithBuy,
      counts: { buy: buySameSym.length, holdOnThoseSymbols: holdSameSym.length, holdAll304: holdAll.length },
      sideBySide: comparisonTable(sumBuyConfAugmented, holdConfAugmented),
      sideBySideAll304: comparisonTable(summarizeGroup(buyAll, 'buy'), summarizeGroup(holdAll, 'hold')),
      rsiSignificance: {
        buyMean: mean(buyRsi),
        holdMean: mean(holdRsi),
        delta: report30d.buyVsHoldDelta.rsi14,
        buyStd: std(buyRsi),
        holdStd: std(holdRsi),
        welchTTest: welchTTest(buyRsi, holdRsi),
        mannWhitneyU: mannWhitneyU(buyRsi, holdRsi),
        interpretationJa:
          welchTTest(buyRsi, holdRsi) != null && welchTTest(buyRsi, holdRsi)!.pTwoSided < 0.05
            ? 'buy日RSIはhold日より統計的に有意に高い（p<0.05）'
            : 'buy日RSIはhold日より高い傾向あるが、サンプル差・分散のため有意水準5%では棄却できない可能性',
        cohenD:
          buyRsi.length && holdRsi.length
            ? (() => {
                const mb = mean(buyRsi)!;
                const mh = mean(holdRsi)!;
                const sb = std(buyRsi) ?? 0;
                const sh = std(holdRsi) ?? 0;
                const pooled = Math.sqrt(((buyRsi.length - 1) * sb ** 2 + (holdRsi.length - 1) * sh ** 2) / (buyRsi.length + holdRsi.length - 2));
                return pooled === 0 ? null : Math.round(((mb - mh) / pooled) * 100) / 100;
              })()
            : null,
      },
      perSymbol,
      openAiBuyConditionProfileJa: [
        'RSI: buyはholdより約+4pt（50〜65帯に集中、RSI≤30の逆張り買いではない）',
        'confidence: buy約75 vs hold約65（+10pt）— 30dコホート',
        '日中変化: buyは微プラス、holdは微マイナス傾向',
        '出来高倍率・20日高値距離: 下記sideBySideのdelta参照',
        '5d/10dリターン: buy平均はholdより劣る傾向（銘柄内でも1023で顕著）',
      ],
      reference30dReport: {
        buyVsHoldDelta: report30d.buyVsHoldDelta,
        buyConfidenceMean: report30d.buyCommonFeatures.aiConfidenceMean,
        holdConfidenceMean: report30d.holdBaselineFeatures.aiConfidenceMean,
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-vs-hold-features.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY vs HOLD FEATURES ===\n', JSON.stringify(report, null, 2));
  });
});
