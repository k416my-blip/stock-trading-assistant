/**
 * 固定TP +5% vs トレーリングストップ監査 — 条件適合96件 · ルール変更なし
 */
import {
  FORWARD_HOLD_DAYS,
  FORWARD_INITIAL_CAPITAL_USD,
  FORWARD_SIGNAL_START,
} from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardTrailingStopAuditReport,
  ForwardTrailingStopScenarioId,
  ForwardTrailingStopScenarioStats,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import {
  barIndexByDate,
  simulateExitFromEntry,
  simulateTrailingStopFromEntry,
} from './case4Indicators';
import { auditPassedTrades } from './forwardValidationPassedTradesAudit';

const FIXED_TP_PCT = 5;

const SCENARIO_DEFS: {
  id: ForwardTrailingStopScenarioId;
  labelJa: string;
  kind: 'fixed_tp' | 'trailing';
  tpPct?: number;
  trailPct?: number;
}[] = [
  { id: 'fixed_tp5', labelJa: '固定TP +5%', kind: 'fixed_tp', tpPct: FIXED_TP_PCT },
  { id: 'trail2', labelJa: 'トレーリング2%', kind: 'trailing', trailPct: 2 },
  { id: 'trail3', labelJa: 'トレーリング3%', kind: 'trailing', trailPct: 3 },
  { id: 'trail4', labelJa: 'トレーリング4%', kind: 'trailing', trailPct: 4 },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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

type SimOutcome = {
  returnPct: number;
  exitDate: string;
  exitReason: 'take_profit' | 'trailing_stop' | 'max_hold';
};

function simulateFixedTp(
  bundle: ForwardOhlcvBundle,
  trade: ForwardPassedTradeRecord,
  tpPct: number,
): SimOutcome | null {
  const bars = bundle.etfBars[trade.symbol];
  const entryIdx = barIndexByDate(bars, trade.entryDate);
  if (entryIdx < 0) return null;
  const exit = simulateExitFromEntry(bars, entryIdx, FORWARD_HOLD_DAYS, tpPct);
  if (!exit) return null;
  return { returnPct: exit.returnPct, exitDate: exit.exitDate, exitReason: exit.reason };
}

function simulateTrailing(
  bundle: ForwardOhlcvBundle,
  trade: ForwardPassedTradeRecord,
  trailPct: number,
): SimOutcome | null {
  const bars = bundle.etfBars[trade.symbol];
  const entryIdx = barIndexByDate(bars, trade.entryDate);
  if (entryIdx < 0) return null;
  const exit = simulateTrailingStopFromEntry(bars, entryIdx, FORWARD_HOLD_DAYS, trailPct);
  if (!exit) return null;
  return { returnPct: exit.returnPct, exitDate: exit.exitDate, exitReason: exit.reason };
}

function dailyReturnsFromOutcomes(outcomes: SimOutcome[]): number[] {
  const byDate = new Map<string, number[]>();
  for (const o of outcomes) {
    const arr = byDate.get(o.exitDate) ?? [];
    arr.push(o.returnPct);
    byDate.set(o.exitDate, arr);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rets]) => mean(rets) ?? 0);
}

