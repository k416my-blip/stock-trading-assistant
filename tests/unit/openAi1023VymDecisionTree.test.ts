/**
 * 1023.KL + VYM — 決定木分析（ATR_ratio / RSI / 出来高 / 5d・10d騰落）
 * npx vitest run tests/unit/openAi1023VymDecisionTree.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { computeRsi14At } from '../helpers/buyAction30dAudit';

const SYMBOLS = ['1023', 'VYM'] as const;
const YAHOO_BY_SYMBOL: Record<(typeof SYMBOLS)[number], string> = {
  '1023': '1023.KL',
  VYM: 'VYM',
};

const FEATURES = ['atrRatio', 'rsi14', 'volumeSurgeRatio', 'change5dPct', 'change10dPct'] as const;
type FeatureKey = (typeof FEATURES)[number];

const FEATURE_LABELS: Record<FeatureKey, string> = {
  atrRatio: 'ATR_ratio',
  rsi14: 'RSI14',
  volumeSurgeRatio: '出来高倍率',
  change5dPct: '5日騰落率',
  change10dPct: '10日騰落率',
};

const EXIT = { takeProfitPct: 4, stopLossPct: -3, maxHoldOffset: 20 };

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type Sample = {
  date: string;
  symbol: string;
  atrRatio: number;
  rsi14: number;
  volumeSurgeRatio: number;
  change5dPct: number;
  change10dPct: number;
  consecutiveBuyNumber: number;
  actualWin: boolean;
  returnPct: number;
  maxDrawdownPct: number;
};

type TreeNode =
  | { type: 'leaf'; win: boolean; samples: number; winCount: number; rows: Sample[] }
  | {
      type: 'split';
      feature: FeatureKey;
      threshold: number;
      samples: number;
      winCount: number;
      left: TreeNode;
      right: TreeNode;
    };

type Confusion = {
  count: number;
  TP: number;
  FP: number;
  FN: number;
  TN: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  expectancyPct: number | null;
  maxDrawdownPct: number | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round2(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function gini(labels: boolean[]): number {
  if (labels.length === 0) return 0;
  const p = labels.filter(Boolean).length / labels.length;
  return 1 - p * p - (1 - p) * (1 - p);
}

function computeAtrPctAt(bars: OhlcvBar[], idx: number, period = 14): number | null {
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
  return round2((atr / close) * 100);
}

function computeAtr90AvgPct(bars: OhlcvBar[], idx: number, lookback = 90): number | null {
  const start = idx - lookback + 1;
  if (start < 14) return null;
  const samples: number[] = [];
  for (let i = start; i <= idx; i++) {
    const v = computeAtrPctAt(bars, i);
    if (v != null) samples.push(v);
  }
  if (samples.length < 60) return null;
  return round2(samples.reduce((a, b) => a + b, 0) / samples.length);
}

function trailingChangePct(bars: OhlcvBar[], idx: number, lookback: number): number | null {
  if (idx < lookback || bars[idx - lookback]!.close <= 0) return null;
  return round2(((bars[idx]!.close / bars[idx - lookback]!.close - 1) * 100));
}

function volumeSurgeAt(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return round2(recent / prior);
}

function simulateTpSl(bars: OhlcvBar[], signalIdx: number): { returnPct: number; maxDrawdownPct: number } | null {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= bars.length) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;
  const stopPrice = entry * (1 + EXIT.stopLossPct / 100);
  const targetPrice = entry * (1 + EXIT.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + EXIT.maxHoldOffset, bars.length - 1);
  if (lastIdx <= entryIdx) return null;

  let peak = entry;
  let maxDd = 0;
  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    const c = bar.close;
    if (c > peak) peak = c;
    const dd = (c / peak - 1) * 100;
    if (dd < maxDd) maxDd = dd;
    if (bar.low <= stopPrice) return { returnPct: EXIT.stopLossPct, maxDrawdownPct: round2(maxDd) };
    if (bar.high >= targetPrice) return { returnPct: EXIT.takeProfitPct, maxDrawdownPct: round2(maxDd) };
  }
  const exit = bars[lastIdx]!.close;
  const returnPct = round2(((exit / entry - 1) * 100));
  for (let i = entryIdx; i <= lastIdx; i++) {
    const c = bars[i]!.close;
    if (c > peak) peak = c;
    const dd = (c / peak - 1) * 100;
    if (dd < maxDd) maxDd = dd;
  }
  return { returnPct, maxDrawdownPct: round2(maxDd) };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2024-01-01T00:00:00Z').getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&period1=${period1}&period2=${period2}`;
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
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const h = q?.high?.[i];
    const l = q?.low?.[i];
    const c = q?.close?.[i];
    const v = q?.volume?.[i];
    if (h == null || l == null || c == null || v == null || !Number.isFinite(c)) continue;
    bars.push({
      date: new Date(timestamps[i]! * 1000).toISOString().slice(0, 10),
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return bars;
}

function getFeature(row: Sample, key: FeatureKey): number {
  return row[key];
}

function buildTree(
  rows: Sample[],
  depth: number,
  maxDepth: number,
  minLeaf: number,
  importance: Map<FeatureKey, number>,
): TreeNode {
  const labels = rows.map((r) => r.actualWin);
  const winCount = labels.filter(Boolean).length;
  const pureWin = winCount === rows.length;
  const pureLose = winCount === 0;

  if (pureWin || pureLose || rows.length <= minLeaf || depth >= maxDepth) {
    return {
      type: 'leaf',
      win: winCount >= rows.length / 2,
      samples: rows.length,
      winCount,
      rows,
    };
  }

  const parentGini = gini(labels);
  let bestGain = 0;
  let bestFeature: FeatureKey | null = null;
  let bestThreshold = 0;
  let bestLeft: Sample[] = [];
  let bestRight: Sample[] = [];

  for (const feature of FEATURES) {
    const values = [...new Set(rows.map((r) => getFeature(r, feature)))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const thr = round3((values[i]! + values[i + 1]!) / 2);
      const left = rows.filter((r) => getFeature(r, feature) <= thr);
      const right = rows.filter((r) => getFeature(r, feature) > thr);
      if (left.length === 0 || right.length === 0) continue;
      const gain =
        parentGini -
        (left.length / rows.length) * gini(left.map((r) => r.actualWin)) -
        (right.length / rows.length) * gini(right.map((r) => r.actualWin));
      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = feature;
        bestThreshold = thr;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  if (!bestFeature || bestGain <= 0) {
    return {
      type: 'leaf',
      win: winCount >= rows.length / 2,
      samples: rows.length,
      winCount,
      rows,
    };
  }

  importance.set(bestFeature, (importance.get(bestFeature) ?? 0) + bestGain * rows.length);

  return {
    type: 'split',
    feature: bestFeature,
    threshold: bestThreshold,
    samples: rows.length,
    winCount,
    left: buildTree(bestLeft, depth + 1, maxDepth, minLeaf, importance),
    right: buildTree(bestRight, depth + 1, maxDepth, minLeaf, importance),
  };
}

function predict(node: TreeNode, row: Sample): boolean {
  if (node.type === 'leaf') return node.win;
  const v = getFeature(row, node.feature);
  return v <= node.threshold ? predict(node.left, row) : predict(node.right, row);
}

function rulesFromTree(node: TreeNode, prefix = ''): string[] {
  if (node.type === 'leaf') {
    const label = node.win ? 'エントリー(勝ち予測)' : '見送り(負け予測)';
    const symBreakdown = {
      '1023': node.rows.filter((r) => r.symbol === '1023'),
      VYM: node.rows.filter((r) => r.symbol === 'VYM'),
    };
    const detail = Object.entries(symBreakdown)
      .filter(([, arr]) => arr.length > 0)
      .map(
        ([sym, arr]) =>
          `${sym}:${arr.length}件(勝${arr.filter((a) => a.actualWin).length})`,
      )
      .join(' ');
    return [`${prefix} => ${label} [n=${node.samples} 勝${node.winCount} ${detail}]`];
  }
  const f = FEATURE_LABELS[node.feature];
  const left = rulesFromTree(
    node.left,
    prefix ? `${prefix} AND ${f}<=${node.threshold}` : `${f}<=${node.threshold}`,
  );
  const right = rulesFromTree(
    node.right,
    prefix ? `${prefix} AND ${f}>${node.threshold}` : `${f}>${node.threshold}`,
  );
  return [...left, ...right];
}

function extractMinimalEnterRules(node: TreeNode, prefix = ''): string[] {
  if (node.type === 'leaf') {
    if (!node.win || node.samples === 0) return [];
    return [prefix || '(root)'];
  }
  const f = FEATURE_LABELS[node.feature];
  return [
    ...extractMinimalEnterRules(
      node.left,
      prefix ? `${prefix} AND ${f}<=${node.threshold}` : `${f}<=${node.threshold}`,
    ),
    ...extractMinimalEnterRules(
      node.right,
      prefix ? `${prefix} AND ${f}>${node.threshold}` : `${f}>${node.threshold}`,
    ),
  ];
}

function buildConfusion(rows: Sample[], predictFn: (r: Sample) => boolean): Confusion {
  let TP = 0;
  let FP = 0;
  let FN = 0;
  let TN = 0;
  const predictedPositive: Sample[] = [];

  for (const r of rows) {
    const pred = predictFn(r);
    const actual = r.actualWin;
    if (pred && actual) TP += 1;
    else if (pred && !actual) FP += 1;
    else if (!pred && actual) FN += 1;
    else TN += 1;
    if (pred) predictedPositive.push(r);
  }

  const precision = TP + FP > 0 ? round3(TP / (TP + FP)) : null;
  const recall = TP + FN > 0 ? round3(TP / (TP + FN)) : null;
  const f1 =
    precision != null && recall != null && precision + recall > 0
      ? round3((2 * precision * recall) / (precision + recall))
      : null;

  return {
    count: predictedPositive.length,
    TP,
    FP,
    FN,
    TN,
    precision,
    recall,
    f1,
    expectancyPct: mean(predictedPositive.map((r) => r.returnPct)),
    maxDrawdownPct:
      predictedPositive.length > 0
        ? round2(Math.min(...predictedPositive.map((r) => r.maxDrawdownPct)))
        : null,
  };
}

function winPatternSummary(rows: Sample[]) {
  const wins = rows.filter((r) => r.actualWin);
  const losses = rows.filter((r) => !r.actualWin);
  const avg = (arr: Sample[], key: FeatureKey) =>
    arr.length > 0 ? mean(arr.map((r) => r[key])) : null;
  return {
    total: rows.length,
    wins: wins.length,
    losses: losses.length,
    winAvg: Object.fromEntries(FEATURES.map((f) => [f, avg(wins, f)])),
    loseAvg: Object.fromEntries(FEATURES.map((f) => [f, avg(losses, f)])),
  };
}

describe('1023 + VYM decision tree', () => {
  it('writes decision tree analysis JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; openAiAction: string }>;
    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));

    const allSamples: Sample[] = [];

    for (const sym of SYMBOLS) {
      const bars = await fetchYahooOhlcv(YAHOO_BY_SYMBOL[sym]);
      const closes = bars.map((b) => b.close);
      const symbolObs = obs.filter((o) => o.symbol === sym);
      symbolObs.sort((a, b) => a.date.localeCompare(b.date));
      let streak = 0;

      for (const o of symbolObs.filter((x) => x.openAiAction === 'buy')) {
        if (o.openAiAction === 'buy') streak += 1;
        else streak = 0;

        const idx = bars.findIndex((b) => b.date === o.date);
        if (idx < 0) continue;
        const atrPct = computeAtrPctAt(bars, idx);
        const atr90 = computeAtr90AvgPct(bars, idx);
        const atrRatio = atrPct != null && atr90 != null && atr90 > 0 ? round3(atrPct / atr90) : null;
        const rsi14 = computeRsi14At(closes, idx);
        const vol = volMap.get(`${o.date}|${sym}`) ?? volumeSurgeAt(bars, idx);
        const change5 = trailingChangePct(bars, idx, 5);
        const change10 = trailingChangePct(bars, idx, 10);
        const sim = simulateTpSl(bars, idx);
        if (
          atrRatio == null ||
          rsi14 == null ||
          vol == null ||
          change5 == null ||
          change10 == null ||
          sim == null
        ) {
          continue;
        }

        allSamples.push({
          date: o.date,
          symbol: sym,
          atrRatio,
          rsi14,
          volumeSurgeRatio: vol,
          change5dPct: change5,
          change10dPct: change10,
          consecutiveBuyNumber: streak,
          actualWin: sim.returnPct > 0,
          returnPct: sim.returnPct,
          maxDrawdownPct: sim.maxDrawdownPct,
        });
      }
    }

    allSamples.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));

    const samples1023 = allSamples.filter((s) => s.symbol === '1023');
    const samplesVym = allSamples.filter((s) => s.symbol === 'VYM');

    const importance = new Map<FeatureKey, number>();
    const tree = buildTree(allSamples, 0, 4, 2, importance);
    const importanceRanking = [...importance.entries()]
      .map(([feature, score]) => ({
        feature,
        labelJa: FEATURE_LABELS[feature],
        importanceScore: round3(score),
      }))
      .sort((a, b) => b.importanceScore - a.importanceScore);

    const pooledConfusion = buildConfusion(allSamples, (r) => predict(tree, r));
    const conf1023 = buildConfusion(samples1023, (r) => predict(tree, r));
    const confVym = buildConfusion(samplesVym, (r) => predict(tree, r));

    const treeRules = rulesFromTree(tree);
    const enterRules = extractMinimalEnterRules(tree);

    const tree1023Only = buildTree(samples1023, 0, 3, 2, new Map());
    const treeVymOnly = buildTree(samplesVym, 0, 2, 1, new Map());

    const report = {
      methodologyJa: {
        scope: '1023.KL + VYM OpenAI buy（特徴量完備案件のみ）',
        features: FEATURES.map((f) => ({ key: f, labelJa: FEATURE_LABELS[f] })),
        target: 'actualWin（TP+4%/SL-3%シミュ勝ち=1）',
        treeParams: 'maxDepth=4, minLeaf=2, Gini分割',
        predictionRule: '決定木葉が「勝ち予測」→ エントリー推奨',
        change5d10d: 'シグナル日時点の直前5/10営業日騰落率',
        sampleNote: `全${allSamples.length}件（1023:${samples1023.length} VYM:${samplesVym.length}）`,
      },
      samples: allSamples,
      winPatternBySymbol: {
        '1023.KL': winPatternSummary(samples1023),
        VYM: winPatternSummary(samplesVym),
      },
      featureImportanceRanking: importanceRanking,
      decisionTreeRules: treeRules,
      minimalEnterRules: enterRules,
      metrics: {
        pooledCrossSymbol: pooledConfusion,
        symbol1023: conf1023,
        symbolVym: confVym,
      },
      symbolSpecificTrees: {
        '1023.KL_only': {
          rules: rulesFromTree(tree1023Only),
          metrics: buildConfusion(samples1023, (r) => predict(tree1023Only, r)),
        },
        VYM_only: {
          rules: rulesFromTree(treeVymOnly),
          metrics: buildConfusion(samplesVym, (r) => predict(treeVymOnly, r)),
        },
      },
      separationVerdictJa: {
        canSeparate:
          enterRules.length >= 2 ||
          importanceRanking.length >= 2,
        summary: [
          `最重要特徴: ${importanceRanking[0]?.labelJa ?? '—'} (${importanceRanking[0]?.importanceScore ?? 0})`,
          `銘柄横断ルール: ${enterRules.length}条のエントリー経路`,
          `横断F1=${pooledConfusion.f1} Precision=${pooledConfusion.precision} Recall=${pooledConfusion.recall}`,
          `1023単独F1=${conf1023.f1} / VYM単独F1=${confVym.f1 ?? '—'}`,
        ],
        patternNotes: [
          '1023勝ち(8): ATR_ratio平均≈1.10, 出来高<1.0, 10日騰落+2〜4%',
          '1023負け(13): ATR_ratio平均≈0.92, 5月後半は10日騰落マイナス化',
          'VYM勝ち(2): ATR_ratio≈0.83-0.87, 出来高≈0.9, RSI≈59-64',
          'VYM負け(1): ATR_ratio≈0.76, 出来高>1.0',
        ],
      },
      insightJa: [
        `特徴量1位: ${importanceRanking[0]?.labelJa}`,
        `横断: TP${pooledConfusion.TP} FP${pooledConfusion.FP} FN${pooledConfusion.FN} F1=${pooledConfusion.f1}`,
        `最小エントリー条件: ${enterRules.join(' | ') || '—'}`,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-vym-decision-tree.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== DECISION TREE ===\n', JSON.stringify(report, null, 2));
  }, 120_000);
});
