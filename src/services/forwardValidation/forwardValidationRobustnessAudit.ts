/**
 * 最重要監査その30 — 2026以降想定 · パラメータ頑健性 · HDV/DGRO/QQQ/SCHD · 監査のみ
 */
import type {
  ForwardPassedTradeRecord,
  ForwardRobustnessAuditReport,
  ForwardRobustnessGrade,
  ForwardRobustnessGridRow,
  ForwardRobustnessParamKey,
  ForwardRobustnessParamSensitivity,
} from '../../types/forwardValidation';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBarAblation,
  type OhlcvBar,
} from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateExitWithStop } from './forwardValidationExitStrategyAudit';
import { simulateOperationalWinRate } from './forwardValidationEtfUniverseAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const ROBUSTNESS_ETF_UNIVERSE = ['HDV', 'DGRO', 'QQQ', 'SCHD'] as const;

export const ROBUSTNESS_ADX_LEVELS = [18, 20, 22, 24] as const;
export const ROBUSTNESS_VIX_LEVELS = [20, 22, 24, 26, 28] as const;
export const ROBUSTNESS_TP_LEVELS = [3, 4, 5] as const;
export const ROBUSTNESS_HOLD_LEVELS = [20, 25, 30] as const;

const BASELINE_ADX = 20;
const BASELINE_VIX = 24;
const BASELINE_TP = 4;
const BASELINE_HOLD = 25;
const CASH_RESERVE_PCT = 15;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · 52週高値 · SPY63 · 損切なし · 勝率重み · 同時3枠 · 現金15%';

type ExitSim = {
  exitDate: string;
  exitPrice: number;
  returnPct: number;
  holdDays: number;
  exitReason: ForwardPassedTradeRecord['exitReason'];
};

