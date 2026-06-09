/**
 * VIX≥24 拡張履歴監査 — 2018-01-01〜 · 2025年4〜5月以外の有効性 · 監査のみ
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardVix24ExtendedHistoryAuditReport,
  ForwardVix24HistoryPerformanceRow,
  ForwardVix24HistoryYearRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, type OhlcvBar } from './case4Indicators';
import { collectPassedTradesFrom } from './forwardValidationPassedTradesAudit';

export const EXTENDED_AUDIT_START = '2018-01-01';
const VIX_THRESHOLD = 24;
const CONDITION_LABEL = 'ADX+MACD+52w+SPY63（現行）+ VIX≥24';

const YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const SPECIAL_PERIODS: { id: string; labelJa: string; from: string; to: string }[] = [
  { id: 'corona', labelJa: '4. コロナショック (2020-02〜2020-05)', from: '2020-02-01', to: '2020-05-31' },
  { id: 'bear2022', labelJa: '5. 2022年ベア相場', from: '2022-01-01', to: '2022-12-31' },
  { id: 'bank2023', labelJa: '6. 2023年銀行危機', from: '2023-03-01', to: '2023-05-31' },
  { id: 'aprMay2025', labelJa: '7a. 2025年4〜5月', from: '2025-04-01', to: '2025-05-31' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return round3(vixBars[idx]!.close);
}

function computeTradeMaxDrawdown(
  bars: OhlcvBar[],
  t: ForwardPassedTradeRecord,
): number | null {
  const entryIdx = barIndexByDate(bars, t.entryDate);
  const exitIdx = barIndexByDate(bars, t.exitDate);
  if (entryIdx < 0 || exitIdx < entryIdx || t.entryPrice <= 0) return null;
  let mae = 0;
  for (let i = entryIdx; i <= exitIdx; i++) {
    const lowRet = (bars[i]!.low / t.entryPrice - 1) * 100;
    if (lowRet < mae) mae = lowRet;
  }
  return round3(mae);
}

export function filterVix24Trades(
  trades: ForwardPassedTradeRecord[],
  vixBars: OhlcvBar[],
): ForwardPassedTradeRecord[] {
  return trades.filter((t) => {
    const vix = vixAtDate(vixBars, t.signalDate);
    return vix != null && vix >= VIX_THRESHOLD;
  });
}

export function countVixGte24Days(
  vixBars: OhlcvBar[],
  dates: string[],
): number {
  let count = 0;
  for (const d of dates) {
    const vix = vixAtDate(vixBars, d);
    if (vix != null && vix >= VIX_THRESHOLD) count++;
  }
  return count;
}

function buildPerformanceRow(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
): ForwardVix24HistoryPerformanceRow {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  const dds: number[] = [];
  for (const t of trades) {
    const dd = computeTradeMaxDrawdown(bundle.etfBars[t.symbol], t);
    if (dd != null) dds.push(dd);
  }
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    avgMaxDrawdownPct: mean(dds),
    cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
  };
}

function tradesInRange(
  trades: ForwardPassedTradeRecord[],
  from: string,
  to: string,
): ForwardPassedTradeRecord[] {
  return trades.filter((t) => t.signalDate >= from && t.signalDate <= to);
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatYearTable(rows: ForwardVix24HistoryYearRow[]): string[] {
  const cols = [
    { w: 6, h: '年' },
    { w: 5, h: '件数' },
    { w: 7, h: '勝率%' },
    { w: 7, h: '均R%' },
    { w: 8, h: '最大DD%' },
    { w: 8, h: '累積%' },
    { w: 8, h: 'VIX日' },
    { w: 8, h: 'シグナル' },
  ];
  const line = (cells: string[]) => cols.map((c, i) => pad(cells[i] ?? '', c.w)).join(' ');
  return [
    line(cols.map((c) => c.h)),
    cols.map((c) => '-'.repeat(c.w)).join(' '),
    ...rows.map((r) =>
      line([
        r.year,
        String(r.tradeCount),
        String(r.winRatePct),
        r.avgReturnPct != null ? String(r.avgReturnPct) : '—',
        r.avgMaxDrawdownPct != null ? String(r.avgMaxDrawdownPct) : '—',
        String(r.cumulativeReturnPct),
        String(r.vixGte24Days),
        String(r.vixGte24SignalCount),
      ]),
    ),
  ];
}

function formatPerfRow(r: ForwardVix24HistoryPerformanceRow): string {
  return (
    `${r.labelJa}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · ` +
    `DD${r.avgMaxDrawdownPct ?? '—'}% · 累積${r.cumulativeReturnPct}%`
  );
}

export function auditVix24ExtendedHistory(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
  toDate?: string;
}): ForwardVix24ExtendedHistoryAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const vixBars = input.bundle.vixBars ?? [];

  const allPassed = collectPassedTradesFrom(input.bundle, fromDate, toDate);
  const cohort = filterVix24Trades(allPassed, vixBars);

function effectiveEndDate(periodEnd: string, auditEnd: string): string {
  return periodEnd <= auditEnd ? periodEnd : auditEnd;
}

  const yearly: ForwardVix24HistoryYearRow[] = YEARS.map((year) => {
    const yearFrom = `${year}-01-01`;
    const yearEnd = year === '2026' ? toDate : `${year}-12-31`;
    const rangeEnd = effectiveEndDate(yearEnd, toDate);
    const yearDates = input.bundle.tradingDates.filter(
      (d) => d >= yearFrom && d <= rangeEnd && d >= fromDate && d <= toDate,
    );
    const yearTrades = tradesInRange(cohort, yearFrom, rangeEnd);
    const perf = buildPerformanceRow(year, yearTrades, input.bundle);
    return {
      year,
      ...perf,
      vixGte24Days: countVixGte24Days(vixBars, yearDates),
      vixGte24SignalCount: yearTrades.length,
    };
  });

  const specialPeriods = SPECIAL_PERIODS.map((p) =>
    buildPerformanceRow(
      p.labelJa,
      tradesInRange(cohort, p.from, p.to),
      input.bundle,
    ),
  );

  const aprMay2025 = buildPerformanceRow(
    '2025年4〜5月',
    tradesInRange(cohort, '2025-04-01', '2025-05-31'),
    input.bundle,
  );
  const outsideAprMay = buildPerformanceRow(
    '2025年4〜5月以外',
    cohort.filter(
      (t) => t.signalDate < '2025-04-01' || t.signalDate > '2025-05-31',
    ),
    input.bundle,
  );

  const humanLines = [
    `【VIX≥24 拡張履歴監査】${fromDate} ～ ${toDate}`,
    `条件 ${CONDITION_LABEL} · 利確+${FORWARD_TAKE_PROFIT_PCT}%/${FORWARD_HOLD_DAYS}日 · 監査のみ`,
    `全期間シグナル ${cohort.length}件`,
    '',
    '■ 1. 年別成績',
    ...formatYearTable(yearly),
    '',
    '■ 2. VIX≥24発生日数（年別）',
    ...yearly.map((y) => `${y.year}: ${y.vixGte24Days}日`),
    '',
    '■ 3. VIX≥24シグナル件数（年別）',
    ...yearly.map((y) => `${y.year}: ${y.vixGte24SignalCount}件`),
    '',
    '■ 4〜6. 特定期間',
    ...specialPeriods.slice(0, 3).map(formatPerfRow),
    '',
    '■ 7. 2025年4〜5月 vs それ以外',
    formatPerfRow(aprMay2025),
    formatPerfRow(outsideAprMay),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    vixThreshold: VIX_THRESHOLD,
    conditionLabelJa: CONDITION_LABEL,
    totalSignalCount: cohort.length,
    yearly,
    specialPeriods,
    aprMay2025Comparison: [aprMay2025, outsideAprMay],
    outsideAprMay2025: outsideAprMay,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runVix24ExtendedHistoryAudit(): Promise<ForwardVix24ExtendedHistoryAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditVix24ExtendedHistory({ bundle });
}

export function formatVix24ExtendedHistoryCsv(
  report: ForwardVix24ExtendedHistoryAuditReport,
): string {
  const yearHeader =
    'year,tradeCount,winRatePct,avgReturnPct,avgMaxDrawdownPct,cumulativeReturnPct,vixGte24Days,vixGte24SignalCount';
  const yearRows = report.yearly.map((y) =>
    [
      y.year,
      y.tradeCount,
      y.winRatePct,
      y.avgReturnPct ?? '',
      y.avgMaxDrawdownPct ?? '',
      y.cumulativeReturnPct,
      y.vixGte24Days,
      y.vixGte24SignalCount,
    ].join(','),
  );
  const periodHeader =
    'period,tradeCount,winRatePct,avgReturnPct,avgMaxDrawdownPct,cumulativeReturnPct';
  const periodRows = [...report.specialPeriods, ...report.aprMay2025Comparison].map((p) =>
    [
      p.labelJa,
      p.tradeCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.avgMaxDrawdownPct ?? '',
      p.cumulativeReturnPct,
    ].join(','),
  );
  return [yearHeader, ...yearRows, '', periodHeader, ...periodRows].join('\n');
}
