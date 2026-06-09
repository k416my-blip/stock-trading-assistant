/**
 * OpenAI buy/hold × confidence帯域・相関分析
 * npx vitest run tests/unit/openAiConfidenceReturnAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, it, vi } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import { bootstrapSecretsForAiEvalProbe } from '../helpers/aiEvalProbeBootstrap';
import { buildConciergeEvidenceForProactive } from '../../src/services/conciergeEvidenceBuilder';
import { buildEnrichedAiSecondEvaluatorInputs } from '../../src/services/aiSecondEvaluatorDataEnrichment';
import { loadAnalysisApiKeys } from '../../src/services/analysisApiKeys';
import {
  fetchAiSecondEvaluatorBatch,
  resetAiSecondEvaluatorCacheForTest,
} from '../../src/services/aiSecondEvaluatorService';
import * as aiEvalLog from '../../src/services/aiSecondEvaluatorLog';
import {
  loadHistoricalDayInputs,
  patchEnrichedInputsForDay,
} from '../helpers/openAi30dMeasurement';
import {
  fetchYahooDailyBars,
  toYahooSymbol,
  type DailyBar,
  type ProbeSymbol,
} from '../helpers/buyAction30dAudit';
import type { AiSecondEvaluatorAction } from '../../src/types/aiSecondEvaluator';

type Obs = {
  date: string;
  symbol: string;
  rsi14: number;
  openAiAction: AiSecondEvaluatorAction;
  confidence: number;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
};

const CONF_BUCKETS = [
  { id: '40_50', label: '40-50', match: (c: number) => c >= 40 && c <= 50 },
  { id: '50_60', label: '50-60', match: (c: number) => c > 50 && c <= 60 },
  { id: '60_70', label: '60-70', match: (c: number) => c > 60 && c <= 70 },
  { id: '70_80', label: '70-80', match: (c: number) => c > 70 && c <= 80 },
  { id: '80_90', label: '80-90', match: (c: number) => c > 80 && c <= 90 },
] as const;

function forwardReturn(bars: DailyBar[], date: string, horizon: number): number | null {
  const idx = bars.findIndex((b) => b.date === date);
  if (idx < 0 || idx + horizon >= bars.length) return null;
  const entry = bars[idx + 1]!.close;
  const exit = bars[idx + horizon]!.close;
  if (entry <= 0) return null;
  return ((exit - entry) / entry) * 100;
}

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

function bucketTable(rows: Obs[]) {
  return Object.fromEntries(
    CONF_BUCKETS.map((b) => {
      const inB = rows.filter((r) => b.match(r.confidence));
      return [
        b.id,
        {
          label: b.label,
          count: inB.length,
          avgReturn5d: avg(inB.map((r) => r.return5d).filter((v): v is number => v != null)),
          avgReturn10d: avg(inB.map((r) => r.return10d).filter((v): v is number => v != null)),
          avgReturn20d: avg(inB.map((r) => r.return20d).filter((v): v is number => v != null)),
        },
      ];
    }),
  );
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]! - mx;
    const y = ys[i]! - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 1000) / 1000;
}

function residuals(y: number[], x: number[]): number[] {
  const n = y.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i]! - mx) * (y[i]! - my);
    den += (x[i]! - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  return y.map((yi, i) => yi - (a + b * x[i]!));
}

function corrPairs(rows: Obs[], horizon: 'return5d' | 'return10d' | 'return20d') {
  const paired = rows.filter((r) => r[horizon] != null);
  const conf = paired.map((r) => r.confidence);
  const ret = paired.map((r) => r[horizon] as number);
  const rsi = paired.map((r) => r.rsi14);
  const retResidRsi = residuals(ret, rsi);
  const confResidRsi = residuals(conf, rsi);
  return {
    n: paired.length,
    pearsonConfVsReturn: pearson(conf, ret),
    /** RSIで両方を直交化した後の confidence と return の相関 */
    partialStyleConfVsReturnExcludingRsi: pearson(confResidRsi, retResidRsi),
  };
}