function sharpeFromDaily(dailyReturns: number[]): number | null {
  if (dailyReturns.length < 2) return null;
  const mu = mean(dailyReturns);
  const sigma = std(dailyReturns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3(mu / sigma);
}

function maxDrawdownFromDaily(dailyReturns: number[]): number | null {
  if (dailyReturns.length === 0) return null;
  let equity = FORWARD_INITIAL_CAPITAL_USD;
  let peak = FORWARD_INITIAL_CAPITAL_USD;
  let maxDd = 0;
  for (const r of dailyReturns) {
    equity += (FORWARD_INITIAL_CAPITAL_USD * r) / 100;
    if (equity > peak) peak = equity;
    maxDd = Math.min(maxDd, equity / peak - 1);
  }
  return round2(maxDd * 100);
}

function runScenario(
  bundle: ForwardOhlcvBundle,
  entries: ForwardPassedTradeRecord[],
  def: (typeof SCENARIO_DEFS)[number],
): SimOutcome[] {
  const outcomes: SimOutcome[] = [];
  for (const trade of entries) {
    const o =
      def.kind === 'fixed_tp'
        ? simulateFixedTp(bundle, trade, def.tpPct!)
        : simulateTrailing(bundle, trade, def.trailPct!);
    if (o) outcomes.push(o);
  }
  return outcomes;
}

function buildStats(
  def: (typeof SCENARIO_DEFS)[number],
  outcomes: SimOutcome[],
): ForwardTrailingStopScenarioStats {
  const wins = outcomes.filter((o) => o.returnPct > 0);
  const maxHold = outcomes.filter((o) => o.exitReason === 'max_hold');
  const trailing = outcomes.filter((o) => o.exitReason === 'trailing_stop');
  const takeProfit = outcomes.filter((o) => o.exitReason === 'take_profit');
  const daily = dailyReturnsFromOutcomes(outcomes);

  return {
    id: def.id,
    labelJa: def.labelJa,
    tradeCount: outcomes.length,
    winCount: wins.length,
    winRatePct: outcomes.length > 0 ? round3((wins.length / outcomes.length) * 100) : 0,
    avgReturnPct: mean(outcomes.map((o) => o.returnPct)),
    sharpe: sharpeFromDaily(daily),
    maxDrawdownPct: maxDrawdownFromDaily(daily),
    maxHoldRatePct: outcomes.length > 0 ? round3((maxHold.length / outcomes.length) * 100) : 0,
    trailingStopRatePct: outcomes.length > 0 ? round3((trailing.length / outcomes.length) * 100) : 0,
    takeProfitRatePct: outcomes.length > 0 ? round3((takeProfit.length / outcomes.length) * 100) : 0,
  };
}

function formatScenario(s: ForwardTrailingStopScenarioStats): string {
  return (
    `${s.labelJa}: ${s.tradeCount}件 · 勝率${s.winRatePct}% · 均R${s.avgReturnPct ?? '—'}% · ` +
    `Sharpe${s.sharpe ?? '—'} · MaxDD${s.maxDrawdownPct ?? '—'}% · 25日満了${s.maxHoldRatePct}%`
  );
}

export function auditTrailingStopCompare(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardTrailingStopAuditReport {
  const passed = auditPassedTrades(input);
  const scenarios = SCENARIO_DEFS.map((def) =>
    buildStats(def, runScenario(input.bundle, passed.trades, def)),
  );

  const humanLines = [
    `【固定TP +5% vs トレーリングストップ監査】${FORWARD_SIGNAL_START} ～ ${input.bundle.latestDate}`,
    `対象 条件適合 ${passed.tradeCount}件 · 同一エントリー · 最大保有${FORWARD_HOLD_DAYS}日`,
    '（トレーリング = 高値更新後ピークからの%下落で決済 · 反実仮想）',
    '',
    ...scenarios.map(formatScenario),
    '',
    '※ Sharpe/MaxDD = 決済日別均Rの日次系列（フォワード検証と同方式）',
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: FORWARD_SIGNAL_START,
    toDate: input.bundle.latestDate,
    totalTrades: passed.tradeCount,
    maxHoldDays: FORWARD_HOLD_DAYS,
    scenarios,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export function formatTrailingStopAuditCsv(report: ForwardTrailingStopAuditReport): string {
  const header =
    'scenario,tradeCount,winRatePct,avgReturnPct,sharpe,maxDrawdownPct,maxHoldRatePct,trailingStopRatePct,takeProfitRatePct';
  const rows = report.scenarios.map((s) =>
    [
      s.labelJa,
      s.tradeCount,
      s.winRatePct,
      s.avgReturnPct ?? '',
      s.sharpe ?? '',
      s.maxDrawdownPct ?? '',
      s.maxHoldRatePct,
      s.trailingStopRatePct,
      s.takeProfitRatePct,
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
