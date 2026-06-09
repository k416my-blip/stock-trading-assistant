/**
 * 最重要監査その38 — 銘柄ウェイト最適化監査 · 監査37最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSymbolWeightAdoptionGrade,
  ForwardSymbolWeightAuditReport,
  ForwardSymbolWeightSchemeId,
  ForwardSymbolWeightSchemeMetrics,
} from '../../types/forwardValidation';
import { symbolWinRatesBeforeUniverse } from './forwardValidationEtfUniverseAudit';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  buildSymbolMetricsFromTrades,
} from './forwardValidationSymbolContributionAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  buildWalkForward31PhaseMetrics,
  collectRecommendedRuleCandidates,
  dedupOneEtfPerDayWinRateWithHistory,
} from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const RM3000_CAPITAL_MYR = 3000;
const BASE_LOT_MYR = 700;
const MIN_SLOT_PCT = 12;
const MAX_SLOT_PCT = 50;
const BASE_SLOT_PCT = 100 / FORWARD_MAX_CONCURRENT;
const PERIOD_2026_FROM = '2026-01-01';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000 · 利益50%再投資(運用推奨)';

const CURRENT_WEIGHT_NOTE_JA =
  '現行: 日次シグナルは過去勝率で1銘柄選定 · 枠配分は勝率連動スロット(約12〜50%・3枠上限) · 銘柄固定%ウェイトは未使用';

export type WeightSelectionMode = 'win_rate' | 'equal' | 'weighted';
export type WeightSlotMode = 'win_rate' | 'equal' | 'weight_proportional';

export type SymbolWeightSchemeDef = {
  schemeId: ForwardSymbolWeightSchemeId;
  labelJa: string;
  universe: readonly string[];
  selectionMode: WeightSelectionMode;
  slotMode: WeightSlotMode;
  selectionWeights?: Record<string, number>;
  slotWeights?: Record<string, number>;
};

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

function normalizeWeights(
  symbols: readonly string[],
  raw: Record<string, number>,
): Record<string, number> {
  const vals = symbols.map((s) => Math.max(0, raw[s] ?? 0));
  const sum = vals.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  symbols.forEach((s, i) => {
    out[s] = sum > 0 ? round3(vals[i]! / sum) : round3(1 / symbols.length);
  });
  return out;
}

function heavyWeights(
  symbols: readonly string[],
  focus: string,
  ratio = 3,
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const s of symbols) raw[s] = s === focus ? ratio : 1;
  return normalizeWeights(symbols, raw);
}

function centerWeights(
  symbols: readonly string[],
  focus: string[],
  inner = 3,
  outer = 0.5,
): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const s of symbols) raw[s] = focus.includes(s) ? inner : outer;
  return normalizeWeights(symbols, raw);
}

export function buildSymbolWeightSchemeDefs(input: {
  symbols: readonly string[];
  contributionWeights: Record<string, number>;
  sharpeWeights: Record<string, number>;
  marWeights: Record<string, number>;
  ddMinWeights: Record<string, number>;
}): SymbolWeightSchemeDef[] {
  const all = input.symbols;
  const equal = normalizeWeights(all, Object.fromEntries(all.map((s) => [s, 1])));

  return [
    {
      schemeId: 'current',
      labelJa: '① 現行ウェイト確認',
      universe: all,
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
    {
      schemeId: 'equal',
      labelJa: '② 均等配分',
      universe: all,
      selectionMode: 'equal',
      slotMode: 'equal',
      selectionWeights: equal,
      slotWeights: equal,
    },
    {
      schemeId: 'contribution',
      labelJa: '③ 寄与度比例配分',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: input.contributionWeights,
      slotWeights: input.contributionWeights,
    },
    {
      schemeId: 'sharpe_max',
      labelJa: '④ Sharpe最大化配分',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: input.sharpeWeights,
      slotWeights: input.sharpeWeights,
    },
    {
      schemeId: 'mar_max',
      labelJa: '⑤ MAR最大化配分',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: input.marWeights,
      slotWeights: input.marWeights,
    },
    {
      schemeId: 'dd_min',
      labelJa: '⑥ DD最小化配分',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: input.ddMinWeights,
      slotWeights: input.ddMinWeights,
    },
    {
      schemeId: 'hdv_heavy',
      labelJa: '⑦ HDV重視',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: heavyWeights(all, 'HDV'),
      slotWeights: heavyWeights(all, 'HDV'),
    },
    {
      schemeId: 'dgro_heavy',
      labelJa: '⑧ DGRO重視',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: heavyWeights(all, 'DGRO'),
      slotWeights: heavyWeights(all, 'DGRO'),
    },
    {
      schemeId: 'qqq_heavy',
      labelJa: '⑨ QQQ重視',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: heavyWeights(all, 'QQQ'),
      slotWeights: heavyWeights(all, 'QQQ'),
    },
    {
      schemeId: 'schd_heavy',
      labelJa: '⑩ SCHD重視',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: heavyWeights(all, 'SCHD'),
      slotWeights: heavyWeights(all, 'SCHD'),
    },
    {
      schemeId: 'hdv_dgro_center',
      labelJa: '⑪ HDV+DGRO中心',
      universe: all,
      selectionMode: 'weighted',
      slotMode: 'weight_proportional',
      selectionWeights: centerWeights(all, ['HDV', 'DGRO']),
      slotWeights: centerWeights(all, ['HDV', 'DGRO']),
    },
    {
      schemeId: 'hdv_dgro_qqq',
      labelJa: '⑫ HDV+DGRO+QQQ',
      universe: ['HDV', 'DGRO', 'QQQ'],
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
    {
      schemeId: 'hdv_qqq',
      labelJa: '⑬ HDV+QQQ',
      universe: ['HDV', 'QQQ'],
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
    {
      schemeId: 'dgro_qqq',
      labelJa: '⑭ DGRO+QQQ',
      universe: ['DGRO', 'QQQ'],
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
    {
      schemeId: 'excl_schd',
      labelJa: '⑮ SCHD除外',
      universe: all.filter((s) => s !== 'SCHD'),
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
    {
      schemeId: 'excl_qqq',
      labelJa: '⑯ QQQ除外',
      universe: all.filter((s) => s !== 'QQQ'),
      selectionMode: 'win_rate',
      slotMode: 'win_rate',
    },
  ];
}

export function dedupOneEtfPerDayWithWeights(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
  selectionMode: WeightSelectionMode,
  selectionWeights: Record<string, number>,
  seedHistory: ForwardPassedTradeRecord[] = [],
): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    if (!universeSymbols.includes(t.symbol)) continue;
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const dates = [...byDate.keys()].sort();
  const out: ForwardPassedTradeRecord[] = [];
  const rollingHistory = [...seedHistory];

  for (const date of dates) {
    const rows = byDate.get(date)!;
    let best: ForwardPassedTradeRecord;
    if (selectionMode === 'win_rate') {
      const wr = symbolWinRatesBeforeUniverse(rollingHistory, date, universeSymbols);
      best = [...rows].sort((a, b) => {
        const diff = (wr[b.symbol] ?? 0.5) - (wr[a.symbol] ?? 0.5);
        if (Math.abs(diff) > 1e-9) return diff;
        return a.symbol.localeCompare(b.symbol);
      })[0]!;
    } else {
      const wr =
        selectionMode === 'weighted'
          ? symbolWinRatesBeforeUniverse(rollingHistory, date, universeSymbols)
          : {};
      best = [...rows].sort((a, b) => {
        const scoreA = (selectionWeights[a.symbol] ?? 0) * (wr[a.symbol] ?? 1);
        const scoreB = (selectionWeights[b.symbol] ?? 0) * (wr[b.symbol] ?? 1);
        const diff = scoreB - scoreA;
        if (Math.abs(diff) > 1e-9) return diff;
        return a.symbol.localeCompare(b.symbol);
      })[0]!;
    }
    out.push(best);
    rollingHistory.push(best);
  }
  return out;
}

export function simulateOperationalWithScheme(
  candidates: ForwardPassedTradeRecord[],
  def: SymbolWeightSchemeDef,
): ForwardPassedTradeRecord[] {
  const universe = [...def.universe];
  const selWeights =
    def.selectionWeights ??
    normalizeWeights(universe, Object.fromEntries(universe.map((s) => [s, 1])));

  const deduped =
    def.selectionMode === 'win_rate'
      ? dedupOneEtfPerDayWinRateWithHistory(candidates, universe, [])
      : dedupOneEtfPerDayWithWeights(
          candidates,
          universe,
          def.selectionMode === 'equal' ? 'equal' : 'weighted',
          selWeights,
          [],
        );

  const sorted = [...deduped].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  const open: ForwardPassedTradeRecord[] = [];
  const executed: ForwardPassedTradeRecord[] = [];

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    if (open.length >= FORWARD_MAX_CONCURRENT) continue;
    open.push(t);
    executed.push(t);
  }
  return executed;
}

export function resolveSlotPctForScheme(
  trade: ForwardPassedTradeRecord,
  history: ForwardPassedTradeRecord[],
  def: SymbolWeightSchemeDef,
): number {
  const universe = [...def.universe];
  if (def.slotMode === 'win_rate') {
    return winRateSlotPct(trade, history, universe);
  }
  const slotWeights =
    def.slotWeights ??
    normalizeWeights(universe, Object.fromEntries(universe.map((s) => [s, 1])));
  const avg =
    mean(universe.map((s) => slotWeights[s] ?? 0)) ?? 1 / Math.max(universe.length, 1);
  const w = slotWeights[trade.symbol] ?? avg;
  const mult = avg > 0 ? w / avg : 1;
  if (def.slotMode === 'equal') {
    return round3(Math.max(MIN_SLOT_PCT, Math.min(MAX_SLOT_PCT, BASE_SLOT_PCT)));
  }
  return round3(
    Math.max(MIN_SLOT_PCT, Math.min(MAX_SLOT_PCT, BASE_SLOT_PCT * mult)),
  );
}

export type Rm3000PathResult = {
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  expectedProfitMYR: number;
  maxLossMYR: number;
  finalEquityMYR: number;
  minEquityMYR: number;
};

export function simulateRm3000WeightedPath(
  trades: ForwardPassedTradeRecord[],
  def: SymbolWeightSchemeDef,
): Rm3000PathResult {
  const universe = [...def.universe];
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const entries = [...trades].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  type Leg = ForwardPassedTradeRecord & { notional: number };
  const pendingByExit = new Map<string, Leg[]>();
  for (const t of entries) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...entries.map((t) => t.entryDate), ...entries.map((t) => t.exitDate)]),
  ].sort();

  let equity = RM3000_CAPITAL_MYR;
  let peak = equity;
  let minEquity = equity;
  let maxDd = 0;
  const open: Leg[] = [];
  const equityReturns: number[] = [];
  const history: ForwardPassedTradeRecord[] = [];

  for (const date of eventDates) {
    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex((o) => o.id === leg.id);
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = round3((active.notional * active.returnPct) / 100);
      const eqBefore = equity;
      equity = round3(equity + pnl);
      equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
      if (equity < minEquity) minEquity = equity;
    }

    const dayEntries = entries.filter((t) => t.entryDate === date);
    for (const t of dayEntries) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      const slotPct = resolveSlotPctForScheme(t, history, def);
      const openNotional = stillOpen.reduce((s, l) => s + l.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      let notional = round3(Math.min(target, available, BASE_LOT_MYR * 2));
      if (def.slotMode === 'weight_proportional' && def.slotWeights) {
        const avg =
          mean(universe.map((s) => def.slotWeights![s] ?? 0)) ?? 1 / universe.length;
        const w = def.slotWeights[t.symbol] ?? avg;
        const lotScale = avg > 0 ? w / avg : 1;
        notional = round3(Math.min((equity * slotPct) / 100, available, BASE_LOT_MYR * lotScale * 1.5));
      }
      notional = round3(Math.min(notional, BASE_LOT_MYR * 1.25, available));
      if (notional <= 0) continue;

      const leg: Leg = { ...t, notional };
      open.push(leg);
      history.push(t);
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;
    }
  }

  for (const leg of open) {
    const pnl = round3((leg.notional * leg.returnPct) / 100);
    equity = round3(equity + pnl);
    if (equity < minEquity) minEquity = equity;
  }

  const cumulativeReturnPct = round3(
    ((equity - RM3000_CAPITAL_MYR) / RM3000_CAPITAL_MYR) * 100,
  );
  const years = Math.max(entries.length / 8, 1);
  const mu = mean(equityReturns);
  const sigma =
    equityReturns.length > 1
      ? Math.sqrt(
          equityReturns.reduce((a, x) => a + (x - (mu ?? 0)) ** 2, 0) / equityReturns.length,
        )
      : 0;
  const sharpe =
    mu != null && sigma > 1e-9
      ? round3((mu / sigma) * Math.sqrt(Math.max(equityReturns.length / years, 1)))
      : null;
  const cagr =
    cumulativeReturnPct > -100
      ? round3(
          (Math.pow(1 + cumulativeReturnPct / 100, 1 / Math.max(years / 2, 0.5)) - 1) * 100,
        )
      : null;
  const mar =
    cagr != null && maxDd !== 0 ? round3(cagr / Math.abs(maxDd)) : null;

  return {
    cumulativeReturnPct,
    maxDrawdownPct: round3(maxDd),
    sharpe,
    mar,
    expectedProfitMYR: round2(equity - RM3000_CAPITAL_MYR),
    maxLossMYR: round2(Math.max(0, peak - minEquity)),
    finalEquityMYR: round2(equity),
    minEquityMYR: round2(minEquity),
  };
}

function deriveStaticWeights(
  symbolRows: ReturnType<typeof buildSymbolMetricsFromTrades>,
  symbols: readonly string[],
): {
  contribution: Record<string, number>;
  sharpe: Record<string, number>;
  mar: Record<string, number>;
  ddMin: Record<string, number>;
} {
  const contribution: Record<string, number> = {};
  const sharpe: Record<string, number> = {};
  const mar: Record<string, number> = {};
  const ddMin: Record<string, number> = {};
  for (const s of symbols) {
    const row = symbolRows.find((r) => r.symbol === s);
    contribution[s] = Math.max(0, row?.cumulativeReturnPct ?? 0);
    sharpe[s] = Math.max(0, row?.sharpe ?? 0);
    const dd = row?.maxDrawdownPct ?? 0;
    mar[s] = Math.max(0, row?.cumulativeReturnPct ?? 0) / Math.max(Math.abs(dd), 0.1);
    ddMin[s] = 1 / Math.max(Math.abs(dd), 0.1);
  }
  return {
    contribution: normalizeWeights(symbols, contribution),
    sharpe: normalizeWeights(symbols, sharpe),
    mar: normalizeWeights(symbols, mar),
    ddMin: normalizeWeights(symbols, ddMin),
  };
}

function gradeScheme(input: {
  schemeId: ForwardSymbolWeightSchemeId;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
}): ForwardSymbolWeightAdoptionGrade {
  if (input.schemeId === 'current') return 'B';
  if (input.schemeId === 'excl_schd' || input.schemeId === 'excl_qqq') return 'C';
  if (Math.abs(input.maxDrawdownPct) > 20) return 'D';
  if (input.cumulativeReturnPct < 0) return 'D';
  if (input.sharpe != null && input.sharpe >= 2 && input.cumulativeReturnPct >= 100) return 'A';
  if (input.cumulativeReturnPct >= 105) return 'B';
  return 'C';
}

function recommendedLotForScheme(def: SymbolWeightSchemeDef): number {
  if (def.slotMode === 'win_rate' || def.schemeId === 'current') return BASE_LOT_MYR;
  const universe = [...def.universe];
  const maxW = Math.max(...universe.map((s) => def.slotWeights?.[s] ?? 0.25));
  return round2(Math.min(1050, Math.max(BASE_LOT_MYR, BASE_LOT_MYR * (maxW / 0.25))));
}

export function buildSymbolWeightReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardSymbolWeightAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const candidates = collectRecommendedRuleCandidates(
    input.bundle,
    symbols,
    fromDate,
    toDate,
  );

  const baselineExecuted = simulateOperationalWithScheme(candidates, {
    schemeId: 'current',
    labelJa: 'baseline',
    universe: symbols,
    selectionMode: 'win_rate',
    slotMode: 'win_rate',
  });

  const symbolRows = buildSymbolMetricsFromTrades(
    baselineExecuted,
    symbols,
    fromDate,
    toDate,
  );
  const staticW = deriveStaticWeights(symbolRows, symbols);
  const schemeDefs = buildSymbolWeightSchemeDefs({
    symbols,
    contributionWeights: staticW.contribution,
    sharpeWeights: staticW.sharpe,
    marWeights: staticW.mar,
    ddMinWeights: staticW.ddMin,
  });

  const schemeRows: ForwardSymbolWeightSchemeMetrics[] = schemeDefs.map((def) => {
    const executed = simulateOperationalWithScheme(candidates, def);
    const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, executed);
    const rm = simulateRm3000WeightedPath(executed, def);
    return {
      schemeId: def.schemeId,
      labelJa: def.labelJa,
      universe: [...def.universe],
      selectionNoteJa:
        def.selectionMode === 'win_rate'
          ? '過去勝率優先選定'
          : def.selectionMode === 'equal'
            ? '均等スコア選定'
            : '静的ウェイト×勝率選定',
      slotNoteJa:
        def.slotMode === 'win_rate'
          ? '勝率連動スロット'
          : def.slotMode === 'equal'
            ? `均等${BASE_SLOT_PCT}%/枠`
            : 'ウェイト比例スロット',
      tradeCount: phase.tradeCount,
      winRatePct: phase.winRatePct,
      profitFactor: phase.profitFactor,
      sharpe: phase.sharpe,
      mar: phase.mar,
      maxDrawdownPct: phase.maxDrawdownPct,
      cumulativeReturnPct: phase.cumulativeReturnPct,
      expectedProfitMYR: rm.expectedProfitMYR,
      maxLossMYR: rm.maxLossMYR,
      recommendedLotMYR: recommendedLotForScheme(def),
      adoptionGrade: gradeScheme({
        schemeId: def.schemeId,
        cumulativeReturnPct: phase.cumulativeReturnPct,
        maxDrawdownPct: phase.maxDrawdownPct ?? 0,
        sharpe: phase.sharpe,
      }),
    };
  });

  const byCum = [...schemeRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const bySharpe = [...schemeRows].sort((a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999));
  const byDd = [...schemeRows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );

  const profitMax = byCum[0]!;
  const sharpeMax = bySharpe[0]!;
  const ddMin = byDd[0]!;

  const since2026Defs = schemeDefs.filter((d) =>
    ['current', 'excl_schd', 'hdv_dgro_qqq', 'contribution', 'equal'].includes(d.schemeId),
  );
  let best2026 = schemeRows.find((r) => r.schemeId === 'current')!;
  let best2026Score = -Infinity;
  for (const def of since2026Defs) {
    const executed = tradesInSignalRange(
      simulateOperationalWithScheme(candidates, def),
      PERIOD_2026_FROM,
      toDate,
    );
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      PERIOD_2026_FROM,
      toDate,
      executed,
    );
    const score = (phase.sharpe ?? 0) * 2 + phase.cumulativeReturnPct;
    if (score > best2026Score) {
      best2026Score = score;
      best2026 = schemeRows.find((r) => r.schemeId === def.schemeId) ?? best2026;
    }
  }

  const operational = schemeRows.find((r) => r.schemeId === 'current')!;
  const exclSchd = schemeRows.find((r) => r.schemeId === 'excl_schd');
  const operationalNoteJa =
    exclSchd && exclSchd.cumulativeReturnPct > operational.cumulativeReturnPct + 2
      ? 'シミュレーション上はSCHD除外が累積+だが、現行勝率重みを維持（ルール変更なし）。'
      : '現行の勝率重み選定・RM700/枠が実運用推奨。ウェイト変更は参考のみ。';

  const answerAJa = `A 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · RM期待+${profitMax.expectedProfitMYR}）— 評価${profitMax.adoptionGrade}`;
  const answerBJa = `B Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'} · WR${sharpeMax.winRatePct}%）— 評価${sharpeMax.adoptionGrade}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · MAR${ddMin.mar ?? '—'}）— 評価${ddMin.adoptionGrade}`;
  const answerDJa = `D 実運用推奨: ${operational.labelJa}（累積${operational.cumulativeReturnPct}% · ロットRM${operational.recommendedLotMYR}）— 評価B`;
  const answerEJa = `E 2026以降: ${best2026.labelJa}（${best2026.universe.join('+')}）— 評価C`;

  const humanSummaryJa = [
    `監査38 銘柄ウェイト ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    CURRENT_WEIGHT_NOTE_JA,
    `利益最大 ${profitMax.schemeId} · Sharpe最大 ${sharpeMax.schemeId} · DD最小 ${ddMin.schemeId}`,
    answerDJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    currentWeightNoteJa: CURRENT_WEIGHT_NOTE_JA,
    schemeRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalSchemeId: 'current',
    operationalGrade: 'B',
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runSymbolWeightAudit(): Promise<ForwardSymbolWeightAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildSymbolWeightReport({ bundle });
}

export function formatSymbolWeightCsv(report: ForwardSymbolWeightAuditReport): string {
  const lines = [
    `# 最重要監査その38 銘柄ウェイト ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.currentWeightNoteJa}`,
    '',
    'schemeId,label,universe,selection,slot,trades,winRatePct,profitFactor,sharpe,mar,maxDD,cumulative,expectedProfitMYR,maxLossMYR,recommendedLotMYR,grade',
    ...report.schemeRows.map((r) =>
      [
        r.schemeId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.universe.join('+'),
        `"${r.selectionNoteJa}"`,
        `"${r.slotNoteJa}"`,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.expectedProfitMYR,
        r.maxLossMYR,
        r.recommendedLotMYR,
        r.adoptionGrade,
      ].join(','),
    ),
    '',
    'answer,content,grade',
    ['A', report.answerAJa, 'A'],
    ['B', report.answerBJa, 'B'],
    ['C', report.answerCJa, 'C'],
    ['D', report.answerDJa, 'B'],
    ['E', report.answerEJa, 'C'],
    ['operational', report.operationalNoteJa, report.operationalGrade],
  ];
  return lines.join('\n');
}
