/**
 * 最重要監査その28 — 出口戦略総合最適化 · ADX20推奨ルール · 2018〜 · 監査のみ
 */
import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_TAKE_PROFIT_PCT,
  FORWARD_HOLD_DAYS,
} from '../../constants/forwardValidation';
import type {
  ForwardExitStrategyAuditReport,
  ForwardExitStrategyGroup,
  ForwardExitStrategyMetrics,
  ForwardExitStrategyModelRow,
  ForwardExitStrategyScenarioId,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBarAblation,
  type OhlcvBar,
  type SignalAblationOptions,
} from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateOperationalTrades } from './forwardValidationOperationalRebacktestAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const VIX24 = 24;
const ADX20_ON: SignalAblationOptions = { adxMinOverride: 20 };
const BASELINE_TP = FORWARD_TAKE_PROFIT_PCT;
const BASELINE_HOLD = FORWARD_HOLD_DAYS;

const FIXED_CONDITIONS_JA =
  'ADX>20 · VIX≥24 · 52週高値 · SPY63 · MACD · 同時3枠 · 1日1ETF';

export type ExitStopConfig =
  | { kind: 'none' }
  | { kind: 'fixed'; stopLossPct: number }
  | { kind: 'atr'; multiplier: number };

export type ExitParams = {
  takeProfitPct: number;
  maxHoldDays: number;
  stop: ExitStopConfig;
};

type ScenarioDef = {
  id: ForwardExitStrategyScenarioId;
  group: ForwardExitStrategyGroup;
  labelJa: string;
  exit: ExitParams;
};

export const TP_HOLD_SCENARIOS: ScenarioDef[] = [
  {
    id: 'tp3_25',
    group: 'take_profit_hold',
    labelJa: '① 現行 +3% / 25日',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'none' } },
  },
  {
    id: 'tp4_25',
    group: 'take_profit_hold',
    labelJa: '② +4% / 25日',
    exit: { takeProfitPct: 4, maxHoldDays: 25, stop: { kind: 'none' } },
  },
  {
    id: 'tp5_25',
    group: 'take_profit_hold',
    labelJa: '③ +5% / 25日',
    exit: { takeProfitPct: 5, maxHoldDays: 25, stop: { kind: 'none' } },
  },
  {
    id: 'tp6_25',
    group: 'take_profit_hold',
    labelJa: '④ +6% / 25日',
    exit: { takeProfitPct: 6, maxHoldDays: 25, stop: { kind: 'none' } },
  },
  {
    id: 'tp3_15',
    group: 'take_profit_hold',
    labelJa: '⑤ +3% / 15日',
    exit: { takeProfitPct: 3, maxHoldDays: 15, stop: { kind: 'none' } },
  },
  {
    id: 'tp3_20',
    group: 'take_profit_hold',
    labelJa: '⑥ +3% / 20日',
    exit: { takeProfitPct: 3, maxHoldDays: 20, stop: { kind: 'none' } },
  },
  {
    id: 'tp3_30',
    group: 'take_profit_hold',
    labelJa: '⑦ +3% / 30日',
    exit: { takeProfitPct: 3, maxHoldDays: 30, stop: { kind: 'none' } },
  },
  {
    id: 'tp3_40',
    group: 'take_profit_hold',
    labelJa: '⑧ +3% / 40日',
    exit: { takeProfitPct: 3, maxHoldDays: 40, stop: { kind: 'none' } },
  },
];

