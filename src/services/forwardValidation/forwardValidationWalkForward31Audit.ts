/**
 * 最重要監査その31 — ウォークフォワード検証 · 監査30最終推奨ルール · 監査のみ
 */
import { FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardPassedTradeRecord,
  ForwardWalkForward31AuditReport,
  ForwardWalkForward31FoldRow,
  ForwardWalkForward31Grade,
  ForwardWalkForward31PhaseMetrics,
} from '../../types/forwardValidation';
import {
  buildTradesFromTemplate,
  fetchRobustnessAuditBundle,
  precomputeTradeTemplates,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  simulateOperationalWinRate,
  symbolWinRatesBeforeUniverse,
} from './forwardValidationEtfUniverseAudit';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const ADX_MIN = 20;
const VIX_THRESHOLD = 24;
const TAKE_PROFIT_PCT = 4;
const MAX_HOLD_DAYS = 25;
const CASH_RESERVE_PCT = 15;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

export const WALK_FORWARD_31_FOLDS = [
  { foldId: 1, trainFrom: '2018-01-01', trainTo: '2020-12-31', testYear: '2021' },
  { foldId: 2, trainFrom: '2018-01-01', trainTo: '2021-12-31', testYear: '2022' },
  { foldId: 3, trainFrom: '2018-01-01', trainTo: '2022-12-31', testYear: '2023' },
  { foldId: 4, trainFrom: '2018-01-01', trainTo: '2023-12-31', testYear: '2024' },
  { foldId: 5, trainFrom: '2018-01-01', trainTo: '2024-12-31', testYear: '2025' },
  { foldId: 6, trainFrom: '2018-01-01', trainTo: '2025-12-31', testYear: '2026' },
] as const;

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function yearBounds(year: string, auditEnd: string): { from: string; to: string } {
  const from = `${year}-01-01`;
  const yearEnd = year === '2026' ? auditEnd : `${year}-12-31`;
  const to = yearEnd <= auditEnd ? yearEnd : auditEnd;
  return { from, to };
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

function tradeSharpe(returns: number[], years: number): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3((mu / sigma) * Math.sqrt(Math.max(returns.length / years, 1)));
}

export function dedupOneEtfPerDayWinRateWithHistory(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
  seedHistory: ForwardPassedTradeRecord[],
): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const dates = [...byDate.keys()].sort();
  const out: ForwardPassedTradeRecord[] = [];
  const rollingHistory = [...seedHistory];
  for (const date of dates) {
    const rows = byDate.get(date)!;
    const wr = symbolWinRatesBeforeUniverse(rollingHistory, date, universeSymbols);
    const best = [...rows].sort((a, b) => {
      const diff = (wr[b.symbol] ?? 0.5) - (wr[a.symbol] ?? 0.5);
      if (Math.abs(diff) > 1e-9) return diff;
      return a.symbol.localeCompare(b.symbol);
    })[0]!;
    out.push(best);
    rollingHistory.push(best);
  }
  return out;
}

export function simulateOperationalWinRateWithSeed(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
  seedHistory: ForwardPassedTradeRecord[],
): ForwardPassedTradeRecord[] {
  const candidates = dedupOneEtfPerDayWinRateWithHistory(trades, universeSymbols, seedHistory);
  const sorted = [...candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  const open: ForwardPassedTradeRecord[] = [];
  const executed: ForwardPassedTradeRecord[] = [];

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    if (open.length >= FORWARD_MAX_CONCURRENT) continue;
    open.push(t);
    executed.push(t);
  }

  return executed;
}

export function collectRecommendedRuleCandidates(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const templates = precomputeTradeTemplates({ bundle, symbols, fromDate, toDate });
  return buildTradesFromTemplate(
    templates,
    ADX_MIN,
    VIX_THRESHOLD,
    TAKE_PROFIT_PCT,
    MAX_HOLD_DAYS,
  );
}

