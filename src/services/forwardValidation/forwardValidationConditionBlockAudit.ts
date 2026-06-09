/**
 * 条件別失格率監査 — ルール変更なし・診断のみ
 */
import {
  FORWARD_ADX_MIN,
  FORWARD_ETF_UNIVERSE,
  FORWARD_MACD_MIN,
  FORWARD_SHALLOW_ADX_MIN,
  FORWARD_SHALLOW_MACD_MIN,
  FORWARD_SIDEWAYS_DEEP_DIST,
  FORWARD_SIGNAL_START,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardConditionBlockAuditReport,
  ForwardConditionBlockPeriodStats,
  ForwardConditionBlockRankingItem,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  buildSpyRegimeMap,
  classifyBucket,
  computeAdx14,
  computeDist52wPct,
  computeMacdHistPct,
  scanSignalAtBar,
  type OhlcvBar,
  type Regime,
} from './case4Indicators';

export const CONDITION_BLOCK_GAP_FROM = '2026-04-14';
export const CONDITION_BLOCK_GAP_TO = '2026-06-02';

export type ConditionBlockCategory = 'passed' | 'pullback' | 'adx' | 'macd' | 'regime' | 'other';

const CATEGORY_LABEL_JA: Record<ConditionBlockCategory, string> = {
  passed: '条件適合',
  pullback: '押し目不足',
  adx: 'ADX不足',
  macd: 'MACD不足',
  regime: 'レジーム不足',
  other: 'その他（指標不足等）',
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** パイプライン順の第一失格原因（相互排他） */
export function classifyPrimaryBlockCategory(input: {
  adx14: number | null;
  macdHistPct: number | null;
  dist52wPct: number | null;
  spyRegime: Regime | 'unknown';
  passes: boolean;
}): ConditionBlockCategory {
  const { adx14, macdHistPct, dist52wPct, spyRegime, passes } = input;
  if (passes) return 'passed';
  if (adx14 == null || macdHistPct == null || dist52wPct == null) return 'other';
  if (adx14 <= FORWARD_ADX_MIN) return 'adx';
  if (macdHistPct <= FORWARD_MACD_MIN) return 'macd';
  if (spyRegime === 'unknown') return 'regime';

  const bucket = classifyBucket(spyRegime, dist52wPct);

  if (bucket === 'up') {
    if (dist52wPct > -2) return 'pullback';
  } else if (bucket === 'down' || bucket === 'sideways_deep') {
    if (dist52wPct > -8) return 'pullback';
  } else if (bucket === 'sideways_shallow') {
    if (dist52wPct > -2 || dist52wPct <= FORWARD_SIDEWAYS_DEEP_DIST) return 'pullback';
    if (adx14 <= FORWARD_SHALLOW_ADX_MIN) return 'adx';
    if (macdHistPct <= FORWARD_SHALLOW_MACD_MIN) return 'macd';
  }

  return 'other';
}

function evaluateEtfDay(input: {
  bars: OhlcvBar[];
  idx: number;
  regimeMap: Map<string, Regime>;
}): ConditionBlockCategory {
  const { bars, idx, regimeMap } = input;
  const date = bars[idx]!.date;
  const adx14 = computeAdx14(bars, idx);
  const closes = bars.map((b) => b.close);
  const macdHistPct = computeMacdHistPct(closes, idx);
  const dist52wPct = computeDist52wPct(bars, idx);
  const spyRegime = regimeMap.get(date) ?? 'unknown';
  const passes = scanSignalAtBar(bars, idx, regimeMap)?.passes ?? false;
  return classifyPrimaryBlockCategory({ adx14, macdHistPct, dist52wPct, spyRegime, passes });
}

function emptyCounts(): Record<ConditionBlockCategory, number> {
  return { passed: 0, pullback: 0, adx: 0, macd: 0, regime: 0, other: 0 };
}

export function aggregateConditionBlockStats(input: {
  bundle: ForwardOhlcvBundle;
  fromDate: string;
  toDate: string;
}): ForwardConditionBlockPeriodStats {
  const { bundle, fromDate, toDate } = input;
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const totalCounts = emptyCounts();
  const perEtf = Object.fromEntries(
    FORWARD_ETF_UNIVERSE.map((s) => [s, emptyCounts()]),
  ) as Record<ForwardEtfSymbol, Record<ConditionBlockCategory, number>>;

  let totalEvaluations = 0;

  for (const date of dates) {
    for (const symbol of FORWARD_ETF_UNIVERSE) {
      const bars = bundle.etfBars[symbol];
      const idx = bars.findIndex((b) => b.date === date);
      if (idx < 0) continue;
      totalEvaluations++;
      const cat = evaluateEtfDay({ bars, idx, regimeMap });
      totalCounts[cat]++;
      perEtf[symbol][cat]++;
    }
  }

  const failTotal = totalEvaluations - totalCounts.passed;
  const rates = {
    pullbackPct: totalEvaluations > 0 ? round1((totalCounts.pullback / totalEvaluations) * 100) : 0,
    adxPct: totalEvaluations > 0 ? round1((totalCounts.adx / totalEvaluations) * 100) : 0,
    macdPct: totalEvaluations > 0 ? round1((totalCounts.macd / totalEvaluations) * 100) : 0,
    regimePct: totalEvaluations > 0 ? round1((totalCounts.regime / totalEvaluations) * 100) : 0,
    passedPct: totalEvaluations > 0 ? round1((totalCounts.passed / totalEvaluations) * 100) : 0,
    otherPct: totalEvaluations > 0 ? round1((totalCounts.other / totalEvaluations) * 100) : 0,
  };

  const ranking = buildRanking(totalCounts, failTotal);

  return {
    fromDate,
    toDate,
    tradingDays: dates.length,
    totalEvaluations,
    passCount: totalCounts.passed,
    failCount: failTotal,
    counts: { ...totalCounts },
    rates,
    ranking,
    perEtfCounts: perEtf,
  };
}

function buildRanking(
  counts: Record<ConditionBlockCategory, number>,
  failTotal: number,
): ForwardConditionBlockRankingItem[] {
  const blockers: Array<{ category: ConditionBlockCategory; count: number }> = [
    { category: 'pullback', count: counts.pullback },
    { category: 'adx', count: counts.adx },
    { category: 'macd', count: counts.macd },
    { category: 'regime', count: counts.regime },
    { category: 'other', count: counts.other },
  ];
  return blockers
    .sort((a, b) => b.count - a.count)
    .map((item, i) => ({
      rank: i + 1,
      category: item.category,
      labelJa: CATEGORY_LABEL_JA[item.category],
      count: item.count,
      ratePct: failTotal > 0 ? round1((item.count / failTotal) * 100) : 0,
      rateOfAllPct:
        counts.passed + failTotal > 0
          ? round1((item.count / (counts.passed + failTotal)) * 100)
          : 0,
    }));
}

export function auditConditionBlockRates(input: {
  bundle: ForwardOhlcvBundle;
  fullFromDate?: string;
  gapFromDate?: string;
  gapToDate?: string;
}): ForwardConditionBlockAuditReport {
  const fullFrom = input.fullFromDate ?? FORWARD_SIGNAL_START;
  const latest = input.bundle.latestDate;
  const gapFrom = input.gapFromDate ?? CONDITION_BLOCK_GAP_FROM;
  const gapTo = input.gapToDate ?? CONDITION_BLOCK_GAP_TO;

  const fullPeriod = aggregateConditionBlockStats({
    bundle: input.bundle,
    fromDate: fullFrom,
    toDate: latest,
  });
  const gapPeriod = aggregateConditionBlockStats({
    bundle: input.bundle,
    fromDate: gapFrom,
    toDate: gapTo,
  });

  const humanLines: string[] = [
    '【条件別失格率監査】確定ルール・変更なし',
    '',
    `■ 全期間 ${fullFrom} ～ ${latest}`,
    `評価数: ${fullPeriod.totalEvaluations}（${fullPeriod.tradingDays}営業日 × 4ETF）`,
    `適合率: ${fullPeriod.rates.passedPct}%（${fullPeriod.passCount}件）`,
    `押し目不足: ${fullPeriod.rates.pullbackPct}%`,
    `ADX不足: ${fullPeriod.rates.adxPct}%`,
    `MACD不足: ${fullPeriod.rates.macdPct}%`,
    `レジーム不足: ${fullPeriod.rates.regimePct}%`,
    '',
    '阻害ランキング（全評価に対する割合）:',
    ...fullPeriod.ranking.map(
      (r) => `${r.rank}. ${r.labelJa} — ${r.rateOfAllPct}%（${r.count}件）`,
    ),
    '',
    `■ 期間限定 ${gapFrom} ～ ${gapTo}`,
    `評価数: ${gapPeriod.totalEvaluations}`,
    `適合率: ${gapPeriod.rates.passedPct}%`,
    `押し目不足: ${gapPeriod.rates.pullbackPct}%`,
    `ADX不足: ${gapPeriod.rates.adxPct}%`,
    `MACD不足: ${gapPeriod.rates.macdPct}%`,
    `レジーム不足: ${gapPeriod.rates.regimePct}%`,
    '',
    '阻害ランキング:',
    ...gapPeriod.ranking.map(
      (r) => `${r.rank}. ${r.labelJa} — ${r.rateOfAllPct}%（${r.count}件）`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fullPeriod,
    gapPeriod,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatConditionBlockAuditCsv(report: ForwardConditionBlockAuditReport): string {
  const row = (label: string, s: ForwardConditionBlockPeriodStats) =>
    [
      label,
      s.fromDate,
      s.toDate,
      s.totalEvaluations,
      s.rates.passedPct,
      s.rates.pullbackPct,
      s.rates.adxPct,
      s.rates.macdPct,
      s.rates.regimePct,
      s.rates.otherPct,
    ].join(',');

  const lines = [
    'period,fromDate,toDate,evaluations,passedPct,pullbackPct,adxPct,macdPct,regimePct,otherPct',
    row('full', report.fullPeriod),
    row('gap', report.gapPeriod),
    '',
    '# fullRanking,rank,label,count,rateOfAllPct',
    ...report.fullPeriod.ranking.map((r) =>
      ['full', r.rank, r.labelJa, r.count, r.rateOfAllPct].join(','),
    ),
    '',
    '# gapRanking,rank,label,count,rateOfAllPct',
    ...report.gapPeriod.ranking.map((r) =>
      ['gap', r.rank, r.labelJa, r.count, r.rateOfAllPct].join(','),
    ),
  ];
  return lines.join('\n');
}

export { CATEGORY_LABEL_JA };
