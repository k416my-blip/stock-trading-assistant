/**
 * 最重要監査その47 — 利上げフェーズ監査 · 監査46最終ルール固定 · 監査のみ
 *
 * 2022-01利上げサイクルを基準にフェーズ分類。2020利下げ・2024利下げもF/Gに割当。
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardRateHikePhaseAuditReport,
  ForwardRateHikePhaseId,
  ForwardRateHikePhaseMetrics,
  ForwardRateHikeRankingRow,
  ForwardRateHikeStopSimId,
} from '../../types/forwardValidation';
import { simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  enrichWithSpy63,
  type EnrichedSidewaysTrade,
} from './forwardValidationSpySidewaysValidityAudit';
import { classifyVixBand } from './forwardValidationVix2430BandValidityAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;

const HIKE_CYCLE_START = '2022-01-01';
const HIKE_CYCLE_END = '2023-09-30';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const RATE_PHASE_DEFS: { phaseId: ForwardRateHikePhaseId; labelJa: string }[] = [
  { phaseId: 'pre_hike', labelJa: 'A 利上げ前' },
  { phaseId: 'hike_0_3m', labelJa: 'B 利上げ開始〜3か月' },
  { phaseId: 'hike_3_6m', labelJa: 'C 利上げ3〜6か月' },
  { phaseId: 'hike_6_12m', labelJa: 'D 利上げ6〜12か月' },
  { phaseId: 'hike_1y_plus', labelJa: 'E 利上げ継続1年以上' },
  { phaseId: 'cut_0_3m', labelJa: 'F 利下げ開始〜3か月' },
  { phaseId: 'cut_3_12m', labelJa: 'G 利下げ3〜12か月' },
];

export const RATE_HIKE_STOP_SIM_DEFS: {
  stopSimId: ForwardRateHikeStopSimId;
  labelJa: string;
}[] = [
  { stopSimId: 'stop_hike_0_3m', labelJa: 'A 利上げ開始3か月停止' },
  { stopSimId: 'stop_hike_6m', labelJa: 'B 利上げ6か月停止' },
  { stopSimId: 'stop_hike_1y', labelJa: 'C 利上げ1年停止' },
  { stopSimId: 'stop_cut_0_3m', labelJa: 'D 利下げ開始停止' },
  {
    stopSimId: 'stop_hike_0_3m_vix2426',
    labelJa: 'E 利上げ開始3か月かつVIX24〜26停止',
  },
];

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function isVix24_26(vix: number | null): boolean {
  return classifyVixBand(vix) === 'vix_d_24_26';
}

export function isQqqVix2426(t: EnrichedSidewaysTrade): boolean {
  return t.symbol === 'QQQ' && isVix24_26(t.vixAtSignal);
}

/** シグナル日 → 利上げ/利下げフェーズ（2022サイクル基準 + 2020/2024利下げ） */
export function classifyRatePhase(signalDate: string): ForwardRateHikePhaseId {
  if (signalDate >= '2020-03-01' && signalDate <= '2020-05-31') return 'cut_0_3m';
  if (signalDate >= '2020-06-01' && signalDate <= '2021-12-31') return 'cut_3_12m';
  if (signalDate < HIKE_CYCLE_START) return 'pre_hike';
  if (signalDate >= '2022-01-01' && signalDate <= '2022-03-31') return 'hike_0_3m';
  if (signalDate >= '2022-04-01' && signalDate <= '2022-06-30') return 'hike_3_6m';
  if (signalDate >= '2022-07-01' && signalDate <= '2022-12-31') return 'hike_6_12m';
  if (signalDate >= '2023-01-01' && signalDate <= HIKE_CYCLE_END) return 'hike_1y_plus';
  if (signalDate >= '2024-09-01' && signalDate <= '2024-11-30') return 'cut_0_3m';
  if (signalDate >= '2024-12-01') return 'cut_3_12m';
  if (signalDate >= '2023-10-01' && signalDate <= '2024-08-31') return 'neutral';
  return 'neutral';
}

export function phaseLabelJa(phaseId: ForwardRateHikePhaseId): string {
  return (
    RATE_PHASE_DEFS.find((d) => d.phaseId === phaseId)?.labelJa ??
    '中立・その他'
  );
}

