/**
 * down × 52w≤-10% 3期間再現性監査 — 29件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardDownDist10PeriodId,
  ForwardDownDist10PeriodStats,
  ForwardDownDist10ReproAuditReport,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';

const COHORT_LABEL = 'down × 52w≤-10%';

const PERIOD_DEFS: {
  id: ForwardDownDist10PeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
}[] = [
  { id: 'p2024_h1', labelJa: '2024年前半', fromDate: '2024-01-01', toDate: '2024-06-30' },
  {
    id: 'p2024h2_2025h1',
    labelJa: '2024後半〜2025前半',
    fromDate: '2024-07-01',
    toDate: '2025-06-30',
  },
  { id: 'p2025h2_on', labelJa: '2025後半〜2026', fromDate: '2025-07-01', toDate: '2099-12-31' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function matchesDownDist10(trade: ForwardPassedTradeRecord): boolean {
  return classifyRegimeGroup(trade.bucket) === 'down' && trade.dist52wPct <= -10;
}

function inPeriod(signalDate: string, fromDate: string, toDate: string): boolean {
  return signalDate >= fromDate && signalDate <= toDate;
}

function periodStats(
  def: (typeof PERIOD_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
): ForwardDownDist10PeriodStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const maxHold = trades.filter((t) => t.exitReason === 'max_hold');
  const toDate =
    def.toDate === '2099-12-31'
      ? trades.reduce((max, t) => (t.signalDate > max ? t.signalDate : max), def.fromDate)
      : def.toDate;

  return {
    id: def.id,
    labelJa: def.labelJa,
    fromDate: def.fromDate,
    toDate: trades.length > 0 && def.toDate === '2099-12-31' ? toDate : def.toDate,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(trades.map((t) => t.returnPct)),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
    maxHoldRatePct: trades.length > 0 ? round3((maxHold.length / trades.length) * 100) : 0,
  };
}

function formatPeriodLine(p: ForwardDownDist10PeriodStats, latestDate: string): string {
  const end =
    p.id === 'p2025h2_on'
      ? latestDate
      : p.toDate === '2099-12-31'
        ? latestDate
        : p.toDate;
  const range = `${p.fromDate}～${end}`;
  return (
    `■ ${p.labelJa}（${range}）\n` +
    `${p.tradeCount}件 · 勝率${p.winRatePct}% · 均R${p.avgReturnPct ?? '—'}% · ` +
    `利確${p.takeProfitRatePct}% · 25日満了${p.maxHoldRatePct}%`
  );
}

export function auditDownDist10Repro(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardDownDist10ReproAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesDownDist10);

  const byPeriod = new Map<ForwardDownDist10PeriodId, ForwardPassedTradeRecord[]>();
  for (const def of PERIOD_DEFS) byPeriod.set(def.id, []);

  let unassigned = 0;
  for (const t of cohort) {
    let placed = false;
    for (const def of PERIOD_DEFS) {
      if (inPeriod(t.signalDate, def.fromDate, def.toDate === '2099-12-31' ? '2099-12-31' : def.toDate)) {
        byPeriod.get(def.id)!.push(t);
        placed = true;
        break;
      }
    }
    if (!placed) unassigned++;
  }

  const periods = PERIOD_DEFS.map((def) =>
    periodStats(def, byPeriod.get(def.id) ?? []),
  );

  const lastPeriod = periods[periods.length - 1]!;
  if (lastPeriod.tradeCount > 0) {
    lastPeriod.toDate = input.bundle.latestDate;
  }

  const humanLines = [
    `【down × 52w≤-10% 再現性監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 ${COHORT_LABEL} · ${cohort.length}件${unassigned > 0 ? ` · 期間外 ${unassigned}件` : ''}`,
    '（時系列3分割 · シグナル日基準）',
    '',
    ...periods.map((p) => formatPeriodLine(p, input.bundle.latestDate)),
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    cohortLabelJa: COHORT_LABEL,
    matchedCount: cohort.length,
    periods,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatDownDist10ReproCsv(report: ForwardDownDist10ReproAuditReport): string {
  const header =
    'period,fromDate,toDate,tradeCount,winCount,winRatePct,avgReturnPct,takeProfitRatePct,maxHoldRatePct';
  const rows = report.periods.map((p) =>
    [
      p.labelJa,
      p.fromDate,
      p.toDate,
      p.tradeCount,
      p.winCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.takeProfitRatePct,
      p.maxHoldRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