export function buildWalkForward31PhaseMetrics(
  labelJa: string,
  fromDate: string,
  toDate: string,
  trades: ForwardPassedTradeRecord[],
): ForwardWalkForward31PhaseMetrics {
  const wins = trades.filter((t) => t.returnPct > 0);
  const returns = trades.map((t) => t.returnPct);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const cumulativeReturnPct = round3(returns.reduce((s, r) => s + r, 0) * deployableScale);
  const maxDrawdownPct = portfolioMaxDrawdownPct(
    exitOrderedReturns(trades).map((r) => r * deployableScale),
  );
  const years = calendarYears(fromDate, toDate);
  const cagr =
    cumulativeReturnPct > -100
      ? round3((Math.pow(1 + cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;
  const mar =
    cagr != null && maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cagr / Math.abs(maxDrawdownPct))
      : null;

  return {
    labelJa,
    fromDate,
    toDate,
    tradeCount: trades.length,
    winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
    avgReturnPct: mean(returns),
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    maxDrawdownPct,
    cumulativeReturnPct,
    mar,
  };
}

export function isCollapsedTestPhase(
  train: ForwardWalkForward31PhaseMetrics,
  test: ForwardWalkForward31PhaseMetrics,
): boolean {
  if (test.tradeCount === 0) return false;
  if (test.cumulativeReturnPct < 0) return true;
  if (test.winRatePct < 75) return true;
  if (test.tradeCount >= 3 && test.cumulativeReturnPct < 3) return true;
  return false;
}

export function buildWalkForward31Fold(
  fold: (typeof WALK_FORWARD_31_FOLDS)[number],
  allCandidates: ForwardPassedTradeRecord[],
  symbols: string[],
  auditEnd: string,
): ForwardWalkForward31FoldRow {
  const { from: testFrom, to: testTo } = yearBounds(fold.testYear, auditEnd);
  const executedThroughTest = simulateOperationalWinRateWithSeed(
    allCandidates.filter((t) => t.signalDate <= testTo),
    symbols,
    [],
  );

  const trainTrades = tradesInSignalRange(executedThroughTest, fold.trainFrom, fold.trainTo);
  const testTrades = tradesInSignalRange(executedThroughTest, testFrom, testTo);

  const train = buildWalkForward31PhaseMetrics(
    `学習 ${fold.trainFrom.slice(0, 4)}-${fold.trainTo.slice(0, 4)}`,
    fold.trainFrom,
    fold.trainTo,
    trainTrades,
  );
  const test = buildWalkForward31PhaseMetrics(
    `検証 ${fold.testYear}`,
    testFrom,
    testTo,
    testTrades,
  );

  const hasTest = test.tradeCount > 0;

  return {
    foldId: fold.foldId,
    trainFrom: fold.trainFrom,
    trainTo: fold.trainTo,
    testYear: fold.testYear,
    testFrom,
    testTo,
    train,
    test,
    winRateDegradationPct: hasTest ? degradationPct(train.winRatePct, test.winRatePct) : null,
    avgReturnDegradationPct: hasTest ? degradationPct(train.avgReturnPct, test.avgReturnPct) : null,
    cumulativeDegradationPct: hasTest
      ? degradationPct(train.cumulativeReturnPct, test.cumulativeReturnPct)
      : null,
    collapsed: hasTest && isCollapsedTestPhase(train, test),
  };
}

export function gradeWalkForward31(input: {
  folds: ForwardWalkForward31FoldRow[];
  aggregateTest: ForwardWalkForward31PhaseMetrics;
  avgWinRateDegradationPct: number | null;
  avgCumulativeDegradationPct: number | null;
  collapsedYears: string[];
}): { grade: ForwardWalkForward31Grade; gradeJa: string; operational2026Ja: string } {
  const { folds, aggregateTest, avgWinRateDegradationPct, avgCumulativeDegradationPct, collapsedYears } =
    input;
  const withTest = folds.filter((f) => f.test.tradeCount > 0);
  const positiveTestYears = withTest.filter((f) => f.test.cumulativeReturnPct > 0).length;
  const wrOkYears = withTest.filter((f) => f.test.winRatePct >= 85).length;

  const fold2026 = folds.find((f) => f.testYear === '2026');
  const operational2026Ja =
    fold2026 && fold2026.test.tradeCount > 0
      ? `2026検証: ${fold2026.test.tradeCount}件 · WR${fold2026.test.winRatePct}% · 累積${fold2026.test.cumulativeReturnPct}%`
      : '2026検証: 実行トレードなし（データ不足）';

  if (
    collapsedYears.length === 0 &&
    aggregateTest.winRatePct >= 88 &&
    aggregateTest.cumulativeReturnPct > 0 &&
    (avgWinRateDegradationPct == null || avgWinRateDegradationPct <= 8) &&
    (avgCumulativeDegradationPct == null || avgCumulativeDegradationPct <= 15) &&
    wrOkYears >= withTest.length - 1
  ) {
    return {
      grade: 'A',
      gradeJa:
        `A（非常に頑健）: OOS累積${aggregateTest.cumulativeReturnPct}% · WR${aggregateTest.winRatePct}% · ` +
        `崩壊年なし · 平均勝率劣化${avgWinRateDegradationPct ?? '—'}%。`,
      operational2026Ja,
    };
  }

  if (
    collapsedYears.length <= 1 &&
    aggregateTest.cumulativeReturnPct > 0 &&
    aggregateTest.winRatePct >= 80 &&
    positiveTestYears >= Math.max(1, withTest.length - 1)
  ) {
    return {
      grade: 'B',
      gradeJa:
        `B（頑健）: OOS累積${aggregateTest.cumulativeReturnPct}% · WR${aggregateTest.winRatePct}% · ` +
        `崩壊年${collapsedYears.length} · 平均累積劣化${avgCumulativeDegradationPct ?? '—'}%。2026以降運用許容。`,
      operational2026Ja,
    };
  }

  if (
    collapsedYears.length >= 3 ||
    aggregateTest.cumulativeReturnPct < 0 ||
    aggregateTest.winRatePct < 70
  ) {
    return {
      grade: 'D',
      gradeJa:
        `D（実運用非推奨）: OOS累積${aggregateTest.cumulativeReturnPct}% · WR${aggregateTest.winRatePct}% · ` +
        `崩壊年${collapsedYears.join(',') || '—'}。`,
      operational2026Ja,
    };
  }

  return {
    grade: 'C',
    gradeJa:
      `C（要注意）: OOS累積${aggregateTest.cumulativeReturnPct}% · WR${aggregateTest.winRatePct}% · ` +
      `崩壊年${collapsedYears.join(',') || 'なし'} · 平均勝率劣化${avgWinRateDegradationPct ?? '—'}%。`,
    operational2026Ja,
  };
}

function formatPhaseLine(m: ForwardWalkForward31PhaseMetrics): string {
  return (
    `${m.tradeCount}件 · WR${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · PF${m.profitFactor ?? '—'} · ` +
    `Sharpe${m.sharpe ?? '—'} · DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`
  );
}

export function auditWalkForward31(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardWalkForward31AuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );

  const allCandidates = collectRecommendedRuleCandidates(
    input.bundle,
    symbols,
    fromDate,
    toDate,
  );
  const fullExecuted = simulateOperationalWinRate(allCandidates, symbols).executed;

  const folds = WALK_FORWARD_31_FOLDS.map((fold) =>
    buildWalkForward31Fold(fold, allCandidates, symbols, toDate),
  );

  const aggregateTestTrades = tradesInSignalRange(fullExecuted, '2021-01-01', toDate);
  const aggregateTest = buildWalkForward31PhaseMetrics(
    'OOS統合（2021〜）',
    '2021-01-01',
    toDate,
    aggregateTestTrades,
  );

  const foldsWithTest = folds.filter((f) => f.test.tradeCount > 0);
  const avgWinRateDegradationPct = mean(
    foldsWithTest
      .map((f) => f.winRateDegradationPct)
      .filter((v): v is number => v != null),
  );
  const avgCumulativeDegradationPct = mean(
    foldsWithTest
      .map((f) => f.cumulativeDegradationPct)
      .filter((v): v is number => v != null),
  );
  const collapsedYears = foldsWithTest.filter((f) => f.collapsed).map((f) => f.testYear);

  const overfitVerdictJa =
    avgWinRateDegradationPct != null && avgWinRateDegradationPct > 20
      ? `過剰最適化の疑い: 平均勝率劣化${avgWinRateDegradationPct}% · 学習→検証で性能乖離大。`
      : avgCumulativeDegradationPct != null && avgCumulativeDegradationPct > 30
        ? `過剰最適化の疑い: 平均累積劣化${avgCumulativeDegradationPct}%。`
        : collapsedYears.length === 0
          ? '過剰最適化なし: 全検証年で崩壊なし · 学習/検証乖離は許容範囲。'
          : `軽度の過剰最適化: 崩壊年${collapsedYears.join(' · ')} · 全体OOSは${aggregateTest.cumulativeReturnPct >= 0 ? 'プラス' : 'マイナス'}。`;

  const { grade, gradeJa, operational2026Ja } = gradeWalkForward31({
    folds,
    aggregateTest,
    avgWinRateDegradationPct,
    avgCumulativeDegradationPct,
    collapsedYears,
  });

  const answer1Ja = foldsWithTest
    .map(
      (f) =>
        `${f.testYear}: ${f.test.tradeCount}件 WR${f.test.winRatePct}% 均R${f.test.avgReturnPct ?? '—'}% ` +
        `PF${f.test.profitFactor ?? '—'} Sharpe${f.test.sharpe ?? '—'} DD${f.test.maxDrawdownPct ?? '—'}% 累積${f.test.cumulativeReturnPct}%`,
    )
    .join(' · ');

  const answer2Ja =
    `平均勝率劣化${avgWinRateDegradationPct ?? '—'}% · 平均累積劣化${avgCumulativeDegradationPct ?? '—'}% · ` +
    `平均利益劣化${mean(foldsWithTest.map((f) => f.avgReturnDegradationPct).filter((v): v is number => v != null)) ?? '—'}%。`;

  const answer3Ja = overfitVerdictJa;

  const answer4Ja =
    collapsedYears.length === 0
      ? '未来期間で崩壊した年なし。'
      : `崩壊年: ${collapsedYears.join(' · ')}。`;

  const answer5Ja =
    `OOS統合（2021〜）: ${aggregateTest.tradeCount}件 · WR${aggregateTest.winRatePct}% · ` +
    `累積${aggregateTest.cumulativeReturnPct}% · PF${aggregateTest.profitFactor ?? '—'} · Sharpe${aggregateTest.sharpe ?? '—'} · MAR${aggregateTest.mar ?? '—'}。`;

  const answer6Ja = `${grade}: ${gradeJa}`;

  const answer7Ja =
    grade === 'D'
      ? '2026以降の実運用は非推奨。ルール見直しまたはポジション縮小を推奨。'
      : grade === 'C'
        ? `条件付き可: ${operational2026Ja} · 崩壊年に注意し小ロット開始。`
        : `実運用可: ${operational2026Ja} · OOS累積${aggregateTest.cumulativeReturnPct}%を根拠に継続。`;

  const humanSummaryJa = [
    '【最重要監査その31 · ウォークフォワード検証】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate}`,
    '',
    `【判定 ${grade}】 ${gradeJa}`,
    '',
    ...folds.flatMap((f) => [
      `【${f.foldId}】学習${f.trainFrom.slice(0, 4)}-${f.trainTo.slice(0, 4)} → 検証${f.testYear}`,
      `  学習: ${formatPhaseLine(f.train)}`,
      `  検証: ${formatPhaseLine(f.test)}`,
      `  劣化: WR${f.winRateDegradationPct ?? '—'}% · 累積${f.cumulativeDegradationPct ?? '—'}%${f.collapsed ? ' · 崩壊' : ''}`,
    ]),
    '',
    `OOS統合: ${formatPhaseLine(aggregateTest)}`,
    '',
    answer3Ja,
    answer7Ja,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    etfUniverse: symbols,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    folds,
    aggregateTest,
    avgWinRateDegradationPct,
    avgCumulativeDegradationPct,
    collapsedYears,
    overfitVerdictJa,
    grade,
    gradeJa,
    operational2026Ja,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    answer6Ja,
    answer7Ja,
    humanSummaryJa,
  };
}

export async function runWalkForward31Audit(): Promise<ForwardWalkForward31AuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return auditWalkForward31({ bundle });
}