describe('OpenAI confidence return analysis', () => {
  beforeAll(() => {
    vi.spyOn(aiEvalLog, 'logAiEvalStart').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalResponse').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalEnd').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalPrompt').mockImplementation(() => {});
    vi.spyOn(aiEvalLog, 'logAiEvalOpenAiSkipped').mockImplementation(() => {});
  });

  it('compares buy vs hold by confidence bucket and correlation', async () => {
    await bootstrapSecretsForAiEvalProbe();
    resetAiSecondEvaluatorCacheForTest();

    const state = buildProbeAppState(10, 'bursa-first');
    const apiKeys = await loadAnalysisApiKeys();
    const symbols: ProbeSymbol[] = state.portfolio.map((p) => ({
      symbol: p.symbol,
      market: p.market as ProbeSymbol['market'],
      yahooSymbol: toYahooSymbol(p.symbol, p.market as ProbeSymbol['market']),
    }));

    const evidence = await buildConciergeEvidenceForProactive(state, apiKeys, 'balanced');
    const { daySlices } = await loadHistoricalDayInputs(symbols);
    const baseEnriched = await buildEnrichedAiSecondEvaluatorInputs(evidence.symbols, {
      forceRefresh: true,
      degradedMode: false,
    });
    const ruleScoresBySymbol = Object.fromEntries(
      evidence.symbols.map((s) => [s.symbol.toUpperCase(), 50]),
    );
    const barsBySymbol = new Map<string, DailyBar[]>();
    for (const s of symbols) {
      barsBySymbol.set(s.symbol, await fetchYahooDailyBars(s.yahooSymbol));
    }

    const allObs: Obs[] = [];
    for (const day of daySlices) {
      if (day.points.length === 0) continue;
      const dayInputs = patchEnrichedInputsForDay(baseEnriched, day.points);
      resetAiSecondEvaluatorCacheForTest();
      const batch = await fetchAiSecondEvaluatorBatch([], {
        force: true,
        prebuiltInputs: dayInputs,
        ruleScoresBySymbol,
        degradedMode: false,
      });
      const bySym = new Map(batch.symbols.map((s) => [s.symbol.toUpperCase(), s] as const));
      for (const p of day.points) {
        const ai = bySym.get(p.symbol.toUpperCase());
        if (!ai || p.rsi14 == null) continue;
        const bars = barsBySymbol.get(p.symbol)!;
        allObs.push({
          date: day.date,
          symbol: p.symbol,
          rsi14: p.rsi14,
          openAiAction: ai.action,
          confidence: ai.confidence,
          return5d: forwardReturn(bars, day.date, 5),
          return10d: forwardReturn(bars, day.date, 10),
          return20d: forwardReturn(bars, day.date, 20),
        });
      }
    }

    const buy = allObs.filter((o) => o.openAiAction === 'buy');
    const hold = allObs.filter((o) => o.openAiAction === 'hold');

    const buyBuckets = bucketTable(buy);
    const holdBuckets = bucketTable(hold);

    const expectationCompare = CONF_BUCKETS.map((b) => ({
      bucket: b.label,
      buy: buyBuckets[b.id],
      hold: holdBuckets[b.id],
      buyMinusHold10d:
        buyBuckets[b.id].avgReturn10d != null && holdBuckets[b.id].avgReturn10d != null
          ? Math.round((buyBuckets[b.id].avgReturn10d! - holdBuckets[b.id].avgReturn10d!) * 100) / 100
          : null,
    }));

    const correlation = {
      all304: {
        return5d: corrPairs(allObs, 'return5d'),
        return10d: corrPairs(allObs, 'return10d'),
        return20d: corrPairs(allObs, 'return20d'),
      },
      buyOnly24: {
        return5d: corrPairs(buy, 'return5d'),
        return10d: corrPairs(buy, 'return10d'),
        return20d: corrPairs(buy, 'return20d'),
      },
      holdOnly162: {
        return5d: corrPairs(hold, 'return5d'),
        return10d: corrPairs(hold, 'return10d'),
        return20d: corrPairs(hold, 'return20d'),
      },
    };

    const confidenceOnlyValidity = {
      noteJa:
        'RSI除外＝confidenceとreturnの相関を、両者からRSIへの線形効果を引いた残差同士で評価（単変量の偏相関に近い）。',
      buyOnly: correlation.buyOnly24,
      holdOnly: correlation.holdOnly162,
      interpretationJa: [] as string[],
    };

    const rBuy10 = correlation.buyOnly24.return10d.pearsonConfVsReturn;
    const rHold10 = correlation.holdOnly162.return10d.pearsonConfVsReturn;
    const prBuy10 = correlation.buyOnly24.return10d.partialStyleConfVsReturnExcludingRsi;
    const prHold10 = correlation.holdOnly162.return10d.partialStyleConfVsReturnExcludingRsi;

    if (rBuy10 != null && rBuy10 < 0) {
      confidenceOnlyValidity.interpretationJa.push('buy24: confidence↑は10dリターン↓傾向（弱い負相関の可能性）');
    }
    if (rHold10 != null && Math.abs(rHold10) < 0.15) {
      confidenceOnlyValidity.interpretationJa.push('hold162: confidenceと10dリターンはほぼ無相関');
    }
    confidenceOnlyValidity.interpretationJa.push(
      `全304・10d: r(conf,ret)=${correlation.all304.return10d.pearsonConfVsReturn}、RSI直交化後=${correlation.all304.return10d.partialStyleConfVsReturnExcludingRsi}`,
    );

    const higherConfBetter = {
      questionJa: 'confidenceが高いほど将来リターンが高いか',
      all304: correlation.all304,
      verdictJa:
        Math.abs(correlation.all304.return10d.pearsonConfVsReturn ?? 0) < 0.1
          ? '304観測では線形相関は弱く、「高confidence＝高リターン」は支持されない'
          : (correlation.all304.return10d.pearsonConfVsReturn ?? 0) > 0
            ? 'わずかな正相関あり（強度はr値参照）'
            : '負相関あり（高confidenceほどリターン低下の傾向）',
    };

    const report = {
      observationCount: allObs.length,
      buyCount: buy.length,
      holdCount: hold.length,
      section1: { openAiBuy24: buyBuckets, openAiHold162: holdBuckets },
      section2: { confidenceExpectationBuyVsHold: expectationCompare },
      section3: higherConfBetter,
      section4: confidenceOnlyValidity,
      confidenceRangeNote: '帯域外（<40 or >90）の観測は各表から除外',
      buyConfidenceDist: {
        min: Math.min(...buy.map((b) => b.confidence)),
        max: Math.max(...buy.map((b) => b.confidence)),
      },
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-confidence-return-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== OPENAI CONFIDENCE ANALYSIS ===\n', JSON.stringify(report, null, 2));
  }, 600_000);
});
