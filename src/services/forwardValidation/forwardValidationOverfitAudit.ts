/**
 * 最重要監査その51 — 過学習（オーバーフィット）監査 · 監査50最終ルール固定 · 監査のみ
 *
 * 候補: 利上げ0-3m × QQQ × VIX24-26 停止 vs 現行
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardOverfitAdoptionGrade,
  ForwardOverfitAuditReport,
  ForwardOverfitPeriodId,
  ForwardOverfitPeriodRow,
  ForwardOverfitRuleMetrics,
  ForwardOverfitSimulationSummary,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { simulateDangerEnvFilter } from './forwardValidationDangerousEnvironmentFilterAudit';
import {
  collectBaselineCandidates,
} from './forwardValidationLosingStreakAudit';
import {
  mulberry32,
  percentile,
  shuffleInPlace,
  simulateMonteCarloPath,
  winRateSlotPct,
} from './forwardValidationMonteCarloAudit';
import { enrichTradesWithVix } from './forwardValidationRegimeEnvironmentAudit';
import {
  matchesCoreDanger,
} from './forwardValidationReproducibilityAudit';
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

export const OVERFIT_SIM_RUNS = 1000;
const CASH_RESERVE_PCT = 15;
const INITIAL_CAPITAL = 100;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const CANDIDATE_RULE_JA =
  '候補: 利上げ0-3m × QQQ × VIX24-26 エントリー停止';

export const OVERFIT_PERIOD_DEFS: {
  periodId: ForwardOverfitPeriodId;
  labelJa: string;
  from: string;
  to: string;
}[] = [
  { periodId: 'a_2018_2020', labelJa: 'A 2018〜2020', from: '2018-01-01', to: '2020-12-31' },
  { periodId: 'b_2021_2023', labelJa: 'B 2021〜2023', from: '2021-01-01', to: '2023-12-31' },
  { periodId: 'c_2024_2026', labelJa: 'C 2024〜2026', from: '2024-01-01', to: '2026-12-31' },
];

type ActiveLeg = EnrichedSidewaysTrade & { slotPct: number; notional: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function inPeriod(signalDate: string, from: string, to: string): boolean {
  return signalDate >= from && signalDate <= to;
}

export function shouldSkipCoreDangerCandidate(t: EnrichedSidewaysTrade): boolean {
  return matchesCoreDanger(t);
}

export function simulateCoreDangerStopPolicy(input: {
  candidates: EnrichedSidewaysTrade[];
  symbols: string[];
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
        (o) => o.signalDate === leg.signalDate && o.symbol === leg.symbol,
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

      if (shouldSkipCoreDangerCandidate(t)) {
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
    completed.push(leg);
  }

  return { executed, skippedCount };
}

function toRuleMetrics(
  ruleId: 'current' | 'candidate',
  labelJa: string,
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  coreSkipCount: number,
): ForwardOverfitRuleMetrics {
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  const coreHitCount = trades.filter((t) => matchesCoreDanger(t as EnrichedSidewaysTrade)).length;
  return {
    ruleId,
    labelJa,
    tradeCount: phase.tradeCount,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    coreSkipCount,
    coreHitCount,
  };
}

function buildPeriodRow(
  def: (typeof OVERFIT_PERIOD_DEFS)[number] | {
    periodId: 'full';
    labelJa: string;
    from: string;
    to: string;
  },
  auditEnd: string,
  currentExecuted: EnrichedSidewaysTrade[],
  candidateExecuted: EnrichedSidewaysTrade[],
  allCandidates: EnrichedSidewaysTrade[],
): ForwardOverfitPeriodRow {
  const toDate = def.to <= auditEnd ? def.to : auditEnd;
  const currentTrades = currentExecuted.filter((t) =>
    inPeriod(t.signalDate, def.from, toDate),
  );
  const candidateTrades = candidateExecuted.filter((t) =>
    inPeriod(t.signalDate, def.from, toDate),
  );
  const periodSkips = allCandidates.filter(
    (t) => inPeriod(t.signalDate, def.from, toDate) && matchesCoreDanger(t),
  ).length;

  const current = toRuleMetrics(
    'current',
    '現行',
    currentTrades,
    def.from,
    toDate,
    0,
  );
  const candidate = toRuleMetrics(
    'candidate',
    '候補停止',
    candidateTrades,
    def.from,
    toDate,
    periodSkips,
  );

  return {
    periodId: def.periodId,
    periodLabelJa: def.labelJa,
    fromDate: def.from,
    toDate,
    current,
    candidate,
    deltaCumulativePt: round3(candidate.cumulativeReturnPct - current.cumulativeReturnPct),
    deltaMaxDrawdownPt: round3(
      (candidate.maxDrawdownPct ?? 0) - (current.maxDrawdownPct ?? 0),
    ),
    deltaSharpe:
      candidate.sharpe != null && current.sharpe != null
        ? round3(candidate.sharpe - current.sharpe)
        : null,
    candidateBetter: candidate.cumulativeReturnPct > current.cumulativeReturnPct,
  };
}

function runResampledComparison(
  baselineTrades: ForwardPassedTradeRecord[],
  symbols: string[],
  years: number,
  runs: number,
  mode: 'monte_carlo' | 'bootstrap',
): ForwardOverfitSimulationSummary {
  const deltas: number[] = [];
  let candidateWins = 0;

  for (let i = 0; i < runs; i++) {
    const rand = mulberry32(i + 1);
    let sample: ForwardPassedTradeRecord[];
    if (mode === 'monte_carlo') {
      sample = shuffleInPlace([...baselineTrades], rand);
    } else {
      sample = [];
      for (let j = 0; j < baselineTrades.length; j++) {
        sample.push(baselineTrades[Math.floor(rand() * baselineTrades.length)]!);
      }
    }

    const candidateSample = sample.filter(
      (t) => !matchesCoreDanger(t as EnrichedSidewaysTrade),
    );
    const baseMetrics = simulateMonteCarloPath(sample, symbols, years);
    const candMetrics = simulateMonteCarloPath(candidateSample, symbols, years);
    const delta = round3(candMetrics.cumulativeReturnPct - baseMetrics.cumulativeReturnPct);
    deltas.push(delta);
    if (delta > 0) candidateWins++;
  }

  const sorted = [...deltas].sort((a, b) => a - b);
  const candidateWinRatePct = round3((candidateWins / runs) * 100);

  return {
    runs,
    candidateWinRatePct,
    meanDeltaCumulativePt: mean(deltas) ?? 0,
    medianDeltaCumulativePt: percentile(sorted, 50),
    ci95LowDeltaPt: percentile(sorted, 2.5),
    ci95HighDeltaPt: percentile(sorted, 97.5),
    pValuePct: round3(100 - candidateWinRatePct),
  };
}

export function gradeOverfitAdoption(input: {
  coreExecutedCount: number;
  bootstrap: ForwardOverfitSimulationSummary;
  periodRows: ForwardOverfitPeriodRow[];
}): { grade: ForwardOverfitAdoptionGrade; verdictJa: string } {
  const splitRows = input.periodRows.filter((r) => r.periodId !== 'full');
  const improvedSplits = splitRows.filter((r) => r.candidateBetter).length;
  const bPeriod = splitRows.find((r) => r.periodId === 'b_2021_2023');
  const bCoreHits = bPeriod?.current.coreHitCount ?? 0;

  if (
    input.coreExecutedCount >= 10 &&
    input.bootstrap.candidateWinRatePct >= 95 &&
    input.bootstrap.ci95LowDeltaPt > 0 &&
    improvedSplits >= 2
  ) {
    return {
      grade: 'A',
      verdictJa: 'A評価 · 採用推奨 — 十分なサンプル · 統計的有意 · 複数期間で改善',
    };
  }

  if (
    input.coreExecutedCount >= 5 &&
    input.bootstrap.candidateWinRatePct >= 80 &&
    bCoreHits >= 3 &&
    (bPeriod?.candidateBetter ?? false)
  ) {
    return {
      grade: 'B',
      verdictJa: 'B評価 · 参考監視 — 一部改善あり · サンプル/有意性は限定的',
    };
  }

  return {
    grade: 'C',
    verdictJa: 'C評価 · 採用禁止 — サンプル不足または2022特異クラスター依存 · 過学習リスク高',
  };
}

export function buildOverfitAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  toDate?: string;
  auditedAt?: string;
}): ForwardOverfitAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.toDate ?? input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const vixBars = input.bundle.vixBars ?? [];
  const vixDataAvailable = vixBars.length > 0;
  const years = calendarYears(fromDate, toDate);

  const candidates = enrichWithSpy63(
    enrichTradesWithVix(
      collectBaselineCandidates(input.bundle, fromDate, toDate),
      vixBars,
    ),
    input.bundle.spyBars ?? [],
  );

  const baseline = simulateDangerEnvFilter({
    candidates,
    symbols,
    filterId: 'current',
    historyForSlot: [],
  });
  const candidate = simulateCoreDangerStopPolicy({
    candidates,
    symbols,
    historyForSlot: [],
  });

  const baselineExecuted = enrichWithSpy63(
    enrichTradesWithVix(baseline.executed, vixBars),
    input.bundle.spyBars ?? [],
  );
  const candidateExecuted = enrichWithSpy63(
    enrichTradesWithVix(candidate.executed, vixBars),
    input.bundle.spyBars ?? [],
  );

  const coreCandidateCount = candidates.filter((t) => matchesCoreDanger(t)).length;
  const coreExecutedCount = baselineExecuted.filter((t) => matchesCoreDanger(t)).length;

  const periodRows: ForwardOverfitPeriodRow[] = [
    ...OVERFIT_PERIOD_DEFS.map((def) =>
      buildPeriodRow(def, toDate, baselineExecuted, candidateExecuted, candidates),
    ),
    buildPeriodRow(
      {
        periodId: 'full',
        labelJa: '全期間',
        from: fromDate,
        to: toDate,
      },
      toDate,
      baselineExecuted,
      candidateExecuted,
      candidates,
    ),
  ];

  const orderedBaseline = [...baselineExecuted].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );

  const monteCarlo = runResampledComparison(
    orderedBaseline,
    symbols,
    years,
    OVERFIT_SIM_RUNS,
    'monte_carlo',
  );
  const bootstrap = runResampledComparison(
    orderedBaseline,
    symbols,
    years,
    OVERFIT_SIM_RUNS,
    'bootstrap',
  );

  const { grade, verdictJa } = gradeOverfitAdoption({
    coreExecutedCount,
    bootstrap,
    periodRows,
  });

  const fullRow = periodRows.find((r) => r.periodId === 'full')!;
  const splitRows = periodRows.filter((r) => r.periodId !== 'full');
  const improvedSplits = splitRows.filter((r) => r.candidateBetter).length;
  const bPeriod = splitRows.find((r) => r.periodId === 'b_2021_2023')!;

  const statisticallySignificant =
    bootstrap.candidateWinRatePct >= 95 && bootstrap.ci95LowDeltaPt > 0;

  const answerAJa = statisticallySignificant
    ? `A 統計的有意: はい（Bootstrap勝率${bootstrap.candidateWinRatePct}% · 95%CI下限${bootstrap.ci95LowDeltaPt}pt）— 評価A`
    : `A 統計的有意: いいえ（Bootstrap勝率${bootstrap.candidateWinRatePct}% · 95%CI${bootstrap.ci95LowDeltaPt}〜${bootstrap.ci95HighDeltaPt}pt）— 評価C`;

  const answerBJa = `B 偶然の可能性: ${bootstrap.pValuePct}%（MC勝率${monteCarlo.candidateWinRatePct}% · 核心${coreExecutedCount}件依存）— 評価${bootstrap.pValuePct <= 5 ? 'A' : bootstrap.pValuePct <= 20 ? 'B' : 'C'}`;

  const answerCJa = `C サンプル数: ${coreExecutedCount < 5 ? '不足' : '概ね可'}（候補${coreCandidateCount}件 · 実行${coreExecutedCount}件 · 監査49整合）— 評価${coreExecutedCount >= 10 ? 'A' : coreExecutedCount >= 5 ? 'B' : 'C'}`;

  const answerDJa = `D 過学習リスク: ${improvedSplits <= 1 && bPeriod.candidateBetter ? '高（B期間のみ改善 · 2022特異）' : improvedSplits >= 2 ? '中' : '高'} — 評価${grade === 'A' ? 'A' : grade === 'B' ? 'B' : 'C'}`;

  const adoptLabel =
    grade === 'A' ? '採用可' : grade === 'B' ? '参考監視のみ（不採用）' : '不採用';
  const answerEJa = `E ルール採用: ${adoptLabel} — ${verdictJa}`;

  const operationalNoteJa = [
    `全期間Δ累積${fullRow.deltaCumulativePt}pt · 核心実行${coreExecutedCount}件`,
    `分割改善${improvedSplits}/3 · B期間Δ${bPeriod.deltaCumulativePt}pt`,
    `Bootstrap ${bootstrap.candidateWinRatePct}% · ${verdictJa}`,
  ].join(' · ');

  const humanSummaryJa = [
    `監査51 過学習 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    CANDIDATE_RULE_JA,
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
    candidateRuleJa: CANDIDATE_RULE_JA,
    vixDataAvailable,
    coreCandidateCount,
    coreExecutedCount,
    periodRows,
    monteCarlo,
    bootstrap,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    operationalNoteJa,
    humanSummaryJa,
  };
}

export async function runOverfitAudit(): Promise<ForwardOverfitAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildOverfitAuditReport({ bundle });
}

export function formatOverfitCsv(report: ForwardOverfitAuditReport): string {
  const lines = [
    `# 最重要監査その51 過学習 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.candidateRuleJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,periodId,periodLabel,rule,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative,coreSkip,coreHit',
    ...report.periodRows.flatMap((row) => [
      [
        'period',
        row.periodId,
        `"${row.periodLabelJa}"`,
        'current',
        row.current.tradeCount,
        row.current.winRatePct,
        row.current.profitFactor ?? '',
        row.current.sharpe ?? '',
        row.current.maxDrawdownPct ?? '',
        row.current.cumulativeReturnPct,
        row.current.coreSkipCount,
        row.current.coreHitCount,
      ].join(','),
      [
        'period',
        row.periodId,
        `"${row.periodLabelJa}"`,
        'candidate',
        row.candidate.tradeCount,
        row.candidate.winRatePct,
        row.candidate.profitFactor ?? '',
        row.candidate.sharpe ?? '',
        row.candidate.maxDrawdownPct ?? '',
        row.candidate.cumulativeReturnPct,
        row.candidate.coreSkipCount,
        row.candidate.coreHitCount,
      ].join(','),
      [
        'delta',
        row.periodId,
        `"${row.periodLabelJa}"`,
        'candidate-current',
        '',
        '',
        '',
        row.deltaSharpe ?? '',
        row.deltaMaxDrawdownPt,
        row.deltaCumulativePt,
        '',
        row.candidateBetter ? 1 : 0,
      ].join(','),
    ]),
    '',
    'section,method,runs,candidateWinRatePct,meanDeltaPt,medianDeltaPt,ci95Low,ci95High,pValuePct',
    [
      'simulation',
      'monte_carlo',
      report.monteCarlo.runs,
      report.monteCarlo.candidateWinRatePct,
      report.monteCarlo.meanDeltaCumulativePt,
      report.monteCarlo.medianDeltaCumulativePt,
      report.monteCarlo.ci95LowDeltaPt,
      report.monteCarlo.ci95HighDeltaPt,
      report.monteCarlo.pValuePct,
    ].join(','),
    [
      'simulation',
      'bootstrap',
      report.bootstrap.runs,
      report.bootstrap.candidateWinRatePct,
      report.bootstrap.meanDeltaCumulativePt,
      report.bootstrap.medianDeltaCumulativePt,
      report.bootstrap.ci95LowDeltaPt,
      report.bootstrap.ci95HighDeltaPt,
      report.bootstrap.pValuePct,
    ].join(','),
    '',
    'section,key,value',
    `core,coreCandidateCount,${report.coreCandidateCount}`,
    `core,coreExecutedCount,${report.coreExecutedCount}`,
    `verdict,adoptionGrade,${report.adoptionGrade}`,
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `operational,"${report.operationalNoteJa}"`,
  ];
  return lines.join('\n');
}
