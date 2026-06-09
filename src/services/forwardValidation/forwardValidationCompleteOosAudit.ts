/**
 * 最重要監査その54 — 完全アウトオブサンプル検証 · 監査53最終ルール固定 · 監査のみ
 */
import type {
  ForwardCompleteOosAuditReport,
  ForwardCompleteOosSplitRow,
  ForwardCompleteOosTrustGrade,
  ForwardCompleteOosYearRow,
  ForwardPassedTradeRecord,
  ForwardWalkForward31FoldRow,
  ForwardWalkForward31PhaseMetrics,
} from '../../types/forwardValidation';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import {
  buildWalkForward31Fold,
  buildWalkForward31PhaseMetrics,
  collectRecommendedRuleCandidates,
  simulateOperationalWinRateWithSeed,
  WALK_FORWARD_31_FOLDS,
} from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export const COMPLETE_OOS_SPLIT_DEFS = [
  {
    splitId: 'holdout_a' as const,
    labelJa: 'Holdout A · Train2018-2023 → Test2024-2026',
    trainFrom: '2018-01-01',
    trainTo: '2023-12-31',
    testFrom: '2024-01-01',
    testTo: '2026-12-31',
  },
  {
    splitId: 'holdout_b' as const,
    labelJa: 'Holdout B · Train2018-2022 → Test2023-2026',
    trainFrom: '2018-01-01',
    trainTo: '2022-12-31',
    testFrom: '2023-01-01',
    testTo: '2026-12-31',
  },
] as const;

const OOS_YEARS = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function resolveTestTo(requestedTo: string, auditEnd: string): string {
  return requestedTo <= auditEnd ? requestedTo : auditEnd;
}

function yearBounds(year: string, auditEnd: string): { from: string; to: string } {
  const from = `${year}-01-01`;
  const yearEnd = year === '2026' ? auditEnd : `${year}-12-31`;
  const to = yearEnd <= auditEnd ? yearEnd : auditEnd;
  return { from, to };
}

