/**
 * 最重要監査その43 — 危険環境フィルター監査 · 監査42最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardDangerEnvFilterAdoptionGrade,
  ForwardDangerEnvFilterAuditReport,
  ForwardDangerEnvFilterId,
  ForwardDangerEnvFilterMetrics,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { buildOperationalEquityCurve } from './forwardValidationEquityCurveAudit';
import {
  collectBaselineCandidates,
} from './forwardValidationLosingStreakAudit';
import { extractDrawdownEpisodes } from './forwardValidationMaxDrawdownCauseAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import {
  enrichTradesWithVix,
  type EnrichedTrade,
} from './forwardValidationRegimeEnvironmentAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  buildWalkForward31PhaseMetrics,
} from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const PERIOD_2026_FROM = '2026-01-01';
const CUM_RETENTION_TOLERANCE_PT = 2;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type DangerFilterDef = {
  filterId: ForwardDangerEnvFilterId;
  labelJa: string;
};

export const DANGER_ENV_FILTER_DEFS: DangerFilterDef[] = [
  { filterId: 'current', labelJa: '① 現行' },
  { filterId: 'vix_gte30', labelJa: '② VIX30以上のみ停止' },
  { filterId: 'vix_24_30', labelJa: '③ VIX24〜30のみ停止' },
  { filterId: 'spy_sideways', labelJa: '④ SPY横ばいのみ停止' },
  { filterId: 'rate_hike', labelJa: '⑤ 金利上昇期のみ停止' },
  { filterId: 'vix24_sideways_and', labelJa: '⑥ VIX24〜30 AND SPY横ばい停止' },
  { filterId: 'vix24_rate_and', labelJa: '⑦ VIX24〜30 AND 金利上昇停止' },
  { filterId: 'vix24_sideways_or', labelJa: '⑧ VIX24〜30 OR SPY横ばい停止' },
];

type ActiveLeg = EnrichedTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

export function isSpySideways(trade: EnrichedTrade): boolean {
  const g = classifyRegimeGroup(trade.bucket);
  return g === 'sideways' || g === 'sideways_shallow';
}

export function isRateHikePeriod(signalDate: string): boolean {
  return signalDate >= '2022-01-01' && signalDate <= '2023-09-30';
}

export function isVixBand24To30(trade: EnrichedTrade): boolean {
  return trade.vixAtSignal != null && trade.vixAtSignal >= 24 && trade.vixAtSignal < 30;
}

export function isVixGte30(trade: EnrichedTrade): boolean {
  return trade.vixAtSignal != null && trade.vixAtSignal >= 30;
}

export function shouldSkipEntryForFilter(
  trade: EnrichedTrade,
  filterId: ForwardDangerEnvFilterId,
): boolean {
  if (filterId === 'current') return false;
  const vix24 = isVixBand24To30(trade);
  const sideways = isSpySideways(trade);
  const hike = isRateHikePeriod(trade.signalDate);
  switch (filterId) {
    case 'vix_gte30':
      return isVixGte30(trade);
    case 'vix_24_30':
      return vix24;
    case 'spy_sideways':
      return sideways;
    case 'rate_hike':
      return hike;
    case 'vix24_sideways_and':
      return vix24 && sideways;
    case 'vix24_rate_and':
      return vix24 && hike;
    case 'vix24_sideways_or':
      return vix24 || sideways;
    default:
      return false;
  }
}

export function simulateDangerEnvFilter(input: {
  candidates: EnrichedTrade[];
  symbols: string[];
  filterId: ForwardDangerEnvFilterId;
  historyForSlot: ForwardPassedTradeRecord[];
}): { executed: EnrichedTrade[]; skippedCount: number } {
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
  const executed: EnrichedTrade[] = [];
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

      if (shouldSkipEntryForFilter(t, input.filterId)) {
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

export function recoveryDaysFromExecuted(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
): number | null {
  const { exits } = buildOperationalEquityCurve({
    trades,
    symbols,
    initialCapital: INITIAL_CAPITAL,
  });
  const worst = extractDrawdownEpisodes(exits)[0];
  if (!worst?.recoveryDate) return null;
  return daysBetween(worst.troughDate, worst.recoveryDate);
}

function filterToMetrics(
  def: DangerFilterDef,
  executed: ForwardPassedTradeRecord[],
  skippedCount: number,
  fromDate: string,
  toDate: string,
  symbols: string[],
  currentCum: number,
): ForwardDangerEnvFilterMetrics {
  const phase = buildWalkForward31PhaseMetrics(def.labelJa, fromDate, toDate, executed);
  const profitSharePct =
    currentCum > 0 && phase.cumulativeReturnPct > 0
      ? Math.round((phase.cumulativeReturnPct / currentCum) * 1000) / 10
      : 0;

  return {
    filterId: def.filterId,
    labelJa: def.labelJa,
    tradeCount: phase.tradeCount,
    skippedTradeCount: skippedCount,
    winRatePct: phase.winRatePct,
    avgReturnPct: phase.avgReturnPct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    mar: phase.mar,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    recoveryDays: recoveryDaysFromExecuted(executed, symbols),
    profitSharePct,
    cumulativeDeltaVsCurrentPt: 0,
    maxDrawdownDeltaVsCurrentPt: 0,
  };
}

function gradeRank(rank: number): ForwardDangerEnvFilterAdoptionGrade {
  if (rank === 0) return 'A';
  if (rank === 1) return 'B';
  if (rank <= 2) return 'C';
  return 'D';
}

function pickDdReductionCandidate(
  rows: ForwardDangerEnvFilterMetrics[],
  current: ForwardDangerEnvFilterMetrics,
): ForwardDangerEnvFilterMetrics | null {
  const candidates = rows.filter(
    (r) =>
      r.filterId !== 'current' &&
      r.cumulativeDeltaVsCurrentPt >= -CUM_RETENTION_TOLERANCE_PT &&
      (r.maxDrawdownPct ?? 0) > (current.maxDrawdownPct ?? 0),
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      (b.maxDrawdownDeltaVsCurrentPt ?? 0) - (a.maxDrawdownDeltaVsCurrentPt ?? 0) ||
      b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
}

export function buildDangerEnvFilterReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardDangerEnvFilterAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const vixDataAvailable = vixBars.length > 0;

  const candidates = enrichTradesWithVix(
    collectBaselineCandidates(input.bundle, fromDate, toDate),
    vixBars,
  );

  const filterRows: ForwardDangerEnvFilterMetrics[] = [];
  for (const def of DANGER_ENV_FILTER_DEFS) {
    const { executed, skippedCount } = simulateDangerEnvFilter({
      candidates,
      symbols,
      filterId: def.filterId,
      historyForSlot: [],
    });
    filterRows.push(
      filterToMetrics(def, executed, skippedCount, fromDate, toDate, symbols, 0),
    );
  }

  const currentRow = filterRows.find((r) => r.filterId === 'current')!;
  const currentCum = currentRow.cumulativeReturnPct;
  for (const row of filterRows) {
    row.profitSharePct =
      currentCum > 0 && row.cumulativeReturnPct > 0
        ? Math.round((row.cumulativeReturnPct / currentCum) * 1000) / 10
        : 0;
    row.cumulativeDeltaVsCurrentPt = round3(
      row.cumulativeReturnPct - currentCum,
    );
    row.maxDrawdownDeltaVsCurrentPt = round3(
      (row.maxDrawdownPct ?? 0) - (currentRow.maxDrawdownPct ?? 0),
    );
  }

  const byCum = [...filterRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  );
  const bySharpe = [...filterRows].sort(
    (a, b) => (b.sharpe ?? -999) - (a.sharpe ?? -999),
  );
  const byDd = [...filterRows].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 0) - Math.abs(b.maxDrawdownPct ?? 0),
  );

  const profitMax = byCum[0]!;
  const sharpeMax = bySharpe[0]!;
  const ddMin = byDd[0]!;

  const ddReductionPick = pickDdReductionCandidate(filterRows, currentRow);

  const baselineExecuted = simulateDangerEnvFilter({
    candidates,
    symbols,
    filterId: 'current',
    historyForSlot: [],
  }).executed;

  const since2026 = DANGER_ENV_FILTER_DEFS.map((def) => {
    const { executed } = simulateDangerEnvFilter({
      candidates: candidates.filter((t) => t.signalDate >= PERIOD_2026_FROM),
      symbols,
      filterId: def.filterId,
      historyForSlot: baselineExecuted.filter((t) => t.signalDate < PERIOD_2026_FROM),
    });
    const sliced = tradesInSignalRange(executed, PERIOD_2026_FROM, toDate);
    const phase = buildWalkForward31PhaseMetrics(
      def.labelJa,
      PERIOD_2026_FROM,
      toDate,
      sliced,
    );
    return { def, score: (phase.sharpe ?? 0) * 2 + phase.cumulativeReturnPct };
  }).sort((a, b) => b.score - a.score);
  const rec2026 = since2026[0]!.def;

  const operationalFilterId: ForwardDangerEnvFilterId = 'current';
  const answerAJa = `A 利益最大: ${profitMax.labelJa}（累積${profitMax.cumulativeReturnPct}% · ${profitMax.tradeCount}件 · 利益シェア${profitMax.profitSharePct}%）— 評価${gradeRank(byCum.indexOf(profitMax))}`;
  const answerBJa = `B Sharpe最大: ${sharpeMax.labelJa}（Sharpe${sharpeMax.sharpe ?? '—'} · MAR${sharpeMax.mar ?? '—'}）— 評価${gradeRank(bySharpe.indexOf(sharpeMax))}`;
  const answerCJa = `C DD最小: ${ddMin.labelJa}（DD${ddMin.maxDrawdownPct ?? '—'}% · 回復${ddMin.recoveryDays ?? '—'}日）— 評価${gradeRank(byDd.indexOf(ddMin))}`;
  const answerDJa = `D 実運用推奨: ① 現行（危険環境は監視のみ · エントリー停止ルール変更なし · スキップ${currentRow.skippedTradeCount}件）— 評価B`;
  const answerEJa = `E 2026監視: VIX24〜30帯・SPY横ばい・金利政策転換 · 参考${rec2026.labelJa} — 評価B`;

  const ddReductionConclusionJa = ddReductionPick
    ? `利益ほぼ維持（Δ累積${ddReductionPick.cumulativeDeltaVsCurrentPt}pt）でDD改善が最大: ${ddReductionPick.labelJa}（DD${ddReductionPick.maxDrawdownPct}% · ΔDD${ddReductionPick.maxDrawdownDeltaVsCurrentPt}pt · スキップ${ddReductionPick.skippedTradeCount}件 · 利益シェア${ddReductionPick.profitSharePct}%）。`
    : `現行DD${currentRow.maxDrawdownPct}%のまま、累積-${CUM_RETENTION_TOLERANCE_PT}pt以内でDDを有意に削る案はなし。横ばい/VIX24〜30の監視優先。`;

  const operationalNoteJa = [
    `現行${currentRow.tradeCount}件 · 累積${currentRow.cumulativeReturnPct}% · DD${currentRow.maxDrawdownPct}%`,
    ddReductionConclusionJa,
    vixDataAvailable ? 'VIX系列あり' : 'VIX系列なし（帯フィルタは要再検証）',
  ].join(' ');

  const humanSummaryJa = [
    `監査43 危険環境フィルター ${fromDate}〜${toDate} · 現行${currentRow.tradeCount}件`,
    FIXED_CONDITIONS_JA,
    answerAJa,
    answerCJa,
    answerDJa,
    ddReductionConclusionJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    vixDataAvailable,
    filterRows,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalFilterId,
    operationalGrade: 'B',
    operationalNoteJa,
    ddReductionConclusionJa,
    humanSummaryJa,
  };
}

export async function runDangerEnvFilterAudit(): Promise<ForwardDangerEnvFilterAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildDangerEnvFilterReport({ bundle });
}

export function formatDangerEnvFilterCsv(
  report: ForwardDangerEnvFilterAuditReport,
): string {
  const lines = [
    `# 最重要監査その43 危険環境フィルター ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# vixDataAvailable=${report.vixDataAvailable}`,
    '',
    'filterId,label,trades,skipped,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays,profitSharePct,deltaCumVsCurrent,deltaDDVsCurrent',
    ...report.filterRows.map((r) =>
      [
        r.filterId,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.tradeCount,
        r.skippedTradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.mar ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.recoveryDays ?? '',
        r.profitSharePct,
        r.cumulativeDeltaVsCurrentPt,
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
    ['dd_reduction', report.ddReductionConclusionJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
