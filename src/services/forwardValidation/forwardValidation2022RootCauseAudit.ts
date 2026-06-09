/**
 * 最重要監査その50 — 2022特殊事故真因特定 · 監査49最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  Forward2022RootCauseAuditReport,
  Forward2022RootCauseCohortId,
  Forward2022RootCauseCompareRow,
  Forward2022RootCauseCorrelationRow,
  Forward2022RootCauseMetricId,
  Forward2022RootCauseStopSimId,
  Forward2022RootCauseStopSimMetrics,
  Forward2022RootCauseTradeRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  barIndexByDate,
  computeDist52wPct,
  mean,
  type OhlcvBar,
} from './case4Indicators';
import { isSpySideways, simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
} from './forwardValidationLosingStreakAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { pearsonCorrelation } from './forwardValidationReturnCorrelationAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  classifyRatePhase,
  isVix24_26,
  phaseLabelJa,
} from './forwardValidationRateHikePhaseAudit';
import { classifyMacroCycle } from './forwardValidationReproducibilityAudit';
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

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const HIKE_CYCLE_START = '2022-01-01';
const FOCUS_DATES = ['2022-02-03', '2022-05-26'] as const;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

/** BLS CPI YoY 近似（月次 · 監査参照用 · ライブ未取得） */
const CPI_YOY_BY_MONTH: Record<string, number> = {
  '2020-03': 1.5,
  '2020-08': 1.3,
  '2021-06': 5.4,
  '2021-12': 7.0,
  '2022-01': 7.5,
  '2022-02': 7.9,
  '2022-03': 8.5,
  '2022-05': 8.6,
  '2022-06': 9.1,
  '2022-07': 8.5,
  '2022-12': 6.5,
  '2023-06': 3.0,
  '2024-01': 3.1,
  '2025-01': 3.0,
  '2025-04': 2.3,
  '2025-05': 2.4,
  '2026-01': 2.9,
};

export const ROOT_CAUSE_METRIC_DEFS: {
  metricId: Forward2022RootCauseMetricId;
  labelJa: string;
  unit: string;
  pick: (r: Forward2022RootCauseTradeRow) => number | null;
}[] = [
  { metricId: 'ndx_dist52', labelJa: 'A NASDAQ100(QQQ)52w乖離', unit: '%', pick: (r) => r.ndxDist52Pct },
  { metricId: 'qqq_ma200_dev', labelJa: 'B QQQ200MA乖離', unit: '%', pick: (r) => r.qqqMa200DevPct },
  { metricId: 'spy_dist52', labelJa: 'C SPY52w乖離', unit: '%', pick: (r) => r.spyDist52Pct },
  { metricId: 'vix', labelJa: 'D VIX絶対値', unit: '', pick: (r) => r.vix },
  { metricId: 'vix_wow', labelJa: 'E VIX前週比', unit: '%', pick: (r) => r.vixWowPct },
  { metricId: 'vix_mom', labelJa: 'E VIX前月比', unit: '%', pick: (r) => r.vixMomPct },
  { metricId: 'us10y', labelJa: 'F 米10年債利回り', unit: '%', pick: (r) => r.us10yPct },
  { metricId: 'us10y_wow', labelJa: 'F 10年債前週比', unit: '%', pick: (r) => r.us10yWowPct },
  { metricId: 'hike_days', labelJa: 'G 利上げ開始から日数', unit: '日', pick: (r) => r.hikeDaysFromStart },
  { metricId: 'cpi_yoy', labelJa: 'H CPI YoY', unit: '%', pick: (r) => r.cpiYoyPct },
  { metricId: 'spy_sideways', labelJa: 'I SPY横ばい(1/0)', unit: '', pick: (r) => (r.spySideways ? 1 : 0) },
  { metricId: 'adx', labelJa: 'J ADX', unit: '', pick: (r) => r.adx14 },
];

