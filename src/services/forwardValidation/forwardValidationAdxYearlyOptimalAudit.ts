/**
 * 最重要監査その21 — 年度別ADX最適値検証 · ADX>20 vs >25 · 2018〜 · 監査のみ
 */
import { FORWARD_ADX_MIN } from '../../constants/forwardValidation';
import type {
  ForwardAdxYearlyCompareRow,
  ForwardAdxYearlyOptimalAuditReport,
  ForwardAdxYearlyOptimalVerdict,
  ForwardAdxYearlyThresholdMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { runAdxThresholdOperational } from './forwardValidationAdxSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const ADX20 = 20;
const ADX25 = FORWARD_ADX_MIN;

export const ADX_YEARLY_OPTIMAL_YEARS = [
  '2018',
  '2019',
  '2020',
  '2021',
  '2022',
  '2023',
  '2024',
  '2025',
  '2026',
] as const;

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

export function tradesInSignalYear(
  trades: ForwardPassedTradeRecord[],
  year: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const yearFrom = `${year}-01-01`;
  const yearEnd = year === '2026' ? toDate : `${year}-12-31`;
  const rangeEnd = yearEnd <= toDate ? yearEnd : toDate;
  return trades.filter((t) => t.signalDate >= yearFrom && t.signalDate <= rangeEnd);
}

export function buildAdxYearlyThresholdMetrics(
  trades: ForwardPassedTradeRecord[],
): ForwardAdxYearlyThresholdMetrics {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  return {
    tradeCount: trades.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
    maxDrawdownPct: portfolioMaxDrawdownPct(exitOrderedReturns(trades)),
  };
}

export function evaluateYearSuperiority(
  adx20: ForwardAdxYearlyThresholdMetrics,
  adx25: ForwardAdxYearlyThresholdMetrics,
): 'adx20' | 'adx25' | 'tie' {
  if (adx20.cumulativeReturnPct > adx25.cumulativeReturnPct) return 'adx20';
  if (adx25.cumulativeReturnPct > adx20.cumulativeReturnPct) return 'adx25';
  return 'tie';
}

export function buildAdxYearlyCompareRow(
  year: string,
  adx20Trades: ForwardPassedTradeRecord[],
  adx25Trades: ForwardPassedTradeRecord[],
): ForwardAdxYearlyCompareRow {
  const adx20 = buildAdxYearlyThresholdMetrics(adx20Trades);
  const adx25 = buildAdxYearlyThresholdMetrics(adx25Trades);
  return {
    year,
    adx20,
    adx25,
    cumulativeDelta20Minus25: round3(adx20.cumulativeReturnPct - adx25.cumulativeReturnPct),
    superiorThreshold: evaluateYearSuperiority(adx20, adx25),
  };
}

export function evaluateAdxYearlyOptimal(input: {
  yearlyRows: ForwardAdxYearlyCompareRow[];
  adx20SuperiorYearCount: number;
  adx25SuperiorYearCount: number;
  adx20SuperiorYears: string[];
  adx25SuperiorYears: string[];
}): { verdict: ForwardAdxYearlyOptimalVerdict; verdictJa: string } {
  const {
    yearlyRows,
    adx20SuperiorYearCount,
    adx25SuperiorYearCount,
    adx20SuperiorYears,
    adx25SuperiorYears,
  } = input;

  const activeYears = yearlyRows.filter(
    (r) => r.adx20.tradeCount > 0 || r.adx25.tradeCount > 0,
  ).length;

  if (activeYears === 0) {
    return { verdict: 'mixed', verdictJa: '全年度でトレードなし。' };
  }

  if (
    adx20SuperiorYearCount === 1 &&
    adx20SuperiorYears[0] === '2020' &&
    adx25SuperiorYearCount >= 1
  ) {
    return {
      verdict: 'year_2020_only',
      verdictJa:
        `ADX20優位は2020年のみ（Δ${yearlyRows.find((r) => r.year === '2020')?.cumulativeDelta20Minus25 ?? '—'}%）。` +
        `ADX25優位${adx25SuperiorYearCount}年（${adx25SuperiorYears.join('、')}）。` +
        `2020年特化の見かけ優位 — 複数年度再現なし。`,
    };
  }

  if (adx20SuperiorYearCount >= 2) {
    return {
      verdict: 'multi_year_adx20',
      verdictJa:
        `ADX20優位${adx20SuperiorYearCount}年（${adx20SuperiorYears.join('、')}）— 2020年だけに限定されない。` +
        `ADX25優位${adx25SuperiorYearCount}年（${adx25SuperiorYears.join('、') || '—'}）。`,
    };
  }

  if (adx25SuperiorYearCount > adx20SuperiorYearCount) {
    return {
      verdict: 'adx25_dominant',
      verdictJa:
        `ADX25優位${adx25SuperiorYearCount}年 vs ADX20優位${adx20SuperiorYearCount}年。` +
        `ADX25: ${adx25SuperiorYears.join('、')} / ADX20: ${adx20SuperiorYears.join('、') || '—'}。` +
        `現行ADX>25が年度別でも優位。`,
    };
  }

  return {
    verdict: 'mixed',
    verdictJa:
      `混合: ADX20優位${adx20SuperiorYearCount}年（${adx20SuperiorYears.join('、') || '—'}）· ` +
      `ADX25優位${adx25SuperiorYearCount}年（${adx25SuperiorYears.join('、') || '—'}）。` +
      `単年依存か複年再現か断定困難。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function fmtMetric(v: number | null, suffix = ''): string {
  return v != null ? `${v}${suffix}` : '—';
}

function formatYearCompareTable(rows: ForwardAdxYearlyCompareRow[]): string[] {
  const header =
    '年    ADX20件 WR20  均20  累20  DD20  | ADX25件 WR25  均25  累25  DD25  | Δ累積 優位';
  const sep = '-'.repeat(header.length);
  const line = (r: ForwardAdxYearlyCompareRow) => {
    const sup =
      r.superiorThreshold === 'adx20' ? '20' : r.superiorThreshold === 'adx25' ? '25' : '同';
    const a = r.adx20;
    const b = r.adx25;
    return [
      pad(r.year, 4),
      pad(String(a.tradeCount), 3),
      pad(fmtMetric(a.winRatePct), 5),
      pad(fmtMetric(a.avgReturnPct), 5),
      pad(fmtMetric(a.cumulativeReturnPct), 5),
      pad(fmtMetric(a.maxDrawdownPct), 5),
      '|',
      pad(String(b.tradeCount), 3),
      pad(fmtMetric(b.winRatePct), 5),
      pad(fmtMetric(b.avgReturnPct), 5),
      pad(fmtMetric(b.cumulativeReturnPct), 5),
      pad(fmtMetric(b.maxDrawdownPct), 5),
      '|',
      pad(fmtMetric(r.cumulativeDelta20Minus25), 5),
      sup,
    ].join(' ');
  };
  return [header, sep, ...rows.map(line)];
}

export function auditAdxYearlyOptimal(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardAdxYearlyOptimalAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const adx20All = runAdxThresholdOperational(input.bundle, fromDate, toDate, ADX20);
  const adx25All = runAdxThresholdOperational(input.bundle, fromDate, toDate, ADX25);

  const yearlyRows = ADX_YEARLY_OPTIMAL_YEARS.map((year) =>
    buildAdxYearlyCompareRow(
      year,
      tradesInSignalYear(adx20All, year, toDate),
      tradesInSignalYear(adx25All, year, toDate),
    ),
  );

  const adx20SuperiorYears = yearlyRows
    .filter((r) => r.superiorThreshold === 'adx20')
    .map((r) => r.year);
  const adx25SuperiorYears = yearlyRows
    .filter((r) => r.superiorThreshold === 'adx25')
    .map((r) => r.year);
  const tieYearCount = yearlyRows.filter((r) => r.superiorThreshold === 'tie').length;

  const { verdict, verdictJa } = evaluateAdxYearlyOptimal({
    yearlyRows,
    adx20SuperiorYearCount: adx20SuperiorYears.length,
    adx25SuperiorYearCount: adx25SuperiorYears.length,
    adx20SuperiorYears,
    adx25SuperiorYears,
  });

  const verdictLabel: Record<ForwardAdxYearlyOptimalVerdict, string> = {
    multi_year_adx20: '複数年ADX20',
    year_2020_only: '2020年のみ',
    adx25_dominant: 'ADX25優位',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その21】年度別ADX最適値検証 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '比較: ADX>20 vs ADX>25（実運用シミュレーション · シグナル日で年度分割）',
    '監査のみ · ルール変更なし',
    '',
    '■ 年度別比較（件数 · 勝率 · 平均利益 · 累積 · 最大DD）',
    ...formatYearCompareTable(yearlyRows),
    '',
    `■ 優位年数集計: ADX20=${adx20SuperiorYears.length}年 · ADX25=${adx25SuperiorYears.length}年 · 同点=${tieYearCount}年`,
    `ADX20優位: ${adx20SuperiorYears.length > 0 ? adx20SuperiorYears.join('、') : '—'}`,
    `ADX25優位: ${adx25SuperiorYears.length > 0 ? adx25SuperiorYears.join('、') : '—'}`,
    '',
    `■ 判定: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    years: [...ADX_YEARLY_OPTIMAL_YEARS],
    yearlyRows,
    adx20SuperiorYearCount: adx20SuperiorYears.length,
    adx25SuperiorYearCount: adx25SuperiorYears.length,
    tieYearCount,
    adx20SuperiorYears,
    adx25SuperiorYears,
    verdict,
    verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runAdxYearlyOptimalAudit(): Promise<ForwardAdxYearlyOptimalAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditAdxYearlyOptimal({ bundle });
}

export function formatAdxYearlyOptimalCsv(
  report: ForwardAdxYearlyOptimalAuditReport,
): string {
  const rows = report.yearlyRows.map((r) =>
    [
      r.year,
      r.adx20.tradeCount,
      r.adx20.winRatePct,
      r.adx20.avgReturnPct ?? '',
      r.adx20.cumulativeReturnPct,
      r.adx20.maxDrawdownPct ?? '',
      r.adx25.tradeCount,
      r.adx25.winRatePct,
      r.adx25.avgReturnPct ?? '',
      r.adx25.cumulativeReturnPct,
      r.adx25.maxDrawdownPct ?? '',
      r.cumulativeDelta20Minus25,
      r.superiorThreshold,
    ].join(','),
  );

  return [
    'year,adx20_tradeCount,adx20_winRatePct,adx20_avgReturnPct,adx20_cumulativeReturnPct,adx20_maxDrawdownPct,adx25_tradeCount,adx25_winRatePct,adx25_avgReturnPct,adx25_cumulativeReturnPct,adx25_maxDrawdownPct,cumulativeDelta20Minus25,superiorThreshold',
    ...rows,
    '',
    `adx20SuperiorYearCount,${report.adx20SuperiorYearCount}`,
    `adx25SuperiorYearCount,${report.adx25SuperiorYearCount}`,
    `tieYearCount,${report.tieYearCount}`,
    `verdict,${report.verdict}`,
  ].join('\n');
}
