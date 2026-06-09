/**
 * 最強セル月別・4月クラスター監査 — MACD≥0.25 × 52w≤-5% × SPY down · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardStrongCellMonthlyAuditReport,
  ForwardStrongCellMonthlyRow,
  ForwardStrongCellMonthlySnapshot,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;
const APRIL_2025_MONTH = '2025-04';
const STRONG_CELL_LABEL = `MACD≥${MACD_THRESHOLD} × 52w≤${DIST52_THRESHOLD}% × SPY down`;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function tradeSharpe(returns: number[]): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

export function matchesStrongestCell(t: ForwardPassedTradeRecord): boolean {
  return (
    t.macdHistPct >= MACD_THRESHOLD &&
    t.dist52wPct <= DIST52_THRESHOLD &&
    classifyRegimeGroup(t.bucket) === 'down'
  );
}

function buildSnapshot(trades: ForwardPassedTradeRecord[]): ForwardStrongCellMonthlySnapshot {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function buildMonthlyRow(month: string, trades: ForwardPassedTradeRecord[]): ForwardStrongCellMonthlyRow {
  const snap = buildSnapshot(trades);
  return { month, ...snap };
}

function formatSnapshot(label: string, s: ForwardStrongCellMonthlySnapshot): string {
  return (
    `${label}: ${s.tradeCount}件 · 勝率${s.winRatePct}% · 均R${s.avgReturnPct ?? '—'}% · ` +
    `Sharpe${s.sharpe ?? '—'} · 25日満了${s.maxHoldRatePct}%`
  );
}

function formatMonthRow(r: ForwardStrongCellMonthlyRow): string {
  return (
    `${r.month}: ${r.tradeCount}件 · 勝率${r.winRatePct}% · 均R${r.avgReturnPct ?? '—'}% · ` +
    `Sharpe${r.sharpe ?? '—'} · 25日満了${r.maxHoldRatePct}%`
  );
}

export function auditStrongCellMonthly(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardStrongCellMonthlyAuditReport {
  const passed = auditPassedTrades(input);
  const strong = passed.trades.filter(matchesStrongestCell);

  const byMonth = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of strong) {
    const m = monthKey(t.signalDate);
    const list = byMonth.get(m) ?? [];
    list.push(t);
    byMonth.set(m, list);
  }

  const monthlyRows = [...byMonth.keys()]
    .sort()
    .map((month) => buildMonthlyRow(month, byMonth.get(month)!));

  const aprilCluster = strong.filter((t) => monthKey(t.signalDate) === APRIL_2025_MONTH);
  const excludingApril = strong.filter((t) => monthKey(t.signalDate) !== APRIL_2025_MONTH);

  const fullPeriod = buildSnapshot(strong);
  const aprilClusterStats = buildSnapshot(aprilCluster);
  const excludingAprilStats = buildSnapshot(excludingApril);

  const humanLines = [
    `【最強セル月別監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `セル: ${STRONG_CELL_LABEL} · 条件適合母集団 ${passed.tradeCount}件 · 最強セル ${strong.length}件`,
    '（現行出口+3%/25日 · ルール変更・最適化なし）',
    '',
    '■ 月別（件数・勝率・均R・Sharpe・25日満了率）',
    ...(monthlyRows.length > 0 ? monthlyRows.map(formatMonthRow) : ['（該当なし）']),
    '',
    '■ 全体',
    formatSnapshot('全期間', fullPeriod),
    '',
    `■ ${APRIL_2025_MONTH}クラスターのみ（${aprilCluster.length}件）`,
    formatSnapshot(APRIL_2025_MONTH, aprilClusterStats),
    '',
    `■ ${APRIL_2025_MONTH}除外後（${excludingApril.length}件）`,
    formatSnapshot('除外後', excludingAprilStats),
    '',
    '※ Sharpe = グループ内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalPassedTrades: passed.tradeCount,
    strongCellLabelJa: STRONG_CELL_LABEL,
    strongCellTradeCount: strong.length,
    monthlyRows,
    fullPeriod,
    aprilMonth: APRIL_2025_MONTH,
    aprilClusterCount: aprilCluster.length,
    aprilCluster: aprilClusterStats,
    excludingApril: excludingAprilStats,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatStrongCellMonthlyCsv(report: ForwardStrongCellMonthlyAuditReport): string {
  const header = 'section,month,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const lines = [header];
  for (const r of report.monthlyRows) {
    lines.push(
      [
        'monthly',
        r.month,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.sharpe ?? '',
        r.maxHoldRatePct,
      ].join(','),
    );
  }
  const pushSnap = (section: string, s: ForwardStrongCellMonthlySnapshot) => {
    lines.push(
      [
        section,
        '',
        s.tradeCount,
        s.winRatePct,
        s.avgReturnPct ?? '',
        s.sharpe ?? '',
        s.maxHoldRatePct,
      ].join(','),
    );
  };
  pushSnap('full', report.fullPeriod);
  pushSnap('april_cluster', report.aprilCluster);
  pushSnap('excluding_april', report.excludingApril);
  return lines.join('\n');
}
