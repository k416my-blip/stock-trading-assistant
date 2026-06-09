/**
 * MACD詳細監査 — ルール変更なし・診断のみ
 */
import {
  FORWARD_ADX_MIN,
  FORWARD_ETF_UNIVERSE,
  FORWARD_SIGNAL_START,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type { ForwardMacdAuditReport, ForwardMacdDistributionBucket } from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  classifyPrimaryBlockCategory,
  type ConditionBlockCategory,
} from './forwardValidationConditionBlockAudit';
import {
  buildSpyRegimeMap,
  computeAdx14,
  computeDist52wPct,
  computeMacdHistPct,
  scanSignalAtBar,
  type OhlcvBar,
  type Regime,
} from './case4Indicators';

export const MACD_BUCKET_LABELS = [
  '<0',
  '0〜0.05%',
  '0.05〜0.10%',
  '0.10〜0.20%',
  '0.20〜0.50%',
  '0.50%以上',
] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function macdDistributionBucket(macdHistPct: number): (typeof MACD_BUCKET_LABELS)[number] {
  if (macdHistPct < 0) return '<0';
  if (macdHistPct < 0.05) return '0〜0.05%';
  if (macdHistPct < 0.10) return '0.05〜0.10%';
  if (macdHistPct < 0.20) return '0.10〜0.20%';
  if (macdHistPct < 0.50) return '0.20〜0.50%';
  return '0.50%以上';
}

type EvalRow = {
  symbol: ForwardEtfSymbol;
  date: string;
  adx14: number | null;
  macdHistPct: number | null;
  category: ConditionBlockCategory;
  passes: boolean;
};

function collectEvaluations(input: {
  bundle: ForwardOhlcvBundle;
  fromDate: string;
  toDate: string;
}): EvalRow[] {
  const { bundle, fromDate, toDate } = input;
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const rows: EvalRow[] = [];

  for (const date of dates) {
    for (const symbol of FORWARD_ETF_UNIVERSE) {
      const bars = bundle.etfBars[symbol];
      const idx = bars.findIndex((b) => b.date === date);
      if (idx < 0) continue;
      rows.push(evaluateRow({ bars, idx, symbol, date, regimeMap }));
    }
  }
  return rows;
}

function evaluateRow(input: {
  bars: OhlcvBar[];
  idx: number;
  symbol: ForwardEtfSymbol;
  date: string;
  regimeMap: Map<string, Regime>;
}): EvalRow {
  const { bars, idx, symbol, date, regimeMap } = input;
  const adx14 = computeAdx14(bars, idx);
  const closes = bars.map((b) => b.close);
  const macdHistPct = computeMacdHistPct(closes, idx);
  const dist52wPct = computeDist52wPct(bars, idx);
  const spyRegime = regimeMap.get(date) ?? 'unknown';
  const passes = scanSignalAtBar(bars, idx, regimeMap)?.passes ?? false;
  const category = classifyPrimaryBlockCategory({
    adx14,
    macdHistPct,
    dist52wPct,
    spyRegime,
    passes,
  });
  return { symbol, date, adx14, macdHistPct, category, passes };
}

function buildDistribution(rows: EvalRow[]): ForwardMacdDistributionBucket[] {
  const withMacd = rows.filter((r) => r.macdHistPct != null) as Array<
    EvalRow & { macdHistPct: number }
  >;
  const total = withMacd.length;
  return MACD_BUCKET_LABELS.map((label) => {
    const count = withMacd.filter((r) => macdDistributionBucket(r.macdHistPct) === label).length;
    return {
      label,
      count,
      pct: total > 0 ? round3((count / total) * 100) : 0,
    };
  });
}

function etfMacdStats(rows: EvalRow[], symbol: ForwardEtfSymbol) {
  const symRows = rows.filter((r) => r.symbol === symbol && r.macdHistPct != null) as Array<
    EvalRow & { macdHistPct: number }
  >;
  const macdFail = symRows.filter((r) => r.category === 'macd');
  const passed = symRows.filter((r) => r.passes);
  const adxPassMacdFail = symRows.filter(
    (r) => r.category === 'macd' && r.adx14 != null && r.adx14 > FORWARD_ADX_MIN,
  );
  return {
    symbol,
    evaluationCount: symRows.length,
    macdMeanAll: mean(symRows.map((r) => r.macdHistPct)),
    macdFailCount: macdFail.length,
    macdFailMean: mean(macdFail.map((r) => r.macdHistPct)),
    passedCount: passed.length,
    passedMean: mean(passed.map((r) => r.macdHistPct)),
    adxPassThenMacdFailCount: adxPassMacdFail.length,
  };
}

