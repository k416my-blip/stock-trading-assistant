/**
 * MACD≥0.25 × 52w≤-5% 期間別監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardMacdDist52PeriodAuditReport,
  ForwardMacdDist52PeriodStats,
  ForwardPassedTradeRecord,
  ForwardStandalonePeriodId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const MACD_THRESHOLD = 0.25;
const DIST52_THRESHOLD = -5;
const COHORT_LABEL = `MACD>=${MACD_THRESHOLD} × 52w<=${DIST52_THRESHOLD}%`;

const PERIOD_DEFS: {
  id: ForwardStandalonePeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
}[] = [
  { id: 'y2024', labelJa: '2024年', fromDate: '2024-01-01', toDate: '2024-12-31' },
  { id: 'y2025_h1', labelJa: '2025年前半', fromDate: '2025-01-01', toDate: '2025-06-30' },
  { id: 'y2025_h2', labelJa: '2025年後半', fromDate: '2025-07-01', toDate: '2099-12-31' },
];

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

function inPeriod(signalDate: string, fromDate: string, toDate: string): boolean {
  return signalDate >= fromDate && signalDate <= toDate;
}

export function matchesMacdDist52(t: ForwardPassedTradeRecord): boolean {
  return t.macdHistPct >= MACD_THRESHOLD && t.dist52wPct <= DIST52_THRESHOLD;
}

function buildPeriodStats(
  periodDef: (typeof PERIOD_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
  latestDate: string,
): ForwardMacdDist52PeriodStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const returns = trades.map((t) => t.returnPct);
  const toDate = periodDef.toDate === '2099-12-31' ? latestDate : periodDef.toDate;

  return {
    periodId: periodDef.id,
    periodLabelJa: periodDef.labelJa,
    fromDate: periodDef.fromDate,
    toDate,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatPeriod(p: ForwardMacdDist52PeriodStats): string {
  return (
    `${p.periodLabelJa}: ${p.tradeCount}件 · 勝率${p.winRatePct}% · 均R${p.avgReturnPct ?? '—'}% · ` +
    `Sharpe${p.sharpe ?? '—'} · 25日満了${p.maxHoldRatePct}%`
  );
}

export function auditMacdDist52Period(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardMacdDist52PeriodAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesMacdDist52);

  const periods = PERIOD_DEFS.map((def) => {
    const toDate = def.toDate === '2099-12-31' ? input.bundle.latestDate : def.toDate;
    const periodTrades = cohort.filter((t) => inPeriod(t.signalDate, def.fromDate, toDate));
    return buildPeriodStats(def, periodTrades, input.bundle.latestDate);
  });

  const humanLines = [
    `【MACD×52w 期間別監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · フィルタ ${COHORT_LABEL} · 該当 ${cohort.length}件`,
    '（シグナル日基準 · 現行出口+3%/25日 · 監査のみ）',
    '',
    ...periods.map((p) => formatPeriod(p)),
    '',
    '※ Sharpe = 期間内トレードリターンの mean/std（2件未満は—）',
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
    periods,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatMacdDist52PeriodCsv(report: ForwardMacdDist52PeriodAuditReport): string {
  const header =
    'period,fromDate,toDate,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct';
  const rows = report.periods.map((p) =>
    [
      p.periodLabelJa,
      p.fromDate,
      p.toDate,
      p.tradeCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.sharpe ?? '',
      p.maxHoldRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
