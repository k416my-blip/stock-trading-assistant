/**
 * MACD≥0.25 × 52w≤-5% ETF別成績監査 — ルール変更なし
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type { ForwardEtfSymbol } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52EtfAuditReport,
  ForwardMacdDist52EtfStats,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { matchesMacdDist52 } from './forwardValidationMacdDist52PeriodAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;
const COHORT_LABEL = `MACD>=${MACD_THRESHOLD} × 52w<=${DIST52_THRESHOLD}%`;

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

function buildEtfStats(symbol: ForwardEtfSymbol, cohort: ReturnType<typeof auditPassedTrades>['trades']): ForwardMacdDist52EtfStats {
  const rows = cohort.filter((t) => t.symbol === symbol);
  const wins = rows.filter((t) => t.returnPct > 0);
  const maxHold = rows.filter((t) => t.exitReason === 'max_hold');
  const returns = rows.map((t) => t.returnPct);
  return {
    symbol,
    tradeCount: rows.length,
    winCount: wins.length,
    winRatePct: rows.length > 0 ? round3((wins.length / rows.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: rows.length > 0 ? round3((maxHold.length / rows.length) * 100) : 0,
  };
}

function formatEtf(e: ForwardMacdDist52EtfStats): string {
  return (
    `${e.symbol}: ${e.tradeCount}件 · 勝率${e.winRatePct}% · 均R${e.avgReturnPct ?? '—'}% · ` +
    `Sharpe${e.sharpe ?? '—'} · 25日満了${e.maxHoldRatePct}%`
  );
}

export function auditMacdDist52Etf(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52EtfAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesMacdDist52);
  const etfRows = FORWARD_ETF_UNIVERSE.map((s) => buildEtfStats(s, cohort));

  const humanLines = [
    `【MACD×52w ETF別監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · ${COHORT_LABEL} · 該当 ${cohort.length}件`,
    '（現行出口+3%/25日 · 監査のみ）',
    '',
    '■ ETF別',
    ...etfRows.map(formatEtf),
    '',
    '※ Sharpe = ETF内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    cohortLabelJa: COHORT_LABEL,
    cohortTradeCount: cohort.length,
    macdThreshold: MACD_THRESHOLD,
    dist52Threshold: DIST52_THRESHOLD,
    etfRows,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52EtfCsv(report: ForwardMacdDist52EtfAuditReport): string {
  const header = 'symbol,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const rows = report.etfRows.map((e) =>
    [e.symbol, e.tradeCount, e.winRatePct, e.avgReturnPct ?? '', e.sharpe ?? '', e.maxHoldRatePct].join(','),
  );
  return [header, ...rows].join('\n');
}
