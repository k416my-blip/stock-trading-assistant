/**
 * buy vs reduce 二値検証 — 上昇発見型 vs 下落回避型
 * npx vitest run tests/unit/openAiBuyVsReduceBinaryAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = {
  date: string;
  symbol: string;
  rsi14: number;
  openAiAction: AiSecondEvaluatorAction;
  return5d: number | null;
  return10d: number | null;
};

type FeatureRow = {
  date: string;
  symbol: string;
  pctFrom20dHigh: number;
  dayChangePct: number;
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

function winRatePct(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.filter((v) => v > 0).length / vals.length) * 1000) / 10;
}

function returnStats(rows: Obs[], field: 'return5d' | 'return10d') {
  const rets = rows.map((r) => r[field]).filter((v): v is number => v != null);
  return {
    observationCount: rows.length,
    countWithReturn: rets.length,
    avg: mean(rets),
    median: median(rets),
    winRatePct: winRatePct(rets),
  };
}

function mannWhitneyU(a: number[], b: number[]): {
  u: number;
  z: number;
  pTwoSided: number;
  nA: number;
  nB: number;
} | null {
  if (a.length === 0 || b.length === 0) return null;
  const ranked = [...a.map((v) => ({ v, g: 1 })), ...b.map((v) => ({ v, g: 2 }))].sort((x, y) => x.v - y.v);
  const ranks: number[] = [];
  for (let i = 0; i < ranked.length; ) {
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1]!.v === ranked[i]!.v) j += 1;
    const avgRank = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
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
  return { u: Math.round(u), z: Math.round(z * 1000) / 1000, pTwoSided: Math.round(p * 10000) / 10000, nA: n1, nB: n2 };
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

/** score: buy=1, reduce=0 · label: return10d>0 */
function rocAucBuyVsReduce(rows: Array<{ score: number; positive: boolean }>): number | null {
  const pos = rows.filter((r) => r.positive);
  const neg = rows.filter((r) => !r.positive);
  if (pos.length === 0 || neg.length === 0) return null;
  let concordant = 0;
  let total = 0;
  for (const p of pos) {
    for (const n of neg) {
      total += 1;
      if (p.score > n.score) concordant += 1;
      else if (p.score === n.score) concordant += 0.5;
    }
  }
  return Math.round((concordant / total) * 10000) / 10000;
}

