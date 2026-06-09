/**
 * MACD≥0.25 · 2025年4〜5月除外 再集計監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdExclSpringAuditReport,
  ForwardMacdExclSpringSnapshot,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const MACD_THRESHOLD = 0.25;
const EXCLUDE_MONTHS = ['2025-04', '2025-05'] as const;
const FILTER_LABEL = `MACD>=${MACD_THRESHOLD}（単独）`;

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

function matchesMacdHigh(t: ForwardPassedTradeRecord): boolean {
  return t.macdHistPct >= MACD_THRESHOLD;
}

function isSpring2025(signalDate: string): boolean {
  return (EXCLUDE_MONTHS as readonly string[]).includes(monthKey(signalDate));
}

function buildSnapshot(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
): ForwardMacdExclSpringSnapshot {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  return {
    labelJa,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatSnap(s: ForwardMacdExclSpringSnapshot): string {
  return (
    `${s.labelJa}: ${s.tradeCount}件 · 勝率${s.winRatePct}% · 均R${s.avgReturnPct ?? '—'}% · ` +
    `Sharpe${s.sharpe ?? '—'} · 25日満了${s.maxHoldRatePct}%`
  );
}

export function auditMacdExclSpring(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdExclSpringAuditReport {
  const passed = auditPassedTrades(input);
  const macdAll = passed.trades.filter(matchesMacdHigh);
  const excluded = macdAll.filter((t) => isSpring2025(t.signalDate));
  const remaining = macdAll.filter((t) => !isSpring2025(t.signalDate));

  const full = buildSnapshot('MACD≥0.25 全件', macdAll);
  const excludedSnap = buildSnapshot(`${EXCLUDE_MONTHS.join('・')}除外分`, excluded);
  const remainingSnap = buildSnapshot(`${EXCLUDE_MONTHS.join('・')}除外後`, remaining);

  const humanLines = [
    `【MACD 4〜5月除外 再集計監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · ${FILTER_LABEL} · 該当 ${macdAll.length}件`,
    `除外: ${EXCLUDE_MONTHS.join(', ')}シグナル ${excluded.length}件`,
    '（監査のみ・ルール変更・最適化なし）',
    '',
    '■ 除外前（参考）',
    formatSnap(full),
    '',
    '■ 除外対象',
    formatSnap(excludedSnap),
    '',
    '■ 除外後（再集計）',
    formatSnap(remainingSnap),
    '',
    '※ Sharpe = グループ内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    filterLabelJa: FILTER_LABEL,
    macdThreshold: MACD_THRESHOLD,
    excludeMonths: [...EXCLUDE_MONTHS],
    macdCohortCount: macdAll.length,
    excludedCount: excluded.length,
    remainingCount: remaining.length,
    full,
    excluded: excludedSnap,
    remaining: remainingSnap,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdExclSpringCsv(report: ForwardMacdExclSpringAuditReport): string {
  const header = 'group,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const row = (g: ForwardMacdExclSpringSnapshot) =>
    [g.labelJa, g.tradeCount, g.winRatePct, g.avgReturnPct ?? '', g.sharpe ?? '', g.maxHoldRatePct].join(
      ',',
    );
  return [header, row(report.full), row(report.excluded), row(report.remaining)].join('\n');
}
