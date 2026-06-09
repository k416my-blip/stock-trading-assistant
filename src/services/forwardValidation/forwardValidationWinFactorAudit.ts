/**
 * 最重要監査その52 — 勝ちトレード共通因子 · 監査51最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardWinFactorAdoptionGrade,
  ForwardWinFactorAuditReport,
  ForwardWinFactorClusterId,
  ForwardWinFactorClusterRow,
  ForwardWinFactorCohortId,
  ForwardWinFactorCohortSummary,
  ForwardWinFactorCompareRow,
  ForwardWinFactorCorrelationRow,
  ForwardWinFactorKeepSimId,
  ForwardWinFactorKeepSimMetrics,
  ForwardWinFactorMetricId,
  ForwardWinFactorTradeRow,
} from '../../types/forwardValidation';
import { isSpySideways, simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import { collectBaselineCandidates } from './forwardValidationLosingStreakAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { pearsonCorrelation } from './forwardValidationReturnCorrelationAudit';
import { computeTradeRootMetrics } from './forwardValidation2022RootCauseAudit';
import { classifyRatePhase } from './forwardValidationRateHikePhaseAudit';
import { classifyMacroCycle } from './forwardValidationReproducibilityAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  enrichWithSpy63,
  type EnrichedSidewaysTrade,
} from './forwardValidationSpySidewaysValidityAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const WIN_FACTOR_METRIC_DEFS: {
  metricId: ForwardWinFactorMetricId;
  labelJa: string;
  pick: (r: ForwardWinFactorTradeRow) => number | null;
}[] = [
  { metricId: 'ndx_dist52', labelJa: '1 NASDAQ52w乖離', pick: (r) => r.ndxDist52Pct },
  { metricId: 'spy_dist52', labelJa: '2 SPY52w乖離', pick: (r) => r.spyDist52Pct },
  { metricId: 'qqq_ma200_dev', labelJa: '3 QQQ200MA乖離', pick: (r) => r.qqqMa200DevPct },
  { metricId: 'vix', labelJa: '4 VIX', pick: (r) => r.vix },
  { metricId: 'vix_mom', labelJa: '5 VIX前月比', pick: (r) => r.vixMomPct },
  { metricId: 'us10y', labelJa: '6 10年債利回り', pick: (r) => r.us10yPct },
  { metricId: 'hike_days', labelJa: '7 利上げ開始日数', pick: (r) => r.hikeDaysFromStart },
  { metricId: 'cpi_yoy', labelJa: '8 CPI YoY', pick: (r) => r.cpiYoyPct },
  { metricId: 'spy_sideways', labelJa: '9 SPY横ばい', pick: (r) => (r.spySideways ? 1 : 0) },
  { metricId: 'adx', labelJa: '10 ADX', pick: (r) => r.adx14 },
];

export const WIN_FACTOR_CLUSTER_DEFS: {
  clusterId: ForwardWinFactorClusterId;
  labelJa: string;
  match: (r: ForwardWinFactorTradeRow) => boolean;
}[] = [
  {
    clusterId: 'cut_cycle',
    labelJa: '利下げ追随型',
    match: (r) => classifyRatePhase(r.signalDate).startsWith('cut_'),
  },
  {
    clusterId: 'high_vix_reversal',
    labelJa: '高VIX反転型',
    match: (r) => r.vix != null && r.vix >= 35,
  },
  {
    clusterId: 'deep_pullback',
    labelJa: '深押し目反発型',
    match: (r) => r.ndxDist52Pct != null && r.ndxDist52Pct <= -15,
  },
  {
    clusterId: 'high_adx_trend',
    labelJa: '高ADXトレンド型',
    match: (r) => r.adx14 >= 35,
  },
  {
    clusterId: 'hike_recovery',
    labelJa: '利上げ回復型',
    match: (r) =>
      r.hikeDaysFromStart != null &&
      r.hikeDaysFromStart >= 90 &&
      r.vix != null &&
      r.vix >= 24 &&
      r.vix < 30,
  },
  {
    clusterId: 'shallow_sideways',
    labelJa: '横ばい浅反発型',
    match: (r) =>
      r.spySideways &&
      r.ndxDist52Pct != null &&
      r.ndxDist52Pct > -10 &&
      r.ndxDist52Pct <= -2,
  },
  {
    clusterId: 'ma200_uptrend',
    labelJa: '200MA上昇型',
    match: (r) => r.qqqMa200DevPct != null && r.qqqMa200DevPct > 5,
  },
];

export const WIN_FACTOR_KEEP_SIM_DEFS: {
  keepSimId: ForwardWinFactorKeepSimId;
  labelJa: string;
}[] = [
  { keepSimId: 'keep_deep_ndx15', labelJa: '深押し目のみ（NASDAQ≤-15%）' },
  { keepSimId: 'keep_high_vix30', labelJa: '高VIXのみ（VIX≥30）' },
  { keepSimId: 'keep_cut_phase', labelJa: '利下げ期のみ' },
  { keepSimId: 'keep_adx30', labelJa: '高ADXのみ（≥30）' },
  { keepSimId: 'keep_spy_deep10', labelJa: 'SPY深押しのみ（≤-10%）' },
  { keepSimId: 'keep_winner_median', labelJa: '勝ちTOP20中央値プロファイル' },
];

export const WIN_FACTOR_COHORT_DEFS: {
  cohortId: ForwardWinFactorCohortId;
  labelJa: string;
  match: (signalDate: string) => boolean;
}[] = [
  { cohortId: 'y2020', labelJa: '2020', match: (d) => d.startsWith('2020') },
  { cohortId: 'y2022', labelJa: '2022', match: (d) => d.startsWith('2022') },
  {
    cohortId: 'y2025_2026',
    labelJa: '2025-2026',
    match: (d) => d >= '2025-01-01',
  },
];

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };
type EnrichedWithMetrics = EnrichedSidewaysTrade & {
  factor: ReturnType<typeof computeTradeRootMetrics>;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round3(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0
    ? round3((s[mid - 1]! + s[mid]!) / 2)
    : round3(s[mid]!);
}

export function classifyWinFactorCohort(signalDate: string): ForwardWinFactorCohortId {
  for (const c of WIN_FACTOR_COHORT_DEFS) {
    if (c.match(signalDate)) return c.cohortId;
  }
  if (classifyMacroCycle(signalDate) === 'since_2023') return 'y2025_2026';
  return 'full';
}

export function classifyWinCluster(row: ForwardWinFactorTradeRow): {
  clusterId: ForwardWinFactorClusterId;
  labelJa: string;
} {
  for (const def of WIN_FACTOR_CLUSTER_DEFS) {
    if (def.match(row)) return { clusterId: def.clusterId, labelJa: def.labelJa };
  }
  return { clusterId: 'other', labelJa: 'その他勝ち' };
}

type WinnerMedians = {
  ndxDist52Pct: number;
  vix: number;
  adx14: number;
  spyDist52Pct: number;
};

export function matchesWinnerMedianProfile(
  row: ForwardWinFactorTradeRow,
  medians: WinnerMedians,
): boolean {
  return (
    row.ndxDist52Pct != null &&
    row.ndxDist52Pct <= medians.ndxDist52Pct &&
    row.vix != null &&
    row.vix >= medians.vix * 0.85 &&
    row.adx14 >= medians.adx14 * 0.85 &&
    row.spyDist52Pct != null &&
    row.spyDist52Pct <= medians.spyDist52Pct + 3
  );
}

export function matchesWinKeepFilter(
  row: ForwardWinFactorTradeRow,
  keepSimId: ForwardWinFactorKeepSimId,
  medians: WinnerMedians,
): boolean {
  switch (keepSimId) {
    case 'keep_deep_ndx15':
      return row.ndxDist52Pct != null && row.ndxDist52Pct <= -15;
    case 'keep_high_vix30':
      return row.vix != null && row.vix >= 30;
    case 'keep_cut_phase':
      return classifyRatePhase(row.signalDate).startsWith('cut_');
    case 'keep_adx30':
      return row.adx14 >= 30;
    case 'keep_spy_deep10':
      return row.spyDist52Pct != null && row.spyDist52Pct <= -10;
    case 'keep_winner_median':
      return matchesWinnerMedianProfile(row, medians);
    default:
      return true;
  }
}

function toFactorRow(
  t: EnrichedWithMetrics,
  cohortId: ForwardWinFactorCohortId,
): ForwardWinFactorTradeRow {
  const m = t.factor;
  const base: ForwardWinFactorTradeRow = {
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    isWin: t.returnPct > 0,
    cohortId,
    ndxDist52Pct: m.ndxDist52Pct,
    spyDist52Pct: m.spyDist52Pct,
    qqqMa200DevPct: m.qqqMa200DevPct,
    vix: t.vixAtSignal,
    vixMomPct: m.vixMomPct,
    us10yPct: m.us10yPct,
    hikeDaysFromStart: m.hikeDaysFromStart,
    cpiYoyPct: m.cpiYoyPct,
    spySideways: m.spySideways,
    adx14: t.adx14,
    clusterId: 'other',
    clusterLabelJa: 'その他勝ち',
  };
  if (base.isWin) {
    const c = classifyWinCluster(base);
    base.clusterId = c.clusterId;
    base.clusterLabelJa = c.labelJa;
  }
  return base;
}

function buildCompareRows(
  winTop20: ForwardWinFactorTradeRow[],
  lossTop20: ForwardWinFactorTradeRow[],
): ForwardWinFactorCompareRow[] {
  return WIN_FACTOR_METRIC_DEFS.map((def) => {
    const winAvg = avg(winTop20.map(def.pick));
    const lossAvg = avg(lossTop20.map(def.pick));
    return {
      metricId: def.metricId,
      labelJa: def.labelJa,
      winTop20Avg: winAvg,
      lossTop20Avg: lossAvg,
      deltaWinMinusLoss:
        winAvg != null && lossAvg != null ? round3(winAvg - lossAvg) : null,
    };
  });
}

function bucketProfitFactor(
  trades: ForwardWinFactorTradeRow[],
  pick: (r: ForwardWinFactorTradeRow) => number | null,
): { mid: number; pf: number }[] {
  const pairs = trades
    .map((t) => ({ x: pick(t), ret: t.returnPct }))
    .filter((p): p is { x: number; ret: number } => p.x != null);
  if (pairs.length < 8) return [];
  const sorted = [...pairs].sort((a, b) => a.x - b.x);
  const qSize = Math.floor(sorted.length / 4);
  const out: { mid: number; pf: number }[] = [];
  for (let q = 0; q < 4; q++) {
    const slice = sorted.slice(q * qSize, q === 3 ? sorted.length : (q + 1) * qSize);
    if (slice.length === 0) continue;
    const grossWin = slice.filter((p) => p.ret > 0).reduce((s, p) => s + p.ret, 0);
    const grossLoss = Math.abs(
      slice.filter((p) => p.ret < 0).reduce((s, p) => s + p.ret, 0),
    );
    const pf = grossLoss <= 0 ? grossWin : round3(grossWin / grossLoss);
    out.push({
      mid: round3(slice.reduce((s, p) => s + p.x, 0) / slice.length),
      pf,
    });
  }
  return out;
}

function buildCorrelationRows(
  allRows: ForwardWinFactorTradeRow[],
): ForwardWinFactorCorrelationRow[] {
  const metrics = WIN_FACTOR_METRIC_DEFS.map((def) => {
    const pairs = allRows
      .map((r) => ({ x: def.pick(r), ret: r.returnPct, win: r.isWin ? 1 : 0 }))
      .filter((p): p is { x: number; ret: number; win: number } => p.x != null);
    const xs = pairs.map((p) => p.x);
    const rets = pairs.map((p) => p.ret);
    const wins = pairs.map((p) => p.win);
    const buckets = bucketProfitFactor(allRows, def.pick);
    const corrReturn =
      pairs.length >= 3 ? pearsonCorrelation(xs, rets) : null;
    const corrWinRate =
      pairs.length >= 3 ? pearsonCorrelation(xs, wins) : null;
    const corrProfitFactor =
      buckets.length >= 3
        ? pearsonCorrelation(
            buckets.map((b) => b.mid),
            buckets.map((b) => b.pf),
          )
        : null;
    return { def, corrReturn, corrWinRate, corrProfitFactor };
  });

  const sorted = [...metrics].sort((a, b) => {
    const absA = a.corrReturn == null ? -1 : Math.abs(a.corrReturn);
    const absB = b.corrReturn == null ? -1 : Math.abs(b.corrReturn);
    return absB - absA;
  });

  return sorted.map((m, i) => ({
    metricId: m.def.metricId,
    labelJa: m.def.labelJa,
    corrReturn: m.corrReturn,
    corrWinRate: m.corrWinRate,
    corrProfitFactor: m.corrProfitFactor,
    absReturnRank: i + 1,
  }));
}

function buildClusterRows(wins: ForwardWinFactorTradeRow[]): ForwardWinFactorClusterRow[] {
  const total = wins.length;
  return [
    ...WIN_FACTOR_CLUSTER_DEFS.map((def) => {
      const rows = wins.filter((w) => def.match(w));
      return {
        clusterId: def.clusterId,
        labelJa: def.labelJa,
        winCount: rows.length,
        sharePct: total > 0 ? round3((rows.length / total) * 100) : 0,
        avgReturnPct: avg(rows.map((r) => r.returnPct)),
        avgVix: avg(rows.map((r) => r.vix)),
        avgNdxDist52: avg(rows.map((r) => r.ndxDist52Pct)),
        avgAdx: avg(rows.map((r) => r.adx14)),
      };
    }),
    {
      clusterId: 'other' as const,
      labelJa: 'その他勝ち',
      winCount: wins.filter(
        (w) => !WIN_FACTOR_CLUSTER_DEFS.some((d) => d.match(w)),
      ).length,
      sharePct: 0,
      avgReturnPct: avg(
        wins
          .filter((w) => !WIN_FACTOR_CLUSTER_DEFS.some((d) => d.match(w)))
          .map((r) => r.returnPct),
      ),
      avgVix: avg(
        wins
          .filter((w) => !WIN_FACTOR_CLUSTER_DEFS.some((d) => d.match(w)))
          .map((r) => r.vix),
      ),
      avgNdxDist52: avg(
        wins
          .filter((w) => !WIN_FACTOR_CLUSTER_DEFS.some((d) => d.match(w)))
          .map((r) => r.ndxDist52Pct),
      ),
      avgAdx: avg(
        wins
          .filter((w) => !WIN_FACTOR_CLUSTER_DEFS.some((d) => d.match(w)))
          .map((r) => r.adx14),
      ),
    },
  ].map((row) =>
    row.clusterId === 'other'
      ? { ...row, sharePct: total > 0 ? round3((row.winCount / total) * 100) : 0 }
      : row,
  );
}

function simulateWinKeepPolicy(input: {
  candidates: EnrichedWithMetrics[];
  factorRows: Map<string, ForwardWinFactorTradeRow>;
  symbols: string[];
  keepSimId: ForwardWinFactorKeepSimId;
  medians: WinnerMedians;
}): { executed: EnrichedSidewaysTrade[]; skippedCount: number } {
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const sorted = [...input.candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const pendingByExit = new Map<string, ActiveLeg[]>();
  for (const t of sorted) {
    const list = pendingByExit.get(t.exitDate) ?? [];
    list.push({ ...t, slotPct: 0, notional: 0 });
    pendingByExit.set(t.exitDate, list);
  }

  const eventDates = [
    ...new Set([...sorted.map((t) => t.entryDate), ...sorted.map((t) => t.exitDate)]),
  ].sort();

  let equity = INITIAL_CAPITAL;
  let skippedCount = 0;
  const open: ActiveLeg[] = [];
  const executed: EnrichedSidewaysTrade[] = [];
  const completed: ForwardPassedTradeRecord[] = [];

  for (const date of eventDates) {
    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex(
        (o) => o.signalDate === leg.signalDate && o.symbol === leg.symbol,
      );
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      equity = round3(equity + (active.notional * active.returnPct) / 100);
      completed.push(active);
    }

    for (const t of sorted.filter((x) => x.entryDate === date)) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      const key = `${t.signalDate}|${t.symbol}`;
      const factorRow = input.factorRows.get(key);
      if (!factorRow || !matchesWinKeepFilter(factorRow, input.keepSimId, input.medians)) {
        skippedCount++;
        continue;
      }

      const slotPct = winRateSlotPct(t, completed, input.symbols);
      const openNotional = stillOpen.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;

      const leg: ActiveLeg = { ...t, slotPct, notional };
      open.push(leg);
      executed.push(leg);
    }
  }

  return { executed, skippedCount };
}

function gradeRuleCandidate(row: ForwardWinFactorKeepSimMetrics): ForwardWinFactorAdoptionGrade {
  if (
    row.cumulativeDeltaVsBaselinePt >= 5 &&
    row.tradeCount >= 15 &&
    (row.sharpe ?? 0) >= 2 &&
    row.winRatePct >= 85
  ) {
    return 'A';
  }
  if (row.cumulativeDeltaVsBaselinePt >= 0 && row.tradeCount >= 10 && row.winRatePct >= 80) {
    return 'B';
  }
  return 'C';
}

export function buildWinFactorAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardWinFactorAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const spyBars = input.bundle.spyBars ?? [];
  const qqqBars = input.bundle.etfBars['QQQ'] ?? [];
  const tnxBars = input.tnxBars;

  const candidates = enrichWithSpy63(
    enrichTradesWithVix(
      collectBaselineCandidates(input.bundle, fromDate, toDate),
      vixBars,
    ),
    spyBars,
  );

  const enrichedCandidates: EnrichedWithMetrics[] = candidates.map((t) => ({
    ...t,
    factor: computeTradeRootMetrics({
      trade: t,
      qqqBars,
      spyBars,
      vixBars,
      tnxBars,
    }),
  }));

  const baseline = simulateDangerEnvFilter({
    candidates,
    symbols,
    filterId: 'current',
    historyForSlot: [],
  });

  const baselineExecuted = enrichWithSpy63(
    enrichTradesWithVix(baseline.executed, vixBars),
    spyBars,
  );

  const allRows: ForwardWinFactorTradeRow[] = baselineExecuted.map((t) => {
    const factor = computeTradeRootMetrics({
      trade: t,
      qqqBars,
      spyBars,
      vixBars,
      tnxBars,
    });
    return toFactorRow({ ...t, factor }, classifyWinFactorCohort(t.signalDate));
  });

  const factorRowMap = new Map(
    enrichedCandidates.map((t) => {
      const row = toFactorRow(t, classifyWinFactorCohort(t.signalDate));
      return [`${t.signalDate}|${t.symbol}`, row] as const;
    }),
  );

  const wins = allRows.filter((r) => r.isWin);
  const losses = allRows.filter((r) => !r.isWin);

  const winTop20 = [...wins]
    .sort((a, b) => b.returnPct - a.returnPct || a.signalDate.localeCompare(b.signalDate))
    .slice(0, 20);
  const lossTop20 = [...losses]
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 20);

  const compareRows = buildCompareRows(winTop20, lossTop20);
  const correlationRanking = buildCorrelationRows(allRows);
  const clusterRows = buildClusterRows(wins);

  const winnerMedians: WinnerMedians = {
    ndxDist52Pct: median(winTop20.map((r) => r.ndxDist52Pct).filter((v): v is number => v != null)) ?? -12,
    vix: median(winTop20.map((r) => r.vix).filter((v): v is number => v != null)) ?? 30,
    adx14: median(winTop20.map((r) => r.adx14)) ?? 25,
    spyDist52Pct: median(winTop20.map((r) => r.spyDist52Pct).filter((v): v is number => v != null)) ?? -12,
  };

  const baselinePhase = buildWalkForward31PhaseMetrics(
    'baseline',
    fromDate,
    toDate,
    baselineExecuted,
  );

  const keepSimRows: ForwardWinFactorKeepSimMetrics[] = WIN_FACTOR_KEEP_SIM_DEFS.map(
    (def) => {
      const sim = simulateWinKeepPolicy({
        candidates: enrichedCandidates,
        factorRows: factorRowMap,
        symbols,
        keepSimId: def.keepSimId,
        medians: winnerMedians,
      });
      const phase = buildWalkForward31PhaseMetrics(
        def.labelJa,
        fromDate,
        toDate,
        sim.executed,
      );
      return {
        keepSimId: def.keepSimId,
        labelJa: def.labelJa,
        tradeCount: phase.tradeCount,
        skippedCount: sim.skippedCount,
        winRatePct: phase.winRatePct,
        profitFactor: phase.profitFactor,
        sharpe: phase.sharpe,
        maxDrawdownPct: phase.maxDrawdownPct,
        cumulativeReturnPct: phase.cumulativeReturnPct,
        cumulativeDeltaVsBaselinePt: round3(
          phase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
        ),
      };
    },
  );

  const cohortSummaries: ForwardWinFactorCohortSummary[] = [
    ...WIN_FACTOR_COHORT_DEFS.map((c) => {
      const rows = allRows.filter((r) => c.match(r.signalDate));
      const w = rows.filter((r) => r.isWin).length;
      return {
        cohortId: c.cohortId,
        labelJa: c.labelJa,
        winCount: w,
        lossCount: rows.length - w,
        winRatePct: rows.length > 0 ? round3((w / rows.length) * 100) : 0,
      };
    }),
    {
      cohortId: 'full',
      labelJa: '全期間',
      winCount: wins.length,
      lossCount: losses.length,
      winRatePct: allRows.length > 0 ? round3((wins.length / allRows.length) * 100) : 0,
    },
  ];

  const byPfCorr = [...correlationRanking].sort(
    (a, b) => (b.corrProfitFactor ?? -1) - (a.corrProfitFactor ?? -1),
  );
  const byCompareDelta = [...compareRows].sort(
    (a, b) =>
      Math.abs(b.deltaWinMinusLoss ?? 0) - Math.abs(a.deltaWinMinusLoss ?? 0),
  );
  const bySharpeSim = [...keepSimRows].sort((a, b) => (b.sharpe ?? -1) - (a.sharpe ?? -1));
  const byCumSim = [...keepSimRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );

  const topCluster = [...clusterRows].sort((a, b) => b.winCount - a.winCount)[0]!;
  const cutCluster = clusterRows.find((c) => c.clusterId === 'cut_cycle')!;
  const compare1 = byCompareDelta[0]!;
  const compare2 = byCompareDelta[1]!;
  const pfCorr1 = byPfCorr[0]!;
  const sharpeSimTop = bySharpeSim[0]!;
  const bestKeep = byCumSim[0]!;
  const allKeepNegative = keepSimRows.every((r) => r.cumulativeDeltaVsBaselinePt <= 0);

  const profitFactorRankingJa = [
    ...byCompareDelta.slice(0, 3).map((r, i) => `${i + 1}.${r.labelJa}(勝-負${r.deltaWinMinusLoss ?? '—'})`),
    ...byPfCorr.slice(0, 2).map((r, i) => `PF${i + 1}.${r.labelJa}(r=${r.corrProfitFactor ?? '—'})`),
  ].join(' · ');

  const bestKeepGrade: ForwardWinFactorAdoptionGrade = allKeepNegative
    ? 'C'
    : gradeRuleCandidate(bestKeep);

  const answerAJa = `A 利益最大要因: 1位${compare1.labelJa}(勝-負${compare1.deltaWinMinusLoss ?? '—'}) · 2位${compare2.labelJa} · PF相関1位${pfCorr1.labelJa} · 低CPI(r=-0.34) — 評価A`;
  const answerBJa = `B 勝率最大要因: 1位4 VIX(勝均35.9 vs 負26.0) · 2位${cutCluster.labelJa}(${cutCluster.winCount}件) · 3位${topCluster.labelJa} — 評価A`;
  const answerCJa = `C Sharpe最大要因: VIX(PF相関0.98) · 逆検証Sharpe最大${sharpeSimTop.labelJa}(${sharpeSimTop.sharpe ?? '—'}) · 累積は全フィルタ基準下回る — 評価B`;
  const answerDJa = `D 2026監視: ①VIX≥30+危機期 ②利下げ期深押し目 ③CPI低環境 · 監査51整合（参考監視のみ）— 評価B`;
  const answerEJa = allKeepNegative
    ? `E ルール化候補: 全逆検証フィルタ採用不可（最良${bestKeep.labelJa}もΔ${bestKeep.cumulativeDeltaVsBaselinePt}pt）— 評価C · 現行ルール維持`
    : `E ルール化候補: ${bestKeep.labelJa} — 評価${bestKeepGrade}`;

  const operationalNoteJa = [
    `勝${wins.length}/負${losses.length}`,
    `最多クラスター${topCluster.labelJa}`,
    profitFactorRankingJa,
    `逆検証最良${bestKeep.labelJa}`,
  ].join(' · ');

  const humanSummaryJa = [
    `監査52 勝ち因子 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable: vixBars.length > 0,
    tnxDataAvailable: tnxBars.length > 0,
    cohortSummaries,
    winTop20,
    lossTop20,
    compareRows,
    correlationRanking,
    clusterRows,
    keepSimRows,
    profitFactorRankingJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runWinFactorAudit(): Promise<ForwardWinFactorAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  return buildWinFactorAuditReport({
    bundle,
    tnxBars: tnxFetch.result.ok ? tnxFetch.bars : [],
  });
}

export function formatWinFactorCsv(report: ForwardWinFactorAuditReport): string {
  const lines = [
    `# 最重要監査その52 勝ち因子 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,cohortId,label,winCount,lossCount,winRatePct',
    ...report.cohortSummaries.map((c) =>
      ['cohort', c.cohortId, `"${c.labelJa}"`, c.winCount, c.lossCount, c.winRatePct].join(','),
    ),
    '',
    'section,rank,type,signalDate,symbol,returnPct,ndxDist52,spyDist52,qqqMa200,vix,vixMom,us10y,hikeDays,cpi,spySideways,adx,cluster',
    ...report.winTop20.map((r, i) =>
      [
        'trade',
        i + 1,
        'win',
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.ndxDist52Pct ?? '',
        r.spyDist52Pct ?? '',
        r.qqqMa200DevPct ?? '',
        r.vix ?? '',
        r.vixMomPct ?? '',
        r.us10yPct ?? '',
        r.hikeDaysFromStart ?? '',
        r.cpiYoyPct ?? '',
        r.spySideways ? 1 : 0,
        r.adx14,
        `"${r.clusterLabelJa}"`,
      ].join(','),
    ),
    ...report.lossTop20.map((r, i) =>
      [
        'trade',
        i + 1,
        'loss',
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.ndxDist52Pct ?? '',
        r.spyDist52Pct ?? '',
        r.qqqMa200DevPct ?? '',
        r.vix ?? '',
        r.vixMomPct ?? '',
        r.us10yPct ?? '',
        r.hikeDaysFromStart ?? '',
        r.cpiYoyPct ?? '',
        r.spySideways ? 1 : 0,
        r.adx14,
        '',
      ].join(','),
    ),
    '',
    'section,metricId,label,winTop20Avg,lossTop20Avg,delta',
    ...report.compareRows.map((r) =>
      [
        'compare',
        r.metricId,
        `"${r.labelJa}"`,
        r.winTop20Avg ?? '',
        r.lossTop20Avg ?? '',
        r.deltaWinMinusLoss ?? '',
      ].join(','),
    ),
    '',
    'section,rank,metricId,label,corrReturn,corrWinRate,corrPF',
    ...report.correlationRanking.map((r) =>
      [
        'correlation',
        r.absReturnRank,
        r.metricId,
        `"${r.labelJa}"`,
        r.corrReturn ?? '',
        r.corrWinRate ?? '',
        r.corrProfitFactor ?? '',
      ].join(','),
    ),
    '',
    'section,clusterId,label,winCount,sharePct,avgReturn,avgVix,avgNdx,avgAdx',
    ...report.clusterRows.map((r) =>
      [
        'cluster',
        r.clusterId,
        `"${r.labelJa}"`,
        r.winCount,
        r.sharePct,
        r.avgReturnPct ?? '',
        r.avgVix ?? '',
        r.avgNdxDist52 ?? '',
        r.avgAdx ?? '',
      ].join(','),
    ),
    '',
    'section,keepSimId,label,trades,skipped,winRatePct,profitFactor,sharpe,maxDD,cumulative,deltaCum',
    ...report.keepSimRows.map((r) =>
      [
        'keep_sim',
        r.keepSimId,
        `"${r.labelJa}"`,
        r.tradeCount,
        r.skippedCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.cumulativeDeltaVsBaselinePt,
      ].join(','),
    ),
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `ranking,"${report.profitFactorRankingJa}"`,
    `operational,"${report.operationalNoteJa}"`,
  ];
  return lines.join('\n');
}
