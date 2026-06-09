/**
 * buy + 出来高<1.2 固定 — RSI帯別リターン比較・ランキング
 * npx vitest run tests/unit/openAiBuyVol12RsiBandAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type BuyRow = {
  date: string;
  symbol: string;
  rsi14: number;
  volumeSurgeRatio: number;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

type HorizonKey = 'return5d' | 'return10d' | 'return20d';

const VOL_MAX = 1.2;

const RSI_BANDS = [
  { id: '50_55', labelJa: 'RSI50-55', match: (r: number) => r >= 50 && r < 55 },
  { id: '55_60', labelJa: 'RSI55-60', match: (r: number) => r >= 55 && r < 60 },
  { id: '60_65', labelJa: 'RSI60-65', match: (r: number) => r >= 60 && r < 65 },
  { id: '65_70', labelJa: 'RSI65-70', match: (r: number) => r >= 65 && r < 70 },
] as const;

const HORIZONS: { key: HorizonKey; labelJa: string }[] = [
  { key: 'return5d', labelJa: '5営業日' },
  { key: 'return10d', labelJa: '10営業日' },
  { key: 'return20d', labelJa: '20営業日' },
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
    sharpeRatio: sharpeRatio(vals),
    maxProfitPct: vals.length ? Math.round(Math.max(...vals) * 100) / 100 : null,
    maxLossPct: vals.length ? Math.round(Math.min(...vals) * 100) / 100 : null,
  };
}

function cohortBlock(rows: BuyRow[]) {
  return {
    countTotal: rows.length,
    horizons: Object.fromEntries(HORIZONS.map((h) => [h.key, horizonStats(rows, h.key)])),
    samples: rows.map((r) => ({
      date: r.date,
      symbol: r.symbol,
      rsi14: Math.round(r.rsi14 * 100) / 100,
      volumeSurgeRatio: r.volumeSurgeRatio,
      return5d: r.return5d,
      return10d: r.return10d,
      return20d: r.return20d,
    })),
  };
}

function loadVol12Buys(): BuyRow[] {
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

  const rows: BuyRow[] = [];
  for (const o of obs) {
    if (o.openAiAction !== 'buy') continue;
    const vol = volMap.get(`${o.date}|${o.symbol}`);
    if (vol == null || vol >= VOL_MAX) continue;
    rows.push({
      date: o.date,
      symbol: o.symbol,
      rsi14: o.rsi14,
      volumeSurgeRatio: vol,
      return5d: o.return5d,
      return10d: o.return10d,
      return20d: o.return20d,
    });
  }
  return rows;
}

describe('buy vol<1.2 RSI band analysis', () => {
  it('writes RSI band comparison and ranking JSON', () => {
    const vol12 = loadVol12Buys();
    const outsideRsi50_70 = vol12.filter((r) => !RSI_BANDS.some((b) => b.match(r.rsi14)));

    const rsiBandComparison = RSI_BANDS.map((b) => ({
      rsiBandId: b.id,
      rsiBandLabel: b.labelJa,
      conditionLabel: `出来高<${VOL_MAX} × ${b.labelJa}`,
      ...cohortBlock(vol12.filter((r) => b.match(r.rsi14))),
    }));

    const minRankN = 3;
    const ranked = rsiBandComparison
      .filter((c) => c.countTotal >= minRankN)
      .map((c) => ({
        conditionLabel: c.conditionLabel,
        rsiBandId: c.rsiBandId,
        rsiBandLabel: c.rsiBandLabel,
        count: c.countTotal,
        avgReturn10d: c.horizons.return10d.avgPct,
        medianReturn10d: c.horizons.return10d.medianPct,
        winRate10dPct: c.horizons.return10d.winRatePct,
        sharpe10d: c.horizons.return10d.sharpeRatio,
        avgReturn5d: c.horizons.return5d.avgPct,
        avgReturn20d: c.horizons.return20d.avgPct,
      }))
      .filter((c) => c.avgReturn10d != null)
      .sort((a, b) => (b.avgReturn10d as number) - (a.avgReturn10d as number))
      .map((c, i) => ({ rank: i + 1, ...c }));

    const top20 = ranked.slice(0, 20);
    const excludedFromRanking = rsiBandComparison
      .filter((c) => c.countTotal > 0 && c.countTotal < minRankN)
      .map((c) => ({
        rsiBandLabel: c.rsiBandLabel,
        count: c.countTotal,
        reasonJa: `n=${c.countTotal}はランキング除外（n>=${minRankN}未満）`,
        avgReturn10d: c.horizons.return10d.avgPct,
      }));

    const rankedCandidates = [...ranked];
    const best =
      rankedCandidates[0] ??
      rsiBandComparison
        .filter((c) => c.countTotal > 0)
        .sort(
          (a, b) =>
            (b.horizons.return10d.avgPct ?? -999) - (a.horizons.return10d.avgPct ?? -999),
        )[0];

    const report = {
      methodologyJa: {
        scope: 'OpenAI buyのみ、出来高倍率<1.2固定',
        vol12BuyCount: vol12.length,
        rsiBands: RSI_BANDS.map((b) => b.labelJa),
        rankingRule: `出来高<${VOL_MAX}かつRSI帯、10営業日平均で降順、n>=${minRankN}のみ`,
        sharpeDefinition: '取引単位 mean/std, n≥2',
        returnDefinition: '翌営業日終値エントリー→N営業日後',
      },
      vol12Baseline: {
        labelJa: `出来高<${VOL_MAX}（RSI帯横断）`,
        ...cohortBlock(vol12),
      },
      rsiBandComparison,
      outsideRsi50_70: {
        count: outsideRsi50_70.length,
        samples: outsideRsi50_70.map((r) => ({
          date: r.date,
          symbol: r.symbol,
          rsi14: r.rsi14,
          volumeSurgeRatio: r.volumeSurgeRatio,
        })),
      },
      top20ExpectationRanking: top20,
      excludedFromRankingLowN: excludedFromRanking,
      operationalRuleRecommendation: {
        pipelineJa: ['OpenAI buy', '出来高倍率フィルター', 'RSIフィルター'],
        volumeFilter: {
          rule: `出来高倍率 < ${VOL_MAX}`,
          rationaleJa:
            '前分析: buy全体10d平均-0.07%→vol<1.2で+1.50%、出来高≥1.2の5件は10dすべてマイナス',
        },
        rsiFilter: best
          ? {
              rule:
                rankedCandidates.length > 0 && rankedCandidates[0]!.count >= minRankN
                  ? `${best.rsiBandLabel} のみ執行（${best.conditionLabel}）`
                  : `参考: ${best.rsiBandLabel} が10d平均最大（n=${best.count ?? (best as { countTotal?: number }).countTotal}、ランキングはn>=${minRankN}未達のため要追加検証）`,
              recommendedRsiBandId: best.rsiBandId,
              recommendedRsiBandLabel: best.rsiBandLabel,
              optionalExcludeJa:
                rankedCandidates.length === 0
                  ? '現データではいずれのRSI帯もn>=3未満。RSI単独フィルターは保留し、出来高<1.2のみを実運用第一層とする'
                  : null,
              rationaleJa: [
                `10d期待値1位（n>=${minRankN}）: ${top20[0]?.conditionLabel ?? '該当なし'} 平均${top20[0]?.avgReturn10d ?? 'N/A'}%`,
                'RSI65-70は件数1・10dマイナス寄りのため除外候補',
                'RSI55-60は件数最多だが5/14の-5%が平均を押し下げ',
              ],
            }
          : null,
        consolidatedRuleJa: [
          '1. OpenAIが buy',
          `2. 出来高倍率 < ${VOL_MAX}（必須・不明時は見送り）`,
          rankedCandidates.length > 0
            ? `3. RSI14 ∈ [${top20[0]!.rsiBandLabel.replace('RSI', '').replace('-', ',')}) 相当帯のみ（n>=${minRankN}で検証済み）`
            : '3. RSI帯フィルターはサンプル不足のため当面見送り、②のみ適用',
        ],
      },
      insightJa: [
        `vol<1.2 buy: ${vol12.length}件（すべて1023）`,
        top20.length === 0
          ? `n>=${minRankN}のRSI帯は0件 — TOP20は空`
          : `TOP20は${top20.length}件（最大4帯のため）`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-vol12-rsi-band-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== VOL<1.2 RSI BANDS ===\n', JSON.stringify(report, null, 2));
  });
});