describe('OpenAI buy vs reduce binary validation', () => {
  it('writes buy-reduce binary analysis JSON', () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Obs[];

    const featMap = new Map<string, FeatureRow>();
    const regPath = path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json');
    if (fs.existsSync(regPath)) {
      const reg = JSON.parse(fs.readFileSync(regPath, 'utf8')) as Array<{
        date: string;
        symbol: string;
        pctFrom20dHigh: number;
        dayChangePct: number;
      }>;
      for (const r of reg) featMap.set(`${r.date}|${r.symbol}`, r);
    }

    const binary = obs.filter((r) => r.openAiAction === 'buy' || r.openAiAction === 'reduce');
    const buy = binary.filter((r) => r.openAiAction === 'buy');
    const reduce = binary.filter((r) => r.openAiAction === 'reduce');

    const buy5 = returnStats(buy, 'return5d');
    const reduce5 = returnStats(reduce, 'return5d');
    const buy10 = returnStats(buy, 'return10d');
    const reduce10 = returnStats(reduce, 'return10d');

    const buy10rets = buy.map((r) => r.return10d).filter((v): v is number => v != null);
    const reduce10rets = reduce.map((r) => r.return10d).filter((v): v is number => v != null);
    const mw10 = mannWhitneyU(buy10rets, reduce10rets);
    const buy5rets = buy.map((r) => r.return5d).filter((v): v is number => v != null);
    const reduce5rets = reduce.map((r) => r.return5d).filter((v): v is number => v != null);
    const mw5 = mannWhitneyU(buy5rets, reduce5rets);

    const rocRows = binary
      .filter((r) => r.return10d != null)
      .map((r) => ({
        score: r.openAiAction === 'buy' ? 1 : 0,
        positive: (r.return10d as number) > 0,
        action: r.openAiAction,
        return10d: r.return10d,
      }));
    const auc = rocAucBuyVsReduce(rocRows);
    const buyPositiveRate =
      rocRows.filter((r) => r.score === 1 && r.positive).length /
      Math.max(1, rocRows.filter((r) => r.score === 1).length);
    const reducePositiveRate =
      rocRows.filter((r) => r.score === 0 && r.positive).length /
      Math.max(1, rocRows.filter((r) => r.score === 0).length);

    const enrich = (rows: Obs[]) =>
      rows
        .map((r) => {
          const f = featMap.get(`${r.date}|${r.symbol}`);
          if (!f) return null;
          return { ...r, pctFrom20dHigh: f.pctFrom20dHigh, dayChangePct: f.dayChangePct };
        })
        .filter((x): x is Obs & { pctFrom20dHigh: number; dayChangePct: number } => x != null);

    const buyF = enrich(buy);
    const reduceF = enrich(reduce);

    const featureCompare = {
      buy: {
        n: buyF.length,
        rsi14Mean: mean(buyF.map((r) => r.rsi14)),
        pctFrom20dHighMean: mean(buyF.map((r) => r.pctFrom20dHigh)),
        dayChangePctMean: mean(buyF.map((r) => r.dayChangePct)),
      },
      reduce: {
        n: reduceF.length,
        rsi14Mean: mean(reduceF.map((r) => r.rsi14)),
        pctFrom20dHighMean: mean(reduceF.map((r) => r.pctFrom20dHigh)),
        dayChangePctMean: mean(reduceF.map((r) => r.dayChangePct)),
      },
      deltaBuyMinusReduce: {} as Record<string, number | null>,
    };
    featureCompare.deltaBuyMinusReduce = {
      rsi14:
        featureCompare.buy.rsi14Mean != null && featureCompare.reduce.rsi14Mean != null
          ? Math.round((featureCompare.buy.rsi14Mean - featureCompare.reduce.rsi14Mean) * 100) / 100
          : null,
      pctFrom20dHigh:
        featureCompare.buy.pctFrom20dHighMean != null && featureCompare.reduce.pctFrom20dHighMean != null
          ? Math.round(
              (featureCompare.buy.pctFrom20dHighMean - featureCompare.reduce.pctFrom20dHighMean) * 100,
            ) / 100
          : null,
      dayChangePct:
        featureCompare.buy.dayChangePctMean != null && featureCompare.reduce.dayChangePctMean != null
          ? Math.round((featureCompare.buy.dayChangePctMean - featureCompare.reduce.dayChangePctMean) * 100) /
            100
          : null,
    };

    const report = {
      methodologyJa: {
        cohort: '304観測のうち OpenAI action が buy または reduce のみ',
        returns: '翌営業日エントリー→5/10営業日後（観測JSON）',
        roc: '目的変数=10d>0、スコア=buy→1・reduce→0（上昇予測にbuyが高スコア）',
        mannWhitney: 'buy群 vs reduce群のリターン分布（両側正規近似）',
      },
      counts: { buy: buy.length, reduce: reduce.length, binaryTotal: binary.length },
      section1_buyVsReduceReturns: {
        horizon5d: { buy: buy5, reduce: reduce5 },
        horizon10d: { buy: buy10, reduce: reduce10 },
      },
      section2_mannWhitney: {
        return5d: mw5,
        return10d: mw10,
        interpretationJa:
          mw10 != null && mw10.pTwoSided < 0.05
            ? mw10.z > 0
              ? '10d: buy群のリターンがreduce群より有意に高い（U検定）'
              : '10d: reduce群のリターンがbuy群より有意に高い（U検定）'
            : '10d: buyとreduceのリターン差は有意とは言えない',
      },
      section3_rocAuc: {
        n: rocRows.length,
        auc,
        buyLabeledPositiveRate: Math.round(buyPositiveRate * 1000) / 10,
        reduceLabeledPositiveRate: Math.round(reducePositiveRate * 1000) / 10,
        interpretationJa:
          auc == null
            ? 'AUC未計算'
            : auc > 0.5
              ? `AUC=${auc}>0.5 → buyラベルほど10dプラスになりやすい（上昇発見寄り）`
              : auc < 0.5
                ? `AUC=${auc}<0.5 → reduceラベルほど10dプラスになりやすい、またはbuyが悪い（下落回避・逆シグナル寄り）`
                : `AUC≈0.5 → actionは10d符号の判別に無力`,
      },
      section4_featureMeans: featureCompare,
      section5_conclusionJa: (() => {
        const lines: string[] = [];
        const buyAvg10 = buy10.avg;
        const redAvg10 = reduce10.avg;
        const buyWin10 = buy10.winRatePct;
        const redWin10 = reduce10.winRatePct;

        if (buyAvg10 != null && redAvg10 != null) {
          lines.push(`10d平均: buy ${buyAvg10}% vs reduce ${redAvg10}%`);
        }
        if (buyWin10 != null && redWin10 != null) {
          lines.push(`10d勝率: buy ${buyWin10}% vs reduce ${redWin10}%`);
        }
        if (auc != null) lines.push(`ROC-AUC(buy=1): ${auc}`);

        if (
          (redAvg10 ?? 0) > (buyAvg10 ?? 0) &&
          (redWin10 ?? 0) >= (buyWin10 ?? 0) &&
          (auc ?? 0.5) <= 0.5
        ) {
          lines.push(
            '判定: **下落回避型に近い** — reduceの方がリターン・勝率が良く、buyは上昇銘柄発見として機能していない',
          );
        } else if ((buyAvg10 ?? 0) > (redAvg10 ?? 0) && (auc ?? 0) > 0.55) {
          lines.push('判定: **上昇銘柄発見型に近い** — buyがreduceより10dリターン・AUCで優位');
        } else {
          lines.push(
            '判定: **どちらとも言い難い／混合型** — buy優位は弱く、reduce回避シグナルの方が一貫して強いわけでもない',
          );
        }

        if (featureCompare.deltaBuyMinusReduce.rsi14 != null) {
          lines.push(
            `特徴量: buyはreduceよりRSI ${featureCompare.deltaBuyMinusReduce.rsi14 > 0 ? '高い' : '低い'}（${featureCompare.deltaBuyMinusReduce.rsi14}pt）`,
          );
        }
        return lines;
      })(),
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-vs-reduce-binary.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY vs REDUCE BINARY ===\n', JSON.stringify(report, null, 2));
  });
});
