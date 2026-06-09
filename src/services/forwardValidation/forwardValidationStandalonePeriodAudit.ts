/**
 * MACD≥0.25 / SPY down 単独 · 期間別成績監査 — 条件適合96件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardStandalonePeriodAuditReport,
  ForwardStandalonePeriodCell,
  ForwardStandalonePeriodFilterId,
  ForwardStandalonePeriodId,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const MACD_THRESHOLD = 0.25;

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

const FILTER_DEFS: {
  id: ForwardStandalonePeriodFilterId;
  labelJa: string;
  match: (t: ForwardPassedTradeRecord) => boolean;
}[] = [
  {
    id: 'macd_high',
    labelJa: `MACD>=${MACD_THRESHOLD}（単独）`,
    match: (t) => t.macdHistPct >= MACD_THRESHOLD,
  },
  {
    id: 'spy_down',
    labelJa: 'SPY down（単独）',
    match: (t) => classifyRegimeGroup(t.bucket) === 'down',
  },
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

function buildCell(
  filterId: ForwardStandalonePeriodFilterId,
  filterLabelJa: string,
  periodDef: (typeof PERIOD_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
  latestDate: string,
): ForwardStandalonePeriodCell {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  const toDate = periodDef.toDate === '2099-12-31' ? latestDate : periodDef.toDate;

  return {
    filterId,
    filterLabelJa,
    periodId: periodDef.id,
    periodLabelJa: periodDef.labelJa,
    fromDate: periodDef.fromDate,
    toDate,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
  };
}

function formatCell(c: ForwardStandalonePeriodCell): string {
  return (
    `${c.periodLabelJa}: ${c.tradeCount}件 · 勝率${c.winRatePct}% · ` +
    `均R${c.avgReturnPct ?? '—'}% · Sharpe${c.sharpe ?? '—'}`
  );
}

export function auditStandalonePeriod(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardStandalonePeriodAuditReport {
  const passed = auditPassedTrades(input);
  const all = passed.trades;

  const cells: ForwardStandalonePeriodCell[] = [];

  for (const filter of FILTER_DEFS) {
    const cohort = all.filter(filter.match);
    for (const period of PERIOD_DEFS) {
      const toDate = period.toDate === '2099-12-31' ? input.bundle.latestDate : period.toDate;
      const periodTrades = cohort.filter((t) => inPeriod(t.signalDate, period.fromDate, toDate));
      cells.push(buildCell(filter.id, filter.labelJa, period, periodTrades, input.bundle.latestDate));
    }
  }

  const humanLines = [
    `【MACD/SPY down 単独 期間別監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · シグナル日基準 · 現行出口+3%/25日`,
    '（監査のみ・ルール変更・最適化なし）',
    '',
    ...FILTER_DEFS.flatMap((filter) => {
      const filterCells = cells.filter((c) => c.filterId === filter.id);
      return [`■ ${filter.labelJa}`, ...filterCells.map(formatCell), ''];
    }),
    '※ Sharpe = 期間×フィルタ内トレードリターンの mean/std（2件未満は—）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    macdThreshold: MACD_THRESHOLD,
    cells,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatStandalonePeriodCsv(report: ForwardStandalonePeriodAuditReport): string {
  const header =
    'filter,period,fromDate,toDate,tradeCount,winRatePct,avgReturnPct,sharpe';
  const rows = report.cells.map((c) =>
    [
      c.filterLabelJa,
      c.periodLabelJa,
      c.fromDate,
      c.toDate,
      c.tradeCount,
      c.winRatePct,
      c.avgReturnPct ?? '',
      c.sharpe ?? '',
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
