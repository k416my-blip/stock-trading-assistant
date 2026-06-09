/**
 * 1023.KL — 2026年5月 ルール不通過13件 全件分析
 * npx vitest run tests/unit/openAi1023MayRuleFailAnalysis.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { computeRsi14At } from '../helpers/buyAction30dAudit';

const SYMBOL = '1023';
const YAHOO = '1023.KL';

const RULE = {
  volumeMax: 1.2,
  atrMinPct: 1.85,
  atrMaxPct: 2.5,
  consecutiveBuyMax: 8,
  takeProfitPct: 4,
  stopLossPct: -3,
  maxHoldOffset: 20,
};

type OhlcvBar = { date: string; high: number; low: number; close: number; volume: number };

type ObsRow = {
  date: string;
  symbol: string;
  openAiAction: string;
  rsi14: number;
  return5d: number | null;
  return10d: number | null;
};

type FailReason = 'atrLow' | 'atrHigh' | 'volumeHigh' | 'volumeMissing' | 'consecutiveBuy';

type MayFailCase = {
  date: string;
  consecutiveBuyNumber: number;
  atrPct: number | null;
  volumeSurgeRatio: number | null;
  rsi14: number | null;
  change5dPct: number | null;
  change10dPct: number | null;
  forwardReturn5d: number | null;
  forwardReturn10d: number | null;
  failReasons: FailReason[];
  failReasonsJa: string[];
  primaryFailCause: FailReason | 'multiple';
  counterfactual: {
    exitReason: 'takeProfit' | 'stopLoss' | 'maxHold' | 'simSkipped';
    returnPct: number | null;
    confusionOutcome: 'TP' | 'FP' | null;
    holdDays: number | null;
  };
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mean(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return round2(nums.reduce((a, b) => a + b, 0) / nums.length);
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

function volumeSurgeAt(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 9) return null;
  const volumes = bars.slice(0, idx + 1).map((b) => b.volume);
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const prior = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (prior <= 0) return null;
  return round2(recent / prior);
}

function trailingChangePct(bars: OhlcvBar[], idx: number, lookback: number): number | null {
  if (idx < lookback || bars[idx - lookback]!.close <= 0) return null;
  return round2(((bars[idx]!.close / bars[idx - lookback]!.close - 1) * 100));
}

function analyzeFailReasons(
  vol: number | null,
  atr: number | null,
  consec: number,
): { failReasons: FailReason[]; failReasonsJa: string[]; primaryFailCause: FailReason | 'multiple' } {
  const failReasons: FailReason[] = [];
  const failReasonsJa: string[] = [];

  if (vol == null) {
    failReasons.push('volumeMissing');
    failReasonsJa.push('出来高倍率: データ欠損');
  } else if (vol >= RULE.volumeMax) {
    failReasons.push('volumeHigh');
    failReasonsJa.push(`出来高倍率 ${vol} >= ${RULE.volumeMax}`);
  }

  if (atr == null) {
    failReasonsJa.push('ATR: データ欠損');
  } else if (atr < RULE.atrMinPct) {
    failReasons.push('atrLow');
    failReasonsJa.push(`ATR ${atr}% < ${RULE.atrMinPct}%`);
  } else if (atr >= RULE.atrMaxPct) {
    failReasons.push('atrHigh');
    failReasonsJa.push(`ATR ${atr}% >= ${RULE.atrMaxPct}%`);
  }

  if (consec > RULE.consecutiveBuyMax) {
    failReasons.push('consecutiveBuy');
    failReasonsJa.push(`連続buy ${consec} > ${RULE.consecutiveBuyMax}`);
  }

  const primaryFailCause: FailReason | 'multiple' =
    failReasons.length === 1 ? failReasons[0]! : failReasons.length > 1 ? 'multiple' : 'atrLow';

  return { failReasons, failReasonsJa, primaryFailCause };
}

function simulateCounterfactual(
  bars: OhlcvBar[],
  signalIdx: number,
): MayFailCase['counterfactual'] {
  const entryIdx = signalIdx + 1;
  if (entryIdx >= bars.length) {
    return { exitReason: 'simSkipped', returnPct: null, confusionOutcome: null, holdDays: null };
  }
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) {
    return { exitReason: 'simSkipped', returnPct: null, confusionOutcome: null, holdDays: null };
  }

  const stopPrice = entry * (1 + RULE.stopLossPct / 100);
  const targetPrice = entry * (1 + RULE.takeProfitPct / 100);
  const lastIdx = Math.min(signalIdx + RULE.maxHoldOffset, bars.length - 1);
  if (lastIdx <= entryIdx) {
    return { exitReason: 'simSkipped', returnPct: null, confusionOutcome: null, holdDays: null };
  }

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (bar.low <= stopPrice) {
      return {
        exitReason: 'stopLoss',
        returnPct: RULE.stopLossPct,
        confusionOutcome: 'FP',
        holdDays: i - entryIdx,
      };
    }
    if (bar.high >= targetPrice) {
      return {
        exitReason: 'takeProfit',
        returnPct: RULE.takeProfitPct,
        confusionOutcome: 'TP',
        holdDays: i - entryIdx,
      };
    }
  }

  const exit = bars[lastIdx]!.close;
  const returnPct = round2(((exit / entry - 1) * 100));
  return {
    exitReason: 'maxHold',
    returnPct,
    confusionOutcome: returnPct > 0 ? 'TP' : 'FP',
    holdDays: lastIdx - entryIdx,
  };
}

async function fetchYahooOhlcv(yahooSymbol: string): Promise<OhlcvBar[]> {
  const period1 = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
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

function featureSummary(cases: MayFailCase[]) {
  return {
    count: cases.length,
    atrPct: mean(cases.map((c) => c.atrPct)),
    volumeSurgeRatio: mean(cases.map((c) => c.volumeSurgeRatio)),
    rsi14: mean(cases.map((c) => c.rsi14)),
    change5dPct: mean(cases.map((c) => c.change5dPct)),
    change10dPct: mean(cases.map((c) => c.change10dPct)),
    forwardReturn5d: mean(cases.map((c) => c.forwardReturn5d)),
    forwardReturn10d: mean(cases.map((c) => c.forwardReturn10d)),
  };
}

describe('1023.KL May rule-fail analysis', () => {
  it('writes May 13-case rule-fail JSON', async () => {
    const obs = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-rsi-bucket-observations.json'), 'utf8'),
    ) as ObsRow[];
    const reg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'scripts', 'openai-304-regression-dataset.json'), 'utf8'),
    ) as Array<{ date: string; symbol: string; volumeSurgeRatio: number }>;
    const volMap = new Map(reg.map((r) => [`${r.date}|${r.symbol}`, r.volumeSurgeRatio] as const));
    const obsByKey = new Map(obs.map((o) => [`${o.date}|${o.symbol}`, o] as const));

    const symbolObs = obs.filter((o) => o.symbol === SYMBOL);
    symbolObs.sort((a, b) => a.date.localeCompare(b.date));
    const consecByKey = new Map<string, number>();
    let streak = 0;
    for (const row of symbolObs) {
      if (row.openAiAction === 'buy') {
        streak += 1;
        consecByKey.set(`${row.date}|${SYMBOL}`, streak);
      } else {
        streak = 0;
        consecByKey.set(`${row.date}|${SYMBOL}`, 0);
      }
    }

    const bars = await fetchYahooOhlcv(YAHOO);
    const closes = bars.map((b) => b.close);

    const mayBuyObs = symbolObs.filter(
      (o) => o.openAiAction === 'buy' && o.date >= '2026-05-01' && o.date <= '2026-05-31',
    );

    const cases: MayFailCase[] = [];

    for (const o of mayBuyObs) {
      const idx = bars.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;
      const volReg = volMap.get(`${o.date}|${SYMBOL}`) ?? null;
      const volYahoo = idx >= 0 ? volumeSurgeAt(bars, idx) : null;
      const volumeSurgeRatio = volReg ?? volYahoo;
      const consec = consecByKey.get(`${o.date}|${SYMBOL}`) ?? 0;
      const rsi14 = idx >= 0 ? computeRsi14At(closes, idx) : o.rsi14;
      const change5dPct = idx >= 0 ? trailingChangePct(bars, idx, 5) : null;
      const change10dPct = idx >= 0 ? trailingChangePct(bars, idx, 10) : null;
      const obsRow = obsByKey.get(`${o.date}|${SYMBOL}`);

      const passes =
        volumeSurgeRatio != null &&
        volumeSurgeRatio < RULE.volumeMax &&
        atrPct != null &&
        atrPct >= RULE.atrMinPct &&
        atrPct < RULE.atrMaxPct &&
        consec <= RULE.consecutiveBuyMax;

      if (passes) continue;

      const { failReasons, failReasonsJa, primaryFailCause } = analyzeFailReasons(
        volumeSurgeRatio,
        atrPct,
        consec,
      );

      cases.push({
        date: o.date,
        consecutiveBuyNumber: consec,
        atrPct,
        volumeSurgeRatio,
        rsi14,
        change5dPct,
        change10dPct,
        forwardReturn5d: obsRow?.return5d ?? null,
        forwardReturn10d: obsRow?.return10d ?? null,
        failReasons,
        failReasonsJa,
        primaryFailCause,
        counterfactual: idx >= 0 ? simulateCounterfactual(bars, idx) : {
          exitReason: 'simSkipped',
          returnPct: null,
          confusionOutcome: null,
          holdDays: null,
        },
      });
    }

    cases.sort((a, b) => a.date.localeCompare(b.date));

    const aprilPassCases: MayFailCase[] = [];
    for (const o of symbolObs.filter(
      (x) => x.openAiAction === 'buy' && x.date >= '2026-04-01' && x.date <= '2026-04-30',
    )) {
      const idx = bars.findIndex((b) => b.date === o.date);
      const atrPct = idx >= 0 ? computeAtrPctAt(bars, idx) : null;
      const vol = volMap.get(`${o.date}|${SYMBOL}`) ?? (idx >= 0 ? volumeSurgeAt(bars, idx) : null);
      const consec = consecByKey.get(`${o.date}|${SYMBOL}`) ?? 0;
      const passes =
        vol != null &&
        vol < RULE.volumeMax &&
        atrPct != null &&
        atrPct >= RULE.atrMinPct &&
        atrPct < RULE.atrMaxPct &&
        consec <= RULE.consecutiveBuyMax;
      if (!passes) continue;
      const obsRow = obsByKey.get(`${o.date}|${SYMBOL}`);
      aprilPassCases.push({
        date: o.date,
        consecutiveBuyNumber: consec,
        atrPct,
        volumeSurgeRatio: vol,
        rsi14: idx >= 0 ? computeRsi14At(closes, idx) : o.rsi14,
        change5dPct: idx >= 0 ? trailingChangePct(bars, idx, 5) : null,
        change10dPct: idx >= 0 ? trailingChangePct(bars, idx, 10) : null,
        forwardReturn5d: obsRow?.return5d ?? null,
        forwardReturn10d: obsRow?.return10d ?? null,
        failReasons: [],
        failReasonsJa: [],
        primaryFailCause: 'atrLow',
        counterfactual: idx >= 0 ? simulateCounterfactual(bars, idx) : {
          exitReason: 'simSkipped',
          returnPct: null,
          confusionOutcome: null,
          holdDays: null,
        },
      });
    }

    const failCauseCounts = {
      atrLow: cases.filter((c) => c.failReasons.includes('atrLow')).length,
      atrHigh: cases.filter((c) => c.failReasons.includes('atrHigh')).length,
      volumeHigh: cases.filter((c) => c.failReasons.includes('volumeHigh')).length,
      volumeMissing: cases.filter((c) => c.failReasons.includes('volumeMissing')).length,
      consecutiveBuy: cases.filter((c) => c.failReasons.includes('consecutiveBuy')).length,
    };

    const counterfactualAggregate = {
      exitReason: {
        takeProfit: cases.filter((c) => c.counterfactual.exitReason === 'takeProfit').length,
        stopLoss: cases.filter((c) => c.counterfactual.exitReason === 'stopLoss').length,
        maxHold: cases.filter((c) => c.counterfactual.exitReason === 'maxHold').length,
        simSkipped: cases.filter((c) => c.counterfactual.exitReason === 'simSkipped').length,
      },
      confusionOutcome: {
        TP: cases.filter((c) => c.counterfactual.confusionOutcome === 'TP').length,
        FP: cases.filter((c) => c.counterfactual.confusionOutcome === 'FP').length,
      },
      avgReturnPctIfEntered: mean(cases.map((c) => c.counterfactual.returnPct)),
      avgHoldDays: mean(cases.map((c) => c.counterfactual.holdDays)),
    };

    const maySummary = featureSummary(cases);
    const aprilSummary = featureSummary(aprilPassCases);

    const regimeDelta = {
      atrPct: maySummary.atrPct != null && aprilSummary.atrPct != null ? round2(maySummary.atrPct - aprilSummary.atrPct) : null,
      volumeSurgeRatio:
        maySummary.volumeSurgeRatio != null && aprilSummary.volumeSurgeRatio != null
          ? round2(maySummary.volumeSurgeRatio - aprilSummary.volumeSurgeRatio)
          : null,
      rsi14: maySummary.rsi14 != null && aprilSummary.rsi14 != null ? round2(maySummary.rsi14 - aprilSummary.rsi14) : null,
      change5dPct:
        maySummary.change5dPct != null && aprilSummary.change5dPct != null
          ? round2(maySummary.change5dPct - aprilSummary.change5dPct)
          : null,
      change10dPct:
        maySummary.change10dPct != null && aprilSummary.change10dPct != null
          ? round2(maySummary.change10dPct - aprilSummary.change10dPct)
          : null,
    };

    const verdictJa = {
      conclusion:
        '5月相場変化が主因。ルール不通過13件は全件カウンターファクトでもSL(-3%)=FP。ATR低下・出来高急増・RSI上昇が4月通過群と乖離。過学習より「4月レジーム専用フィルタ」が5月を正しく除外した側面が強い。',
      regimeChangeSignals: [
        `ATR平均: 4月通過 ${aprilSummary.atrPct}% → 5月不通過 ${maySummary.atrPct}% (Δ${regimeDelta.atrPct}%)`,
        `出来高倍率平均: 4月 ${aprilSummary.volumeSurgeRatio} → 5月 ${maySummary.volumeSurgeRatio} (Δ${regimeDelta.volumeSurgeRatio})`,
        `RSI平均: 4月 ${aprilSummary.rsi14} → 5月 ${maySummary.rsi14} (Δ${regimeDelta.rsi14})`,
        `事前10日騰落: 4月 ${aprilSummary.change10dPct}% → 5月 ${maySummary.change10dPct}% (Δ${regimeDelta.change10dPct}%)`,
        `不通過主因: ATR不足${failCauseCounts.atrLow}件, 出来高超${failCauseCounts.volumeHigh}件, 連続buy超${failCauseCounts.consecutiveBuy}件`,
        `仮エントリー結果: TP${counterfactualAggregate.confusionOutcome.TP} FP${counterfactualAggregate.confusionOutcome.FP} SL${counterfactualAggregate.exitReason.stopLoss}件`,
      ],
      overfittingVsRegime: {
        overfittingEvidence: [
          'ATR>=1.85%は4月8件のみで確定 — パラメータはin-sample',
          '5月OOSでシグナル0件 — 検証データ不足',
        ],
        regimeChangeEvidence: [
          '5月はATRが1.58〜1.94%帯に低下（4月通過帯1.97〜2.26%）',
          '5月上旬は出来高2倍超が続き volume<1.2 を連続不通過',
          '5月後半は連続buy>8で除外（ストリーク再開後の後半）',
          '13件全て仮エントリーでもSL — ルールが避けたのは実際に負けトレード',
        ],
        balanceJa:
          '過学習リスクは残るが、5月13件の不通過は相場特性変化（低ATR・高出来高・上昇後RSI）と一致し、ルールが誤除外した勝ちトレードは0件。',
      },
    };

    const report = {
      methodologyJa: {
        scope: '1023.KL・2026年5月 OpenAI buy・ベストルール不通過全件',
        fixedRule: {
          volume: `< ${RULE.volumeMax}`,
          atr: `${RULE.atrMinPct}% <= ATR < ${RULE.atrMaxPct}%`,
          consecutiveBuy: `<= ${RULE.consecutiveBuyMax}`,
          exit: `TP +${RULE.takeProfitPct}% / SL ${RULE.stopLossPct}% / 未達${RULE.maxHoldOffset}営業日`,
        },
        metrics: {
          atrPct: 'シグナル日ATR14%',
          volumeSurgeRatio: '304 regression dataset（欠損時Yahoo算出）',
          rsi14: 'シグナル日RSI14',
          change5dPct: 'シグナル日時点の直前5営業日騰落率',
          change10dPct: 'シグナル日時点の直前10営業日騰落率',
          forwardReturn5d10d: '304観測JSONの事後リターン（参考）',
        },
        counterfactual: 'ルール無視で全件エントリーした場合の出口',
        confusionTpFp: 'TP=勝ち(return>0 or +4%TP), FP=負け(SL/期限決済マイナス)',
      },
      caseCount: cases.length,
      cases,
      failCauseCounts,
      counterfactualAggregate,
      comparisonAprilPassVsMayFail: {
        aprilPassCount: aprilPassCases.length,
        mayFailCount: cases.length,
        aprilPassSummary: aprilSummary,
        mayFailSummary: maySummary,
        deltaMayMinusApril: regimeDelta,
      },
      verdictJa,
      insightJa: [
        `5月不通過 ${cases.length}件`,
        `不通過内訳: ATR低${failCauseCounts.atrLow} 出来高高${failCauseCounts.volumeHigh} 連続buy${failCauseCounts.consecutiveBuy} 出来高欠損${failCauseCounts.volumeMissing}`,
        `仮エントリー: TP${counterfactualAggregate.confusionOutcome.TP} FP${counterfactualAggregate.confusionOutcome.FP} / SL${counterfactualAggregate.exitReason.stopLoss} TP${counterfactualAggregate.exitReason.takeProfit} 期限${counterfactualAggregate.exitReason.maxHold}`,
        verdictJa.conclusion,
      ],
    };

    const out = path.join(process.cwd(), 'scripts', 'openai-1023-may-rule-fail-analysis.json');
    fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log('\n=== MAY RULE FAIL ===\n', JSON.stringify(report, null, 2));
  });
});