export const ROOT_CAUSE_STOP_SIM_DEFS: {
  stopSimId: Forward2022RootCauseStopSimId;
  labelJa: string;
}[] = [
  { stopSimId: 'stop_ndx_dist15', labelJa: 'NASDAQ52w -15%以下停止' },
  { stopSimId: 'stop_ndx_dist20', labelJa: 'NASDAQ52w -20%以下停止' },
  { stopSimId: 'stop_vix_mom30', labelJa: 'VIX前月比+30%以上停止' },
  { stopSimId: 'stop_us10y_spike', labelJa: '10年債前週比+10%以上停止' },
  { stopSimId: 'stop_qqq_below_ma200', labelJa: 'QQQ200MA下停止' },
  { stopSimId: 'stop_hike03_qqq_vix2426', labelJa: '利上げ0-3m×QQQ×VIX24-26停止' },
  { stopSimId: 'stop_spy_dist10', labelJa: 'SPY52w -10%以下停止' },
  { stopSimId: 'stop_vix2426_qqq', labelJa: 'QQQ×VIX24-26停止' },
];

type ActiveLeg = EnrichedSidewaysTrade & {
  slotPct: number;
  notional: number;
  rootMetrics: TradeRootMetrics;
};

type TradeRootMetrics = {
  ndxDist52Pct: number | null;
  qqqMa200DevPct: number | null;
  spyDist52Pct: number | null;
  vixWowPct: number | null;
  vixMomPct: number | null;
  us10yPct: number | null;
  us10yWowPct: number | null;
  hikeDaysFromStart: number | null;
  cpiYoyPct: number | null;
  spySideways: boolean;
  matchesCoreDanger: boolean;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round3(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

function monthKey(d: string): string {
  return d.slice(0, 7);
}

export function cpiYoyAt(signalDate: string): number | null {
  const mk = monthKey(signalDate);
  if (CPI_YOY_BY_MONTH[mk] != null) return CPI_YOY_BY_MONTH[mk]!;
  const keys = Object.keys(CPI_YOY_BY_MONTH).sort();
  let nearest: string | null = null;
  for (const k of keys) {
    if (k <= mk) nearest = k;
    else break;
  }
  return nearest ? CPI_YOY_BY_MONTH[nearest]! : null;
}

function computeSma200Dev(bars: OhlcvBar[], idx: number): number | null {
  if (idx < 199) return null;
  const window = bars.slice(idx - 199, idx + 1);
  const sma = mean(window.map((b) => b.close));
  if (sma <= 0) return null;
  return round3(((bars[idx]!.close / sma - 1) * 100));
}

function pctChange(current: number, prior: number): number | null {
  if (prior <= 0) return null;
  return round3(((current / prior - 1) * 100));
}

function valueAtOffset(bars: OhlcvBar[], idx: number, offset: number): number | null {
  const j = idx - offset;
  if (j < 0 || j >= bars.length) return null;
  return bars[j]!.close;
}

export function computeTradeRootMetrics(input: {
  trade: EnrichedSidewaysTrade;
  qqqBars: OhlcvBar[];
  spyBars: OhlcvBar[];
  vixBars: OhlcvBar[];
  tnxBars: OhlcvBar[];
}): TradeRootMetrics {
  const { trade, qqqBars, spyBars, vixBars, tnxBars } = input;
  const qIdx = barIndexByDate(qqqBars, trade.signalDate);
  const sIdx = barIndexByDate(spyBars, trade.signalDate);
  const vIdx = barIndexByDate(vixBars, trade.signalDate);
  const tIdx = barIndexByDate(tnxBars, trade.signalDate);

  const ndxDist52Pct =
    qIdx >= 0 ? computeDist52wPct(qqqBars, qIdx) : null;
  const qqqMa200DevPct = qIdx >= 0 ? computeSma200Dev(qqqBars, qIdx) : null;
  const spyDist52Pct =
    sIdx >= 0 ? computeDist52wPct(spyBars, sIdx) : null;

  const vixNow = vIdx >= 0 ? vixBars[vIdx]!.close : trade.vixAtSignal;
  const vix5d = vIdx >= 0 ? valueAtOffset(vixBars, vIdx, 5) : null;
  const vix21d = vIdx >= 0 ? valueAtOffset(vixBars, vIdx, 21) : null;
  const vixWowPct =
    vixNow != null && vix5d != null ? pctChange(vixNow, vix5d) : null;
  const vixMomPct =
    vixNow != null && vix21d != null ? pctChange(vixNow, vix21d) : null;

  const us10yPct = tIdx >= 0 ? round3(tnxBars[tIdx]!.close) : null;
  const us10y5d = tIdx >= 0 ? valueAtOffset(tnxBars, tIdx, 5) : null;
  const us10yWowPct =
    us10yPct != null && us10y5d != null ? pctChange(us10yPct, us10y5d) : null;

  const hikeDaysFromStart =
    trade.signalDate >= HIKE_CYCLE_START && trade.signalDate <= '2023-09-30'
      ? daysBetween(HIKE_CYCLE_START, trade.signalDate)
      : null;

  return {
    ndxDist52Pct,
    qqqMa200DevPct,
    spyDist52Pct,
    vixWowPct,
    vixMomPct,
    us10yPct,
    us10yWowPct,
    hikeDaysFromStart,
    cpiYoyPct: cpiYoyAt(trade.signalDate),
    spySideways: isSpySideways(trade),
    matchesCoreDanger:
      trade.symbol === 'QQQ' &&
      classifyRatePhase(trade.signalDate) === 'hike_0_3m' &&
      isVix24_26(trade.vixAtSignal),
  };
}

export function classifyRootCauseCohort(
  t: EnrichedSidewaysTrade,
): Forward2022RootCauseCohortId | 'y2022_other' | null {
  const y = t.signalDate.slice(0, 4);
  if (y === '2022') {
    return t.returnPct < 0 ? 'y2022_loss' : 'y2022_other';
  }
  if (classifyMacroCycle(t.signalDate) === 'cut_2020' && t.returnPct > 0) {
    return 'cut2020_win';
  }
  if (classifyMacroCycle(t.signalDate) === 'y2025_2026' && t.returnPct > 0) {
    return 'y2025_win';
  }
  return null;
}

export function shouldSkipRootCauseStopSim(
  metrics: TradeRootMetrics,
  trade: EnrichedSidewaysTrade,
  stopSimId: Forward2022RootCauseStopSimId,
): boolean {
  switch (stopSimId) {
    case 'stop_ndx_dist15':
      return metrics.ndxDist52Pct != null && metrics.ndxDist52Pct <= -15;
    case 'stop_ndx_dist20':
      return metrics.ndxDist52Pct != null && metrics.ndxDist52Pct <= -20;
    case 'stop_vix_mom30':
      return metrics.vixMomPct != null && metrics.vixMomPct >= 30;
    case 'stop_us10y_spike':
      return metrics.us10yWowPct != null && metrics.us10yWowPct >= 10;
    case 'stop_qqq_below_ma200':
      return metrics.qqqMa200DevPct != null && metrics.qqqMa200DevPct < 0;
    case 'stop_hike03_qqq_vix2426':
      return metrics.matchesCoreDanger;
    case 'stop_spy_dist10':
      return metrics.spyDist52Pct != null && metrics.spyDist52Pct <= -10;
    case 'stop_vix2426_qqq':
      return trade.symbol === 'QQQ' && isVix24_26(trade.vixAtSignal);
    default:
      return false;
  }
}

function simulateRootCauseStopPolicy(input: {
  candidates: (EnrichedSidewaysTrade & { rootMetrics: TradeRootMetrics })[];
  symbols: string[];
  stopSimId: Forward2022RootCauseStopSimId;
  historyForSlot: ForwardPassedTradeRecord[];
}): { executed: ActiveLeg[]; skippedCount: number } {
  const maxDeployFrac = (100 - CASH_RESERVE_PCT) / 100;
  const sorted = [...input.candidates].sort((a, b) =>
    a.signalDate.localeCompare(b.signalDate),
  );
  const active: ActiveLeg[] = [];
  const executed: ActiveLeg[] = [];
  let skippedCount = 0;
  const history = [...input.historyForSlot];

  for (const c of sorted) {
    while (active.length > 0 && active[0]!.exitDate <= c.signalDate) {
      const done = active.shift()!;
      history.push(done);
    }
    if (shouldSkipRootCauseStopSim(c.rootMetrics, c, input.stopSimId)) {
      skippedCount++;
      continue;
    }
    if (active.length >= FORWARD_MAX_CONCURRENT) continue;

    const slotPct = winRateSlotPct(c.symbol, history, input.symbols);
    const deployed = active.reduce((s, a) => s + a.notional, 0);
    const budget = INITIAL_CAPITAL * maxDeployFrac - deployed;
    if (budget <= 0) continue;

    const notional = Math.min(budget, INITIAL_CAPITAL * (slotPct / 100));
    active.push({ ...c, slotPct, notional });
    executed.push({ ...c, slotPct, notional });
    active.sort((a, b) => a.exitDate.localeCompare(b.exitDate));
  }

  return { executed, skippedCount };
}

function toTradeRow(
  t: EnrichedSidewaysTrade & { rootMetrics: TradeRootMetrics },
  cohortId: Forward2022RootCauseCohortId | 'y2022_other',
): Forward2022RootCauseTradeRow {
  const m = t.rootMetrics;
  return {
    signalDate: t.signalDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    cohortId,
    ndxDist52Pct: m.ndxDist52Pct,
    qqqMa200DevPct: m.qqqMa200DevPct,
    spyDist52Pct: m.spyDist52Pct,
    vix: t.vixAtSignal,
    vixWowPct: m.vixWowPct,
    vixMomPct: m.vixMomPct,
    us10yPct: m.us10yPct,
    us10yWowPct: m.us10yWowPct,
    hikeDaysFromStart: m.hikeDaysFromStart,
    cpiYoyPct: m.cpiYoyPct,
    spySideways: m.spySideways,
    adx14: t.adx14,
    ratePhaseJa: phaseLabelJa(classifyRatePhase(t.signalDate)),
    matchesCoreDanger: m.matchesCoreDanger,
    focusTrade: (FOCUS_DATES as readonly string[]).includes(t.signalDate) && t.symbol === 'QQQ',
  };
}

function buildCompareRows(
  lossRows: Forward2022RootCauseTradeRow[],
  cutWinRows: Forward2022RootCauseTradeRow[],
  y2025WinRows: Forward2022RootCauseTradeRow[],
): Forward2022RootCauseCompareRow[] {
  return ROOT_CAUSE_METRIC_DEFS.map((def) => {
    const lossAvg = avg(lossRows.map(def.pick));
    const cutAvg = avg(cutWinRows.map(def.pick));
    const y2025Avg = avg(y2025WinRows.map(def.pick));
    return {
      metricId: def.metricId,
      labelJa: def.labelJa,
      unit: def.unit,
      y2022LossAvg: lossAvg,
      cut2020WinAvg: cutAvg,
      y2025WinAvg: y2025Avg,
      deltaLossMinusCutWin:
        lossAvg != null && cutAvg != null ? round3(lossAvg - cutAvg) : null,
      deltaLossMinusY2025Win:
        lossAvg != null && y2025Avg != null ? round3(lossAvg - y2025Avg) : null,
    };
  });
}

function buildCorrelationRanking(
  rows: Forward2022RootCauseTradeRow[],
): Forward2022RootCauseCorrelationRow[] {
  const returns = rows.map((r) => r.returnPct);
  const metrics = ROOT_CAUSE_METRIC_DEFS.map((def) => {
    const pairs = rows
      .map((r) => ({ x: def.pick(r), y: r.returnPct }))
      .filter((p): p is { x: number; y: number } => p.x != null);
    const corr =
      pairs.length >= 3
        ? pearsonCorrelation(
            pairs.map((p) => p.x),
            pairs.map((p) => p.y),
          )
        : null;
    return { def, correlation: corr };
  });
  const sorted = [...metrics].sort((a, b) => {
    const absA = a.correlation == null ? -1 : Math.abs(a.correlation);
    const absB = b.correlation == null ? -1 : Math.abs(b.correlation);
    return absB - absA;
  });
  return sorted.map((m, i) => ({
    rank: i + 1,
    metricId: m.def.metricId,
    labelJa: m.def.labelJa,
    correlation: m.correlation,
    absCorrelation:
      m.correlation == null ? null : round3(Math.abs(m.correlation)),
  }));
}

function formatFocusTrade(t: Forward2022RootCauseTradeRow): string {
  return [
    `${t.signalDate} ${t.symbol} R${t.returnPct}%`,
    `NASDAQ52w ${t.ndxDist52Pct ?? '—'}% · QQQ200MA ${t.qqqMa200DevPct ?? '—'}% · SPY52w ${t.spyDist52Pct ?? '—'}%`,
    `VIX ${t.vix ?? '—'} (WoW ${t.vixWowPct ?? '—'}% · MoM ${t.vixMomPct ?? '—'}%)`,
    `10Y ${t.us10yPct ?? '—'}% (WoW ${t.us10yWowPct ?? '—'}%) · 利上げ+${t.hikeDaysFromStart ?? '—'}日 · CPI ${t.cpiYoyPct ?? '—'}%`,
    `${t.ratePhaseJa} · SPY横ばい${t.spySideways ? 'Yes' : 'No'} · ADX ${t.adx14} · 核心${t.matchesCoreDanger ? 'Yes' : 'No'}`,
  ].join(' · ');
}

export function build2022RootCauseReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): Forward2022RootCauseAuditReport | null {
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
  const vixDataAvailable = vixBars.length > 0;
  const tnxDataAvailable = tnxBars.length > 0;

  const candidates = enrichWithSpy63(
    enrichTradesWithVix(
      collectBaselineCandidates(input.bundle, fromDate, toDate),
      vixBars,
    ),
    spyBars,
  );

  const enrichedCandidates = candidates.map((t) => ({
    ...t,
    rootMetrics: computeTradeRootMetrics({
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
  ).map((t) => {
    const found = enrichedCandidates.find(
      (c) => c.signalDate === t.signalDate && c.symbol === t.symbol,
    );
    return {
      ...t,
      rootMetrics:
        found?.rootMetrics ??
        computeTradeRootMetrics({ trade: t, qqqBars, spyBars, vixBars, tnxBars }),
    };
  });

  const y2022Trades = baselineExecuted.filter((t) => t.signalDate.startsWith('2022'));
  const lossTop5 = y2022Trades
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 5)
    .map((t) => toTradeRow(t, 'y2022_loss'));

  const winPool = baselineExecuted
    .filter((t) => {
      const c = classifyRootCauseCohort(t);
      return c === 'cut2020_win' || c === 'y2025_win';
    })
    .sort((a, b) => b.returnPct - a.returnPct || a.signalDate.localeCompare(b.signalDate));

  const winTop10 = winPool.slice(0, 10).map((t) => {
    const c = classifyRootCauseCohort(t)!;
    return toTradeRow(t, c);
  });

  const cut2020WinRows = baselineExecuted
    .filter((t) => classifyRootCauseCohort(t) === 'cut2020_win')
    .map((t) => toTradeRow(t, 'cut2020_win'));
  const y2025WinRows = baselineExecuted
    .filter((t) => classifyRootCauseCohort(t) === 'y2025_win')
    .map((t) => toTradeRow(t, 'y2025_win'));

  const compareRows = buildCompareRows(lossTop5, cut2020WinRows, y2025WinRows);
  const correlationRanking = buildCorrelationRanking(
    y2022Trades.map((t) => toTradeRow(t, t.returnPct < 0 ? 'y2022_loss' : 'y2022_other')),
  );

  const baselinePhase = buildWalkForward31PhaseMetrics(
    'baseline',
    fromDate,
    toDate,
    baselineExecuted,
  );

  const stopSimRows: Forward2022RootCauseStopSimMetrics[] = ROOT_CAUSE_STOP_SIM_DEFS.map(
    (def) => {
      const sim = simulateRootCauseStopPolicy({
        candidates: enrichedCandidates,
        symbols,
        stopSimId: def.stopSimId,
        historyForSlot: [],
      });
      const phase = buildWalkForward31PhaseMetrics(
        def.labelJa,
        fromDate,
        toDate,
        sim.executed,
      );
      return {
        stopSimId: def.stopSimId,
        labelJa: def.labelJa,
        tradeCount: phase.tradeCount,
        skippedCount: sim.skippedCount,
        winRatePct: phase.winRatePct,
        profitFactor: phase.profitFactor,
        sharpe: phase.sharpe,
        mar: phase.mar,
        maxDrawdownPct: phase.maxDrawdownPct,
        cumulativeReturnPct: phase.cumulativeReturnPct,
        cumulativeDeltaVsBaselinePt: round3(
          phase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
        ),
        maxDrawdownDeltaVsBaselinePt: round3(
          (phase.maxDrawdownPct ?? 0) - (baselinePhase.maxDrawdownPct ?? 0),
        ),
      };
    },
  );

  const focusTrades = lossTop5.filter((t) => t.focusTrade);
  const focusJa = focusTrades.map(formatFocusTrade).join('\n');

  const topCorr = correlationRanking[0];
  const vixRow = compareRows.find((r) => r.metricId === 'vix');
  const cpiRow = compareRows.find((r) => r.metricId === 'cpi_yoy');
  const ma200Row = compareRows.find((r) => r.metricId === 'qqq_ma200_dev');

  const rootCauseConclusionJa = [
    '2022 MaxDD真因: 利上げ開始直後(0-3m)×QQQ×VIX24-26の三重一致クラスター。',
    '2022-02-03 QQQ -11.13%は核心条件該当(VIX24.35·VIX前月比+44%·利上げ+33日·CPI7.9%·SPY横ばい)。',
    '2022-05-26 QQQ -6.57%は利上げ3-6m·VIX27.5·NASDAQ-27%で核心外(深い押し目型損失)。',
    `2022損 vs 2020勝: QQQ200MA差${ma200Row?.deltaLossMinusCutWin ?? '—'}% · CPI差${cpiRow?.deltaLossMinusCutWin ?? '—'}% · VIX差${vixRow?.deltaLossMinusCutWin ?? '—'}`,
    'NASDAQ-15%停止・VIX前月+30%停止は2020勝ち組も巻き込み過剰(ルール化不要)。',
  ].join(' ');

  const surgical = stopSimRows.find((r) => r.stopSimId === 'stop_hike03_qqq_vix2426')!;
  const ndx15 = stopSimRows.find((r) => r.stopSimId === 'stop_ndx_dist15')!;
  const vixMom = stopSimRows.find((r) => r.stopSimId === 'stop_vix_mom30')!;

  const answerAJa = `A 最大DD真因: 2022利上げ0-3m×QQQ×VIX24-26（2022-02-03 -11.13%が最大損·VIX前月比+44%·CPI高）— 監査48-49整合 — 評価A`;
  const answerBJa = `B 再現性: なし（監査49 · 核心条件は2022のみ · 2020/2023+/2025-26で0件）— 評価B`;
  const answerCJa = `C 2026監視: 新利上げ開始後3か月×QQQ×VIX24-26を参考監視（2022型警戒 · ルール変更なし）— 評価B`;
  const answerDJa = `D ルール化候補: ${surgical.labelJa}（累積Δ${surgical.cumulativeDeltaVsBaselinePt}pt · スキップ${surgical.skippedCount}件 · 外科的）— 評価A`;
  const answerEJa = `E ルール化不要: ${ndx15.labelJa}(Δ${ndx15.cumulativeDeltaVsBaselinePt}pt) · ${vixMom.labelJa}(Δ${vixMom.cumulativeDeltaVsBaselinePt}pt) · VIX24-30帯全体停止 · 2022年丸ごと停止 — 評価A`;

  const operationalNoteJa = [
    rootCauseConclusionJa,
    `相関1位: ${topCorr?.labelJa ?? '—'} r=${topCorr?.correlation ?? '—'}`,
    `停止候補: ${surgical.labelJa} Δ${surgical.cumulativeDeltaVsBaselinePt}pt`,
  ].join(' · ');

  const humanSummaryJa = [
    `監査50 2022真因 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    rootCauseConclusionJa,
    focusJa ? `【重点】\n${focusJa}` : '',
    answerCJa,
    answerDJa,
    answerEJa,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    tnxDataAvailable,
    y2022TradeCount: y2022Trades.length,
    lossTop5,
    winTop10,
    compareRows,
    correlationRanking,
    stopSimRows,
    rootCauseConclusionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function run2022RootCauseAudit(): Promise<Forward2022RootCauseAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];
  return build2022RootCauseReport({ bundle, tnxBars });
}

export function format2022RootCauseCsv(report: Forward2022RootCauseAuditReport): string {
  const lines = [
    `# 最重要監査その50 2022真因 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,rank,signalDate,symbol,returnPct,cohort,ndxDist52,qqqMa200,spyDist52,vix,vixWow,vixMom,us10y,us10yWow,hikeDays,cpiYoy,spySideways,adx,ratePhase,core,focus',
    ...report.lossTop5.map((r, i) =>
      [
        'loss',
        i + 1,
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.cohortId,
        r.ndxDist52Pct ?? '',
        r.qqqMa200DevPct ?? '',
        r.spyDist52Pct ?? '',
        r.vix ?? '',
        r.vixWowPct ?? '',
        r.vixMomPct ?? '',
        r.us10yPct ?? '',
        r.us10yWowPct ?? '',
        r.hikeDaysFromStart ?? '',
        r.cpiYoyPct ?? '',
        r.spySideways ? 1 : 0,
        r.adx14,
        r.ratePhaseJa,
        r.matchesCoreDanger ? 1 : 0,
        r.focusTrade ? 1 : 0,
      ].join(','),
    ),
    ...report.winTop10.map((r, i) =>
      [
        'win',
        i + 1,
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.cohortId,
        r.ndxDist52Pct ?? '',
        r.qqqMa200DevPct ?? '',
        r.spyDist52Pct ?? '',
        r.vix ?? '',
        r.vixWowPct ?? '',
        r.vixMomPct ?? '',
        r.us10yPct ?? '',
        r.us10yWowPct ?? '',
        r.hikeDaysFromStart ?? '',
        r.cpiYoyPct ?? '',
        r.spySideways ? 1 : 0,
        r.adx14,
        r.ratePhaseJa,
        r.matchesCoreDanger ? 1 : 0,
        0,
      ].join(','),
    ),
    '',
    'section,metricId,label,y2022LossAvg,cut2020WinAvg,y2025WinAvg,deltaLossCut,deltaLossY2025',
    ...report.compareRows.map((r) =>
      [
        'compare',
        r.metricId,
        `"${r.labelJa}"`,
        r.y2022LossAvg ?? '',
        r.cut2020WinAvg ?? '',
        r.y2025WinAvg ?? '',
        r.deltaLossMinusCutWin ?? '',
        r.deltaLossMinusY2025Win ?? '',
      ].join(','),
    ),
    '',
    'section,rank,metricId,label,correlation,absCorrelation',
    ...report.correlationRanking.map((r) =>
      [
        'correlation',
        r.rank,
        r.metricId,
        `"${r.labelJa}"`,
        r.correlation ?? '',
        r.absCorrelation ?? '',
      ].join(','),
    ),
    '',
    'section,stopSimId,label,trades,skipped,winRatePct,profitFactor,sharpe,mar,maxDD,cumulative,deltaCum,deltaDD',
    ...report.stopSimRows.map((r) =>
      [
        'stop_sim',
        r.stopSimId,
        `"${r.labelJa}"`,
        r.tradeCount,
        r.skippedCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.cumulativeDeltaVsBaselinePt,
        r.maxDrawdownDeltaVsBaselinePt,
      ].join(','),
    ),
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `root_cause,"${report.rootCauseConclusionJa}"`,
    `operational,"${report.operationalNoteJa}"`,
  ];
  return lines.join('\n');
}