export function auditMacdDetail(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
  toDate?: string;
}): ForwardMacdAuditReport {
  const fromDate = input.fromDate ?? FORWARD_SIGNAL_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const rows = collectEvaluations({ bundle: input.bundle, fromDate, toDate });

  const withMacd = rows.filter((r) => r.macdHistPct != null) as Array<
    EvalRow & { macdHistPct: number }
  >;
  const macdPrimaryFail = withMacd.filter((r) => r.category === 'macd');
  const passed = withMacd.filter((r) => r.passes);
  const adxPassThenMacdFail = withMacd.filter(
    (r) => r.category === 'macd' && r.adx14 != null && r.adx14 > FORWARD_ADX_MIN,
  );

  const distribution = buildDistribution(rows);
  const macdFailMean = mean(macdPrimaryFail.map((r) => r.macdHistPct));
  const passedMean = mean(passed.map((r) => r.macdHistPct));
  const perEtf = FORWARD_ETF_UNIVERSE.map((s) => etfMacdStats(rows, s));

  const humanLines = [
    `【MACD詳細監査】${fromDate} ～ ${toDate}`,
    `評価数 ${rows.length}（MACD算出可能 ${withMacd.length}）`,
    '',
    '■ MACDヒストグラム分布',
    ...distribution.map((b) => `${b.label}: ${b.count}件 (${b.pct}%)`),
    '',
    `■ MACD不足（第一失格）${macdPrimaryFail.length}件 — 平均 ${macdFailMean ?? '—'}%`,
    `■ 条件適合 ${passed.length}件 — 平均 ${passedMean ?? '—'}%`,
    `■ ADX合格後にMACDで失格 ${adxPassThenMacdFail.length}件`,
    '',
    '■ ETF別 MACD平均（全評価）',
    ...perEtf.map(
      (e) =>
        `${e.symbol}: 平均 ${e.macdMeanAll ?? '—'}% · MACD失格 ${e.macdFailCount}件(均${e.macdFailMean ?? '—'}%) · 適合 ${e.passedCount}件(均${e.passedMean ?? '—'}%) · ADX後MACD失格 ${e.adxPassThenMacdFailCount}件`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    totalEvaluations: rows.length,
    macdAvailableCount: withMacd.length,
    macdPrimaryFailCount: macdPrimaryFail.length,
    macdPrimaryFailMean: macdFailMean,
    passedCount: passed.length,
    passedMean,
    adxPassThenMacdFailCount: adxPassThenMacdFail.length,
    distribution,
    perEtf,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdAuditCsv(report: ForwardMacdAuditReport): string {
  const lines = [
    'section,key,value',
    `meta,fromDate,${report.fromDate}`,
    `meta,toDate,${report.toDate}`,
    `meta,macdPrimaryFailCount,${report.macdPrimaryFailCount}`,
    `meta,macdPrimaryFailMean,${report.macdPrimaryFailMean ?? ''}`,
    `meta,passedCount,${report.passedCount}`,
    `meta,passedMean,${report.passedMean ?? ''}`,
    `meta,adxPassThenMacdFailCount,${report.adxPassThenMacdFailCount}`,
    '',
    'distribution,label,count,pct',
    ...report.distribution.map((b) => `distribution,${b.label},${b.count},${b.pct}`),
    '',
    'etf,symbol,evalCount,macdMeanAll,macdFailCount,macdFailMean,passedCount,passedMean,adxPassThenMacdFailCount',
    ...report.perEtf.map(
      (e) =>
        `etf,${e.symbol},${e.evaluationCount},${e.macdMeanAll ?? ''},${e.macdFailCount},${e.macdFailMean ?? ''},${e.passedCount},${e.passedMean ?? ''},${e.adxPassThenMacdFailCount}`,
    ),
  ];
  return lines.join('\n');
}