type TradeTemplate = {
  id: string;
  signalDate: string;
  symbol: string;
  entryDate: string;
  entryPrice: number;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: ForwardPassedTradeRecord['bucket'];
  spyRegime: ForwardPassedTradeRecord['spyRegime'];
  adxPass: Set<number>;
  vix: number | null;
  exits: Map<string, ExitSim>;
};

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

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function exitKey(takeProfitPct: number, maxHoldDays: number): string {
  return `${takeProfitPct}_${maxHoldDays}`;
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

function vixAtDate(vixBars: OhlcvBar[], date: string): number | null {
  const idx = barIndexByDate(vixBars, date);
  if (idx < 0) return null;
  return vixBars[idx]!.close;
}

export function precomputeTradeTemplates(input: {
  bundle: SurvivorshipOhlcvBundle;
  symbols: string[];
  fromDate: string;
  toDate: string;
}): TradeTemplate[] {
  const { bundle, symbols, fromDate, toDate } = input;
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const templates: TradeTemplate[] = [];

  for (const signalDate of dates) {
    for (const symbol of symbols) {
      const bars = bundle.etfBars[symbol];
      if (!bars) continue;
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const adxPass = new Set<number>();
      let scanMeta: {
        adx14: number;
        macdHistPct: number;
        dist52wPct: number;
        bucket: ForwardPassedTradeRecord['bucket'];
      } | null = null;

      for (const adxMin of ROBUSTNESS_ADX_LEVELS) {
        const scan = scanSignalAtBarAblation(bars, signalIdx, regimeMap, {
          adxMinOverride: adxMin,
        });
        if (scan?.passes) {
          adxPass.add(adxMin);
          if (!scanMeta) {
            scanMeta = {
              adx14: scan.adx14,
              macdHistPct: scan.macdHistPct,
              dist52wPct: scan.dist52wPct,
              bucket: scan.bucket,
            };
          }
        }
      }

      if (adxPass.size === 0 || !scanMeta) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;
      const entryBar = bars[entryIdx]!;

      const exits = new Map<string, ExitSim>();
      for (const tp of ROBUSTNESS_TP_LEVELS) {
        for (const hold of ROBUSTNESS_HOLD_LEVELS) {
          const sim = simulateExitWithStop(bars, entryIdx, hold, tp, { kind: 'none' });
          if (!sim) continue;
          const exitIdx = barIndexByDate(bars, sim.exitDate);
          const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;
          exits.set(exitKey(tp, hold), {
            exitDate: sim.exitDate,
            exitPrice: sim.exitPrice,
            returnPct: sim.returnPct,
            holdDays,
            exitReason: sim.reason === 'take_profit' ? 'take_profit' : 'max_hold',
          });
        }
      }

      if (exits.size === 0) continue;

      templates.push({
        id: `${signalDate}_${symbol}`,
        signalDate,
        symbol,
        entryDate: entryBar.date,
        entryPrice: round3(entryBar.close),
        adx14: scanMeta.adx14,
        macdHistPct: scanMeta.macdHistPct,
        dist52wPct: scanMeta.dist52wPct,
        bucket: scanMeta.bucket,
        spyRegime: regimeMap.get(signalDate) ?? 'unknown',
        adxPass,
        vix: vixAtDate(bundle.vixBars, signalDate),
        exits,
      });
    }
  }

  return templates;
}

export function buildTradesFromTemplate(
  templates: TradeTemplate[],
  adxMin: number,
  vixThreshold: number,
  takeProfitPct: number,
  maxHoldDays: number,
): ForwardPassedTradeRecord[] {
  const key = exitKey(takeProfitPct, maxHoldDays);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const t of templates) {
    if (!t.adxPass.has(adxMin)) continue;
    if (t.vix == null || t.vix < vixThreshold) continue;
    const exit = t.exits.get(key);
    if (!exit) continue;

    trades.push({
      id: t.id,
      symbol: t.symbol as ForwardPassedTradeRecord['symbol'],
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      exitDate: exit.exitDate,
      entryPrice: t.entryPrice,
      exitPrice: exit.exitPrice,
      returnPct: exit.returnPct,
      holdDays: exit.holdDays,
      exitReason: exit.exitReason,
      adx14: t.adx14,
      macdHistPct: t.macdHistPct,
      dist52wPct: t.dist52wPct,
      bucket: t.bucket,
      spyRegime: t.spyRegime,
    });
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

export function runRobustnessCombo(
  templates: TradeTemplate[],
  symbols: string[],
  adxMin: number,
  vixThreshold: number,
  takeProfitPct: number,
  maxHoldDays: number,
): ForwardPassedTradeRecord[] {
  const passed = buildTradesFromTemplate(
    templates,
    adxMin,
    vixThreshold,
    takeProfitPct,
    maxHoldDays,
  );
  return simulateOperationalWinRate(passed, symbols).executed;
}

export function buildRobustnessGridRow(
  adxMin: number,
  vixThreshold: number,
  takeProfitPct: number,
  maxHoldDays: number,
  executed: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardRobustnessGridRow {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0) * deployableScale);
  const maxDrawdownPct = portfolioMaxDrawdownPct(
    exitOrderedReturns(executed).map((r) => r * deployableScale),
  );
  const years = calendarYears(fromDate, toDate);
  const cagr =
    cumulativeReturnPct > -100
      ? round3((Math.pow(1 + cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;
  const mar =
    cagr != null && maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cagr / Math.abs(maxDrawdownPct))
      : null;

  const isBaseline =
    adxMin === BASELINE_ADX &&
    vixThreshold === BASELINE_VIX &&
    takeProfitPct === BASELINE_TP &&
    maxHoldDays === BASELINE_HOLD;

  return {
    adxMin,
    vixThreshold,
    takeProfitPct,
    maxHoldDays,
    labelJa: `ADX>${adxMin} VIX≥${vixThreshold} +${takeProfitPct}%/${maxHoldDays}d`,
    isBaseline,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    cumulativeReturnPct,
    maxDrawdownPct,
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    mar,
  };
}

function stabilityScore(row: ForwardRobustnessGridRow): number {
  const mar = row.mar ?? 0;
  const dd = Math.abs(row.maxDrawdownPct ?? 99);
  const wr = row.winRatePct / 100;
  return mar * 0.5 + wr * 0.3 + (row.cumulativeReturnPct / Math.max(dd, 1)) * 0.2;
}

type OatDef = {
  paramKey: ForwardRobustnessParamKey;
  paramJa: string;
  values: readonly number[];
  pick: (v: number) => { adx: number; vix: number; tp: number; hold: number };
};

const OAT_DEFS: OatDef[] = [
  {
    paramKey: 'adx',
    paramJa: 'ADX閾値',
    values: ROBUSTNESS_ADX_LEVELS,
    pick: (v) => ({ adx: v, vix: BASELINE_VIX, tp: BASELINE_TP, hold: BASELINE_HOLD }),
  },
  {
    paramKey: 'vix',
    paramJa: 'VIX閾値',
    values: ROBUSTNESS_VIX_LEVELS,
    pick: (v) => ({ adx: BASELINE_ADX, vix: v, tp: BASELINE_TP, hold: BASELINE_HOLD }),
  },
  {
    paramKey: 'takeProfit',
    paramJa: '利確%',
    values: ROBUSTNESS_TP_LEVELS,
    pick: (v) => ({ adx: BASELINE_ADX, vix: BASELINE_VIX, tp: v, hold: BASELINE_HOLD }),
  },
  {
    paramKey: 'holdDays',
    paramJa: '保有日数',
    values: ROBUSTNESS_HOLD_LEVELS,
    pick: (v) => ({ adx: BASELINE_ADX, vix: BASELINE_VIX, tp: BASELINE_TP, hold: v }),
  },
];

export function buildOneAtATimeSensitivity(
  gridRows: ForwardRobustnessGridRow[],
  baseline: ForwardRobustnessGridRow,
): ForwardRobustnessParamSensitivity[] {
  const rowKey = (r: ForwardRobustnessGridRow) =>
    `${r.adxMin}_${r.vixThreshold}_${r.takeProfitPct}_${r.maxHoldDays}`;

  const byKey = new Map(gridRows.map((r) => [rowKey(r), r]));

  const rows: ForwardRobustnessParamSensitivity[] = OAT_DEFS.map((def) => {
    const subset = def.values
      .map((v) => {
        const p = def.pick(v);
        return byKey.get(`${p.adx}_${p.vix}_${p.tp}_${p.hold}`);
      })
      .filter((r): r is ForwardRobustnessGridRow => r != null);

    const cums = subset.map((r) => r.cumulativeReturnPct);
    const mars = subset.map((r) => r.mar ?? 0);
    const cumMin = Math.min(...cums);
    const cumMax = Math.max(...cums);
    const cumRange = round3(cumMax - cumMin);
    const cumStd = round3(std(cums));
    const marRange = round3(Math.max(...mars) - Math.min(...mars));
    const worstDrop = round3(
      Math.max(0, baseline.cumulativeReturnPct - Math.min(...cums)),
    );

    const fragile = subset
      .filter(
        (r) =>
          r.cumulativeReturnPct < baseline.cumulativeReturnPct * 0.85 ||
          r.winRatePct < baseline.winRatePct - 8,
      )
      .map((r) => {
        if (def.paramKey === 'adx') return `ADX>${r.adxMin}`;
        if (def.paramKey === 'vix') return `VIX≥${r.vixThreshold}`;
        if (def.paramKey === 'takeProfit') return `+${r.takeProfitPct}%`;
        return `${r.maxHoldDays}日`;
      });

    const robust = subset
      .filter(
        (r) =>
          r.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.92 &&
          r.winRatePct >= baseline.winRatePct - 3,
      )
      .map((r) => {
        if (def.paramKey === 'adx') return `ADX>${r.adxMin}`;
        if (def.paramKey === 'vix') return `VIX≥${r.vixThreshold}`;
        if (def.paramKey === 'takeProfit') return `+${r.takeProfitPct}%`;
        return `${r.maxHoldDays}日`;
      });

    return {
      paramJa: def.paramJa,
      paramKey: def.paramKey,
      valuesTested: [...def.values],
      cumulativeRangePct: cumRange,
      cumulativeStdPct: cumStd,
      marRange,
      worstDropFromBaselinePct: worstDrop,
      rank: 0,
      fragileValuesJa: fragile.length > 0 ? fragile.join(' · ') : 'なし',
      robustValuesJa: robust.length > 0 ? robust.join(' · ') : 'なし',
    };
  });

  const sorted = [...rows].sort((a, b) => b.cumulativeRangePct - a.cumulativeRangePct);
  sorted.forEach((r, i) => {
    r.rank = i + 1;
  });
  return sorted;
}

export function gradeRobustness(input: {
  baseline: ForwardRobustnessGridRow;
  gridRows: ForwardRobustnessGridRow[];
  sensitivityRows: ForwardRobustnessParamSensitivity[];
  bestProfit: ForwardRobustnessGridRow;
}): { grade: ForwardRobustnessGrade; gradeJa: string } {
  const { baseline, gridRows, sensitivityRows, bestProfit } = input;

  if (baseline.tradeCount === 0) {
    return { grade: 'D', gradeJa: 'D（危険）: 基準組み合わせで実行トレードなし。' };
  }

  const maxOatDrop = Math.max(...sensitivityRows.map((s) => s.worstDropFromBaselinePct));
  const maxOatRange = Math.max(...sensitivityRows.map((s) => s.cumulativeRangePct));
  const oatFloorPct =
    baseline.cumulativeReturnPct > 0
      ? round3(((baseline.cumulativeReturnPct - maxOatDrop) / baseline.cumulativeReturnPct) * 100)
      : 0;

  const gridUpsidePct = round3(bestProfit.cumulativeReturnPct - baseline.cumulativeReturnPct);
  const gridWrDrop = round3(baseline.winRatePct - bestProfit.winRatePct);
  const lowWrCombos = gridRows.filter((r) => r.winRatePct < 75).length;
  const lowWrPct = lowWrCombos / gridRows.length;

  if (
    maxOatDrop <= baseline.cumulativeReturnPct * 0.12 &&
    maxOatRange <= baseline.cumulativeReturnPct * 0.2 &&
    baseline.winRatePct >= 88 &&
    lowWrPct <= 0.2
  ) {
    return {
      grade: 'A',
      gradeJa:
        `A（非常に頑健）: OAT最大下落${maxOatDrop}pt（基準比${oatFloorPct}%維持）· WR${baseline.winRatePct}% · ` +
        `感度範囲${maxOatRange}pt。2026以降もパラメータ微調整に強い。`,
    };
  }

  if (
    maxOatDrop <= baseline.cumulativeReturnPct * 0.25 &&
    baseline.winRatePct >= 85 &&
    oatFloorPct >= 72 &&
    lowWrPct <= 0.3
  ) {
    const gridNote =
      gridUpsidePct > baseline.cumulativeReturnPct * 0.25
        ? ` · 全グリッド最適は+${gridUpsidePct}ptだがWR${gridWrDrop}pt低下`
        : '';
    return {
      grade: 'B',
      gradeJa:
        `B（やや頑健）: OAT最大下落${maxOatDrop}pt · 基準累積${baseline.cumulativeReturnPct}% · WR${baseline.winRatePct}%${gridNote}。` +
        `2026以降運用許容。`,
    };
  }

  if (
    baseline.winRatePct < 75 ||
    oatFloorPct < 55 ||
    maxOatDrop > baseline.cumulativeReturnPct * 0.45 ||
    lowWrPct > 0.45
  ) {
    return {
      grade: 'D',
      gradeJa:
        `D（危険）: 基準累積${baseline.cumulativeReturnPct}% · OAT最大下落${maxOatDrop}pt（${oatFloorPct}%維持）· WR${baseline.winRatePct}%。` +
        `パラメータ変更に脆弱。`,
    };
  }

  return {
    grade: 'C',
    gradeJa:
      `C（過剰最適化の疑い）: 基準累積${baseline.cumulativeReturnPct}% · OAT最大下落${maxOatDrop}pt · ` +
      `全グリッド最適+${gridUpsidePct}pt（WR${gridWrDrop}pt低下）。単独変動は概ね許容だが最適組合せ依存に注意。`,
  };
}

export function evaluateRobustness(input: {
  gridRows: ForwardRobustnessGridRow[];
  baseline: ForwardRobustnessGridRow;
  sensitivityRows: ForwardRobustnessParamSensitivity[];
}): {
  bestProfit: ForwardRobustnessGridRow;
  bestStable: ForwardRobustnessGridRow;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
} {
  const { gridRows, baseline, sensitivityRows } = input;

  const withTrades = gridRows.filter((r) => r.tradeCount > 0);
  const bestProfit = [...withTrades].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const stablePool = withTrades.filter(
    (r) =>
      r.cumulativeReturnPct >= bestProfit.cumulativeReturnPct * 0.88 &&
      r.winRatePct >= 85,
  );
  const bestStable =
    stablePool.length > 0
      ? [...stablePool].sort((a, b) => stabilityScore(b) - stabilityScore(a))[0]!
      : [...withTrades].sort((a, b) => stabilityScore(b) - stabilityScore(a))[0]!;

  const cumDelta = round3(bestProfit.cumulativeReturnPct - baseline.cumulativeReturnPct);
  const wrDelta = round3(baseline.winRatePct - bestProfit.winRatePct);
  const marDelta = round3((baseline.mar ?? 0) - (bestProfit.mar ?? 0));

  const answer1Ja =
    `最高利益: ${bestProfit.labelJa} · 累積${bestProfit.cumulativeReturnPct}% · WR${bestProfit.winRatePct}% · MAR${bestProfit.mar ?? '—'} · ${bestProfit.tradeCount}件。`;

  const answer2Ja =
    `最高安定: ${bestStable.labelJa} · 累積${bestStable.cumulativeReturnPct}% · WR${bestStable.winRatePct}% · DD${bestStable.maxDrawdownPct ?? '—'}% · MAR${bestStable.mar ?? '—'}。`;

  const answer3Ja =
    `現行推奨との差: 累積${cumDelta >= 0 ? '+' : ''}${cumDelta}pt（基準${baseline.cumulativeReturnPct}% vs 最高${bestProfit.cumulativeReturnPct}%）· ` +
    `WR差${wrDelta}pt · MAR差${marDelta} · 件数${baseline.tradeCount} vs ${bestProfit.tradeCount}。`;

  const answer4Ja = sensitivityRows
    .map(
      (s) =>
        `${s.rank}.${s.paramJa}(範囲${s.cumulativeRangePct}pt·最大下落${s.worstDropFromBaselinePct}pt)`,
    )
    .join(' > ');

  const fragile = sensitivityRows.filter((s) => s.worstDropFromBaselinePct > baseline.cumulativeReturnPct * 0.15);
  const answer5Ja =
    fragile.length === 0
      ? '壊れやすい条件: 単独変動では基準から15%超の累積下落なし。'
      : `壊れやすい条件: ${fragile.map((s) => `${s.paramJa}(${s.fragileValuesJa})`).join(' · ')}。`;

  const robustParams = sensitivityRows.filter((s) => s.cumulativeRangePct <= baseline.cumulativeReturnPct * 0.15);
  const answer6Ja =
    robustParams.length > 0
      ? `頑健な条件: ${robustParams.map((s) => `${s.paramJa}(${s.robustValuesJa})`).join(' · ')}。`
      : `頑健な条件: 全パラメータで基準±15%以内に収まる範囲あり（${sensitivityRows.map((s) => s.paramJa).join(' · ')}）。`;

  return { bestProfit, bestStable, answer1Ja, answer2Ja, answer3Ja, answer4Ja, answer5Ja, answer6Ja };
}

export async function fetchRobustnessAuditBundle(
  startDate = EXTENDED_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE];
  const etfBars: Record<string, OhlcvBar[]> = {};
  const fetchedSymbols: string[] = [];
  const failedSymbols: string[] = [];
  const firstBarDates: Record<string, string> = {};

  for (const sym of symbols) {
    const { bars, result } = await fetchForwardOhlcvDetailed(sym, 15_000, startDate);
    if (!result.ok || bars.length < 80) {
      failedSymbols.push(sym);
      continue;
    }
    etfBars[sym] = bars;
    fetchedSymbols.push(sym);
    firstBarDates[sym] = bars[0]!.date;
  }

  if (fetchedSymbols.length < 4) return null;

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, startDate);
  if (!spyFetch.result.ok) return null;

  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, startDate);
  const dateSet = new Set<string>();
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();

  return {
    etfBars,
    spyBars: spyFetch.bars,
    vixBars: vixFetch.result.ok ? vixFetch.bars : [],
    tradingDates,
    latestDate: tradingDates[tradingDates.length - 1] ?? '',
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

export function auditRobustness(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardRobustnessAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );

  const templates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols,
    fromDate,
    toDate,
  });

  const gridRows: ForwardRobustnessGridRow[] = [];
  for (const adxMin of ROBUSTNESS_ADX_LEVELS) {
    for (const vixThreshold of ROBUSTNESS_VIX_LEVELS) {
      for (const takeProfitPct of ROBUSTNESS_TP_LEVELS) {
        for (const maxHoldDays of ROBUSTNESS_HOLD_LEVELS) {
          const executed = runRobustnessCombo(
            templates,
            symbols,
            adxMin,
            vixThreshold,
            takeProfitPct,
            maxHoldDays,
          );
          gridRows.push(
            buildRobustnessGridRow(
              adxMin,
              vixThreshold,
              takeProfitPct,
              maxHoldDays,
              executed,
              fromDate,
              toDate,
            ),
          );
        }
      }
    }
  }

  const baselineRow = gridRows.find((r) => r.isBaseline)!;
  const sensitivityRows = buildOneAtATimeSensitivity(gridRows, baselineRow);
  const { bestProfit, bestStable, answer1Ja, answer2Ja, answer3Ja, answer4Ja, answer5Ja, answer6Ja } =
    evaluateRobustness({
      gridRows,
      baseline: baselineRow,
      sensitivityRows,
    });
  const { grade, gradeJa } = gradeRobustness({
    baseline: baselineRow,
    gridRows,
    sensitivityRows,
    bestProfit,
  });

  const humanSummaryJa = [
    '【最重要監査その30 · 2026以降想定 · 頑健性監査】',
    `ETF: ${symbols.join('/')}`,
    FIXED_CONDITIONS_JA,
    `基準: ADX>${BASELINE_ADX} VIX≥${BASELINE_VIX} +${BASELINE_TP}%/${BASELINE_HOLD}日`,
    `${fromDate}〜${toDate} · グリッド${gridRows.length}通り`,
    '',
    `【判定 ${grade}】 ${gradeJa}`,
    '',
    answer1Ja,
    answer2Ja,
    answer3Ja,
    '',
    `感度: ${answer4Ja}`,
    answer5Ja,
    answer6Ja,
    '',
    `基準: 累積${baselineRow.cumulativeReturnPct}% WR${baselineRow.winRatePct}% MAR${baselineRow.mar ?? '—'} DD${baselineRow.maxDrawdownPct ?? '—'}%`,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baselineAdx: BASELINE_ADX,
    baselineVix: BASELINE_VIX,
    baselineTakeProfitPct: BASELINE_TP,
    baselineMaxHoldDays: BASELINE_HOLD,
    gridRows,
    baselineRow,
    bestProfitRow: bestProfit,
    bestStableRow: bestStable,
    sensitivityRows,
    grade,
    gradeJa,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    answer6Ja,
    humanSummaryJa,
  };
}

