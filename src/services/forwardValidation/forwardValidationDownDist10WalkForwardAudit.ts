/**
 * down × 52w≤-10% ウォークフォワード独立性検証 — 29件 · ルール変更なし
 */
import { FORWARD_SIGNAL_START } from '../../constants/forwardValidation';
import type {
  ForwardDownDist10WalkForwardAuditReport,
  ForwardDownDist10WalkForwardPeriodId,
  ForwardDownDist10WalkForwardPeriodStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { matchesDownDist10 } from './forwardValidationDownDist10ReproAudit';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const COHORT_LABEL = 'down × 52w≤-10%';

const PERIOD_DEFS: {
  id: ForwardDownDist10WalkForwardPeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
}[] = [
  { id: 'p2024_h2', labelJa: '2024後半', fromDate: '2024-07-01', toDate: '2024-12-31' },
  { id: 'p2025_h1', labelJa: '2025前半', fromDate: '2025-01-01', toDate: '2025-06-30' },
  { id: 'p2025_h2', labelJa: '2025後半', fromDate: '2025-07-01', toDate: '2099-12-31' },
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

function periodStats(
  def: (typeof PERIOD_DEFS)[number],
  trades: ForwardPassedTradeRecord[],
  latestDate: string,
): ForwardDownDist10WalkForwardPeriodStats {
  const wins = trades.filter((t) => t.returnPct > 0);
  const takeProfit = trades.filter((t) => t.exitReason === 'take_profit');
  const returns = trades.map((t) => t.returnPct);
  const toDate = def.toDate === '2099-12-31' ? latestDate : def.toDate;

  return {
    id: def.id,
    labelJa: def.labelJa,
    fromDate: def.fromDate,
    toDate,
    tradeCount: trades.length,
    winCount: wins.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    takeProfitRatePct: trades.length > 0 ? round3((takeProfit.length / trades.length) * 100) : 0,
  };
}

function buildIndependenceInsight(periods: ForwardDownDist10WalkForwardPeriodStats[]): string {
  const withTrades = periods.filter((p) => p.tradeCount > 0);
  const zeroPeriods = periods.filter((p) => p.tradeCount === 0).map((p) => p.labelJa);
  const lines: string[] = [];

  if (zeroPeriods.length > 0) {
    lines.push(`シグナル0件: ${zeroPeriods.join(' · ')} — 期間依存（独立再現なし）。`);
  }

  if (withTrades.length >= 2) {
    const winSpread = spread(withTrades.map((p) => p.winRatePct));
    const returnSpread = spread(withTrades.map((p) => p.avgReturnPct));
    if (winSpread != null && winSpread > 0) {
      lines.push(`勝率スプレッド ${winSpread}%（${withTrades.length}期間）。`);
    }
    if (returnSpread != null && returnSpread > 0) {
      lines.push(`均Rスプレッド ${returnSpread}%（${withTrades.length}期間）。`);
    }
  }

  const dominant = [...withTrades].sort((a, b) => b.tradeCount - a.tradeCount)[0];
  if (dominant && dominant.tradeCount > 0) {
    const pct = round3((dominant.tradeCount / withTrades.reduce((s, p) => s + p.tradeCount, 0)) * 100);
    lines.push(`件数集中: ${dominant.labelJa} ${dominant.tradeCount}件（${pct}%）`);
  }

  if (lines.length === 0) {
    return '全期間に分散 — 単一期間への過度集中なし（件数ベース）。';
  }
  return lines.join('\n');
}

function spread(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null);
  if (nums.length < 2) return null;
  return round3(Math.max(...nums) - Math.min(...nums));
}

function formatPeriodLine(p: ForwardDownDist10WalkForwardPeriodStats): string {
  return (
    `■ ${p.labelJa}（${p.fromDate}～${p.toDate}）\n` +
    `${p.tradeCount}件 · 勝率${p.winRatePct}% · 均R${p.avgReturnPct ?? '—'}% · ` +
    `Sharpe${p.sharpe ?? '—'} · 利確${p.takeProfitRatePct}%`
  );
}

export function auditDownDist10WalkForward(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardDownDist10WalkForwardAuditReport {
  const passed = auditPassedTrades(input);
  const cohort = passed.trades.filter(matchesDownDist10);

  const byPeriod = new Map<ForwardDownDist10WalkForwardPeriodId, ForwardPassedTradeRecord[]>();
  for (const def of PERIOD_DEFS) byPeriod.set(def.id, []);

  let unassigned = 0;
  for (const t of cohort) {
    let placed = false;
    for (const def of PERIOD_DEFS) {
      const end = def.toDate === '2099-12-31' ? '2099-12-31' : def.toDate;
      if (inPeriod(t.signalDate, def.fromDate, end)) {
        byPeriod.get(def.id)!.push(t);
        placed = true;
        break;
      }
    }
    if (!placed) unassigned++;
  }

  const periods = PERIOD_DEFS.map((def) =>
    periodStats(def, byPeriod.get(def.id) ?? [], input.bundle.latestDate),
  );

  const independenceInsightJa = buildIndependenceInsight(periods);

  const humanLines = [
    `【down × 52w≤-10% ウォークフォワード独立性検証】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 ${COHORT_LABEL} · ${cohort.length}件${unassigned > 0 ? ` · 期間外 ${unassigned}件` : ''}`,
    '（2024後半 / 2025前半 / 2025後半 · シグナル日基準 · 現行出口+3%/25日）',
    '',
    '■ 独立性所見',
    independenceInsightJa,
    '',
    ...periods.map(formatPeriodLine),
    '',
    '※ Sharpe = 期間内トレードリターンの mean/std',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    cohortLabelJa: COHORT_LABEL,
    matchedCount: cohort.length,
    periods,
    independenceInsightJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatDownDist10WalkForwardCsv(
  report: ForwardDownDist10WalkForwardAuditReport,
): string {
  const header =
    'period,fromDate,toDate,tradeCount,winRatePct,avgReturnPct,sharpe,takeProfitRatePct';
  const rows = report.periods.map((p) =>
    [
      p.labelJa,
      p.fromDate,
      p.toDate,
      p.tradeCount,
      p.winRatePct,
      p.avgReturnPct ?? '',
      p.sharpe ?? '',
      p.takeProfitRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