export function isAnyHikePhase(phaseId: ForwardRateHikePhaseId): boolean {
  return (
    phaseId === 'hike_0_3m' ||
    phaseId === 'hike_3_6m' ||
    phaseId === 'hike_6_12m' ||
    phaseId === 'hike_1y_plus'
  );
}

export function shouldSkipRateHikeStopSim(
  t: EnrichedSidewaysTrade,
  stopSimId: ForwardRateHikeStopSimId,
): boolean {
  const phase = classifyRatePhase(t.signalDate);
  switch (stopSimId) {
    case 'stop_hike_0_3m':
      return phase === 'hike_0_3m';
    case 'stop_hike_6m':
      return phase === 'hike_0_3m' || phase === 'hike_3_6m';
    case 'stop_hike_1y':
      return isAnyHikePhase(phase);
    case 'stop_cut_0_3m':
      return phase === 'cut_0_3m';
    case 'stop_hike_0_3m_vix2426':
      return phase === 'hike_0_3m' && isVix24_26(t.vixAtSignal);
    default:
      return false;
  }
}

export function simulateRateHikeStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  stopSimId: ForwardRateHikeStopSimId;
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

      if (shouldSkipRateHikeStopSim(t, input.stopSimId)) {
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
  def: { phaseId: ForwardRateHikePhaseId; labelJa: string },
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardRateHikePhaseMetrics {
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, trades);
  return {
    phaseId: def.phaseId,
    labelJa: def.labelJa,
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

function buildPhaseRows(
  trades: EnrichedSidewaysTrade[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardRateHikePhaseMetrics[] {
  return RATE_PHASE_DEFS.map((def) =>
    toPhaseMetrics(
      def,
      trades.filter((t) => classifyRatePhase(t.signalDate) === def.phaseId),
      fromDate,
      toDate,
      symbols,
    ),
  );
}

function toRankingRow(
  t: EnrichedSidewaysTrade,
  rank: number,
): ForwardRateHikeRankingRow {
  const phaseId = classifyRatePhase(t.signalDate);
  return {
    rank,
    signalDate: t.signalDate,
    entryDate: t.entryDate,
    symbol: t.symbol,
    returnPct: t.returnPct,
    vixAtSignal: t.vixAtSignal,
    phaseLabelJa: phaseLabelJa(phaseId),
    isQqq: t.symbol === 'QQQ',
    isQqqVix2426: isQqqVix2426(t),
  };
}

function gradeRank(rank: number): string {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildRateHikePhaseReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardRateHikePhaseAuditReport | null {
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

  const phaseRows = buildPhaseRows(baselineExecuted, fromDate, toDate, symbols);
  const qqqOnly = baselineExecuted.filter((t) => t.symbol === 'QQQ');
  const qqqVix2426 = baselineExecuted.filter((t) => isQqqVix2426(t));

  const qqqPhaseRows = buildPhaseRows(qqqOnly, fromDate, toDate, symbols);
  const qqqVix2426PhaseRows = buildPhaseRows(qqqVix2426, fromDate, toDate, symbols);

  const lossRanking = [...baselineExecuted]
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 20)
    .map((t, i) => toRankingRow(t, i + 1));

  const profitRanking = [...baselineExecuted]
    .filter((t) => t.returnPct > 0)
    .sort((a, b) => b.returnPct - a.returnPct)
    .slice(0, 20)
    .map((t, i) => toRankingRow(t, i + 1));

  const baselinePhase = toPhaseMetrics(
    { phaseId: 'pre_hike', labelJa: '現行' },
    baselineExecuted,
    fromDate,
    toDate,
    symbols,
  );

  const stopSimRows = RATE_HIKE_STOP_SIM_DEFS.map((def) => {
    const { executed, skippedCount } = simulateRateHikeStopPolicy({
      candidates,
      symbols,
      stopSimId: def.stopSimId,
      historyForSlot: [],
    });
    const phase = toPhaseMetrics(
      { phaseId: 'pre_hike', labelJa: def.labelJa },
      executed,
      fromDate,
      toDate,
      symbols,
    );
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

  const hikePhases = phaseRows.filter((r) =>
    ['hike_0_3m', 'hike_3_6m', 'hike_6_12m', 'hike_1y_plus'].includes(r.phaseId),
  );
  const worstHike = [...hikePhases]
    .filter((r) => r.tradeCount > 0)
    .sort((a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct)[0];
  const qqqB = qqqPhaseRows.find((r) => r.phaseId === 'hike_0_3m');
  const qqqVixB = qqqVix2426PhaseRows.find((r) => r.phaseId === 'hike_0_3m');

  const topLoss = lossRanking[0];

  const phaseConclusionJa = [
    `最大損失は${topLoss?.signalDate ?? '—'} ${topLoss?.symbol ?? '—'} ${topLoss?.returnPct ?? '—'}%（${topLoss?.phaseLabelJa ?? '—'} · VIX${topLoss?.vixAtSignal ?? '—'}）`,
    worstHike
      ? `利上げフェーズ最弱は${worstHike.labelJa}（${worstHike.tradeCount}件累積${worstHike.cumulativeReturnPct}%）`
      : '利上げフェーズデータ不足',
    qqqB && qqqB.tradeCount > 0
      ? `QQQ×利上げ開始3か月は${qqqB.tradeCount}件累積${qqqB.cumulativeReturnPct}%`
      : '',
    qqqVixB && qqqVixB.tradeCount > 0
      ? `QQQ×VIX24〜26×開始3か月は${qqqVixB.tradeCount}件累積${qqqVixB.cumulativeReturnPct}%`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

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

  const answerAJa = `A 最大DD原因: ${phaseConclusionJa} — 評価A`;
  const answerBJa = `B 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · Δ${profitMax.cumulativeDeltaVsBaselinePt}pt）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · ΔDD${ddMin.maxDrawdownDeltaVsBaselinePt}pt）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerDJa = `D Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerEJa = `E 2026監視: 利上げ開始後3か月 · QQQ · VIX24〜26（${qqqVixB?.tradeCount ?? 0}件）— ルール変更なし — 評価B`;

  const operationalNoteJa = [
    `実行${baselineExecuted.length}件`,
    `中立期${baselineExecuted.filter((t) => classifyRatePhase(t.signalDate) === 'neutral').length}件はA〜G外`,
    phaseConclusionJa,
  ].join(' · ');

  const humanSummaryJa = [
    `監査47 利上げフェーズ ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    phaseRows,
    qqqPhaseRows,
    qqqVix2426PhaseRows,
    lossRanking,
    profitRanking,
    stopSimRows,
    phaseConclusionJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runRateHikePhaseAudit(): Promise<ForwardRateHikePhaseAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildRateHikePhaseReport({ bundle });
}

export function formatRateHikePhaseCsv(
  report: ForwardRateHikePhaseAuditReport,
): string {
  const phaseLine = (section: string, m: ForwardRateHikePhaseMetrics) =>
    [
      section,
      m.phaseId,
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
    ].join(',');

  const lines = [
    `# 最重要監査その47 利上げフェーズ ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,phaseId,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.phaseRows.map((m) => phaseLine('all', m)),
    '',
    'section,phaseId,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.qqqPhaseRows.map((m) => phaseLine('qqq', m)),
    '',
    'section,phaseId,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.qqqVix2426PhaseRows.map((m) => phaseLine('qqq_vix2426', m)),
    '',
    'section,rank,type,signalDate,entryDate,symbol,returnPct,vix,phase,qqq,qqqVix2426',
    ...report.lossRanking.map((r) =>
      [
        'ranking',
        r.rank,
        'loss',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        `"${r.phaseLabelJa.replace(/"/g, '""')}"`,
        r.isQqq ? 1 : 0,
        r.isQqqVix2426 ? 1 : 0,
      ].join(','),
    ),
    ...report.profitRanking.map((r) =>
      [
        'ranking',
        r.rank,
        'profit',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        `"${r.phaseLabelJa.replace(/"/g, '""')}"`,
        r.isQqq ? 1 : 0,
        r.isQqqVix2426 ? 1 : 0,
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
    ['phase', report.phaseConclusionJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
