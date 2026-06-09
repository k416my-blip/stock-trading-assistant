/**
 * ADX詳細監査 — ルール変更なし・診断のみ
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_SIGNAL_START,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type { ForwardAdxAuditReport, ForwardAdxDistributionBucket } from '../../types/forwardValidation';
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

export const ADX_BUCKET_LABELS = [
  '0-10',
  '10-15',
  '15-20',
  '20-25',
  '25-30',
  '30-40',
  '40+',
] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function adxDistributionBucket(adx14: number): (typeof ADX_BUCKET_LABELS)[number] {
  if (adx14 >= 40) return '40+';
  if (adx14 >= 30) return '30-40';
  if (adx14 >= 25) return '25-30';
  if (adx14 >= 20) return '20-25';
  if (adx14 >= 15) return '15-20';
  if (adx14 >= 10) return '10-15';
  return '0-10';
}

type EvalRow = {
  symbol: ForwardEtfSymbol;
  date: string;
  adx14: number | null;
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
  return { symbol, date, adx14, category, passes };
}

function buildDistribution(rows: EvalRow[]): ForwardAdxDistributionBucket[] {
  const withAdx = rows.filter((r) => r.adx14 != null) as Array<EvalRow & { adx14: number }>;
  const total = withAdx.length;
  return ADX_BUCKET_LABELS.map((label) => {
    const count = withAdx.filter((r) => adxDistributionBucket(r.adx14) === label).length;
    return {
      label,
      count,
      pct: total > 0 ? round3((count / total) * 100) : 0,
    };
  });
}

function etfAdxStats(rows: EvalRow[], symbol: ForwardEtfSymbol) {
  const symRows = rows.filter((r) => r.symbol === symbol && r.adx14 != null) as Array<
    EvalRow & { adx14: number }
  >;
  const adxFail = symRows.filter((r) => r.category === 'adx');
  const passed = symRows.filter((r) => r.passes);
  return {
    symbol,
    evaluationCount: symRows.length,
    adxMeanAll: mean(symRows.map((r) => r.adx14)),
    adxFailCount: adxFail.length,
    adxFailMean: mean(adxFail.map((r) => r.adx14)),
    passedCount: passed.length,
    passedMean: mean(passed.map((r) => r.adx14)),
  };
}

export function auditAdxDetail(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
  toDate?: string;
}): ForwardAdxAuditReport {
  const fromDate = input.fromDate ?? FORWARD_SIGNAL_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const rows = collectEvaluations({ bundle: input.bundle, fromDate, toDate });

  const withAdx = rows.filter((r) => r.adx14 != null) as Array<EvalRow & { adx14: number }>;
  const adxPrimaryFail = withAdx.filter((r) => r.category === 'adx');
  const passed = withAdx.filter((r) => r.passes);

  const distribution = buildDistribution(rows);
  const adxFailMean = mean(adxPrimaryFail.map((r) => r.adx14));
  const passedMean = mean(passed.map((r) => r.adx14));
  const perEtf = FORWARD_ETF_UNIVERSE.map((s) => etfAdxStats(rows, s));

  const humanLines = [
    `【ADX詳細監査】${fromDate} ～ ${toDate}`,
    `評価数 ${rows.length}（ADX算出可能 ${withAdx.length}）`,
    '',
    '■ ADX分布',
    ...distribution.map((b) => `${b.label}: ${b.count}件 (${b.pct}%)`),
    '',
    `■ ADX不足（第一失格）${adxPrimaryFail.length}件 — 平均 ADX ${adxFailMean ?? '—'}`,
    `■ 条件適合 ${passed.length}件 — 平均 ADX ${passedMean ?? '—'}`,
    '',
    '■ ETF別 ADX平均（全評価）',
    ...perEtf.map(
      (e) =>
        `${e.symbol}: 平均 ${e.adxMeanAll ?? '—'} · ADX失格 ${e.adxFailCount}件(均${e.adxFailMean ?? '—'}) · 適合 ${e.passedCount}件(均${e.passedMean ?? '—'})`,
    ),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    totalEvaluations: rows.length,
    adxAvailableCount: withAdx.length,
    adxPrimaryFailCount: adxPrimaryFail.length,
    adxPrimaryFailMean: adxFailMean,
    passedCount: passed.length,
    passedMean,
    distribution,
    perEtf,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatAdxAuditCsv(report: ForwardAdxAuditReport): string {
  const lines = [
    'section,key,value',
    `meta,fromDate,${report.fromDate}`,
    `meta,toDate,${report.toDate}`,
    `meta,adxPrimaryFailCount,${report.adxPrimaryFailCount}`,
    `meta,adxPrimaryFailMean,${report.adxPrimaryFailMean ?? ''}`,
    `meta,passedCount,${report.passedCount}`,
    `meta,passedMean,${report.passedMean ?? ''}`,
    '',
    'distribution,label,count,pct',
    ...report.distribution.map((b) => `distribution,${b.label},${b.count},${b.pct}`),
    '',
    'etf,symbol,evalCount,adxMeanAll,adxFailCount,adxFailMean,passedCount,passedMean',
    ...report.perEtf.map(
      (e) =>
        `etf,${e.symbol},${e.evaluationCount},${e.adxMeanAll ?? ''},${e.adxFailCount},${e.adxFailMean ?? ''},${e.passedCount},${e.passedMean ?? ''}`,
    ),
  ];
  return lines.join('\n');
}
