/**
 * 利確水準感度監査 — 条件適合96件 · +3/+4/+5/+6%比較 · ルール変更なし
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_SIGNAL_START,
  FORWARD_TAKE_PROFIT_PCT,
} from '../../constants/forwardValidation';
import type {
  ForwardTakeProfitScenarioId,
  ForwardTakeProfitScenarioStats,
  ForwardTakeProfitSensitivityAuditReport,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { barIndexByDate, simulateExitFromEntry } from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const TP_LEVELS: { id: ForwardTakeProfitScenarioId; pct: number; labelJa: string }[] = [
  { id: 'tp3', pct: 3, labelJa: '+3%利確' },
  { id: 'tp4', pct: 4, labelJa: '+4%利確' },
  { id: 'tp5', pct: 5, labelJa: '+5%利確' },
  { id: 'tp6', pct: 6, labelJa: '+6%利確' },
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

type SimOutcome = { returnPct: number; exitReason: 'take_profit' | 'max_hold' };

function simulateScenario(
  bundle: ForwardOhlcvBundle,
  entries: ReturnType<typeof auditPassedTrades>['trades'],
  takeProfitPct: number,
): SimOutcome[] {
  const outcomes: SimOutcome[] = [];

  for (const trade of entries) {
    const bars = bundle.etfBars[trade.symbol];
    const entryIdx = barIndexByDate(bars, trade.entryDate);
    if (entryIdx < 0) continue;
    const exit = simulateExitFromEntry(bars, entryIdx, FORWARD_HOLD_DAYS, takeProfitPct);
    if (!exit) continue;
    outcomes.push({ returnPct: exit.returnPct, exitReason: exit.reason });
  }

  return outcomes;
}

function buildScenarioStats(
  def: (typeof TP_LEVELS)[number],
  outcomes: SimOutcome[],
): ForwardTakeProfitScenarioStats {
  const wins = outcomes.filter((o) => o.returnPct > 0);
  const takeProfit = outcomes.filter((o) => o.exitReason === 'take_profit');
  const maxHold = outcomes.filter((o) => o.exitReason === 'max_hold');
  const returns = outcomes.map((o) => o.returnPct);

  return {
    id: def.id,
    takeProfitPct: def.pct,
    labelJa: def.labelJa,
    tradeCount: outcomes.length,
    winCount: wins.length,
    winRatePct: outcomes.length > 0 ? round3((wins.length / outcomes.length) * 100) : 0,
    avgReturnPct: mean(returns),
    sharpe: tradeSharpe(returns),
    maxHoldRatePct: outcomes.length > 0 ? round3((maxHold.length / outcomes.length) * 100) : 0,
    takeProfitRatePct: outcomes.length > 0 ? round3((takeProfit.length / outcomes.length) * 100) : 0,
  };
}

function formatScenario(s: ForwardTakeProfitScenarioStats): string {
  const baseline = s.takeProfitPct === FORWARD_TAKE_PROFIT_PCT ? '（現行）' : '';
  return (
    `${s.labelJa}${baseline}: ${s.tradeCount}件 · 勝率${s.winRatePct}% · 均R${s.avgReturnPct ?? '—'}% · ` +
    `Sharpe${s.sharpe ?? '—'} · 25日満了${s.maxHoldRatePct}%`
  );
}

export function auditTakeProfitSensitivity(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardTakeProfitSensitivityAuditReport {
  const passed = auditPassedTrades(input);
  const scenarios = TP_LEVELS.map((def) =>
    buildScenarioStats(def, simulateScenario(input.bundle, passed.trades, def.pct)),
  );

  const humanLines = [
    `【利確水準感度監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 同一エントリーで利確%のみ変更（反実仮想）`,
    `現行ルール +${FORWARD_TAKE_PROFIT_PCT}% · 最大保有${FORWARD_HOLD_DAYS}日`,
    '',
    ...scenarios.map(formatScenario),
    '',
    '※ Sharpe = トレードリターン系列の mean/std（日次年化なし）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    baselineTakeProfitPct: FORWARD_TAKE_PROFIT_PCT,
    scenarios,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatTakeProfitSensitivityCsv(
  report: ForwardTakeProfitSensitivityAuditReport,
): string {
  const header =
    'takeProfitPct,tradeCount,winRatePct,avgReturnPct,sharpe,maxHoldRatePct,takeProfitRatePct';
  const rows = report.scenarios.map((s) =>
    [
      s.takeProfitPct,
      s.tradeCount,
      s.winRatePct,
      s.avgReturnPct ?? '',
      s.sharpe ?? '',
      s.maxHoldRatePct,
      s.takeProfitRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
