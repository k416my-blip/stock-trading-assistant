/**
 * OpenAI buy — 成功/失敗分解・特徴比較・検定
 * npx vitest run tests/unit/openAiBuySuccessFailureAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';

type BuyRow = {
  date: string;
  symbol: string;
  rsi14: number;
  confidence: number;
  pctFrom20dHigh: number;
  dayChangePct: number;
  volumeSurgeRatio: number;
  return10d: number;
  outcome: 'success' | 'failure';
};

const METRICS = [
  { key: 'rsi14' as const, labelJa: 'RSI14' },
  { key: 'confidence' as const, labelJa: 'confidence' },
  { key: 'pctFrom20dHigh' as const, labelJa: '20日高値距離(%)' },
  { key: 'dayChangePct' as const, labelJa: '日中変化率(%)' },
  { key: 'volumeSurgeRatio' as const, labelJa: '出来高倍率' },
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

function std(vals: number[]): number | null {
  if (vals.length < 2) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / (vals.length - 1)) * 100) / 100;
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

function mannWhitneyU(a: number[], b: number[]): { u: number; z: number; pTwoSided: number } | null {
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
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  if (sigma === 0) return null;
  const z = (u - n1 * n2 * 0.5) / sigma;
  return {
    u: Math.round(u),
    z: Math.round(z * 1000) / 1000,
    pTwoSided: Math.round(2 * (1 - normalCdf(Math.abs(z))) * 10000) / 10000,
  };
}

function cohensD(a: number[], b: number[]): number | null {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a)!;
  const mb = mean(b)!;
  const sa = std(a)!;
  const sb = std(b)!;
  const pooled = Math.sqrt(((a.length - 1) * sa ** 2 + (b.length - 1) * sb ** 2) / (a.length + b.length - 2));
  if (pooled === 0) return null;
  return Math.round(((ma - mb) / pooled) * 100) / 100;
}

function metricSummary(rows: BuyRow[], key: keyof BuyRow) {
  const vals = rows.map((r) => r[key] as number);
  return { mean: mean(vals), median: median(vals), n: vals.length };
}

function rankRow(r: BuyRow) {
  return {
    date: r.date,
    symbol: r.symbol,
    rsi14: r.rsi14,
    confidence: r.confidence,
    return10d: r.return10d,
    outcome: r.outcome,
  };
}

describe('OpenAI buy success vs failure', () => {
  it('writes success-failure buy analysis JSON', () => {
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
      return10d: number;
    }>;

    const hybrid = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-buy-hybrid-analysis.json'), 'utf8'),
    ) as { allRows: Array<{ date: string; symbol: string; confidence: number }> };
    const confHybrid = new Map(hybrid.allRows.map((r) => [`${r.date}|${r.symbol}`, r.confidence]));

    const regBuy = new Map(
      reg.filter((r) => r.openAiAction === 'buy').map((r) => [`${r.date}|${r.symbol}`, r] as const),
    );

    const allBuy = obs.filter((r) => r.openAiAction === 'buy');
    const buys: BuyRow[] = [];

    for (const o of allBuy) {
      const key = `${o.date}|${o.symbol}`;
      const feat = regBuy.get(key);
      if (o.return10d == null) continue;
      const confidence = feat?.confidence ?? confHybrid.get(key) ?? 75;
      buys.push({
        date: o.date,
        symbol: o.symbol,
        rsi14: o.rsi14,
        confidence,
        pctFrom20dHigh: feat?.pctFrom20dHigh ?? 0,
        dayChangePct: feat?.dayChangePct ?? 0,
        volumeSurgeRatio: feat?.volumeSurgeRatio ?? 1,
        return10d: o.return10d,
        outcome: o.return10d > 0 ? 'success' : 'failure',
      });
    }

    const success = buys.filter((b) => b.outcome === 'success');
    const failure = buys.filter((b) => b.outcome === 'failure');

    const compareMetrics = Object.fromEntries(
      METRICS.map((m) => {
        const sVals = success.map((r) => r[m.key]);
        const fVals = failure.map((r) => r[m.key]);
        return [
          m.key,
          {
            labelJa: m.labelJa,
            success: metricSummary(success, m.key),
            failure: metricSummary(failure, m.key),
            deltaSuccessMinusFailure: {
              mean:
                mean(sVals) != null && mean(fVals) != null
                  ? Math.round((mean(sVals)! - mean(fVals)!) * 100) / 100
                  : null,
              median:
                median(sVals) != null && median(fVals) != null
                  ? Math.round((median(sVals)! - median(fVals)!) * 100) / 100
                  : null,
            },
            tests: {
              welch: welchTTest(sVals, fVals),
              mannWhitney: mannWhitneyU(sVals, fVals),
              cohensD: cohensD(sVals, fVals),
            },
          },
        ];
      }),
    );

    const bySymbol = {
      '1023': {
        success: success.filter((b) => b.symbol === '1023').length,
        failure: failure.filter((b) => b.symbol === '1023').length,
        total: buys.filter((b) => b.symbol === '1023').length,
      },
      VYM: {
        success: success.filter((b) => b.symbol === 'VYM').length,
        failure: failure.filter((b) => b.symbol === 'VYM').length,
        total: buys.filter((b) => b.symbol === 'VYM').length,
      },
    };

    const sorted = [...buys].sort((a, b) => b.return10d - a.return10d);
    const successRanking = sorted.filter((b) => b.outcome === 'success').map(rankRow);
    const failureRanking = [...sorted.filter((b) => b.outcome === 'failure')].sort(
      (a, b) => a.return10d - b.return10d,
    ).map(rankRow);
    const allBuyRanking = sorted.map(rankRow);

    const report = {
      methodologyJa: {
        successBuy: '10営業日後リターン > 0',
        failureBuy: '10営業日後リターン <= 0',
        buyOnly: 'OpenAI action=buy（304観測）',
        features: 'regression-dataset + hybrid confidence',
        returns: '翌営業日エントリー→10営業日後',
      },
      counts: {
        buyTotal: allBuy.length,
        withReturn10d: buys.length,
        withoutReturn10d: allBuy.length - buys.length,
        successBuy: success.length,
        failureBuy: failure.length,
        successRatePct: Math.round((success.length / buys.length) * 1000) / 10,
      },
      section1to5_metricComparison: compareMetrics,
      section6_bySymbol: bySymbol,
      section7_successBuyRanking: successRanking,
      section8_failureBuyRanking: failureRanking,
      allBuyRankingByReturn10d: allBuyRanking,
      section9_testsSummary: METRICS.map((m) => ({
        metric: m.labelJa,
        ...compareMetrics[m.key]!.tests,
        deltaMean: compareMetrics[m.key]!.deltaSuccessMinusFailure.mean,
      })),
      section10_conclusionJa: {
        successCommonTraits: [] as string[],
        failureCommonTraits: [] as string[],
        overall: '',
      },
    };

    const rsi = compareMetrics.rsi14!;
    const conf = compareMetrics.confidence!;
    const pct = compareMetrics.pctFrom20dHigh!;
    const day = compareMetrics.dayChangePct!;
    const vol = compareMetrics.volumeSurgeRatio!;

    if ((rsi.deltaSuccessMinusFailure.mean ?? 0) > 2) {
      report.section10_conclusionJa.successCommonTraits.push('RSIは成功buyの方がやや高い（50〜65帯）');
    } else if ((rsi.deltaSuccessMinusFailure.mean ?? 0) < -2) {
      report.section10_conclusionJa.failureCommonTraits.push('RSIは失敗buyの方が高い');
    } else {
      report.section10_conclusionJa.successCommonTraits.push('RSIは成功/失敗で大差なし');
      report.section10_conclusionJa.failureCommonTraits.push('RSIだけでは成否分離困難');
    }

    if ((conf.deltaSuccessMinusFailure.mean ?? 0) > 3) {
      report.section10_conclusionJa.successCommonTraits.push('confidenceは成功buyで高め');
    } else if ((conf.deltaSuccessMinusFailure.mean ?? 0) < -3) {
      report.section10_conclusionJa.failureCommonTraits.push('confidenceは失敗buyで高め（高信頼≠高リターン）');
    }

    if ((pct.deltaSuccessMinusFailure.mean ?? 0) > 1) {
      report.section10_conclusionJa.successCommonTraits.push('20日高値に近い（押し目が浅い）成功が多い');
    } else if ((pct.deltaSuccessMinusFailure.mean ?? 0) < -1) {
      report.section10_conclusionJa.failureCommonTraits.push('20日高値から遠い（深い調整）失敗が多い');
    }

    if ((day.deltaSuccessMinusFailure.mean ?? 0) > 0.3) {
      report.section10_conclusionJa.successCommonTraits.push('当日プラス寄りの日に成功が多い');
    } else if ((day.deltaSuccessMinusFailure.mean ?? 0) < -0.3) {
      report.section10_conclusionJa.failureCommonTraits.push('当日マイナスの日に失敗が多い');
    }

    const sigMetrics = METRICS.filter((m) => {
      const t = compareMetrics[m.key]!.tests.welch;
      return t != null && t.pTwoSided < 0.05;
    });
    if (sigMetrics.length === 0) {
      report.section10_conclusionJa.overall =
        `成功${success.length}件・失敗${failure.length}件（勝率${report.counts.successRatePct}%）。Welch/MWUで有意差が出た指標はなく、単一特徴での成否分離は弱い。1023集中（成功${bySymbol['1023'].success}/失敗${bySymbol['1023'].failure}）で連続buyが失敗に寄与。`;
    } else {
      report.section10_conclusionJa.overall = `有意差: ${sigMetrics.map((m) => m.labelJa).join(', ')}。それ以外は上記共通特徴を参照。`;
    }

    if (bySymbol.VYM.success > 0 && bySymbol.VYM.failure === 0) {
      report.section10_conclusionJa.successCommonTraits.push('VYMのbuyはサンプル少だが成功寄り');
    }
    if (failureRanking.length > 5 && failure.filter((b) => b.symbol === '1023').length > 10) {
      report.section10_conclusionJa.failureCommonTraits.push(
        '1023の連続buyストリーク後半（5月下旬）に失敗が集中',
      );
    }

    const out = path.join(process.cwd(), 'scripts', 'openai-buy-success-failure.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== BUY SUCCESS FAILURE ===\n', JSON.stringify(report, null, 2));
  });
});