export function formatWalkForward31Csv(report: ForwardWalkForward31AuditReport): string {
  const lines: string[] = [
    `# 最重要監査その31 WF ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 判定 ${report.grade}`,
    '',
    'foldId,phase,testYear,fromDate,toDate,tradeCount,winRatePct,avgReturnPct,profitFactor,sharpe,maxDD,cumulative,mar',
  ];

  for (const f of report.folds) {
    for (const [phase, m] of [
      ['train', f.train],
      ['test', f.test],
    ] as const) {
      lines.push(
        [
          f.foldId,
          phase,
          f.testYear,
          m.fromDate,
          m.toDate,
          m.tradeCount,
          m.winRatePct,
          m.avgReturnPct ?? '',
          m.profitFactor ?? '',
          m.sharpe ?? '',
          m.maxDrawdownPct ?? '',
          m.cumulativeReturnPct,
          m.mar ?? '',
        ].join(','),
      );
    }
  }

  lines.push('');
  lines.push(
    [
      'aggregate',
      'test',
      '2021+',
      '2021-01-01',
      report.toDate,
      report.aggregateTest.tradeCount,
      report.aggregateTest.winRatePct,
      report.aggregateTest.avgReturnPct ?? '',
      report.aggregateTest.profitFactor ?? '',
      report.aggregateTest.sharpe ?? '',
      report.aggregateTest.maxDrawdownPct ?? '',
      report.aggregateTest.cumulativeReturnPct,
      report.aggregateTest.mar ?? '',
    ].join(','),
  );

  lines.push('');
  lines.push('answer,content');
  lines.push(`1,"${report.answer1Ja.replace(/"/g, '""')}"`);
  lines.push(`2,"${report.answer2Ja.replace(/"/g, '""')}"`);
  lines.push(`3,"${report.answer3Ja.replace(/"/g, '""')}"`);
  lines.push(`4,"${report.answer4Ja.replace(/"/g, '""')}"`);
  lines.push(`5,"${report.answer5Ja.replace(/"/g, '""')}"`);
  lines.push(`6,"${report.answer6Ja.replace(/"/g, '""')}"`);
  lines.push(`7,"${report.answer7Ja.replace(/"/g, '""')}"`);
  lines.push(`grade,"${report.grade}: ${report.gradeJa.replace(/"/g, '""')}"`);

  return lines.join('\n');
}
