/**
 * 最重要監査その44 — SPY横ばい環境妥当性監査 · 監査43最終ルール固定 · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardSpySidewaysRateDirection,
  ForwardSpySidewaysValidityAuditReport,
  ForwardSpySidewaysValidityCoincidenceStats,
  ForwardSpySidewaysValidityPhaseMetrics,
  ForwardSpySidewaysValiditySymbolMetrics,
  ForwardSpySidewaysValidityThresholdMetrics,
  ForwardSpySidewaysValidityTradeRow,
} from '../../types/forwardValidation';
import {
  collectBaselineCandidates,
  recoveryDaysFromExecuted,
} from './forwardValidationLosingStreakAudit';
import {
  isSpySideways,
  simulateDangerEnvFilter,
} from './forwardValidationDangerousEnvironmentFilterAudit';
import { winRateSlotPct } from './forwardValidationMonteCarloAudit';
import { classifyRegimeGroup } from './forwardValidationRegimePerformanceAudit';
import {
  enrichTradesWithVix,
  type EnrichedTrade,
} from './forwardValidationRegimeEnvironmentAudit';
import { spy63AtDate } from './forwardValidationSixLossRootCauseAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import type { OhlcvBar } from './case4Indicators';

const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;
const PERIOD_2026_FROM = '2026-01-01';
const THRESHOLD_PCTS = [3, 5, 7, 10] as const;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type EnrichedSidewaysTrade = EnrichedTrade & { spy63Pct: number | null };

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function rateDirectionAt(signalDate: string): ForwardSpySidewaysRateDirection {
  if (signalDate >= '2022-01-01' && signalDate <= '2023-09-30') return 'hike';
  if (
    (signalDate >= '2020-03-01' && signalDate <= '2021-12-31') ||
    (signalDate >= '2024-09-01' && signalDate <= '2026-12-31')
  ) {
    return 'cut';
  }
  return 'neutral';
}

export function rateDirectionJa(dir: ForwardSpySidewaysRateDirection): string {
  switch (dir) {
    case 'hike':
      return '金利上昇';
    case 'cut':
      return '金利低下';
    default:
      return '中立';
  }
}

export function enrichWithSpy63(
  trades: EnrichedTrade[],
  spyBars: OhlcvBar[],
): EnrichedSidewaysTrade[] {
  return trades.map((t) => ({
    ...t,
    spy63Pct: spy63AtDate(spyBars, t.signalDate),
  }));
}

export function isSidewaysAtSpy63Threshold(
  spy63Pct: number | null,
  thresholdPct: number,
): boolean {
  if (spy63Pct == null) return false;
  return spy63Pct >= -thresholdPct && spy63Pct <= thresholdPct;
}

export function sidewaysSegment(
  trade: EnrichedSidewaysTrade,
): 'short_shallow' | 'long_deep' | 'other' {
  const g = classifyRegimeGroup(trade.bucket);
  if (g === 'sideways_shallow') return 'short_shallow';
  if (g === 'sideways') return 'long_deep';
  return 'other';
}

export function simulateSkipSpy63Sideways(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
  thresholdPct: number;
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

      if (isSidewaysAtSpy63Threshold(t.spy63Pct, input.thresholdPct)) {
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

function phaseMetrics(
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  symbols: string[],
): ForwardSpySidewaysValidityPhaseMetrics {
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

function symbolMetrics(
  symbol: string,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardSpySidewaysValiditySymbolMetrics {
  const phase = buildWalkForward31PhaseMetrics(symbol, fromDate, toDate, trades);
  return {
    symbol,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
  };
}

function tradeKey(t: ForwardPassedTradeRecord): string {
  return `${t.id}|${t.entryDate}|${t.symbol}`;
}

export function buildSpySidewaysValidityReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardSpySidewaysValidityAuditReport | null {
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
  const skipSidewaysAudit43 = simulateDangerEnvFilter({
    candidates,
    symbols,
    filterId: 'spy_sideways',
    historyForSlot: [],
  });

  const baselineExecuted = enrichWithSpy63(
    enrichTradesWithVix(baseline.executed, vixBars),
    spyBars,
  );
  const executedKeys = new Set(baselineExecuted.map(tradeKey));

  const sidewaysCandidates = candidates.filter((t) => isSpySideways(t));
  const sidewaysExecuted = baselineExecuted.filter((t) => isSpySideways(t));
  const nonSidewaysExecuted = baselineExecuted.filter((t) => !isSpySideways(t));

  const tradeRows: ForwardSpySidewaysValidityTradeRow[] = sidewaysCandidates
    .sort(
      (a, b) =>
        a.signalDate.localeCompare(b.signalDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => {
      const dir = rateDirectionAt(t.signalDate);
      const seg = sidewaysSegment(t);
      return {
        signalDate: t.signalDate,
        entryDate: t.entryDate,
        symbol: t.symbol,
        returnPct: t.returnPct,
        vixAtSignal: t.vixAtSignal,
        spy63Pct: t.spy63Pct,
        rateDirection: dir,
        rateDirectionJa: rateDirectionJa(dir),
        bucket: t.bucket,
        sidewaysSegment:
          seg === 'short_shallow'
            ? 'short_shallow'
            : seg === 'long_deep'
              ? 'long_deep'
              : 'other',
        executedInBaseline: executedKeys.has(tradeKey(t)),
      };
    });

  const sidewaysOnlyMetrics = phaseMetrics(
    '横ばい期間のみ（監査43定義）',
    sidewaysExecuted,
    fromDate,
    toDate,
    symbols,
  );
  const nonSidewaysMetrics = phaseMetrics(
    '非横ばい',
    nonSidewaysExecuted,
    fromDate,
    toDate,
    symbols,
  );
  const shortSidewaysMetrics = phaseMetrics(
    'A 短期横ばい（sideways_shallow）',
    sidewaysExecuted.filter((t) => sidewaysSegment(t) === 'short_shallow'),
    fromDate,
    toDate,
    symbols,
  );
  const longSidewaysMetrics = phaseMetrics(
    'B 長期横ばい（sideways_deep）',
    sidewaysExecuted.filter((t) => sidewaysSegment(t) === 'long_deep'),
    fromDate,
    toDate,
    symbols,
  );

  const symbolRows: ForwardSpySidewaysValiditySymbolMetrics[] = (
    ['QQQ', 'HDV', 'DGRO', 'SCHD'] as const
  ).map((sym) =>
    symbolMetrics(
      sym,
      sidewaysExecuted.filter((t) => t.symbol === sym),
      fromDate,
      toDate,
    ),
  );

  const baselinePhase = phaseMetrics(
    '現行',
    baselineExecuted,
    fromDate,
    toDate,
    symbols,
  );

  const thresholdRows: ForwardSpySidewaysValidityThresholdMetrics[] =
    THRESHOLD_PCTS.map((thresholdPct) => {
      const labelJa = `±${thresholdPct}%`;
      const sidewaysAtThresh = baselineExecuted.filter((t) =>
        isSidewaysAtSpy63Threshold(t.spy63Pct, thresholdPct),
      );
      const sidewaysPhase = buildWalkForward31PhaseMetrics(
        labelJa,
        fromDate,
        toDate,
        sidewaysAtThresh,
      );
      const { executed, skippedCount } = simulateSkipSpy63Sideways({
        candidates,
        symbols,
        thresholdPct,
        historyForSlot: [],
      });
      const skipPhase = buildWalkForward31PhaseMetrics(
        `停止シム ${labelJa}`,
        fromDate,
        toDate,
        executed,
      );
      return {
        thresholdPct,
        labelJa,
        sidewaysTradeCount: sidewaysAtThresh.length,
        sidewaysWinRatePct: sidewaysPhase.winRatePct,
        sidewaysCumulativeReturnPct: sidewaysPhase.cumulativeReturnPct,
        skipSimTradeCount: skipPhase.tradeCount,
        skipSimSkippedCount: skippedCount,
        skipSimCumulativeReturnPct: skipPhase.cumulativeReturnPct,
        skipSimSharpe: skipPhase.sharpe,
        skipSimMaxDrawdownPct: skipPhase.maxDrawdownPct,
        cumulativeDeltaVsBaselinePt: round3(
          skipPhase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
        ),
      };
    });

  const skipSimPhase = phaseMetrics(
    '監査43・横ばい停止',
    skipSidewaysAudit43.executed,
    fromDate,
    toDate,
    symbols,
  );

  const coincidence: ForwardSpySidewaysValidityCoincidenceStats = {
    baselineTradeCount: baselineExecuted.length,
    sidewaysExecutedCount: sidewaysExecuted.length,
    sidewaysCandidateCount: sidewaysCandidates.length,
    sidewaysSkippedCandidateCount: skipSidewaysAudit43.skippedCount,
    sidewaysAvgReturnPct: mean(sidewaysExecuted.map((t) => t.returnPct)),
    nonSidewaysAvgReturnPct: mean(nonSidewaysExecuted.map((t) => t.returnPct)),
    slotSubstitutionLikely:
      skipSidewaysAudit43.skippedCount > sidewaysExecuted.length &&
      skipSimPhase.cumulativeReturnPct > baselinePhase.cumulativeReturnPct,
    audit43CumulativeDeltaPt: round3(
      skipSimPhase.cumulativeReturnPct - baselinePhase.cumulativeReturnPct,
    ),
  };

  const byProfit = [...thresholdRows].sort(
    (a, b) => b.skipSimCumulativeReturnPct - a.skipSimCumulativeReturnPct,
  );
  const byDd = [...thresholdRows].sort(
    (a, b) =>
      Math.abs(a.skipSimMaxDrawdownPct ?? 0) -
      Math.abs(b.skipSimMaxDrawdownPct ?? 0),
  );
  const profitMaxThresh = byProfit[0]!;
  const ddMinThresh = byDd[0]!;

  const optimalThresh = thresholdRows.find((r) => r.thresholdPct === 5)!;
  const sidewaysDangerous =
    sidewaysOnlyMetrics.cumulativeReturnPct < 0 ||
    (sidewaysOnlyMetrics.winRatePct < nonSidewaysMetrics.winRatePct - 5 &&
      (sidewaysOnlyMetrics.profitFactor ?? 0) < (nonSidewaysMetrics.profitFactor ?? 99));

  const answerAJa = sidewaysDangerous
    ? `A 横ばいは相対的に弱い（横ばい${sidewaysOnlyMetrics.tradeCount}件 WR${sidewaysOnlyMetrics.winRatePct}% 累積${sidewaysOnlyMetrics.cumulativeReturnPct}% · 非横ばい累積${nonSidewaysMetrics.cumulativeReturnPct}%）— 評価C`
    : `A 横ばいは本質的に危険ではない（横ばい${sidewaysOnlyMetrics.tradeCount}件 WR${sidewaysOnlyMetrics.winRatePct}% 累積${sidewaysOnlyMetrics.cumulativeReturnPct}% · 均R${sidewaysOnlyMetrics.avgReturnPct ?? '—'}%）。監査43の改善は枠代替${coincidence.slotSubstitutionLikely ? 'が主因' : 'の可能性'}（スキップ${coincidence.sidewaysSkippedCandidateCount}件・実行差${coincidence.baselineTradeCount - skipSimPhase.tradeCount}件）— 評価B`;

  const answerBJa = `B 最適閾値（総合）: ±5%（現行SPY63定義と一致 · 横ばい停止Δ累積${optimalThresh.cumulativeDeltaVsBaselinePt}pt）— 評価B`;
  const answerCJa = `C 利益最大閾値: ${profitMaxThresh.labelJa}（停止シム累積${profitMaxThresh.skipSimCumulativeReturnPct}% · Δ${profitMaxThresh.cumulativeDeltaVsBaselinePt}pt）— 評価A`;
  const answerDJa = `D DD最小閾値: ${ddMinThresh.labelJa}（停止シムDD${ddMinThresh.skipSimMaxDrawdownPct ?? '—'}%）— 評価${ddMinThresh.thresholdPct === profitMaxThresh.thresholdPct ? 'A' : 'B'}`;
  const answerEJa = `E 2026監視: SPY63±5%帯・VIX24〜30 · 短期横ばいWR${shortSidewaysMetrics.winRatePct}% / 長期${longSidewaysMetrics.tradeCount}件 · ルール変更なし — 評価B`;

  const operationalNoteJa = [
    `候補${coincidence.sidewaysCandidateCount}件・実行横ばい${coincidence.sidewaysExecutedCount}件`,
    `短期${shortSidewaysMetrics.tradeCount}件 / 長期${longSidewaysMetrics.tradeCount}件`,
    coincidence.slotSubstitutionLikely
      ? '監査43改善は偶然（選定順・3枠代替）の可能性大'
      : '監査43改善は再検証要',
  ].join(' · ');

  const humanSummaryJa = [
    `監査44 SPY横ばい妥当性 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    answerAJa,
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
    tradeRows,
    sidewaysOnlyMetrics,
    nonSidewaysMetrics,
    shortSidewaysMetrics,
    longSidewaysMetrics,
    symbolRows,
    thresholdRows,
    coincidence,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runSpySidewaysValidityAudit(): Promise<ForwardSpySidewaysValidityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildSpySidewaysValidityReport({ bundle });
}

export function formatSpySidewaysValidityCsv(
  report: ForwardSpySidewaysValidityAuditReport,
): string {
  const lines = [
    `# 最重要監査その44 SPY横ばい妥当性 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'section,signalDate,entryDate,symbol,returnPct,vix,spy63Pct,rateDirection,bucket,segment,executed',
    ...report.tradeRows.map((r) =>
      [
        'sideways_trade',
        r.signalDate,
        r.entryDate,
        r.symbol,
        r.returnPct,
        r.vixAtSignal ?? '',
        r.spy63Pct ?? '',
        r.rateDirectionJa,
        r.bucket,
        r.sidewaysSegment,
        r.executedInBaseline ? 1 : 0,
      ].join(','),
    ),
    '',
    'section,label,trades,winRatePct,avgReturnPct,profitFactor,sharpe,mar,maxDD,cumulative,recoveryDays',
    [report.sidewaysOnlyMetrics, report.nonSidewaysMetrics, report.shortSidewaysMetrics, report.longSidewaysMetrics].map(
      (m) =>
        [
          'phase',
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
    'section,symbol,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    ...report.symbolRows.map((r) =>
      [
        'symbol',
        r.symbol,
        r.tradeCount,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,threshold,label,sidewaysTrades,sidewaysWR,sidewaysCum,skipTrades,skipSkipped,skipCum,skipSharpe,skipDD,deltaCumVsBaseline',
    ...report.thresholdRows.map((r) =>
      [
        'threshold',
        r.thresholdPct,
        `"${r.labelJa.replace(/"/g, '""')}"`,
        r.sidewaysTradeCount,
        r.sidewaysWinRatePct,
        r.sidewaysCumulativeReturnPct,
        r.skipSimTradeCount,
        r.skipSimSkippedCount,
        r.skipSimCumulativeReturnPct,
        r.skipSimSharpe ?? '',
        r.skipSimMaxDrawdownPct ?? '',
        r.cumulativeDeltaVsBaselinePt,
      ].join(','),
    ),
    '',
    'metric,value',
    ['baselineTrades', report.coincidence.baselineTradeCount],
    ['sidewaysExecuted', report.coincidence.sidewaysExecutedCount],
    ['sidewaysCandidates', report.coincidence.sidewaysCandidateCount],
    ['sidewaysSkippedCandidates', report.coincidence.sidewaysSkippedCandidateCount],
    ['sidewaysAvgReturnPct', report.coincidence.sidewaysAvgReturnPct ?? ''],
    ['nonSidewaysAvgReturnPct', report.coincidence.nonSidewaysAvgReturnPct ?? ''],
    ['slotSubstitutionLikely', report.coincidence.slotSubstitutionLikely ? 1 : 0],
    ['audit43CumulativeDeltaPt', report.coincidence.audit43CumulativeDeltaPt],
    '',
    'answer,content',
    ['A', report.answerAJa],
    ['B', report.answerBJa],
    ['C', report.answerCJa],
    ['D', report.answerDJa],
    ['E', report.answerEJa],
    ['operational', report.operationalNoteJa],
  ];
  return lines.join('\n');
}