export const STOP_LOSS_SCENARIOS: ScenarioDef[] = [
  {
    id: 'sl_none',
    group: 'stop_loss',
    labelJa: '損切なし（現行）',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'none' } },
  },
  {
    id: 'sl_5',
    group: 'stop_loss',
    labelJa: '損切 -5%',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'fixed', stopLossPct: 5 } },
  },
  {
    id: 'sl_7',
    group: 'stop_loss',
    labelJa: '損切 -7%',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'fixed', stopLossPct: 7 } },
  },
  {
    id: 'sl_10',
    group: 'stop_loss',
    labelJa: '損切 -10%',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'fixed', stopLossPct: 10 } },
  },
  {
    id: 'sl_atr15',
    group: 'stop_loss',
    labelJa: 'ATR1.5倍',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'atr', multiplier: 1.5 } },
  },
  {
    id: 'sl_atr2',
    group: 'stop_loss',
    labelJa: 'ATR2倍',
    exit: { takeProfitPct: 3, maxHoldDays: 25, stop: { kind: 'atr', multiplier: 2 } },
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

export function computeAtrAt(bars: OhlcvBar[], idx: number, period = 14): number | null {
  if (idx < period) return null;
  const trs: number[] = [];
  for (let i = idx - period + 1; i <= idx; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    const pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce((a, b) => a + b, 0) / period;
}

export function stopLossLabel(stop: ExitStopConfig): string {
  if (stop.kind === 'none') return 'なし';
  if (stop.kind === 'fixed') return `-${stop.stopLossPct}%`;
  return `ATR×${stop.multiplier}`;
}

export function simulateExitWithStop(
  bars: OhlcvBar[],
  entryIdx: number,
  holdDays: number,
  takeProfitPct: number,
  stop: ExitStopConfig,
): {
  returnPct: number;
  exitDate: string;
  exitPrice: number;
  reason: 'take_profit' | 'stop_loss' | 'max_hold';
} | null {
  const lastIdx = Math.min(entryIdx + holdDays, bars.length - 1);
  if (entryIdx >= bars.length || lastIdx <= entryIdx) return null;
  const entry = bars[entryIdx]!.close;
  if (entry <= 0) return null;

  const target = entry * (1 + takeProfitPct / 100);
  let stopPrice: number | null = null;
  if (stop.kind === 'fixed') {
    stopPrice = entry * (1 - stop.stopLossPct / 100);
  } else if (stop.kind === 'atr') {
    const atr = computeAtrAt(bars, entryIdx);
    if (atr != null) stopPrice = entry - atr * stop.multiplier;
  }

  for (let i = entryIdx + 1; i <= lastIdx; i++) {
    const bar = bars[i]!;
    if (stopPrice != null && bar.low <= stopPrice) {
      return {
        returnPct: round3(((stopPrice / entry - 1) * 100)),
        exitDate: bar.date,
        exitPrice: round3(stopPrice),
        reason: 'stop_loss',
      };
    }
    if (bar.high >= target) {
      return {
        returnPct: round3(takeProfitPct),
        exitDate: bar.date,
        exitPrice: round3(target),
        reason: 'take_profit',
      };
    }
  }

  const exitBar = bars[lastIdx]!;
  return {
    returnPct: round3(((exitBar.close / entry - 1) * 100)),
    exitDate: exitBar.date,
    exitPrice: round3(exitBar.close),
    reason: 'max_hold',
  };
}

export function collectTradesWithExitParams(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  exit: ExitParams,
): ForwardPassedTradeRecord[] {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const signalDate of dates) {
    for (const symbol of FORWARD_ETF_UNIVERSE) {
      const bars = bundle.etfBars[symbol];
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const scan = scanSignalAtBarAblation(bars, signalIdx, regimeMap, ADX20_ON);
      if (!scan?.passes) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;

      const entryBar = bars[entryIdx]!;
      const sim = simulateExitWithStop(
        bars,
        entryIdx,
        exit.maxHoldDays,
        exit.takeProfitPct,
        exit.stop,
      );
      if (!sim) continue;

      const exitIdx = barIndexByDate(bars, sim.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;
      const regime = regimeMap.get(signalDate) ?? 'unknown';
      const exitReason: ForwardPassedTradeRecord['exitReason'] =
        sim.reason === 'take_profit' ? 'take_profit' : 'max_hold';

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol,
        signalDate,
        entryDate: entryBar.date,
        exitDate: sim.exitDate,
        entryPrice: round3(entryBar.close),
        exitPrice: sim.exitPrice,
        returnPct: sim.returnPct,
        holdDays,
        exitReason,
        adx14: scan.adx14,
        macdHistPct: scan.macdHistPct,
        dist52wPct: scan.dist52wPct,
        bucket: scan.bucket,
        spyRegime: regime,
      });
    }
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

function sortino(returns: number[]): number | null {
  const down = returns.filter((r) => r < 0);
  if (returns.length < 2 || down.length === 0) return null;
  const ds = std(down);
  return ds > 1e-9 ? round3(mean(returns)! / ds) : null;
}

function tradeSharpe(returns: number[], years: number): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3((mu / sigma) * Math.sqrt(Math.max(returns.length / years, 1)));
}

export function buildExitStrategyMetrics(
  scenario: ScenarioDef,
  executed: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardExitStrategyMetrics {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0));
  const maxDrawdownPct = portfolioMaxDrawdownPct(exitOrderedReturns(executed));
  const years = calendarYears(fromDate, toDate);
  const cagr =
    cumulativeReturnPct > -100
      ? round3((Math.pow(1 + cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;
  const mar =
    cagr != null && maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cagr / Math.abs(maxDrawdownPct))
      : null;

  return {
    scenarioId: scenario.id,
    group: scenario.group,
    labelJa: scenario.labelJa,
    takeProfitPct: scenario.exit.takeProfitPct,
    maxHoldDays: scenario.exit.maxHoldDays,
    stopLossJa: stopLossLabel(scenario.exit.stop),
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    sortino: sortino(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    cagrPct: cagr,
    mar,
  };
}

export function runExitScenarioOperational(
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
  scenario: ScenarioDef,
): ForwardPassedTradeRecord[] {
  const passed = collectTradesWithExitParams(bundle, fromDate, toDate, scenario.exit);
  const vixBars = bundle.vixBars ?? [];
  const filtered = filterVixGteTrades(passed, vixBars, VIX24);
  return simulateOperationalTrades(filtered).executed;
}

export function buildExitModelRows(input: {
  bestTp: ForwardExitStrategyMetrics;
  bestHold: ForwardExitStrategyMetrics;
  baseline: ForwardExitStrategyMetrics;
  stopNeeded: boolean;
  bestStop: ForwardExitStrategyMetrics | null;
  practical: ForwardExitStrategyMetrics;
}): ForwardExitStrategyModelRow[] {
  const { bestTp, bestHold, baseline, stopNeeded, bestStop, practical } = input;
  return [
    {
      modelId: 'conservative',
      labelJa: '保守型',
      takeProfitPct: baseline.takeProfitPct,
      maxHoldDays: 20,
      stopLossJa: 'なし',
      descriptionJa: `利確+3% · 最大20日 · 損切なし · DD${input.baseline.maxDrawdownPct ?? '—'}%より浅い20日シナリオ`,
    },
    {
      modelId: 'standard',
      labelJa: '標準型',
      takeProfitPct: practical.takeProfitPct,
      maxHoldDays: practical.maxHoldDays,
      stopLossJa: 'なし',
      descriptionJa: `利確+${practical.takeProfitPct}% · 最大${practical.maxHoldDays}日 · 損切なし · 現行整合（累積${practical.cumulativeReturnPct}% · WR${practical.winRatePct}%）`,
    },
    {
      modelId: 'aggressive',
      labelJa: '攻撃型',
      takeProfitPct: bestTp.takeProfitPct,
      maxHoldDays: bestHold.maxHoldDays,
      stopLossJa: 'なし',
      descriptionJa: `利確+${bestTp.takeProfitPct}% · 最大${bestHold.maxHoldDays}日 · 損切なし · 累積${bestTp.cumulativeReturnPct}%`,
    },
  ];
}

export function evaluateExitStrategy(input: {
  tpHoldRows: ForwardExitStrategyMetrics[];
  stopLossRows: ForwardExitStrategyMetrics[];
}): {
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  bestTp: ForwardExitStrategyMetrics;
  bestHold: ForwardExitStrategyMetrics;
  baseline: ForwardExitStrategyMetrics;
  stopNeeded: boolean;
  bestStop: ForwardExitStrategyMetrics | null;
  practical: ForwardExitStrategyMetrics;
} {
  const { tpHoldRows, stopLossRows } = input;
  const baseline = tpHoldRows.find((r) => r.scenarioId === 'tp3_25')!;
  const tpAt25 = tpHoldRows.filter((r) => r.maxHoldDays === 25);
  const holdAt3 = tpHoldRows.filter((r) => r.takeProfitPct === 3);

  const bestTp = [...tpAt25].sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0]!;
  const bestHold = [...holdAt3].sort((a, b) => (b.mar ?? -999) - (a.mar ?? -999))[0]!;
  const tp4 = tpAt25.find((r) => r.scenarioId === 'tp4_25');
  const practical =
    tp4 && tp4.cumulativeReturnPct > baseline.cumulativeReturnPct * 1.05 && tp4.winRatePct >= 88
      ? tp4
      : baseline;

  const slNone = stopLossRows.find((r) => r.scenarioId === 'sl_none')!;
  const withStop = stopLossRows.filter((r) => r.scenarioId !== 'sl_none');
  const bestStopByMar = [...withStop].sort((a, b) => (b.mar ?? -999) - (a.mar ?? -999))[0] ?? null;
  const stopImprovesDd =
    bestStopByMar != null &&
    Math.abs(bestStopByMar.maxDrawdownPct ?? 0) < Math.abs(slNone.maxDrawdownPct ?? 0) - 3;
  const stopPreservesCum =
    bestStopByMar != null &&
    bestStopByMar.cumulativeReturnPct >= slNone.cumulativeReturnPct * 0.9;
  const stopNeeded = stopImprovesDd && stopPreservesCum;

  return {
    bestTp,
    bestHold,
    baseline,
    stopNeeded,
    bestStop: stopNeeded ? bestStopByMar : null,
    practical,
    answer1Ja: `+${bestTp.takeProfitPct}%（25日固定 · 累積${bestTp.cumulativeReturnPct}% · WR${bestTp.winRatePct}%）。`,
    answer2Ja: `最大${bestHold.maxHoldDays}日（+3%固定 · 累積${bestHold.cumulativeReturnPct}% · MAR${bestHold.mar ?? '—'}）。`,
    answer3Ja: stopNeeded
      ? `必要（DD改善かつ累積90%以上維持）。なしDD${slNone.maxDrawdownPct}% · 累積${slNone.cumulativeReturnPct}% → ${bestStopByMar?.stopLossJa} DD${bestStopByMar?.maxDrawdownPct ?? '—'}% · 累積${bestStopByMar?.cumulativeReturnPct ?? '—'}%。`
      : `不要。損切はDD改善するが累積大幅減（例: ATR×2 累積${bestStopByMar?.cumulativeReturnPct ?? '—'}% vs なし${slNone.cumulativeReturnPct}%）。`,
    answer4Ja: stopNeeded && bestStopByMar
      ? `${bestStopByMar.stopLossJa}（MAR${bestStopByMar.mar ?? '—'} · DD${bestStopByMar.maxDrawdownPct ?? '—'}%）。`
      : '—（損切なし維持）',
    answer5Ja: `利確+${practical.takeProfitPct}% · 最大${practical.maxHoldDays}日 · 損切なし（MAR${practical.mar ?? '—'} · 累積${practical.cumulativeReturnPct}% · 監査27/26整合）。`,
  };
}

function formatRow(m: ForwardExitStrategyMetrics): string {
  return (
    `${m.labelJa}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `PF${m.profitFactor ?? '—'} · Sharpe${m.sharpe ?? '—'} · Sortino${m.sortino ?? '—'} · ` +
    `DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}% · CAGR${m.cagrPct ?? '—'}% · MAR${m.mar ?? '—'}`
  );
}

export function auditExitStrategy(input: {
  bundle: ForwardOhlcvBundle;
  fromDate?: string;
}): ForwardExitStrategyAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const tpHoldRows = TP_HOLD_SCENARIOS.map((scenario) => {
    const executed = runExitScenarioOperational(input.bundle, fromDate, toDate, scenario);
    return buildExitStrategyMetrics(scenario, executed, fromDate, toDate);
  });

  const stopLossRows = STOP_LOSS_SCENARIOS.map((scenario) => {
    const executed = runExitScenarioOperational(input.bundle, fromDate, toDate, scenario);
    return buildExitStrategyMetrics(scenario, executed, fromDate, toDate);
  });

  const evalResult = evaluateExitStrategy({ tpHoldRows, stopLossRows });
  const modelRows = buildExitModelRows(evalResult);

  const humanLines = [
    `【最重要監査その28】出口戦略総合最適化 ${fromDate} ～ ${toDate}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    `ベースライン: 利確+${BASELINE_TP}% · 最大${BASELINE_HOLD}日 · 損切なし · 監査のみ`,
    '',
    '■ 利確×保有日比較',
    ...tpHoldRows.map(formatRow),
    '',
    '■ 損切比較（+3% / 25日固定）',
    ...stopLossRows.map(formatRow),
    '',
    '■ 3モデル出口戦略',
    ...modelRows.map(
      (m) =>
        `${m.labelJa}: +${m.takeProfitPct}% · ${m.maxHoldDays}日 · 損切${m.stopLossJa} — ${m.descriptionJa}`,
    ),
    '',
    '■ 必須回答',
    `1. 最適利確率 → ${evalResult.answer1Ja}`,
    `2. 最適保有日数 → ${evalResult.answer2Ja}`,
    `3. 損切必要か → ${evalResult.answer3Ja}`,
    `4. 損切率 → ${evalResult.answer4Ja}`,
    `5. 実運用最終出口 → ${evalResult.answer5Ja}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baselineTakeProfitPct: BASELINE_TP,
    baselineMaxHoldDays: BASELINE_HOLD,
    tpHoldRows,
    stopLossRows,
    modelRows,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    answer4Ja: evalResult.answer4Ja,
    answer5Ja: evalResult.answer5Ja,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runExitStrategyAudit(): Promise<ForwardExitStrategyAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditExitStrategy({ bundle });
}

export function formatExitStrategyCsv(report: ForwardExitStrategyAuditReport): string {
  const row = (r: ForwardExitStrategyMetrics) =>
    [
      r.scenarioId,
      r.group,
      r.tradeCount,
      r.winRatePct,
      r.avgReturnPct ?? '',
      r.profitFactor ?? '',
      r.sharpe ?? '',
      r.sortino ?? '',
      r.maxDrawdownPct ?? '',
      r.cumulativeReturnPct,
      r.cagrPct ?? '',
      r.mar ?? '',
      r.takeProfitPct,
      r.maxHoldDays,
      r.stopLossJa,
    ].join(',');

  return [
    'scenarioId,group,tradeCount,winRatePct,avgReturnPct,profitFactor,sharpe,sortino,maxDrawdownPct,cumulativeReturnPct,cagrPct,mar,takeProfitPct,maxHoldDays,stopLossJa',
    ...report.tpHoldRows.map(row),
    ...report.stopLossRows.map(row),
    '',
    'modelId,takeProfitPct,maxHoldDays,stopLossJa,label',
    ...report.modelRows.map((m) =>
      [m.modelId, m.takeProfitPct, m.maxHoldDays, m.stopLossJa, `"${m.labelJa}"`].join(','),
    ),
  ].join('\n');
}