export function buildCompleteOosSplitRow(
  split: (typeof COMPLETE_OOS_SPLIT_DEFS)[number],
  allCandidates: ForwardPassedTradeRecord[],
  symbols: string[],
  auditEnd: string,
): ForwardCompleteOosSplitRow {
  const testTo = resolveTestTo(split.testTo, auditEnd);
  const executedThroughTest = simulateOperationalWinRateWithSeed(
    allCandidates.filter((t) => t.signalDate <= testTo),
    symbols,
    [],
  );
  const trainTrades = tradesInSignalRange(executedThroughTest, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(executedThroughTest, split.testFrom, testTo);

  return {
    splitId: split.splitId,
    labelJa: split.labelJa,
    trainFrom: split.trainFrom,
    trainTo: split.trainTo,
    testFrom: split.testFrom,
    testTo,
    train: buildWalkForward31PhaseMetrics(
      `学習 ${split.trainFrom.slice(0, 4)}-${split.trainTo.slice(0, 4)}`,
      split.trainFrom,
      split.trainTo,
      trainTrades,
    ),
    test: buildWalkForward31PhaseMetrics(
      `検証 ${split.testFrom.slice(0, 4)}-${testTo.slice(0, 4)}`,
      split.testFrom,
      testTo,
      testTrades,
    ),
  };
}

export function buildCompleteOosYearRow(
  year: string,
  executed: ForwardPassedTradeRecord[],
  auditEnd: string,
): ForwardCompleteOosYearRow {
  const { from, to } = yearBounds(year, auditEnd);
  const trades = tradesInSignalRange(executed, from, to);
  const m = buildWalkForward31PhaseMetrics(year, from, to, trades);
  return {
    year,
    fromDate: from,
    toDate: to,
    tradeCount: m.tradeCount,
    winRatePct: m.winRatePct,
    profitFactor: m.profitFactor,
    sharpe: m.sharpe,
    maxDrawdownPct: m.maxDrawdownPct,
    cumulativeReturnPct: m.cumulativeReturnPct,
  };
}

export function computeCompleteOosTrustScore(input: {
  splitRows: ForwardCompleteOosSplitRow[];
  foldRows: ForwardWalkForward31FoldRow[];
  yearRows: ForwardCompleteOosYearRow[];
  aggregateOosTest: ForwardWalkForward31PhaseMetrics;
}): number {
  const { splitRows, foldRows, yearRows, aggregateOosTest } = input;
  let score = 40;

  const holdoutTests = splitRows.map((s) => s.test).filter((t) => t.tradeCount > 0);
  const allHoldoutPositive = holdoutTests.every((t) => t.cumulativeReturnPct > 0);
  const minHoldoutCum = holdoutTests.length
    ? Math.min(...holdoutTests.map((t) => t.cumulativeReturnPct))
    : -100;

  if (allHoldoutPositive) score += 18;
  else if (holdoutTests.some((t) => t.cumulativeReturnPct > 0)) score += 8;
  else score -= 15;

  if (minHoldoutCum >= 10) score += 8;
  else if (minHoldoutCum >= 5) score += 5;
  else if (minHoldoutCum >= 0) score += 2;
  else score -= 10;

  const wfTests = foldRows.map((f) => f.test).filter((t) => t.tradeCount > 0);
  const positiveWf = wfTests.filter((t) => t.cumulativeReturnPct > 0).length;
  if (wfTests.length > 0) {
    score += round3((positiveWf / wfTests.length) * 15);
  }

  const collapsed = foldRows.filter((f) => f.collapsed).length;
  score -= collapsed * 4;

  if (aggregateOosTest.cumulativeReturnPct > 0) score += 10;
  if (aggregateOosTest.winRatePct >= 85) score += 5;
  else if (aggregateOosTest.winRatePct >= 75) score += 2;

  const tradedYears = yearRows.filter((y) => y.tradeCount > 0);
  const positiveYears = tradedYears.filter((y) => y.cumulativeReturnPct > 0).length;
  if (tradedYears.length > 0) {
    score += round3((positiveYears / tradedYears.length) * 8);
  }

  const y2026 = yearRows.find((y) => y.year === '2026');
  if (y2026 && y2026.tradeCount > 0 && y2026.cumulativeReturnPct > 0) score += 4;

  const worstYear = tradedYears.length
    ? [...tradedYears].sort((a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct)[0]!
    : null;
  if (worstYear && worstYear.cumulativeReturnPct >= 0) score += 4;
  else if (worstYear && worstYear.cumulativeReturnPct >= -5) score += 1;

  const oosTrades = aggregateOosTest.tradeCount;
  if (oosTrades < 5) score -= 18;
  else if (oosTrades < 10) score -= 12;
  else if (oosTrades < 20) score -= 6;

  const minHoldoutTrades = holdoutTests.length
    ? Math.min(...holdoutTests.map((t) => t.tradeCount))
    : 0;
  if (minHoldoutTrades < 5) score -= 8;
  else if (minHoldoutTrades < 10) score -= 4;

  return clamp(Math.round(score), 0, 100);
}

export function gradeCompleteOos(input: {
  splitRows: ForwardCompleteOosSplitRow[];
  foldRows: ForwardWalkForward31FoldRow[];
  aggregateOosTest: ForwardWalkForward31PhaseMetrics;
  trustScore: number;
  year2026: ForwardCompleteOosYearRow | null;
}): { grade: ForwardCompleteOosTrustGrade; verdictJa: string } {
  const { splitRows, foldRows, aggregateOosTest, trustScore, year2026 } = input;

  const holdoutTests = splitRows.map((s) => s.test).filter((t) => t.tradeCount > 0);
  const allHoldoutPositive = holdoutTests.every((t) => t.cumulativeReturnPct > 0);
  const minHoldoutCum = holdoutTests.length
    ? Math.min(...holdoutTests.map((t) => t.cumulativeReturnPct))
    : -100;

  const wfTests = foldRows.filter((f) => f.test.tradeCount > 0);
  const positiveWf = wfTests.filter((f) => f.test.cumulativeReturnPct > 0).length;
  const collapsedYears = foldRows.filter((f) => f.collapsed).map((f) => f.testYear);

  if (
    trustScore >= 75 &&
    allHoldoutPositive &&
    minHoldoutCum >= 5 &&
    aggregateOosTest.cumulativeReturnPct > 0 &&
    aggregateOosTest.winRatePct >= 85 &&
    positiveWf >= wfTests.length - 1 &&
    collapsedYears.length === 0
  ) {
    return {
      grade: 'A',
      verdictJa: `A評価 · 強い — OOS累積${aggregateOosTest.cumulativeReturnPct}% · 信頼度${trustScore}点 · 崩壊年なし`,
    };
  }

  if (
    trustScore >= 55 &&
    allHoldoutPositive &&
    aggregateOosTest.cumulativeReturnPct > 0 &&
    aggregateOosTest.winRatePct >= 75 &&
    positiveWf >= Math.max(1, wfTests.length - 1)
  ) {
    return {
      grade: 'B',
      verdictJa: `B評価 · 実用 — OOS累積${aggregateOosTest.cumulativeReturnPct}% · 信頼度${trustScore}点 · 監査53と整合`,
    };
  }

  if (
    collapsedYears.length >= 3 ||
    aggregateOosTest.cumulativeReturnPct < 0 ||
    aggregateOosTest.winRatePct < 70 ||
    !allHoldoutPositive
  ) {
    const y2026Note =
      year2026 && year2026.tradeCount > 0
        ? ` · 2026累積${year2026.cumulativeReturnPct}%`
        : '';
    return {
      grade: 'D',
      verdictJa: `D評価 · 不採用 — OOS累積${aggregateOosTest.cumulativeReturnPct}% · 崩壊年${collapsedYears.join(',') || '—'}${y2026Note}`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C評価 · 注意 — OOS累積${aggregateOosTest.cumulativeReturnPct}% · 信頼度${trustScore}点 · 崩壊年${collapsedYears.join(',') || 'なし'}`,
  };
}

export function buildCompleteOosAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
}): ForwardCompleteOosAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();

  const allCandidates = collectRecommendedRuleCandidates(
    input.bundle,
    symbols,
    fromDate,
    toDate,
  );
  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);

  const splitRows = COMPLETE_OOS_SPLIT_DEFS.map((split) =>
    buildCompleteOosSplitRow(split, allCandidates, symbols, toDate),
  );

  const foldRows = WALK_FORWARD_31_FOLDS.map((fold) =>
    buildWalkForward31Fold(fold, allCandidates, symbols, toDate),
  );

  const yearRows = OOS_YEARS.map((year) => buildCompleteOosYearRow(year, executed, toDate)).filter(
    (y) => y.fromDate <= toDate,
  );

  const tradedYears = yearRows.filter((y) => y.tradeCount > 0);
  const worstYear =
    tradedYears.length > 0
      ? [...tradedYears].sort((a, b) => a.cumulativeReturnPct - b.cumulativeReturnPct)[0]!
      : null;
  const bestYear =
    tradedYears.length > 0
      ? [...tradedYears].sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0]!
      : null;
  const year2026 = yearRows.find((y) => y.year === '2026') ?? null;

  const oosTestTrades = [
    ...tradesInSignalRange(executed, '2023-01-01', toDate),
  ];
  const aggregateOosTest = buildWalkForward31PhaseMetrics(
    'OOS統合（2023〜）',
    '2023-01-01',
    toDate,
    oosTestTrades,
  );

  const trustScore = computeCompleteOosTrustScore({
    splitRows,
    foldRows,
    yearRows,
    aggregateOosTest,
  });

  const { grade, verdictJa } = gradeCompleteOos({
    splitRows,
    foldRows,
    aggregateOosTest,
    trustScore,
    year2026,
  });

  const holdoutA = splitRows.find((s) => s.splitId === 'holdout_a')!;
  const holdoutB = splitRows.find((s) => s.splitId === 'holdout_b')!;
  const allHoldoutPositive =
    holdoutA.test.cumulativeReturnPct > 0 && holdoutB.test.cumulativeReturnPct > 0;

  const answerAJa = allHoldoutPositive
    ? `A 未知期間でも利益: はい — HoldoutA累積${holdoutA.test.cumulativeReturnPct}% · HoldoutB累積${holdoutB.test.cumulativeReturnPct}% — 評価${grade}`
    : `A 未知期間でも利益: 一部または全体でマイナス — HoldoutA${holdoutA.test.cumulativeReturnPct}% · HoldoutB${holdoutB.test.cumulativeReturnPct}% — 評価D`;

  const answerBJa = worstYear
    ? `B 最悪年度: ${worstYear.year}（累積${worstYear.cumulativeReturnPct}% · ${worstYear.tradeCount}件 · WR${worstYear.winRatePct}%）— 評価${worstYear.cumulativeReturnPct >= 0 ? 'A' : worstYear.cumulativeReturnPct >= -5 ? 'B' : 'C'}`
    : 'B 最悪年度: データ不足 — 評価C';

  const answerCJa = bestYear
    ? `C 最良年度: ${bestYear.year}（累積${bestYear.cumulativeReturnPct}% · ${bestYear.tradeCount}件 · WR${bestYear.winRatePct}%）— 評価A`
    : 'C 最良年度: データ不足 — 評価C';

  const answerDJa =
    year2026 && year2026.tradeCount > 0
      ? `D 2026単独成績: ${year2026.tradeCount}件 · WR${year2026.winRatePct}% · 累積${year2026.cumulativeReturnPct}% · DD${year2026.maxDrawdownPct ?? '—'}% — 評価${year2026.cumulativeReturnPct > 0 ? 'A' : 'C'}`
      : `D 2026単独成績: ${year2026?.tradeCount ?? 0}件（データ期間${toDate}まで） — 評価${year2026 && year2026.tradeCount === 0 ? 'C' : 'B'}`;

  const operationalOk = grade === 'A' || grade === 'B';
  const answerEJa = operationalOk
    ? `E 本当に実運用可能か: 可 — ${verdictJa} · 監査53（耐久性A）と整合 · RM3000固定額推奨`
    : `E 本当に実運用可能か: ${grade === 'C' ? '条件付き' : '不可'} — ${verdictJa}`;

  const consistencyNoteJa =
    '監査39-53整合: 現行ルール固定 · 損失停止不採用(51) · 勝ち絞り込み不採用(52) · 耐久性A(53) · 本監査は未知期間OOSのみ検証';

  const humanSummaryJa = [
    `監査54 完全OOS ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    verdictJa,
    `将来信頼度: ${trustScore}/100`,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    totalTradeCount: executed.length,
    splitRows,
    foldRows,
    yearRows,
    worstYear,
    bestYear,
    year2026,
    aggregateOosTest,
    trustGrade: grade,
    trustScore,
    trustVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runCompleteOosAudit(): Promise<ForwardCompleteOosAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildCompleteOosAuditReport({ bundle });
}

export function formatCompleteOosCsv(report: ForwardCompleteOosAuditReport): string {
  const phaseCols = 'trades,winRatePct,profitFactor,sharpe,maxDD,cumulative';
  const lines = [
    `# 最重要監査その54 完全OOS ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.trustVerdictJa} · 信頼度${report.trustScore}/100`,
    '',
    `section,splitId,phase,label,${phaseCols}`,
    ...report.splitRows.flatMap((s) => [
      [
        'holdout',
        s.splitId,
        'train',
        `"${s.labelJa} · 学習"`,
        s.train.tradeCount,
        s.train.winRatePct,
        s.train.profitFactor ?? '',
        s.train.sharpe ?? '',
        s.train.maxDrawdownPct ?? '',
        s.train.cumulativeReturnPct,
      ].join(','),
      [
        'holdout',
        s.splitId,
        'test',
        `"${s.labelJa} · 検証"`,
        s.test.tradeCount,
        s.test.winRatePct,
        s.test.profitFactor ?? '',
        s.test.sharpe ?? '',
        s.test.maxDrawdownPct ?? '',
        s.test.cumulativeReturnPct,
      ].join(','),
    ]),
    '',
    `section,foldId,phase,trainRange,testYear,${phaseCols},collapsed`,
    ...report.foldRows.flatMap((f) => [
      [
        'rolling_wf',
        f.foldId,
        'train',
        `"${f.trainFrom.slice(0, 4)}-${f.trainTo.slice(0, 4)}"`,
        f.testYear,
        f.train.tradeCount,
        f.train.winRatePct,
        f.train.profitFactor ?? '',
        f.train.sharpe ?? '',
        f.train.maxDrawdownPct ?? '',
        f.train.cumulativeReturnPct,
        f.collapsed ? 1 : 0,
      ].join(','),
      [
        'rolling_wf',
        f.foldId,
        'test',
        `"${f.trainFrom.slice(0, 4)}-${f.trainTo.slice(0, 4)}"`,
        f.testYear,
        f.test.tradeCount,
        f.test.winRatePct,
        f.test.profitFactor ?? '',
        f.test.sharpe ?? '',
        f.test.maxDrawdownPct ?? '',
        f.test.cumulativeReturnPct,
        f.collapsed ? 1 : 0,
      ].join(','),
    ]),
    '',
    `section,year,${phaseCols}`,
    ...report.yearRows.map((y) =>
      [
        'yearly',
        y.year,
        y.tradeCount,
        y.winRatePct,
        y.profitFactor ?? '',
        y.sharpe ?? '',
        y.maxDrawdownPct ?? '',
        y.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,key,value',
    `baseline,tradeCount,${report.totalTradeCount}`,
    `aggregate_oos,cumulative,${report.aggregateOosTest.cumulativeReturnPct}`,
    `aggregate_oos,winRate,${report.aggregateOosTest.winRatePct}`,
    `verdict,trustGrade,${report.trustGrade}`,
    `verdict,trustScore,${report.trustScore}`,
    '',
    'answer,content',
    `A,"${report.answerAJa}"`,
    `B,"${report.answerBJa}"`,
    `C,"${report.answerCJa}"`,
    `D,"${report.answerDJa}"`,
    `E,"${report.answerEJa}"`,
    `consistency,"${report.consistencyNoteJa}"`,
    `trust,"将来データ信頼度 ${report.trustScore}/100 · ${report.trustVerdictJa}"`,
  ];
  return lines.join('\n');
}
