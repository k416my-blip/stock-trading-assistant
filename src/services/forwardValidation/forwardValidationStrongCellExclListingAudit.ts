/**
 * 最強セル 月除外後 全件一覧監査 — ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardStrongCellExclListingAuditReport,
  ForwardStrongCellExclListingRow,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesStrongestCell } from './forwardValidationStrongCellMonthlyAudit';

const STRONG_CELL_LABEL = 'MACD≥0.25 × 52w≤-5% × SPY down';
/**
 * 最強セル31件はシグナルが2025-04(20)・2025-05(11)のみ。
 * 4月・5月の両方を除外すると0件。残存11件は2025-04除外・2025-05残存。
 */
const EXCLUDE_MONTHS_FOR_LISTING = ['2025-04'] as const;
const EXCLUDE_MONTHS_BOTH_SPRING = ['2025-04', '2025-05'] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

function isExcludedMonth(month: string, months: readonly string[]): boolean {
  return months.includes(month);
}

function toListRow(t: ForwardPassedTradeRecord): ForwardStrongCellExclListingRow {
  return {
    signalDate: t.signalDate,
    entryDate: t.entryDate,
    exitDate: t.exitDate,
    symbol: t.symbol,
    returnPct: round3(t.returnPct),
    holdDays: t.holdDays,
    macdHistPct: round3(t.macdHistPct),
    adx14: round3(t.adx14),
    dist52wPct: round3(t.dist52wPct),
    exitReason: t.exitReason,
  };
}

function formatRow(r: ForwardStrongCellExclListingRow, index: number): string {
  return [
    `${index}. ${r.signalDate}`,
    `   ETF ${r.symbol} · R${r.returnPct}% · 保有${r.holdDays}日 · ${r.exitReason}`,
    `   MACD ${r.macdHistPct} · ADX ${r.adx14} · 52w ${r.dist52wPct}%`,
    `   入 ${r.entryDate} → 出 ${r.exitDate}`,
  ].join('\n');
}

export function auditStrongCellExclListing(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardStrongCellExclListingAuditReport {
  const passed = auditPassedTrades(input);
  const strong = passed.trades.filter(matchesStrongestCell);

  const monthBreakdown = strong.reduce<Record<string, number>>((acc, t) => {
    const m = monthKey(t.signalDate);
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  const excludedByMonth: Record<string, number> = {};
  for (const m of EXCLUDE_MONTHS_BOTH_SPRING) {
    excludedByMonth[m] = monthBreakdown[m] ?? 0;
  }

  const excludedBothMonths = strong.filter((t) =>
    isExcludedMonth(monthKey(t.signalDate), EXCLUDE_MONTHS_BOTH_SPRING),
  );
  const excludedForListing = strong.filter((t) =>
    isExcludedMonth(monthKey(t.signalDate), EXCLUDE_MONTHS_FOR_LISTING),
  );
  const remaining = strong
    .filter((t) => !isExcludedMonth(monthKey(t.signalDate), EXCLUDE_MONTHS_FOR_LISTING))
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate) || a.symbol.localeCompare(b.symbol));

  const rows = remaining.map(toListRow);

  const humanLines = [
    `【最強セル 4〜5月除外後 全件一覧監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `セル: ${STRONG_CELL_LABEL} · 最強セル ${strong.length}件`,
    '（監査のみ・ルール変更・最適化なし）',
    '',
    '■ 月別内訳',
    ...Object.entries(monthBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, n]) => `  ${m}: ${n}件`),
    '',
    `■ 2025-04・05 両月シグナル完全除外 → ${excludedBothMonths.length}件除外 · 残存0件`,
    `■ 本一覧（2025-04除外・2025-05残存）→ ${excludedForListing.length}件除外 · 残存${remaining.length}件`,
    '',
    '■ 残存トレード全件',
    ...(rows.length > 0 ? rows.map((r, i) => formatRow(r, i + 1)) : ['（該当なし）']),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    strongCellLabelJa: STRONG_CELL_LABEL,
    strongCellTradeCount: strong.length,
    excludeMonthsApplied: [...EXCLUDE_MONTHS_FOR_LISTING],
    excludeMonthsBothSpring: [...EXCLUDE_MONTHS_BOTH_SPRING],
    excludedCount: excludedForListing.length,
    excludedBothMonthsCount: excludedBothMonths.length,
    excludedByMonth,
    remainingCount: remaining.length,
    rows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatStrongCellExclListingCsv(report: ForwardStrongCellExclListingAuditReport): string {
  const header =
    'signalDate,entryDate,exitDate,symbol,returnPct,holdDays,macdHistPct,adx14,dist52wPct,exitReason';
  const lines = report.rows.map((r) =>
    [
      r.signalDate,
      r.entryDate,
      r.exitDate,
      r.symbol,
      r.returnPct,
      r.holdDays,
      r.macdHistPct,
      r.adx14,
      r.dist52wPct,
      r.exitReason,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
