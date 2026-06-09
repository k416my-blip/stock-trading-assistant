/**
 * 最重要監査その48 — QQQ固有リスク監査 · 監査47最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardQqqIntrinsicRiskAuditReport,
  ForwardQqqRiskLossRow,
  ForwardQqqRiskSliceId,
  ForwardQqqRiskStopSimId,
  ForwardQqqRiskSymbolMetrics,
} from '../../types/forwardValidation';
import { simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
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
const YEAR_2022_FROM = '2022-01-01';
const YEAR_2022_TO = '2022-12-31';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

const SYMBOLS = ['QQQ', 'HDV', 'DGRO', 'SCHD'] as const;

export const QQQ_RISK_SLICE_DEFS: {
  sliceId: ForwardQqqRiskSliceId;
  labelJa: string;
}[] = [
  { sliceId: 'all', labelJa: '全期間' },
  { sliceId: 'y2022', labelJa: '2022年限定' },
  { sliceId: 'hike_0_3m', labelJa: '利上げ開始0〜3か月' },
  { sliceId: 'vix24_26', labelJa: 'VIX24〜26' },
  { sliceId: 'hike_vix2426', labelJa: '利上げ0〜3か月×VIX24〜26' },
];

export const QQQ_RISK_STOP_SIM_DEFS: {
  stopSimId: ForwardQqqRiskStopSimId;
  labelJa: string;
}[] = [
  { stopSimId: 'stop_qqq', labelJa: 'A QQQのみ停止' },
  { stopSimId: 'stop_dgro', labelJa: 'B DGROのみ停止' },
  { stopSimId: 'stop_hdv', labelJa: 'C HDVのみ停止' },
  { stopSimId: 'stop_schd', labelJa: 'D SCHDのみ停止' },
  { stopSimId: 'stop_qqq_hike_0_3m', labelJa: 'E QQQかつ利上げ開始3か月停止' },
];

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function matchesRiskSlice(
  t: EnrichedSidewaysTrade,
  sliceId: ForwardQqqRiskSliceId,
): boolean {
  switch (sliceId) {
    case 'all':
      return true;
    case 'y2022':
      return t.signalDate >= YEAR_2022_FROM && t.signalDate <= YEAR_2022_TO;
    case 'hike_0_3m':
      return classifyRatePhase(t.signalDate) === 'hike_0_3m';
    case 'vix24_26':
      return isVix24_26(t.vixAtSignal);
    case 'hike_vix2426':
      return (
        classifyRatePhase(t.signalDate) === 'hike_0_3m' &&
        isVix24_26(t.vixAtSignal)
      );
    default:
      return false;
  }
}

export function shouldSkipQqqRiskStopSim(
  t: EnrichedSidewaysTrade,
  stopSimId: ForwardQqqRiskStopSimId,
): boolean {
  switch (stopSimId) {
    case 'stop_qqq':
      return t.symbol === 'QQQ';
    case 'stop_dgro':
      return t.symbol === 'DGRO';
    case 'stop_hdv':
      return t.symbol === 'HDV';
    case 'stop_schd':
      return t.symbol === 'SCHD';
    case 'stop_qqq_hike_0_3m':
      return t.symbol === 'QQQ' && classifyRatePhase(t.signalDate) === 'hike_0_3m';
    default:
      return false;
  }
}

export function simulateQqqRiskStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  stopSimId: ForwardQqqRiskStopSimId;
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

      if (shouldSkipQqqRiskStopSim(t, input.stopSimId)) {
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

function toSymbolMetrics(
  symbol: string,
  slice: { sliceId: ForwardQqqRiskSliceId; labelJa: string },
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardQqqRiskSymbolMetrics {
  const phase = buildWalkForward31PhaseMetrics(
    `${symbol} ${slice.labelJa}`,
    fromDate,
    toDate,
    trades,
  );
  return {
    symbol,
    sliceId: slice.sliceId,
    sliceLabelJa: slice.labelJa,
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

function gradeRank(rank: number): string {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

export function buildQqqIntrinsicRiskReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardQqqIntrinsicRiskAuditReport | null {
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

  const symbolSliceRows: ForwardQqqRiskSymbolMetrics[] = [];
  for (const sym of SYMBOLS) {
    const symTrades = baselineExecuted.filter((t) => t.symbol === sym);
    for (const slice of QQQ_RISK_SLICE_DEFS) {
      symbolSliceRows.push(
        toSymbolMetrics(
          sym,
          slice,
          symTrades.filter((t) => matchesRiskSlice(t, slice.sliceId)),
          fromDate,
          toDate,
          symbols,
        ),
      );
    }
  }

  const lossRanking: ForwardQqqRiskLossRow[] = [...baselineExecuted]
    .filter((t) => t.returnPct < 0)
    .sort((a, b) => a.returnPct - b.returnPct)
    .slice(0, 20)
    .map((t, i) => ({
      rank: i + 1,
      signalDate: t.signalDate,
      entryDate: t.entryDate,
      symbol: t.symbol,
      returnPct: t.returnPct,
      vixAtSignal: t.vixAtSignal,
      sliceHike03Ja:
        classifyRatePhase(t.signalDate) === 'hike_0_3m' ? '該当' : '—',
      isVix2426: isVix24_26(t.vixAtSignal),
    }));

  const baselineMetrics = toSymbolMetrics(
    'ALL',
    { sliceId: 'all', labelJa: '現行' },
    baselineExecuted,
    fromDate,
    toDate,
    symbols,
  );

  const stopSimRows = QQQ_RISK_STOP_SIM_DEFS.map((def) => {
    const { executed, skippedCount } = simulateQqqRiskStopPolicy({
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
        phase.cumulativeReturnPct - baselineMetrics.cumulativeReturnPct,
      ),
      maxDrawdownDeltaVsBaselinePt: round3(
        (phase.maxDrawdownPct ?? 0) - (baselineMetrics.maxDrawdownPct ?? 0),
      ),
    };
  });

  const coreSlice = symbolSliceRows.filter((r) => r.sliceId === 'hike_vix2426');
  const qqqCore = coreSlice.find((r) => r.symbol === 'QQQ')!;
  const othersCore = coreSlice.filter((r) => r.symbol !== 'QQQ');
  const onlyQqqNegativeInCore =
    qqqCore.tradeCount > 0 &&
    qqqCore.cumulativeReturnPct < 0 &&
    othersCore.every((r) => r.tradeCount === 0 || r.cumulativeReturnPct >= 0);

  const hike03All = symbolSliceRows.filter((r) => r.sliceId === 'hike_0_3m');
  const qqqHike03 = hike03All.find((r) => r.symbol === 'QQQ')!;

  const topLoss = lossRanking[0];
  const qqqLossShare = lossRanking.filter((r) => r.symbol === 'QQQ').length;

  const qqqOnlyDangerJa = onlyQqqNegativeInCore
    ? `核心帯（利上げ0〜3か月×VIX24〜26）で累積マイナスはQQQのみ（${qqqCore.tradeCount}件${qqqCore.cumulativeReturnPct}%）。他銘柄は同帯でプラスまたは0件。`
    : `核心帯でQQQ以外にも弱い銘柄あり。要銘柄別監視。`;

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

  const answerAJa = `A 最大DD原因: ${topLoss?.symbol ?? '—'} ${topLoss?.returnPct ?? '—'}%（${topLoss?.signalDate ?? '—'} · 利上げ0〜3か月${topLoss?.sliceHike03Ja === '該当' ? '' : '外'} · VIX24〜26${topLoss?.isVix2426 ? '' : '外'}）。損失TOP20の${qqqLossShare}件がQQQ。${qqqOnlyDangerJa} — 評価A`;
  const answerBJa = `B 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · Δ${profitMax.cumulativeDeltaVsBaselinePt}pt）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · ΔDD${ddMin.maxDrawdownDeltaVsBaselinePt}pt）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerDJa = `D Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerEJa = `E 2026監視: QQQ · 利上げ開始後3か月 · VIX24〜26（核心${qqqCore.tradeCount}件）— HDV/DGRO/SCHDは継続可 — ルール変更なし — 評価B`;

  const operationalNoteJa = [
    `QQQ全期間${symbolSliceRows.find((r) => r.symbol === 'QQQ' && r.sliceId === 'all')?.cumulativeReturnPct ?? '—'}%`,
    `QQQ利上げ0〜3か月${qqqHike03.cumulativeReturnPct}%`,
    qqqOnlyDangerJa,
    'ルール変更なし',
  ].join(' · ');

  const humanSummaryJa = [
    `監査48 QQQ固有リスク ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    qqqOnlyDangerJa,
    answerBJa,
    operationalNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    symbolSliceRows,
    lossRanking,
    stopSimRows,
    qqqOnlyDangerJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runQqqIntrinsicRiskAudit(): Promise<ForwardQqqIntrinsicRiskAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildQqqIntrinsicRiskReport({ bundle });
}

export function formatQqqIntrinsicRiskCsv(
  report: ForwardQqqIntrinsicRiskAuditReport,
): string {
  const lines = [
    `# 最重要監査その48 QQQ固有リスク ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,symbol,sliceId,sliceLabel,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    ...report.symbolSliceRows.map((r) =>
      [
        'symbol_slice',
        r.symbol,
        r.sliceId,
        `"${r.sliceLabelJa.replace(/"/g, '""')}"`,
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
    'section,rank,signalDate,entryDate,symbol,returnPct,vix,hike03,vix2426',
    ...report.lossRanking.map((r) =>
      [
        'loss',
        r.rank,
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.sliceHike03Ja,
        r.isVix2426 ? 1 : 0,
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
    ['qqq_only', report.qqqOnlyDangerJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
