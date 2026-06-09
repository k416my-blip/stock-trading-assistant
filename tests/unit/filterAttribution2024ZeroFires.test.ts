/**
 * Filter attribution — why 2024 has zero fires
 * npx vitest run tests/unit/filterAttribution2024ZeroFires.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

const ETFS = ['SCHD', 'SPY', 'VYM', 'VIG', 'DGRO', 'SPLG'] as const;
type Etf = (typeof ETFS)[number];
const YEARS = ['2024', '2025', '2026'] as const;

const ADX_MIN = 25;
const MACD_MIN = 0.15;
const DIST52_MAX = -7;
const SIGNAL_START = '2024-01-01';

type BarFeat = {
  date: string;
  year: string;
  symbol: Etf;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
};

function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

async function fetchYahooOhlcv(yahooSymbol: string) {
  const period1 = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'stock-trading-assistant-audit/1.0' } });
  if (!res.ok) throw new Error(`Yahoo ${yahooSymbol} HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { quote?: Array<{ high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[] }> };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const out: Array<{ date: string; high: number; low: number; close: number }> = [];
  for (let i = 0; i < ts.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    if (h == null || l == null || c == null || !Number.isFinite(c)) continue;
    out.push({ date: new Date(ts[i]! * 1000).toISOString().slice(0, 10), high: h, low: l, close: c });
  }
  return out;
}

function buildFeatures(bars: Array<{ date: string; high: number; low: number; close: number }>, symbol: Etf): BarFeat[] {
  const closes = bars.map((b) => b.close);
  const ema = (arr: number[], span: number) => {
    const k = 2 / (span + 1);
    let v = arr[0]!;
    for (let i = 1; i < arr.length; i++) v = arr[i]! * k + v * (1 - k);
    return v;
  };
  const out: BarFeat[] = [];
  for (let i = 0; i < bars.length; i++) {
    const date = bars[i]!.date;
    if (date < SIGNAL_START) continue;
    const year = date.slice(0, 4);
    if (!YEARS.includes(year as (typeof YEARS)[number])) continue;
    const adx = (() => {
      const period = 14;
      if (i < period * 2) return null;
      const trList: number[] = [];
      const plusDm: number[] = [];
      const minusDm: number[] = [];
      for (let j = i - period * 2 + 1; j <= i; j++) {
        const h = bars[j]!.high;
        const l = bars[j]!.low;
        const ph = bars[j - 1]!.high;
        const pl = bars[j - 1]!.low;
        const pc = bars[j - 1]!.close;
        trList.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        plusDm.push(Math.max(h - ph, 0));
        minusDm.push(Math.max(pl - l, 0));
      }
      const smooth = (arr: number[]) => {
        let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
        const acc: number[] = [s];
        for (let k = period; k < arr.length; k++) {
          s = s - s / period + arr[k]!;
          acc.push(s);
        }
        return acc;
      };
      const trS = smooth(trList);
      const pS = smooth(plusDm);
      const mS = smooth(minusDm);
      const dx: number[] = [];
      for (let k = 0; k < trS.length; k++) {
        if (trS[k]! <= 0) return null;
        const diPlus = (100 * pS[k]!) / trS[k]!;
        const diMinus = (100 * mS[k]!) / trS[k]!;
        const sum = diPlus + diMinus;
        dx.push(sum <= 0 ? 0 : (100 * Math.abs(diPlus - diMinus)) / sum);
      }
      return mean(dx.slice(-period));
    })();
    const macd = (() => {
      if (i < 35) return null;
      const slice = closes.slice(0, i + 1);
      const macdLine = ema(slice, 12) - ema(slice, 26);
      const signalSlice: number[] = [];
      for (let j = Math.max(0, i - 8); j <= i; j++) {
        signalSlice.push(ema(closes.slice(0, j + 1), 12) - ema(closes.slice(0, j + 1), 26));
      }
      return ((macdLine - ema(signalSlice, 9)) / closes[i]!) * 100;
    })();
    const dist52 = (() => {
      const lookback = Math.min(252, i);
      if (lookback < 60) return null;
      let maxH = -Infinity;
      for (let j = i - lookback; j <= i; j++) maxH = Math.max(maxH, bars[j]!.high);
      return ((bars[i]!.close / maxH - 1) * 100);
    })();
    if (adx == null || macd == null || dist52 == null) continue;
    out.push({
      date,
      year,
      symbol,
      adx14: Math.round(adx * 1000) / 1000,
      macdHistPct: Math.round(macd * 1000) / 1000,
      dist52wPct: Math.round(dist52 * 1000) / 1000,
    });
  }
  return out;
}

type CondId = '1_adx' | '2_macd' | '3_dist52' | '4_adx_macd' | '5_adx_dist' | '6_macd_dist' | '7_all';

function passes(f: BarFeat, id: CondId): boolean {
  const adx = f.adx14 > ADX_MIN;
  const macd = f.macdHistPct > MACD_MIN;
  const dist = f.dist52wPct <= DIST52_MAX;
  switch (id) {
    case '1_adx':
      return adx;
    case '2_macd':
      return macd;
    case '3_dist52':
      return dist;
    case '4_adx_macd':
      return adx && macd;
    case '5_adx_dist':
      return adx && dist;
    case '6_macd_dist':
      return macd && dist;
    case '7_all':
      return adx && macd && dist;
    default:
      return false;
  }
}

const CONDITIONS: Array<{ id: CondId; labelJa: string }> = [
  { id: '1_adx', labelJa: '1. ADX > 25' },
  { id: '2_macd', labelJa: '2. MACD Histogram > 0.15' },
  { id: '3_dist52', labelJa: '3. 52週高値から7%以上下落 (dist<=-7%)' },
  { id: '4_adx_macd', labelJa: '4. ADX + MACD' },
  { id: '5_adx_dist', labelJa: '5. ADX + 52週' },
  { id: '6_macd_dist', labelJa: '6. MACD + 52週' },
  { id: '7_all', labelJa: '7. ADX + MACD + 52週' },
];

function countByYear(feats: BarFeat[], id: CondId) {
  const c: Record<string, number> = { '2024': 0, '2025': 0, '2026': 0 };
  for (const f of feats) {
    if (passes(f, id)) c[f.year] = (c[f.year] ?? 0) + 1;
  }
  return c as Record<(typeof YEARS)[number], number>;
}

describe('2024 zero-fire filter attribution', () => {
  it('writes yearly counts per filter and bottleneck analysis', async () => {
    const all: BarFeat[] = [];
    for (const sym of ETFS) {
      all.push(...buildFeatures(await fetchYahooOhlcv(sym), sym));
    }

    const byYearValid = { '2024': 0, '2025': 0, '2026': 0 };
    for (const f of all) byYearValid[f.year as keyof typeof byYearValid]++;

    const conditionCounts = CONDITIONS.map((c) => ({
      ...c,
      countsByYear: countByYear(all, c.id),
      total: countByYear(all, c.id)['2024'] + countByYear(all, c.id)['2025'] + countByYear(all, c.id)['2026'],
    }));

    const y2024 = all.filter((f) => f.year === '2024');
    const passAdx = y2024.filter((f) => f.adx14 > ADX_MIN).length;
    const passMacd = y2024.filter((f) => f.macdHistPct > MACD_MIN).length;
    const passDist = y2024.filter((f) => f.dist52wPct <= DIST52_MAX).length;
    const passAdxMacd = y2024.filter((f) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN).length;
    const passAdxDist = y2024.filter((f) => f.adx14 > ADX_MIN && f.dist52wPct <= DIST52_MAX).length;
    const passMacdDist = y2024.filter((f) => f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX).length;
    const passAll = y2024.filter((f) => passes(f, '7_all')).length;

    const marginalBlock2024 = [
      {
        filterJa: 'ADX>25',
        alonePass: passAdx,
        dropFromPair_adx_macd: passAdxMacd,
        onlyFailsAdx_given_macd_dist: y2024.filter(
          (f) => f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX && !(f.adx14 > ADX_MIN),
        ).length,
      },
      {
        filterJa: 'MACD>0.15',
        alonePass: passMacd,
        dropFromPair_adx_macd: passAdxMacd,
        onlyFailsMacd_given_adx_dist: y2024.filter(
          (f) => f.adx14 > ADX_MIN && f.dist52wPct <= DIST52_MAX && !(f.macdHistPct > MACD_MIN),
        ).length,
      },
      {
        filterJa: 'dist52<=-7%',
        alonePass: passDist,
        dropFromPair_macd_dist: passMacdDist,
        onlyFailsDist_given_adx_macd: y2024.filter(
          (f) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && !(f.dist52wPct <= DIST52_MAX),
        ).length,
      },
    ].map((row) => ({
      ...row,
      blockingScore: Math.max(
        row.onlyFailsAdx_given_macd_dist ?? 0,
        row.onlyFailsMacd_given_adx_dist ?? 0,
        row.onlyFailsDist_given_adx_macd ?? 0,
      ),
    }));

    const singleFilterPassRate2024 = [
      { filter: 'ADX>25', pass: passAdx, fail: y2024.length - passAdx, passRate: passAdx / y2024.length },
      { filter: 'MACD>0.15', pass: passMacd, fail: y2024.length - passMacd, passRate: passMacd / y2024.length },
      { filter: 'dist<=-7%', pass: passDist, fail: y2024.length - passDist, passRate: passDist / y2024.length },
    ].sort((a, b) => a.passRate - b.passRate);

    const primaryBottleneck2024 = singleFilterPassRate2024[0]!;

    const relaxationGrid = [
      { label: 'ADX>20', fn: (f: BarFeat) => f.adx14 > 20 && f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX },
      { label: 'ADX>22', fn: (f: BarFeat) => f.adx14 > 22 && f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX },
      { label: 'MACD>0.10', fn: (f: BarFeat) => f.adx14 > ADX_MIN && f.macdHistPct > 0.1 && f.dist52wPct <= DIST52_MAX },
      { label: 'MACD>0.12', fn: (f: BarFeat) => f.adx14 > ADX_MIN && f.macdHistPct > 0.12 && f.dist52wPct <= DIST52_MAX },
      { label: 'dist<=-5%', fn: (f: BarFeat) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && f.dist52wPct <= -5 },
      { label: 'dist<=-3%', fn: (f: BarFeat) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && f.dist52wPct <= -3 },
      { label: 'dist<=-1%', fn: (f: BarFeat) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && f.dist52wPct <= -1 },
    ].map((r) => {
      const byYear = { '2024': 0, '2025': 0, '2026': 0 };
      for (const f of all) {
        if (r.fn(f)) byYear[f.year as keyof typeof byYear]++;
      }
      return { relaxation: r.label, countsByYear: byYear, delta2024VsBaseline: byYear['2024'] - passAll };
    }).sort((a, b) => b.delta2024VsBaseline - a.delta2024VsBaseline);

    const perEtf2024 = Object.fromEntries(
      ETFS.map((sym) => {
        const sub = y2024.filter((f) => f.symbol === sym);
        return [
          sym,
          {
            validBars: sub.length,
            passAll: sub.filter((f) => passes(f, '7_all')).length,
            passAdx: sub.filter((f) => f.adx14 > ADX_MIN).length,
            passMacd: sub.filter((f) => f.macdHistPct > MACD_MIN).length,
            passDist: sub.filter((f) => f.dist52wPct <= DIST52_MAX).length,
            medianDist52: sub.length ? sub.map((f) => f.dist52wPct).sort((a, b) => a - b)[Math.floor(sub.length / 2)] : null,
            medianMacd: sub.length ? sub.map((f) => f.macdHistPct).sort((a, b) => a - b)[Math.floor(sub.length / 2)] : null,
            medianAdx: sub.length ? sub.map((f) => f.adx14).sort((a, b) => a - b)[Math.floor(sub.length / 2)] : null,
          },
        ];
      }),
    );

    const report = {
      methodologyJa: {
        unit: '発火数 = 各ETF×各営業日のシグナル候補バー数（6ETF合算）',
        period: '2024-01-01〜',
        thresholds: { adx: ADX_MIN, macd: MACD_MIN, dist52MaxPct: DIST52_MAX },
      },
      validIndicatorBarsByYear: byYearValid,
      conditionCountsByYear: conditionCounts,
      comparisonTable: conditionCounts.map((c) => ({
        condition: c.labelJa,
        y2024: c.countsByYear['2024'],
        y2025: c.countsByYear['2025'],
        y2026: c.countsByYear['2026'],
        total: c.total,
      })),
      analysis2024: {
        validBars2024: y2024.length,
        passAllTriple: passAll,
        singleFilterPassCounts: { adx: passAdx, macd: passMacd, dist52: passDist },
        pairPassCounts: { adx_macd: passAdxMacd, adx_dist: passAdxDist, macd_dist: passMacdDist },
        strictestSingleFilter2024: primaryBottleneck2024,
        onlyFailsWhenAddingFilter: {
          adxOnlyBlocks_given_macd_dist: y2024.filter(
            (f) => f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX && !(f.adx14 > ADX_MIN),
          ).length,
          macdOnlyBlocks_given_adx_dist: y2024.filter(
            (f) => f.adx14 > ADX_MIN && f.dist52wPct <= DIST52_MAX && !(f.macdHistPct > MACD_MIN),
          ).length,
          distOnlyBlocks_given_adx_macd: y2024.filter(
            (f) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && !(f.dist52wPct <= DIST52_MAX),
          ).length,
        },
        largestReducerJa: (() => {
          const blocks = [
            { name: '52週高値<=-7%', n: y2024.filter((f) => f.adx14 > ADX_MIN && f.macdHistPct > MACD_MIN && !(f.dist52wPct <= DIST52_MAX)).length, from: passAdxMacd, to: passAll },
            { name: 'MACD>0.15', n: y2024.filter((f) => f.adx14 > ADX_MIN && f.dist52wPct <= DIST52_MAX && !(f.macdHistPct > MACD_MIN)).length, from: passAdxDist, to: passAll },
            { name: 'ADX>25', n: y2024.filter((f) => f.macdHistPct > MACD_MIN && f.dist52wPct <= DIST52_MAX && !(f.adx14 > ADX_MIN)).length, from: passMacdDist, to: passAll },
          ];
          const soloDrop = [
            { name: 'ADX単体未達', drop: y2024.length - passAdx },
            { name: 'MACD単体未達', drop: y2024.length - passMacd },
            { name: '52週単体未達', drop: y2024.length - passDist },
          ].sort((a, b) => b.drop - a.drop)[0];
          const pairBlock = blocks.sort((a, b) => b.n - a.n)[0];
          return {
            strictestAlone: primaryBottleneck2024.filter,
            soloBiggestGap: soloDrop,
            biggestTripleBlocker: pairBlock,
            conclusionJa: `2024は単体では「${primaryBottleneck2024.filter}」の通過率が最低。3条件同時では「${pairBlock?.name}」がADX+MACDから${pairBlock?.n}件を落としている（ただし最終0件のため各ペアも要確認）。`,
          };
        })(),
      },
      relaxationToIncrease2024: relaxationGrid,
      perEtf2024Diagnostics: perEtf2024,
      summaryJa: [
        `2024有効バー ${y2024.length}件（6ETF合算）に対し、3条件同時は ${passAll}件。`,
        `単体通過: ADX ${passAdx}, MACD ${passMacd}, 52週 ${passDist}。`,
        `最も通過率が低い単体フィルタ: ${primaryBottleneck2024.filter}（${(primaryBottleneck2024.passRate * 100).toFixed(1)}%）。`,
        `2024発火を最も増やす緩和（3条件ベース）: ${relaxationGrid[0]?.relaxation} → ${relaxationGrid[0]?.countsByYear['2024']}件（+${relaxationGrid[0]?.delta2024VsBaseline}）。`,
      ],
    };

    const outDir = path.join(process.cwd(), 'scripts', 'filter-attribution-2024');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const csv = [
      'condition,y2024,y2025,y2026',
      ...report.comparisonTable.map((r) => `"${r.condition}",${r.y2024},${r.y2025},${r.y2026}`),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'counts-by-year.csv'), `${csv}\n`, 'utf8');

    console.log('\n=== FILTER ATTRIBUTION 2024 ===\n', JSON.stringify(report, null, 2));
  }, 300_000);
});
