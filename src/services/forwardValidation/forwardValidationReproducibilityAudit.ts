/**
 * 最重要監査その49 — 再現性監査 · 監査48最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardReproCohortId,
  ForwardReproCycleMetrics,
  ForwardReproDdCommonFactorRow,
  ForwardReproLossRow,
  ForwardReproMacroCycleId,
  ForwardReproStopSimId,
  ForwardReproducibilityAuditReport,
} from '../../types/forwardValidation';
import { buildOperationalEquityCurve } from './forwardValidationEquityCurveAudit';
import { simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
import { extractDrawdownEpisodes } from './forwardValidationMaxDrawdownCauseAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  classifyRatePhase,
  isVix24_26,
} from './forwardValidationRateHikePhaseAudit';
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

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const REPRO_MACRO_CYCLE_DEFS: {
  cycleId: ForwardReproMacroCycleId;
  labelJa: string;
}[] = [
  { cycleId: 'hike_2022', labelJa: '2022利上げ（2022-01〜2023-09）' },
  { cycleId: 'cut_2020', labelJa: '2020利下げ（2020-03〜2021-12）' },
  { cycleId: 'since_2023', labelJa: '2023以降（2023-10〜2024-12）' },
  { cycleId: 'y2025_2026', labelJa: '2025〜2026' },
];

export const REPRO_COHORT_DEFS: {
  cohortId: ForwardReproCohortId;
  labelJa: string;
}[] = [
  { cohortId: 'all', labelJa: '全銘柄' },
  { cohortId: 'qqq', labelJa: 'QQQのみ' },
  { cohortId: 'vix2426', labelJa: 'VIX24〜26' },
  { cohortId: 'core', labelJa: '核心（利上げ0〜3m×QQQ×VIX24〜26）' },
];

export const REPRO_STOP_SIM_DEFS: {
  stopSimId: ForwardReproStopSimId;
  labelJa: string;
}[] = [
  { stopSimId: 'stop_2022_only', labelJa: 'A 2022のみ停止' },
  { stopSimId: 'stop_hike_0_3m', labelJa: 'B 利上げ開始3か月停止' },
  { stopSimId: 'stop_vix2426', labelJa: 'C VIX24〜26停止' },
  { stopSimId: 'stop_2022_qqq', labelJa: 'D 2022かつQQQ停止' },
  { stopSimId: 'stop_2022_qqq_vix2426', labelJa: 'E 2022かつQQQかつVIX24〜26停止' },
];

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function signalYear(signalDate: string): number {
  return Number.parseInt(signalDate.slice(0, 4), 10);
}

export function classifyMacroCycle(signalDate: string): ForwardReproMacroCycleId {
  if (signalDate >= '2022-01-01' && signalDate <= '2023-09-30') return 'hike_2022';
  if (signalDate >= '2020-03-01' && signalDate <= '2021-12-31') return 'cut_2020';
  if (signalDate >= '2025-01-01') return 'y2025_2026';
  if (signalDate >= '2023-10-01') return 'since_2023';
  return 'other';
}

export function macroCycleLabelJa(cycleId: ForwardReproMacroCycleId): string {
  return (
    REPRO_MACRO_CYCLE_DEFS.find((d) => d.cycleId === cycleId)?.labelJa ??
    'その他（2018-2019等）'
  );
}

export function matchesCoreDanger(t: EnrichedSidewaysTrade): boolean {
  return (
    t.symbol === 'QQQ' &&
    classifyRatePhase(t.signalDate) === 'hike_0_3m' &&
    isVix24_26(t.vixAtSignal)
  );
}

export function matchesReproCohort(
  t: EnrichedSidewaysTrade,
  cohortId: ForwardReproCohortId,
): boolean {
  switch (cohortId) {
    case 'all':
      return true;
    case 'qqq':
      return t.symbol === 'QQQ';
    case 'vix2426':
      return isVix24_26(t.vixAtSignal);
    case 'core':
      return matchesCoreDanger(t);
    default:
      return false;
  }
}

export function shouldSkipReproStopSim(
  t: EnrichedSidewaysTrade,
  stopSimId: ForwardReproStopSimId,
): boolean {
  const y2022 = signalYear(t.signalDate) === 2022;
  switch (stopSimId) {
    case 'stop_2022_only':
      return y2022;
    case 'stop_hike_0_3m':
      return classifyRatePhase(t.signalDate) === 'hike_0_3m';
    case 'stop_vix2426':
      return isVix24_26(t.vixAtSignal);
    case 'stop_2022_qqq':
      return y2022 && t.symbol === 'QQQ';
    case 'stop_2022_qqq_vix2426':
      return y2022 && t.symbol === 'QQQ' && isVix24_26(t.vixAtSignal);
    default:
      return false;
  }
}

export function simulateReproStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  stopSimId: ForwardReproStopSimId;
  historyForSlot: ForwardPassedTradeRecord[];
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
  const completed: ForwardPassedTradeRecord[] = [...input.historyForSlot];

  for (const date of eventDates) {
    const closing = pendingByExit.get(date) ?? [];
    for (const leg of closing) {
      const idx = open.findIndex(
        (o) => o.id === leg.id && o.entryDate === leg.entryDate && o.symbol === leg.symbol,
      );
      if (idx < 0) continue;
      const active = open[idx]!;
      open.splice(idx, 1);
      const pnl = round3((active.notional * active.returnPct) / 100);
      equity = round3(equity + pnl);
      completed.push(active);
    }

    const dayEntries = sorted.filter((t) => t.entryDate === date);
    for (const t of dayEntries) {
      const stillOpen = open.filter((o) => o.exitDate >= date);
      if (stillOpen.length >= FORWARD_MAX_CONCURRENT) continue;

      if (shouldSkipReproStopSim(t, input.stopSimId)) {
        skippedCount++;
        continue;
      }

      const slotPct = winRateSlotPct(t, completed, input.symbols);
      const openNotional = stillOpen.reduce((s, o) => s + o.notional, 0);
      const target = round3((equity * slotPct) / 100);
      const available = Math.max(0, equity * maxDeployFrac - openNotional);
      const notional = round3(Math.min(target, available));
      if (notional <= 0) continue;

      const activeLeg: ActiveLeg = { ...t, slotPct, notional };
      open.push(activeLeg);
      executed.push(activeLeg);
    }
  }

  for (const leg of open) {
    const pnl = round3((leg.notional * leg.returnPct) / 100);
    equity = round3(equity + pnl);
  }

  return { executed, skippedCount };
}

function toCycleMetrics(
  cycle: { cycleId: ForwardReproMacroCycleId; labelJa: string },
  cohort: { cohortId: ForwardReproCohortId; labelJa: string },
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardReproCycleMetrics {
  const phase = buildWalkForward31PhaseMetrics(
    `${cycle.labelJa} ${cohort.labelJa}`,
    fromDate,
    toDate,
    trades,
  );
  return {
    cycleId: cycle.cycleId,
    cycleLabelJa: cycle.labelJa,
    cohortId: cohort.cohortId,
    cohortLabelJa: cohort.labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromExecuted(trades, symbols),
  };
}

function buildDdCommonFactors(
  episodeTrades: EnrichedSidewaysTrade[],
): ForwardReproDdCommonFactorRow[] {
  const qqq = episodeTrades.filter((t) => t.symbol === 'QQQ').length;
  const y2022 = episodeTrades.filter((t) => signalYear(t.signalDate) === 2022).length;
  const hike03 = episodeTrades.filter(
    (t) => classifyRatePhase(t.signalDate) === 'hike_0_3m',
  ).length;
  const vix2426 = episodeTrades.filter((t) => isVix24_26(t.vixAtSignal)).length;
  const core = episodeTrades.filter((t) => matchesCoreDanger(t)).length;
  const losses = episodeTrades.filter((t) => t.returnPct < 0).length;

  return [
    { factor: 'trades_in_episode', valueJa: 'DDエピソード内取引', count: episodeTrades.length },
    { factor: 'qqq', valueJa: 'QQQ', count: qqq },
    { factor: 'calendar_2022', valueJa: '2022年', count: y2022 },
    { factor: 'hike_0_3m', valueJa: '利上げ開始0〜3か月', count: hike03 },
    { factor: 'vix24_26', valueJa: 'VIX24〜26', count: vix2426 },
    { factor: 'core_danger', valueJa: '核心条件', count: core },
    { factor: 'loss_trades', valueJa: '損失取引', count: losses },
  ];
}

function gradeRank(rank: number): string {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildReproducibilityReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardReproducibilityAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const spyBars = input.bundle.spyBars ?? [];
  const vixDataAvailable = vixBars.length > 0;

  const candidates = enrichWithSpy63(
    enrichTradesWithVix(
      collectBaselineCandidates(input.bundle, fromDate, toDate),
      vixBars,
    ),
    spyBars,
  );

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

  const cycleRows: ForwardReproCycleMetrics[] = [];
  for (const cycle of REPRO_MACRO_CYCLE_DEFS) {
    const inCycle = baselineExecuted.filter(
      (t) => classifyMacroCycle(t.signalDate) === cycle.cycleId,
    );
    for (const cohort of REPRO_COHORT_DEFS) {
      cycleRows.push(
        toCycleMetrics(
          cycle,
          cohort,
          inCycle.filter((t) => matchesReproCohort(t, cohort.cohortId)),
          fromDate,
          toDate,
          symbols,
        ),
      );
    }
  }

  const lossRanking: ForwardReproLossRow[] = [...baselineExecuted]
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .map((t, i) => ({
      rank: i + 1,
      signalDate: t.signalDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      cycleLabelJa: macroCycleLabelJa(classifyMacroCycle(t.signalDate)),
      matchesCore: matchesCoreDanger(t),
    }));

  const { exits } = buildOperationalEquityCurve({
    trades: baselineExecuted,
    symbols,
    initialCapital: INITIAL_CAPITAL,
  });
  const worstEp = extractDrawdownEpisodes(exits)[0];
  const episodeTrades = worstEp
    ? baselineExecuted.filter(
        (t) =>
          t.entryDate >= worstEp.startDate &&
          t.entryDate <= (worstEp.recoveryDate ?? worstEp.troughDate),
      )
    : [];
  const ddCommonFactors = buildDdCommonFactors(episodeTrades);
  const maxDdEpisodeJa = worstEp
    ? `最大DD ${worstEp.depthPct}% · ${worstEp.startDate}→${worstEp.troughDate}（回復${worstEp.recoveryDate ?? '—'}）· エピソード内${episodeTrades.length}件`
    : '最大DDエピソードなし';

  const baselinePhase = buildWalkForward31PhaseMetrics(
    '現行',
    fromDate,
    toDate,
    baselineExecuted,
  );

  const stopSimRows = REPRO_STOP_SIM_DEFS.map((def) => {
    const { executed, skippedCount } = simulateReproStopPolicy({
      candidates,
      symbols,
      stopSimId: def.stopSimId,
      historyForSlot: [],
    });
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      fromDate,
      toDate,
      executed,
    );
    return {
      stopSimId: def.stopSimId,
      labelJa: def.labelJa,
      tradeCount: phase.tradeCount,
      skippedCount,
      winRatePct: phase.winRatePct,
      profitFactor: phase.profitFactor,
      sharpe: phase.sharpe,
      mar: phase.mar,
      maxDrawdownPct: phase.maxDrawdownPct,
      cumulativeReturnPct: phase.cumulativeReturnPct,
      recoveryDays: recoveryDaysFromExecuted(executed, symbols),
      cumulativeDeltaVsBaselinePt: round3(
        phase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
      ),
      maxDrawdownDeltaVsBaselinePt: round3(
        (phase.maxDrawdownPct ?? 0) - (baselinePhase.maxDrawdownPct ?? 0),
      ),
    };
  });

  const coreAll = baselineExecuted.filter((t) => matchesCoreDanger(t));
  const coreByCycle = REPRO_MACRO_CYCLE_DEFS.map((c) => ({
    cycle: c,
    trades: coreAll.filter((t) => classifyMacroCycle(t.signalDate) === c.cycleId),
  }));
  const cyclesWithCore = coreByCycle.filter((x) => x.trades.length > 0);
  const coreLossCycles = coreByCycle.filter((x) =>
    x.trades.some((t) => t.returnPct < 0),
  );
  const onlyHike2022 =
    cyclesWithCore.length === 1 && cyclesWithCore[0]!.cycle.cycleId === 'hike_2022';

  const reproducibilityConclusionJa = onlyHike2022
    ? `核心条件は${coreAll.length}件すべて2022利上げサイクル（2022-02 QQQ -11.13%等）。他サイクル（2020利下げ・2023以降・2025-26）では核心0件。再現性は未確認・2022特殊事故の可能性大。`
    : `核心条件が複数サイクルに存在（${cyclesWithCore.map((x) => x.cycle.labelJa).join(' · ')}）。再現性あり。`;

  const byCum = [...stopSimRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const byDd = [...stopSimRows].sort(
    (a, b) =>
      Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );
  const bySharpe = [...stopSimRows].sort(
    (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999),
  );

  const profitMax = byCum[0]!;
  const ddMin = byDd[0]!;

  const answerAJa = onlyHike2022
    ? `A 再現性: なし（核心${coreAll.length}件は全て2022利上げサイクルのみ · 損失サイクル${coreLossCycles.length}）— 評価B`
    : `A 再現性: あり（${cyclesWithCore.length}サイクルで核心観測）— 評価A`;
  const answerBJa = `B 2022特殊事故: ${onlyHike2022 ? 'はい（単一クラスター · 他サイクル核心0件）' : 'いいえ'} — 評価${onlyHike2022 ? 'A' : 'C'}`;
  const answerCJa = `C 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · Δ${profitMax.cumulativeDeltaVsBaselinePt}pt）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerDJa = `D DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · ΔDD${ddMin.maxDrawdownDeltaVsBaselinePt}pt）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerEJa = `E 2026監視: 利上げ開始後3か月×QQQ×VIX24〜26（再現性未確認のため参考監視 · 2022型警戒）— ルール変更なし — 評価B`;

  const operationalNoteJa = [
    maxDdEpisodeJa,
    reproducibilityConclusionJa,
    `停止E（2022×QQQ×VIX24-26）スキップ${stopSimRows.find((r) => r.stopSimId === 'stop_2022_qqq_vix2426')?.skippedCount ?? 0}件`,
  ].join(' · ');

  const humanSummaryJa = [
    `監査49 再現性 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    reproducibilityConclusionJa,
    answerCJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    cycleRows,
    lossRanking,
    ddCommonFactors,
    maxDdEpisodeJa,
    stopSimRows,
    reproducibilityConclusionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runReproducibilityAudit(): Promise<ForwardReproducibilityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildReproducibilityReport({ bundle });
}

export function formatReproducibilityCsv(
  report: ForwardReproducibilityAuditReport,
): string {
  const lines = [
    `# 最重要監査その49 再現性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,cycleId,cycleLabel,cohortId,cohortLabel,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.cycleRows.map((r) =>
      [
        'cycle',
        r.cycleId,
        `"${r.cycleLabelJa.replace(/"/g, '""')}"`,
        r.cohortId,
        `"${r.cohortLabelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
      ].join(','),
    ),
    '',
    'section,rank,signalDate,symbol,returnPct,vix,cycle,matchesCore',
    ...report.lossRanking.map((r) =>
      [
        'loss',
        r.rank,
        r.signalDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        `"${r.cycleLabelJa.replace(/"/g, '""')}"`,
        r.matchesCore ? 1 : 0,
      ].join(','),
    ),
    '',
    'section,factor,value,count',
    ...report.ddCommonFactors.map((r) =>
      ['dd_factor', r.factor, `"${r.valueJa.replace(/"/g, '""')}"`, r.count].join(','),
    ),
    '',
    'section,stopSimId,label,trades,skipped,winRatePct,profitFactor,sharpe,mar,maxDD,cumulative,deltaCum,deltaDD',
    ...report.stopSimRows.map((r) =>
      [
        'stop_sim',
        r.stopSimId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
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
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['max_dd', report.maxDdEpisodeJa],
    ['repro', report.reproducibilityConclusionJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