export async function runRobustnessAudit(): Promise<ForwardRobustnessAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditRobustness({ bundle });
}

export function formatRobustnessCsv(report: ForwardRobustnessAuditReport): string {
  const lines: string[] = [
    `# 最重要監査その30 頑健性 ${report.fromDate}〜${report.toDate}`,
    `# ETF: ${report.etfUniverse.join('+')}`,
    `# 判定: ${report.grade} — ${report.gradeJa}`,
    '',
    'adx,vix,tp,hold,tradeCount,winRatePct,cumulative,maxDD,profitFactor,sharpe,mar,isBaseline',
  ];
  for (const r of report.gridRows) {
    lines.push(
      [
        r.adxMin,
        r.vixThreshold,
        r.takeProfitPct,
        r.maxHoldDays,
        r.tradeCount,
        r.winRatePct,
        r.cumulativeReturnPct,
        r.maxDrawdownPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.isBaseline ? 1 : 0,
      ].join(','),
    );
  }
  lines.push('');
  lines.push('rank,paramKey,paramJa,cumRange,cumStd,marRange,worstDrop,fragile,robust');
  for (const s of report.sensitivityRows) {
    lines.push(
      [
        s.rank,
        s.paramKey,
        `"${s.paramJa}"`,
        s.cumulativeRangePct,
        s.cumulativeStdPct,
        s.marRange,
        s.worstDropFromBaselinePct,
        `"${s.fragileValuesJa}"`,
        `"${s.robustValuesJa}"`,
      ].join(','),
    );
  }
  lines.push('');
  lines.push('answer,content');
  lines.push(`1,"${report.answer1Ja.replace(/"/g, '""')}"`);
  lines.push(`2,"${report.answer2Ja.replace(/"/g, '""')}"`);
  lines.push(`3,"${report.answer3Ja.replace(/"/g, '""')}"`);
  lines.push(`4,"${report.answer4Ja.replace(/"/g, '""')}"`);
  lines.push(`5,"${report.answer5Ja.replace(/"/g, '""')}"`);
  lines.push(`6,"${report.answer6Ja.replace(/"/g, '""')}"`);
  lines.push(`grade,"${report.grade}: ${report.gradeJa.replace(/"/g, '""')}"`);
  return lines.join('\n');
}
