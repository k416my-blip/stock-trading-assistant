/**
 * 最重要監査その70 — Malaysia v2.1→v3 月次積立シミュレーション · 監査69固定 · ルール変更なし
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardMalaysiaV3DcaAuditReport,
  ForwardMalaysiaV3DcaPlanId,
  ForwardMalaysiaV3DcaPlanRow,
  ForwardMalaysiaV3Grade,
  ForwardMalaysiaV3YtlTimingId,
  ForwardMalaysiaV3YtlTimingRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import { lotPerSlotForCapital } from './forwardValidationCompoundingAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import {
  collectExecutedTradesForUniverse,
  MALAYSIA_V1_AUDIT_START,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import { MALAYSIA_V21_UNIVERSE } from './forwardValidationMalaysiaV2WeightAudit';
import { fetchMalaysiaV69AuditBundle } from './forwardValidationMalaysiaV21FourthSymbolAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import {
  resolveSlotPctForScheme,
  type SymbolWeightSchemeDef,
} from './forwardValidationSymbolWeightAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_70_RUNS = 10_000;
const INITIAL_CAPITAL = 3000;
const CASH_RESERVE_PCT = 15;
const BASE_LOT_MYR = 700;
const BOOTSTRAP_SEED = 70_001;
const WF_TRAIN_PCT = 70;
const RUIN_EQUITY_PCT = 50;
const YTL_SYMBOL = '6742';

export const V3_SYMBOLS = ['5347', '5398', '1023', YTL_SYMBOL] as const;
export const V21_SYMBOLS = [...MALAYSIA_V21_UNIVERSE];

export const MALAYSIA_V3_DCA_PLANS: {
  planId: ForwardMalaysiaV3DcaPlanId;
  labelJa: string;
  monthlyContributionMYR: number;
}[] = [
  { planId: 'lump_sum', labelJa: 'A 一括投資', monthlyContributionMYR: 0 },
  { planId: 'dca_500', labelJa: 'B 毎月積立RM500', monthlyContributionMYR: 500 },
  { planId: 'dca_1000', labelJa: 'B 毎月積立RM1000', monthlyContributionMYR: 1000 },
  { planId: 'dca_1500', labelJa: 'B 毎月積立RM1500', monthlyContributionMYR: 1500 },
];

export const MALAYSIA_V3_YTL_TIMINGS: {
  timingId: ForwardMalaysiaV3YtlTimingId;
  labelJa: string;
  ytlThresholdMYR: number;
}[] = [
  { timingId: 't_10000', labelJa: 'RM10000到達時', ytlThresholdMYR: 10_000 },
  { timingId: 't_15000', labelJa: 'RM15000到達時', ytlThresholdMYR: 15_000 },
  { timingId: 't_20000', labelJa: 'RM20000到達時', ytlThresholdMYR: 20_000 },
  { timingId: 't_immediate', labelJa: '初回から4銘柄', ytlThresholdMYR: INITIAL_CAPITAL },
];

const FIXED_CONDITIONS_JA =
  'MY v3積立 · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM3000初期 · v2.1→RM10000でYTL追加';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[]): number {
  const m = mean(vals);
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function monthsBetween(fromDate: string, toDate: string): number {
  const a = new Date(`${fromDate}T00:00:00Z`);
  const b = new Date(`${toDate}T00:00:00Z`);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function addYears(date: string, years: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function equalWeights(symbols: string[]): Record<string, number> {
  const pct = round3(100 / symbols.length);
  return Object.fromEntries(symbols.map((s) => [s, pct]));
}

function buildWeightScheme(symbols: string[]): SymbolWeightSchemeDef {
  return {
    schemeId: 'equal',
    labelJa: 'MY v3 equal weight',
    universe: symbols,
    selectionMode: 'win_rate',
    slotMode: 'weight_proportional',
    slotWeights: equalWeights(symbols),
  };
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export type MalaysiaV3DcaExecutedTrade = {
  id: string;
  symbol: string;
  phase: 'phase3' | 'phase4';
  signalDate: string;
  entryDate: string;
  exitDate: string;
  notionalMYR: number;
  weightPct: number;
  returnPct: number;
  pnlMYR: number;
  equityAfterMYR: number;
};

export type MalaysiaV3PhaseWeights = {
  phase3: Record<string, number>;
  phase4: Record<string, number>;
};

export type MalaysiaV3DcaPathResult = {
  finalEquityMYR: number;
  totalContributedMYR: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  cagr: number | null;
  equityAt1yr: number;
  equityAt3yr: number;
  equityAt5yr: number;
  monthsToRm10000: number | null;
  monthsToRm30000: number | null;
  monthsToRm100000: number | null;
  ytlAddedMonth: number | null;
  ytlAddedDate: string | null;
  minEquityMYR: number;
  tradeCount: number;
  equityReturns: number[];
  equitySnapshots: { date: string; equity: number }[];
  executedTrades?: MalaysiaV3DcaExecutedTrade[];
};

export function simulateMalaysiaV3DcaPath(input: {
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  initialCapitalMYR?: number;
  monthlyContributionMYR: number;
  ytlThresholdMYR?: number;
  cashReservePct?: number;
  phaseWeights?: MalaysiaV3PhaseWeights;
  captureLedger?: boolean;
  zeroPnlSymbols?: string[];
}): MalaysiaV3DcaPathResult {
  const initial = input.initialCapitalMYR ?? INITIAL_CAPITAL;
  const monthly = input.monthlyContributionMYR;
  const ytlThreshold = input.ytlThresholdMYR ?? 10_000;
  const cashReservePct = input.cashReservePct ?? CASH_RESERVE_PCT;
  const maxDeployFrac = (100 - cashReservePct) / 100;
  const startDate = input.fromDate;

  const entries = [...input.trades]
    .filter((t) => t.signalDate >= input.fromDate && t.signalDate <= input.toDate)
    .sort(
      (a, b) =>
        a.entryDate.localeCompare(b.entryDate) ||
        a.signalDate.localeCompare(b.signalDate) ||
        a.symbol.localeCompare(b.symbol),
    );

  type Leg = ForwardPassedTradeRecord & { notional: number; weightPct: number; entryPhase: 'phase3' | 'phase4' };
  const pendingByExit = new Map<string, Leg[]>();
  for (const t of entries) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, notional: 0, weightPct: 0, entryPhase: 'phase3' });
    pendingByExit.set(t.exitDate, list);
  }

  const tradeDates = [
    ...new Set([...entries.map((t) => t.entryDate), ...entries.map((t) => t.exitDate)]),
  ].sort();

  const monthStarts: string[] = [];
  {
    const d = new Date(`${input.fromDate}T00:00:00Z`);
    const end = new Date(`${input.toDate}T00:00:00Z`);
    while (d <= end) {
      monthStarts.push(d.toISOString().slice(0, 10));
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
  }

  const eventDates = [...new Set([...tradeDates, ...monthStarts])].sort();

  let equity = initial;
  let totalContributed = initial;
  let peak = equity;
  let minEquity = equity;
  let maxDd = 0;
  let phase4 = ytlThreshold <= initial;
  let ytlAddedDate: string | null = phase4 ? startDate : null;
  let ytlAddedMonth: number | null = phase4 ? 0 : null;
  let monthsToRm10000: number | null = equity >= 10_000 ? 0 : null;
  let monthsToRm30000: number | null = equity >= 30_000 ? 0 : null;
  let monthsToRm100000: number | null = equity >= 100_000 ? 0 : null;

  const open: Leg[] = [];
  const history: ForwardPassedTradeRecord[] = [];
  const equityReturns: number[] = [];
  const equitySnapshots: { date: string; equity: number }[] = [];
  let executed = 0;
  let lastMonth = '';
  let grossWin = 0;
  let grossLoss = 0;
  const executedTrades: MalaysiaV3DcaExecutedTrade[] = [];

  const recordExecuted = (leg: Leg, pnl: number) => {
    if (!input.captureLedger) return;
    executedTrades.push({
      id: leg.id,
      symbol: leg.symbol,
      phase: leg.entryPhase,
      signalDate: leg.signalDate,
      entryDate: leg.entryDate,
      exitDate: leg.exitDate,
      notionalMYR: leg.notional,
      weightPct: round3(leg.weightPct),
      returnPct: leg.returnPct,
      pnlMYR: pnl,
      equityAfterMYR: round3(equity),
    });
  };

  const activeSymbols = () => {
    const base = phase4 ? [...V3_SYMBOLS] : [...V21_SYMBOLS];
    if (!input.phaseWeights) return base;
    const w = phase4 ? input.phaseWeights.phase4 : input.phaseWeights.phase3;
    const weighted = Object.keys(w).filter((s) => (w[s] ?? 0) > 0);
    return [...new Set([...base, ...weighted])].filter((s) => (w[s] ?? 0) > 0);
  };
  const weightDef = (): SymbolWeightSchemeDef => {
    if (!input.phaseWeights) return buildWeightScheme(activeSymbols());
    const symbols = activeSymbols();
    const w = phase4 ? input.phaseWeights.phase4 : input.phaseWeights.phase3;
    return {
      schemeId: 'custom',
      labelJa: 'MY v3 phase weight',
      universe: symbols,
      selectionMode: 'win_rate',
      slotMode: 'weight_proportional',
      slotWeights: Object.fromEntries(symbols.map((s) => [s, w[s] ?? 0])),
    };
  };

  const zeroPnlSymbols = new Set(input.zeroPnlSymbols ?? []);
  const legPnl = (leg: Leg): number => {
    if (zeroPnlSymbols.has(leg.symbol)) return 0;
    return round3((leg.notional * leg.returnPct) / 100);
  };

  const recordMilestones = (date: string) => {
    const m = monthsBetween(startDate, date);
    if (monthsToRm10000 == null && equity >= 10_000) monthsToRm10000 = m;
    if (monthsToRm30000 == null && equity >= 30_000) monthsToRm30000 = m;
    if (monthsToRm100000 == null && equity >= 100_000) monthsToRm100000 = m;
  };

  for (const date of eventDates) {
    const mk = monthKey(date);
    if (mk !== lastMonth) {
      if (lastMonth && monthly > 0) {
        equity = round3(equity + monthly);
        totalContributed = round3(totalContributed + monthly);
        if (equity > peak) peak = equity;
        recordMilestones(date);
      }
      lastMonth = mk;
    }

    if (!phase4 && equity >= ytlThreshold) {
      phase4 = true;
      ytlAddedDate = date;
      ytlAddedMonth = monthsBetween(startDate, date);
    }

    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex((o) => o.id === leg.id);
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = legPnl(active);
      if (pnl > 0) grossWin = round3(grossWin + pnl);
      else grossLoss = round3(grossLoss + Math.abs(pnl));
      const eqBefore = equity;
      equity = round3(equity + pnl);
      equityReturns.push(eqBefore > 0 ? round3((pnl / eqBefore) * 100) : 0);
      if (equity < minEquity) minEquity = equity;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;
      recordMilestones(date);
      recordExecuted(active, pnl);
      executed++;
    }

    const def = weightDef();
    const universe = activeSymbols();
    const lotBase = lotPerSlotForCapital(equity);
    const dayEntries = entries.filter((e) => e.entryDate === date && universe.includes(e.symbol));
    for (const t of dayEntries) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      const slotPct = resolveSlotPctForScheme(t, history, def);
      const openNotional = stillOpen.reduce((s, l) => s + l.notional, 0);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      let notional = round3(Math.min((equity * slotPct) / 100, available, lotBase * 2));
      if (def.slotWeights) {
        const avg = mean(universe.map((s) => def.slotWeights![s] ?? 0)) || 1 / universe.length;
        const w = def.slotWeights[t.symbol] ?? avg;
        const lotScale = avg > 0 ? w / avg : 1;
        notional = round3(Math.min((equity * slotPct) / 100, available, lotBase * lotScale * 1.5));
      }
      notional = round3(Math.min(notional, lotBase * 1.25, available));
      if (notional <= 0) continue;

      const weightPct = def.slotWeights?.[t.symbol] ?? round3(100 / universe.length);
      open.push({
        ...t,
        notional,
        weightPct,
        entryPhase: phase4 ? 'phase4' : 'phase3',
      });
      history.push(t);
    }

    equitySnapshots.push({ date, equity });
    recordMilestones(date);
  }

  for (const leg of open) {
    const pnl = legPnl(leg);
    if (pnl > 0) grossWin = round3(grossWin + pnl);
    else grossLoss = round3(grossLoss + Math.abs(pnl));
    equity = round3(equity + pnl);
    if (equity < minEquity) minEquity = equity;
    recordExecuted(leg, pnl);
    executed++;
  }

  const equityAt = (horizonDate: string): number => {
    let last = initial;
    for (const snap of equitySnapshots) {
      if (snap.date > horizonDate) break;
      last = snap.equity;
    }
    return round3(last);
  };

  const years = calendarYears(startDate, input.toDate);
  const cagr =
    totalContributed > 0 && equity > 0
      ? round3((Math.pow(equity / totalContributed, 1 / years) - 1) * 100)
      : null;
  const mu = mean(equityReturns);
  const sigma = std(equityReturns);
  const sharpe =
    sigma > 1e-9 && equityReturns.length >= 2
      ? round3((mu / sigma) * Math.sqrt(Math.max(executed / years, 1)))
      : null;

  return {
    finalEquityMYR: round3(equity),
    totalContributedMYR: round3(totalContributed),
    maxDrawdownPct: round3(maxDd),
    sharpe,
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    cagr,
    equityAt1yr: equityAt(addYears(startDate, 1)),
    equityAt3yr: equityAt(addYears(startDate, 3)),
    equityAt5yr: equityAt(addYears(startDate, 5)),
    monthsToRm10000,
    monthsToRm30000,
    monthsToRm100000,
    ytlAddedMonth,
    ytlAddedDate,
    minEquityMYR: round3(minEquity),
    tradeCount: executed,
    equityReturns,
    equitySnapshots,
    ...(input.captureLedger ? { executedTrades } : {}),
  };
}

function isDcaRuin(path: MalaysiaV3DcaPathResult): boolean {
  const minPct = (path.minEquityMYR / INITIAL_CAPITAL) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function runBootstrapDca(input: {
  pool: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  monthlyContributionMYR: number;
  ytlThresholdMYR?: number;
  runs?: number;
  seed?: number;
}): ForwardMalaysiaV3DcaPlanRow['bootstrap'] {
  const runs = input.runs ?? BOOTSTRAP_MC_70_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const finals: number[] = [];
  const maxDds: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateMalaysiaV3DcaPath({
      trades: sample,
      fromDate: input.fromDate,
      toDate: input.toDate,
      monthlyContributionMYR: input.monthlyContributionMYR,
      ytlThresholdMYR: input.ytlThresholdMYR,
    });
    finals.push(path.finalEquityMYR);
    maxDds.push(path.maxDrawdownPct);
    if (isDcaRuin(path)) bankrupt++;
  }

  const sortedFinal = [...finals].sort((a, b) => a - b);
  const sortedDd = [...maxDds].sort((a, b) => a - b);
  return {
    runs,
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    p5FinalEquityMYR: percentile(sortedFinal, 5),
    worstFinalEquityMYR: sortedFinal[0] ?? 0,
    worstMaxDrawdownPct: sortedDd[0] ?? 0,
  };
}

function fmtMonths(m: number | null): string {
  if (m == null) return '未到達';
  if (m < 12) return `${m}ヶ月`;
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return mo > 0 ? `${y}年${mo}ヶ月` : `${y}年`;
}

function planScore(row: ForwardMalaysiaV3DcaPlanRow): number {
  const m100k = row.monthsToRm100000 ?? 999;
  return (
    row.finalEquityMYR * 0.01 +
    row.bootstrap.p5FinalEquityMYR * 0.02 +
    row.wfOos.testReturnPct -
    m100k * 0.5 -
    Math.abs(row.maxDrawdownPct) * 0.3 -
    row.bootstrap.bankruptcyRatePct * 5
  );
}

export function pickBestDcaPlan(plans: ForwardMalaysiaV3DcaPlanRow[]): ForwardMalaysiaV3DcaPlanId {
  const dca = plans.filter((p) => p.planId !== 'lump_sum');
  return [...dca].sort((a, b) => planScore(b) - planScore(a))[0]!.planId;
}

export function pickOptimalYtlTiming(rows: ForwardMalaysiaV3YtlTimingRow[]): ForwardMalaysiaV3YtlTimingId {
  return [...rows].sort((a, b) => {
    const aM = a.monthsToRm100000 ?? 999;
    const bM = b.monthsToRm100000 ?? 999;
    if (aM !== bM) return aM - bM;
    return Math.abs(a.maxDrawdownPct) - Math.abs(b.maxDrawdownPct);
  })[0]!.timingId;
}

export function gradeMalaysiaV3Dca(input: {
  plans: ForwardMalaysiaV3DcaPlanRow[];
  bestPlanId: ForwardMalaysiaV3DcaPlanId;
}): { grade: ForwardMalaysiaV3Grade; verdictJa: string } {
  const best = input.plans.find((p) => p.planId === input.bestPlanId)!;
  const lump = input.plans.find((p) => p.planId === 'lump_sum')!;

  if (
    best.bootstrap.bankruptcyRatePct === 0 &&
    best.wfOos.testReturnPct > 0 &&
    best.monthsToRm10000 != null &&
    best.monthsToRm10000 <= 36 &&
    best.finalEquityMYR > lump.finalEquityMYR
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — ${best.labelJa} · RM10000${fmtMonths(best.monthsToRm10000)} · 最終RM${best.finalEquityMYR}`,
    };
  }

  if (best.bootstrap.bankruptcyRatePct <= 1 && best.wfOos.testReturnPct > 0) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — ${best.labelJa} · RM100000${fmtMonths(best.monthsToRm100000)} · MC破産${best.bootstrap.bankruptcyRatePct}%`,
    };
  }

  if (best.finalEquityMYR > lump.finalEquityMYR) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 積立優位だが目標期間長期 · ${best.labelJa}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — 積立より一括劣位 · v2.1維持',
  };
}

export async function buildMalaysiaV3DcaAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV3DcaAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: input.bundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const symbols = V3_SYMBOLS.filter((s) => input.bundle.fetchedSymbols.includes(s));
  const allTrades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );

  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const trainTrades = tradesInSignalRange(allTrades, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(allTrades, split.testFrom, split.testTo);
  const train = buildWalkForward31PhaseMetrics('train', split.trainFrom, split.trainTo, trainTrades);
  const test = buildWalkForward31PhaseMetrics('test', split.testFrom, split.testTo, testTrades);

  const plans: ForwardMalaysiaV3DcaPlanRow[] = MALAYSIA_V3_DCA_PLANS.map((def, i) => {
    const path = simulateMalaysiaV3DcaPath({
      trades: allTrades,
      fromDate,
      toDate,
      monthlyContributionMYR: def.monthlyContributionMYR,
    });
    const oosPath = simulateMalaysiaV3DcaPath({
      trades: testTrades,
      fromDate: split.testFrom,
      toDate: split.testTo,
      monthlyContributionMYR: def.monthlyContributionMYR,
    });
    const testReturnPct =
      oosPath.totalContributedMYR > 0
        ? round3(
            ((oosPath.finalEquityMYR - oosPath.totalContributedMYR) / oosPath.totalContributedMYR) *
              100,
          )
        : 0;

    return {
      planId: def.planId,
      labelJa: def.labelJa,
      monthlyContributionMYR: def.monthlyContributionMYR,
      initialCapitalMYR: INITIAL_CAPITAL,
      totalContributedMYR: path.totalContributedMYR,
      finalEquityMYR: path.finalEquityMYR,
      equityAt1yr: path.equityAt1yr,
      equityAt3yr: path.equityAt3yr,
      equityAt5yr: path.equityAt5yr,
      maxDrawdownPct: path.maxDrawdownPct,
      cagr: path.cagr,
      sharpe: path.sharpe,
      monthsToRm10000: path.monthsToRm10000,
      monthsToRm30000: path.monthsToRm30000,
      monthsToRm100000: path.monthsToRm100000,
      ytlAddedMonth: path.ytlAddedMonth,
      ytlAddedDate: path.ytlAddedDate,
      bootstrap: runBootstrapDca({
        pool: allTrades,
        fromDate,
        toDate,
        monthlyContributionMYR: def.monthlyContributionMYR,
        seed: BOOTSTRAP_SEED + i,
      }),
      wfOos: {
        testFinalEquityMYR: oosPath.finalEquityMYR,
        testContributedMYR: oosPath.totalContributedMYR,
        testReturnPct,
        overfitVerdictJa: judgeWf7030Overfit({
          train,
          test,
          cumulativeDegradationPct: null,
        }),
      },
    };
  });

  const bestDcaPlanId = pickBestDcaPlan(plans);
  const bestMonthly = plans.find((p) => p.planId === bestDcaPlanId)!.monthlyContributionMYR;

  const ytlTimings: ForwardMalaysiaV3YtlTimingRow[] = MALAYSIA_V3_YTL_TIMINGS.map((def) => {
    const path = simulateMalaysiaV3DcaPath({
      trades: allTrades,
      fromDate,
      toDate,
      monthlyContributionMYR: bestMonthly,
      ytlThresholdMYR: def.ytlThresholdMYR,
    });
    return {
      timingId: def.timingId,
      labelJa: def.labelJa,
      ytlThresholdMYR: def.ytlThresholdMYR,
      monthlyContributionMYR: bestMonthly,
      monthsToRm10000: path.monthsToRm10000,
      monthsToRm100000: path.monthsToRm100000,
      maxDrawdownPct: path.maxDrawdownPct,
      finalEquityMYR: path.finalEquityMYR,
    };
  });

  const optimalYtlTimingId = pickOptimalYtlTiming(ytlTimings);
  const { grade, verdictJa } = gradeMalaysiaV3Dca({ plans, bestPlanId: bestDcaPlanId });

  const fastest10000 = [...plans].sort(
    (a, b) => (a.monthsToRm10000 ?? 999) - (b.monthsToRm10000 ?? 999),
  )[0]!;
  const fastest30000 = [...plans].sort(
    (a, b) => (a.monthsToRm30000 ?? 999) - (b.monthsToRm30000 ?? 999),
  )[0]!;
  const fastest100000 = [...plans].sort(
    (a, b) => (a.monthsToRm100000 ?? 999) - (b.monthsToRm100000 ?? 999),
  )[0]!;
  const best = plans.find((p) => p.planId === bestDcaPlanId)!;
  const lump = plans.find((p) => p.planId === 'lump_sum')!;
  const ytlOpt = ytlTimings.find((t) => t.timingId === optimalYtlTimingId)!;

  const lumpSumVsDcaNoteJa = `一括RM${lump.finalEquityMYR} vs 最適積立RM${best.finalEquityMYR} · 投入${best.totalContributedMYR}`;

  const answerAJa = `A RM10000到達: ${fastest10000.labelJa} · ${fmtMonths(fastest10000.monthsToRm10000)} · 1年後RM${fastest10000.equityAt1yr}`;
  const answerBJa = `B RM30000到達: ${fastest30000.labelJa} · ${fmtMonths(fastest30000.monthsToRm30000)} · 3年後RM${fastest30000.equityAt3yr}`;
  const answerCJa = `C RM100000到達: ${fastest100000.labelJa} · ${fmtMonths(fastest100000.monthsToRm100000)} · 5年後RM${fastest100000.equityAt5yr}`;
  const answerDJa = `D 最適積立額: ${best.labelJa} · 月額RM${best.monthlyContributionMYR} · CAGR${best.cagr ?? '—'}% · Sharpe${best.sharpe ?? '—'}`;
  const answerEJa = `E YTL追加タイミング: ${ytlOpt.labelJa} · RM100000${fmtMonths(ytlOpt.monthsToRm100000)} · MaxDD${ytlOpt.maxDrawdownPct}%`;
  const answerFJa = [
    'F Malaysia v3実運用案:',
    `RM3000→${fmtMonths(best.monthsToRm10000)}でRM10000`,
    `3銘柄(33/33/33)→${ytlOpt.labelJa}で4銘柄(25%×4)`,
    `月次積立RM${best.monthlyContributionMYR}`,
    `RM100000${fmtMonths(best.monthsToRm100000)}`,
    'MC破産0%目標',
  ].join(' · ');

  const consistencyNoteJa =
    '監査69整合: v2.1三銘柄→RM10000でYTL · v3積立シミュ · US版監査継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査70 Malaysia v2.1→v3 月次積立シミュレーション',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    lumpSumVsDcaNoteJa,
    ...plans.map(
      (p) =>
        `${p.labelJa}: 投入RM${p.totalContributedMYR} → 最終RM${p.finalEquityMYR} · 1年RM${p.equityAt1yr} · 3年RM${p.equityAt3yr} · 5年RM${p.equityAt5yr} · CAGR${p.cagr ?? '—'}% · Sharpe${p.sharpe ?? '—'} · MaxDD${p.maxDrawdownPct}% · RM10k${fmtMonths(p.monthsToRm10000)} · RM100k${fmtMonths(p.monthsToRm100000)} · MC破産${p.bootstrap.bankruptcyRatePct}% · OOS${p.wfOos.testReturnPct}%`,
    ),
    ...ytlTimings.map(
      (t) =>
        `YTLタイミング ${t.labelJa}: RM100k${fmtMonths(t.monthsToRm100000)} · 最終RM${t.finalEquityMYR}`,
    ),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    lumpSumVsDcaNoteJa,
    plans,
    ytlTimings,
    bestDcaPlanId,
    optimalYtlTimingId,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMalaysiaV3DcaAudit(): Promise<ForwardMalaysiaV3DcaAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV3DcaAuditReport({ bundle });
}

export function formatMalaysiaV3DcaCsv(report: ForwardMalaysiaV3DcaAuditReport): string {
  const lines = [
    `# 最重要監査その70 Malaysia v3 積立 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,planId,label,monthly,contributed,final,eq1y,eq3y,eq5y,cagr,sharpe,maxDD,m10k,m30k,m100k,ytlMonth,bankruptcy,p5,oosReturn',
    ...report.plans.map((p) =>
      [
        'plan',
        p.planId,
        `"${p.labelJa}"`,
        p.monthlyContributionMYR,
        p.totalContributedMYR,
        p.finalEquityMYR,
        p.equityAt1yr,
        p.equityAt3yr,
        p.equityAt5yr,
        p.cagr ?? '',
        p.sharpe ?? '',
        p.maxDrawdownPct,
        p.monthsToRm10000 ?? '',
        p.monthsToRm30000 ?? '',
        p.monthsToRm100000 ?? '',
        p.ytlAddedMonth ?? '',
        p.bootstrap.bankruptcyRatePct,
        p.bootstrap.p5FinalEquityMYR,
        p.wfOos.testReturnPct,
      ].join(','),
    ),
    '',
    'section,timingId,label,threshold,monthly,m10k,m100k,maxDD,final',
    ...report.ytlTimings.map((t) =>
      [
        'ytl_timing',
        t.timingId,
        `"${t.labelJa}"`,
        t.ytlThresholdMYR,
        t.monthlyContributionMYR,
        t.monthsToRm10000 ?? '',
        t.monthsToRm100000 ?? '',
        t.maxDrawdownPct,
        t.finalEquityMYR,
      ].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['verdict', 'bestDca', report.bestDcaPlanId].join(','),
    ['verdict', 'ytlTiming', report.optimalYtlTimingId].join(','),
    ['compare', 'lumpVsDca', `"${report.lumpSumVsDcaNoteJa}"`].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
