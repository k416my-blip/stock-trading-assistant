/**
 * buyのみ — 出来高倍率フィルター別リターン比較（304観測）
 * npx vitest run tests/unit/openAiBuyVolumeFilterAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type BuyRow = {
  date: string;
  symbol: string;
  volumeSurgeRatio: number | null;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

type HorizonKey = 'return5d' | 'return10d' | 'return20d';

const HORIZONS: { key: HorizonKey; labelJa: string }[] = [
  { key: 'return5d', labelJa: '5営業日' },
  { key: 'return10d', labelJa: '10営業日' },
  { key: 'return20d', labelJa: '20営業日' },
];

type CohortDef = {
  id: string;
  labelJa: string;
  match: (r: BuyRow) => boolean;
};

const COHORTS: CohortDef[] = [
  { id: 'all_buy', labelJa: '① buy全体', match: () => true },
  { id: 'vol_lt_12', labelJa: '② 出来高倍率<1.2', match: (r) => r.volumeSurgeRatio != null && r.volumeSurgeRatio < 1.2 },
  { id: 'vol_lt_10', labelJa: '③ 出来高倍率<1.0', match: (r) => r.volumeSurgeRatio != null && r.volumeSurgeRatio < 1.0 },
  { id: 'vol_lt_08', labelJa: '④ 出来高倍率<0.8', match: (r) => r.volumeSurgeRatio != null && r.volumeSurgeRatio < 0.8 },
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

function horizonStats(rows: BuyRow[], key: HorizonKey) {
  const vals = rows.map((r) => r[key]).filter((v): v is number => v != null);
  return {
    countWithReturn: vals.length,
    avgPct: mean(vals),
    medianPct: median(vals),
    winRatePct: winRatePct(vals),
    maxProfitPct: vals.length ? Math.round(Math.max(...vals) * 100) / 100 : null,
    maxLossPct: vals.length ? Math.round(Math.min(...vals) * 100) / 100 : null,
    sharpeRatio: sharpeRatio(vals),
    stdPct: sampleStd(vals) != null ? Math.round(sampleStd(vals)! * 100) / 100 : null,
  };
}

function improvementVsBaseline(
  filtered: ReturnType<typeof horizonStats>,
  baseline: ReturnType<typeof horizonStats>,
) {
  const bAvg = baseline.avgPct;
  const fAvg = filtered.avgPct;
  const bMed = baseline.medianPct;
  const fMed = filtered.medianPct;
  const bWin = baseline.winRatePct;
  const fWin = filtered.winRatePct;
  const bSharpe = baseline.sharpeRatio;
  const fSharpe = filtered.sharpeRatio;

  const rel = (f: number | null, b: number | null) => {
    if (f == null || b == null) return null;
    if (b === 0) return f === 0 ? 0 : null;
    return Math.round(((f - b) / Math.abs(b)) * 1000) / 10;
  };

  return {
    avgPctDelta: fAvg != null && bAvg != null ? Math.round((fAvg - bAvg) * 100) / 100 : null,
    avgPctImprovementPct: rel(fAvg, bAvg),
    medianPctDelta: fMed != null && bMed != null ? Math.round((fMed - bMed) * 100) / 100 : null,
    medianPctImprovementPct: rel(fMed, bMed),
    winRatePctDelta: fWin != null && bWin != null ? Math.round((fWin - bWin) * 10) / 10 : null,
    sharpeDelta: fSharpe != null && bSharpe != null ? Math.round((fSharpe - bSharpe) * 1000) / 1000 : null,
  };
}

function loadBuyRows(): BuyRow[] {
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

  return obs
    .filter((o) => o.openAiAction === 'buy')
    .map((o) => ({
      date: o.date,
      symbol: o.symbol,
      volumeSurgeRatio: volMap.get(`${o.date}|${o.symbol}`) ?? null,
      return5d: o.return5d,
      return10d: o.return10d,
      return20d: o.return20d,
    }));
}

function scoreBalance(cohort: {
  id: string;
  countTotal: number;
  horizons: Record<string, ReturnType<typeof horizonStats>>;
}) {
  const h10 = cohort.horizons.return10d;
  const avg = h10?.avgPct ?? 0;
  const n = cohort.countTotal;
  const sharpe = h10?.sharpeRatio ?? 0;
  const composite = avg * Math.sqrt(Math.max(n, 1)) + (sharpe ?? 0) * 0.5;
  return { compositeScore: Math.round(composite * 100) / 100, avg10d: avg, n, sharpe10d: sharpe };
}

describe('buy volume filter performance', () => {
  it('writes volume filter comparison JSON', () => {
    const allBuys = loadBuyRows();
    const withVol = allBuys.filter((r) => r.volumeSurgeRatio != null);
    const excludedVolGte12 = withVol.filter((r) => r.volumeSurgeRatio! >= 1.2);

    const cohortResults = COHORTS.map((c) => {
      const rows = c.id === 'all_buy' ? allBuys : withVol.filter(c.match);
      const horizons = Object.fromEntries(HORIZONS.map((h) => [h.key, horizonStats(rows, h.key)]));
      return {
        cohortId: c.id,
        labelJa: c.labelJa,
        countTotal: rows.length,
        countExcludedFromAllBuy: c.id === 'all_buy' ? 0 : allBuys.length - rows.length,
        countMissingVolumeExcluded: c.id === 'all_buy' ? allBuys.length - withVol.length : null,
        volumeSurgeRatioRange:
          rows.length > 0
            ? {
                min: Math.round(Math.min(...rows.map((r) => r.volumeSurgeRatio!)) * 100) / 100,
                max: Math.round(Math.max(...rows.map((r) => r.volumeSurgeRatio!)) * 100) / 100,
              }
            : null,
        horizons,
        samples: rows.map((r) => ({
          date: r.date,
          symbol: r.symbol,
          volumeSurgeRatio: r.volumeSurgeRatio,
          return5d: r.return5d,
          return10d: r.return10d,
          return20d: r.return20d,
        })),
      };
    });

    const baseline = cohortResults.find((c) => c.cohortId === 'all_buy')!;
    const withImprovement = cohortResults.map((c) => ({
      ...c,
      improvementVsAllBuy:
        c.cohortId === 'all_buy'
          ? null
          : Object.fromEntries(
              HORIZONS.map((h) => [
                h.key,
                improvementVsBaseline(c.horizons[h.key]!, baseline.horizons[h.key]!),
              ]),
            ),
    }));

    const balanceScores = withImprovement
      .filter((c) => c.cohortId !== 'all_buy')
      .map((c) => ({
        cohortId: c.cohortId,
        labelJa: c.labelJa,
        ...scoreBalance(c),
      }));

    const recommended = (() => {
      const candidates = balanceScores.filter((c) => c.cohortId !== 'all_buy');
      const sorted = [...candidates].sort((a, b) => b.compositeScore - a.compositeScore);
      const best = sorted[0]!;
      return {
        recommendedCohortId: best.cohortId,
        recommendedLabelJa: best.labelJa,
        rationaleJa: [
          '①は304観測のbuy全24件。②③④は出来高判明かつ閾値未満の部分集合（出来高不明9件は②③④から除外）。',
          '改善率は①24件ベースの10d/5d/20d指標との比較。',
          '10営業日平均・Sharpe・件数のバランスで compositeScore = avg10d×√n + sharpe×0.5 を参考指標に使用。',
          `推奨: ${best.labelJa} — 10d平均${best.avg10d}%・n=${best.n}・Sharpe(10d)=${best.sharpe10d ?? 'N/A'}`,
          '②は①から5件（出来高≥1.2）を除外しサンプル10件を維持。④は件数6件まで減るため期待値が高くても再現性は低い。',
        ],
      };
    })();

    const report = {
      methodologyJa: {
        scope: 'OpenAI buyのみ（304観測）',
        buyTotal304: allBuys.length,
        buyWithKnownVolume: withVol.length,
        buyMissingVolume: allBuys.length - withVol.length,
        volumeSource: 'openai-304-regression-dataset.json',
        returnDefinition: 'シグナル翌営業日終値エントリー→N営業日後終値',
        sharpeDefinition: '取引単位: mean(return)/std(return), 標本標準偏差, n≥2',
        improvementVsBaseline: '① buy全体（24件）との差分・相対改善率(%)',
        excludedVolGte12: excludedVolGte12.map((r) => ({
          date: r.date,
          symbol: r.symbol,
          volumeSurgeRatio: r.volumeSurgeRatio,
          return5d: r.return5d,
          return10d: r.return10d,
          return20d: r.return20d,
        })),
      },
      allBuy304Summary: {
        count: allBuys.length,
        horizons: Object.fromEntries(HORIZONS.map((h) => [h.key, horizonStats(allBuys, h.key)])),
      },
      cohorts: withImprovement,
      balanceScores,
      recommendation: recommended,
      insightJa: [
        `出来高≥1.2で除外されるbuy: ${excludedVolGte12.length}件（すべて5月中旬クラスター）`,
        baseline.horizons.return10d?.avgPct != null
          ? `①全体10d平均: ${baseline.horizons.return10d.avgPct}% (n=${baseline.horizons.return10d.countWithReturn})`
          : null,
      ].filter(Boolean),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-volume-filter-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY VOLUME FILTER ===\n', JSON.stringify(report, null, 2));
  });
});
