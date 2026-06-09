/**
 * 最強セル適用時の除外・残存監査 — 条件適合96件・負け6件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardStrongCellFilterAuditReport } from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesStrongestCell } from './forwardValidationStrongCellMonthlyAudit';

const STRONG_CELL_LABEL = 'MACD≥0.25 × 52w≤-5% × SPY down';

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

function pct(part: number, whole: number): number {
  return whole > 0 ? round3((part / whole) * 100) : 0;
}

export function auditStrongCellFilter(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardStrongCellFilterAuditReport {
  const passed = auditPassedTrades(input);
  const all = passed.trades;
  const remaining = all.filter(matchesStrongestCell);
  const excluded = all.filter((t) => !matchesStrongestCell(t));

  const allWins = all.filter((t) => t.returnPct > 0);
  const allLosses = all.filter((t) => t.returnPct <= 0);
  const remainingWins = remaining.filter((t) => t.returnPct > 0);
  const remainingLosses = remaining.filter((t) => t.returnPct <= 0);
  const excludedWins = excluded.filter((t) => t.returnPct > 0);
  const excludedLosses = excluded.filter((t) => t.returnPct <= 0);

  const baselineWinRatePct = pct(allWins.length, all.length);
  const newWinRatePct = pct(remainingWins.length, remaining.length);
  const baselineSharpe = tradeSharpe(all.map((t) => t.returnPct));
  const newSharpe = tradeSharpe(remaining.map((t) => t.returnPct));

  const humanLines = [
    `【最強セル適用 除外・残存監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${all.length}件（勝ち${allWins.length} · 負け${allLosses.length}）`,
    `適用条件: ${STRONG_CELL_LABEL}（監査のみ・ルール変更なし）`,
    '',
    `除外件数: ${excluded.length}件 · 除外率 ${pct(excluded.length, all.length)}%`,
    `　うち勝ち除外 ${excludedWins.length} · 負け除外 ${excludedLosses.length}`,
    '',
    `残る件数: ${remaining.length}件 · 残存率 ${pct(remaining.length, all.length)}%`,
    `残った勝ち: ${remainingWins.length}件`,
    `残った負け: ${remainingLosses.length}件`,
    '',
    `新勝率: ${newWinRatePct}%（適用前 ${baselineWinRatePct}%）`,
    `新Sharpe: ${newSharpe ?? '—'}（適用前 ${baselineSharpe ?? '—'}）`,
    '',
    '※ 最強セルは既存96件のサブセット分類。実際のルール追加・最適化は行っていない。',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: all.length,
    totalWinners: allWins.length,
    totalLosers: allLosses.length,
    strongCellLabelJa: STRONG_CELL_LABEL,
    excludedCount: excluded.length,
    excludedRatePct: pct(excluded.length, all.length),
    excludedWinners: excludedWins.length,
    excludedLosers: excludedLosses.length,
    remainingCount: remaining.length,
    remainingRatePct: pct(remaining.length, all.length),
    remainingWinners: remainingWins.length,
    remainingLosers: remainingLosses.length,
    baselineWinRatePct,
    newWinRatePct,
    baselineSharpe,
    newSharpe,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatStrongCellFilterCsv(report: ForwardStrongCellFilterAuditReport): string {
  const header =
    'metric,value,excludedCount,excludedRatePct,remainingCount,remainingRatePct,remainingLosers,remainingWinners,newWinRatePct,newSharpe';
  const row = (metric: string, value: string | number) =>
    [
      metric,
      value,
      report.excludedCount,
      report.excludedRatePct,
      report.remainingCount,
      report.remainingRatePct,
      report.remainingLosers,
      report.remainingWinners,
      report.newWinRatePct,
      report.newSharpe ?? '',
    ].join(',');
  return [
    header,
    row('summary', report.strongCellLabelJa),
    `baseline,winRate=${report.baselineWinRatePct},sharpe=${report.baselineSharpe ?? ''}`,
    `excluded_breakdown,winners=${report.excludedWinners},losers=${report.excludedLosers}`,
  ].join('\n');
}
