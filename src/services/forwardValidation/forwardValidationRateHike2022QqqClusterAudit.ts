/**
 * 最重要監査その45 — 2022利上げ期QQQクラスター監査 · 監査44最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardRateHike2022QqqAuditReport,
  ForwardRateHike2022QqqConditionId,
  ForwardRateHike2022QqqCulpritOverlap,
  ForwardRateHike2022QqqLossRow,
  ForwardRateHike2022QqqPhaseMetrics,
  ForwardRateHike2022QqqStopSimId,
  ForwardRateHike2022QqqTradeRow,
  ForwardRateHike2022QqqYearMetrics,
} from '../../types/forwardValidation';
import { isSpySideways, simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  enrichWithSpy63,
  rateDirectionAt,
  rateDirectionJa,
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
const PERIOD_2026_FROM = '2026-01-01';
const YEAR_2022_FROM = '2022-01-01';
const YEAR_2022_TO = '2022-12-31';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const QQQ_CONDITION_DEFS: {
  conditionId: ForwardRateHike2022QqqConditionId;
  labelJa: string;
}[] = [
  { conditionId: 'qqq_only', labelJa: 'A QQQのみ' },
  { conditionId: 'qqq_hike', labelJa: 'B QQQ＋金利上昇' },
  { conditionId: 'qqq_vix24_30', labelJa: 'C QQQ＋VIX24〜30' },
  { conditionId: 'qqq_sideways', labelJa: 'D QQQ＋横ばい' },
  { conditionId: 'qqq_hike_vix24', labelJa: 'E QQQ＋金利上昇＋VIX24〜30' },
  { conditionId: 'qqq_hike_vix24_sideways', labelJa: 'F QQQ＋金利上昇＋VIX24〜30＋横ばい' },
];

export const QQQ_STOP_SIM_DEFS: {
  stopSimId: ForwardRateHike2022QqqStopSimId;
  labelJa: string;
}[] = [
  { stopSimId: 'stop_all_qqq', labelJa: 'A 全QQQ停止' },
  { stopSimId: 'stop_2022_qqq', labelJa: 'B 2022QQQ停止' },
  { stopSimId: 'stop_qqq_hike', labelJa: 'C QQQ＋金利上昇停止' },
  { stopSimId: 'stop_qqq_vix24', labelJa: 'D QQQ＋VIX24〜30停止' },
  { stopSimId: 'stop_qqq_hike_vix24', labelJa: 'E QQQ＋金利上昇＋VIX24〜30停止' },
];

const QQQ_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function tradeKey(t: ForwardPassedTradeRecord): string {
  return `${t.id}|${t.entryDate}|${t.symbol}`;
}

function signalYear(signalDate: string): number {
  return Number.parseInt(signalDate.slice(0, 4), 10);
}

export function isRateHike(signalDate: string): boolean {
  return signalDate >= '2022-01-01' && signalDate <= '2023-09-30';
}

export function isVix24_30(vix: number | null): boolean {
  return vix != null && vix >= 24 && vix < 30;
}

export function spyEnvJa(bucket: string): string {
  const g = classifyRegimeGroup(bucket);
  switch (g) {
    case 'up':
      return '上昇';
    case 'down':
      return '下落';
    case 'sideways':
      return '横ばい(深)';
    case 'sideways_shallow':
      return '横ばい(浅)';
    default:
      return bucket;
  }
}

export function matchesQqqCondition(
  t: EnrichedSidewaysTrade,
  conditionId: ForwardRateHike2022QqqConditionId,
): boolean {
  if (t.symbol !== 'QQQ') return false;
  const hike = isRateHike(t.signalDate);
  const vix = isVix24_30(t.vixAtSignal);
  const side = isSpySideways(t);
  switch (conditionId) {
    case 'qqq_only':
      return true;
    case 'qqq_hike':
      return hike;
    case 'qqq_vix24_30':
      return vix;
    case 'qqq_sideways':
      return side;
    case 'qqq_hike_vix24':
      return hike && vix;
    case 'qqq_hike_vix24_sideways':
      return hike && vix && side;
    default:
      return false;
  }
}

export function shouldSkipQqqStopSim(
  t: EnrichedSidewaysTrade,
  stopSimId: ForwardRateHike2022QqqStopSimId,
): boolean {
  if (t.symbol !== 'QQQ') return false;
  switch (stopSimId) {
    case 'stop_all_qqq':
      return true;
    case 'stop_2022_qqq':
      return signalYear(t.signalDate) === 2022;
    case 'stop_qqq_hike':
      return isRateHike(t.signalDate);
    case 'stop_qqq_vix24':
      return isVix24_30(t.vixAtSignal);
    case 'stop_qqq_hike_vix24':
      return isRateHike(t.signalDate) && isVix24_30(t.vixAtSignal);
    default:
      return false;
  }
}

export function simulateQqqStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  stopSimId: ForwardRateHike2022QqqStopSimId;
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

      if (shouldSkipQqqStopSim(t, input.stopSimId)) {
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

function toPhaseMetrics(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardRateHike2022QqqPhaseMetrics {
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  return {
    labelJa,
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

function buildCulpritOverlaps(
  qqq2022Losses: EnrichedSidewaysTrade[],
): ForwardRateHike2022QqqCulpritOverlap[] {
  return QQQ_CONDITION_DEFS.map((def) => {
    const subset = qqq2022Losses.filter((t) => matchesQqqCondition(t, def.conditionId));
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      YEAR_2022_FROM,
      YEAR_2022_TO,
      subset,
    );
    return {
      conditionId: def.conditionId,
      labelJa: def.labelJa,
      tradeCount: subset.length,
      lossTradeCount: subset.length,
      cumulativeReturnPct: phase.cumulativeReturnPct,
    };
  });
}

function gradeRank(rank: number): string {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildRateHike2022QqqClusterReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardRateHike2022QqqAuditReport | null {
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

  const trades2022: ForwardRateHike2022QqqTradeRow[] = baselineExecuted
    .filter((t) => t.signalDate >= YEAR_2022_FROM && t.signalDate <= YEAR_2022_TO)
    .sort((a, b) => a.signalDate.localeCompare(b.signalDate))
    .map((t) => ({
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      spyEnvJa: spyEnvJa(t.bucket),
      rateDirectionJa: rateDirectionJa(rateDirectionAt(t.signalDate)),
    }));

  const qqqOnly = baselineExecuted.filter((t) => t.symbol === 'QQQ');
  const qqqOnlyMetrics = toPhaseMetrics(
    'QQQのみ（全期間）',
    qqqOnly,
    fromDate,
    toDate,
    symbols,
  );

  const qqqYearRows: ForwardRateHike2022QqqYearMetrics[] = QQQ_YEARS.map((year) => {
    const subset = qqqOnly.filter((t) => signalYear(t.signalDate) === year);
    const phase = buildWalkForward31PhaseMetrics(
      `QQQ ${year}`,
      `${year}-01-01`,
      `${year}-12-31`,
      subset,
    );
    return {
      year,
      tradeCount: phase.tradeCount,
      winRatePct: phase.winRatePct,
      profitFactor: phase.profitFactor,
      sharpe: phase.sharpe,
      maxDrawdownPct: phase.maxDrawdownPct,
      cumulativeReturnPct: phase.cumulativeReturnPct,
    };
  });

  const qqq2022Losses = qqqOnly
    .filter(
      (t) =>
        t.signalDate >= YEAR_2022_FROM &&
        t.signalDate <= YEAR_2022_TO &&
        t.returnPct < 0,
    )
    .sort((a, b) => a.returnPct - b.returnPct);

  const lossRanking2022: ForwardRateHike2022QqqLossRow[] = qqq2022Losses
    .slice(0, 20)
    .map((t, i) => ({
      rank: i + 1,
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      spyEnvJa: spyEnvJa(t.bucket),
      rateDirectionJa: rateDirectionJa(rateDirectionAt(t.signalDate)),
      matchesHike: isRateHike(t.signalDate),
      matchesVix24_30: isVix24_30(t.vixAtSignal),
      matchesSideways: isSpySideways(t),
    }));

  const conditionRows = QQQ_CONDITION_DEFS.map((def) =>
    toPhaseMetrics(
      def.labelJa,
      baselineExecuted.filter((t) => matchesQqqCondition(t, def.conditionId)),
      fromDate,
      toDate,
      symbols,
    ),
  );

  const baselinePhase = toPhaseMetrics(
    '現行',
    baselineExecuted,
    fromDate,
    toDate,
    symbols,
  );

  const stopSimRows = QQQ_STOP_SIM_DEFS.map((def) => {
    const { executed, skippedCount } = simulateQqqStopPolicy({
      candidates,
      symbols,
      stopSimId: def.stopSimId,
      historyForSlot: [],
    });
    const phase = toPhaseMetrics(def.labelJa, executed, fromDate, toDate, symbols);
    return {
      ...phase,
      stopSimId: def.stopSimId,
      skippedCount,
      cumulativeDeltaVsBaselinePt: round3(
        phase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
      ),
      maxDrawdownDeltaVsBaselinePt: round3(
        (phase.maxDrawdownPct ?? 0) - (baselinePhase.maxDrawdownPct ?? 0),
      ),
    };
  });

  const culpritOverlapRows = buildCulpritOverlaps(qqq2022Losses);

  const eCond = conditionRows.find((r) => r.labelJa.startsWith('E '))!;
  const fCond = conditionRows.find((r) => r.labelJa.startsWith('F '))!;
  const qqq2022 = qqqYearRows.find((r) => r.year === 2022)!;

  const lossKeysE = new Set(
    qqq2022Losses
      .filter((t) => matchesQqqCondition(t, 'qqq_hike_vix24'))
      .map(tradeKey),
  );
  const lossKeysF = new Set(
    qqq2022Losses
      .filter((t) => matchesQqqCondition(t, 'qqq_hike_vix24_sideways'))
      .map(tradeKey),
  );
  const sameCulprit =
    lossKeysE.size > 0 &&
    lossKeysE.size === lossKeysF.size &&
    [...lossKeysE].every((k) => lossKeysF.has(k));

  const sameCulpritConclusionJa = sameCulprit
    ? `2022年QQQ損失${qqq2022Losses.length}件のうちE条件${lossKeysE.size}件とF条件が完全一致。同一犯（QQQ×利上げ×VIX24〜30×横ばい深）が最大DDの中心。`
    : `2022年QQQ損失${qqq2022Losses.length}件 · E${lossKeysE.size}件 / F${lossKeysF.size}件。中心はQQQ×2022×利上げ×VIX24〜30（横ばいは部分集合）。`;

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
  const sharpeMax = bySharpe[0]!;

  const answerAJa = `A 最大DD原因: ${sameCulpritConclusionJa} 2022QQQ累積${qqq2022.cumulativeReturnPct}%（${qqq2022.tradeCount}件 WR${qqq2022.winRatePct}%）— 評価A`;
  const answerBJa = `B 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · Δ${profitMax.cumulativeDeltaVsBaselinePt}pt）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · ΔDD${ddMin.maxDrawdownDeltaVsBaselinePt}pt）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerDJa = `D Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerEJa = `E 2026監視: QQQ新規 · 利上げ局面 · VIX24〜30 · SPY横ばい深 — 参考E条件（${eCond.tradeCount}件累積${eCond.cumulativeReturnPct}%）— 評価B`;

  const operationalNoteJa = [
    `2022全取引${trades2022.length}件`,
    `QQQ全期間${qqqOnlyMetrics.tradeCount}件`,
    `停止シムB(2022QQQのみ) Δ累積${stopSimRows.find((r) => r.stopSimId === 'stop_2022_qqq')?.cumulativeDeltaVsBaselinePt ?? '—'}pt`,
    'ルール変更なし',
  ].join(' · ');

  const humanSummaryJa = [
    `監査45 2022利上げQQQ ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    sameCulpritConclusionJa,
    answerBJa,
    answerCJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    trades2022,
    qqqOnlyMetrics,
    qqqYearRows,
    lossRanking2022,
    conditionRows,
    stopSimRows,
    culpritOverlapRows,
    sameCulpritConclusionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runRateHike2022QqqClusterAudit(): Promise<ForwardRateHike2022QqqAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildRateHike2022QqqClusterReport({ bundle });
}

export function formatRateHike2022QqqClusterCsv(
  report: ForwardRateHike2022QqqAuditReport,
): string {
  const lines = [
    `# 最重要監査その45 2022利上げQQQ ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,signalDate,entryDate,symbol,returnPct,vix,spyEnv,rateDirection',
    ...report.trades2022.map((r) =>
      [
        'trade_2022',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.spyEnvJa,
        r.rateDirectionJa,
      ].join(','),
    ),
    '',
    'section,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    [
      report.qqqOnlyMetrics,
      ...report.conditionRows,
    ].map((m) =>
      [
        'metrics',
        `"${m.labelJa.replace(/"/g, '""')}"`,
        m.tradeCount,
        m.winRatePct,
        m.avgReturnPct ?? '',
        m.profitFactor ?? '',
        m.sharpe ?? '',
        m.mar ?? '',
        m.maxDrawdownPct ?? '',
        m.cumulativeReturnPct,
        m.recoveryDays ?? '',
      ].join(','),
    ),
    '',
    'section,year,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    ...report.qqqYearRows.map((r) =>
      [
        'qqq_year',
        r.year,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,rank,signalDate,entryDate,returnPct,vix,spyEnv,rate,hike,vix24_30,sideways',
    ...report.lossRanking2022.map((r) =>
      [
        'loss_2022',
        r.rank,
        r.signalDate,
        r.entryDate,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.spyEnvJa,
        r.rateDirectionJa,
        r.matchesHike ? 1 : 0,
        r.matchesVix24_30 ? 1 : 0,
        r.matchesSideways ? 1 : 0,
      ].join(','),
    ),
    '',
    'section,conditionId,label,lossTrades,cumReturn',
    ...report.culpritOverlapRows.map((r) =>
      [
        'culprit',
        r.conditionId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.lossTradeCount,
        r.cumulativeReturnPct,
      ].join(','),
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
        r.maxDrawdownDeltaVsCurrentPt,
      ].join(','),
    ),
    '',
    'answer,content',
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['same_culprit', report.sameCulpritConclusionJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
