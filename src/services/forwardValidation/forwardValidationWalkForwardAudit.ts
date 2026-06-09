/**
 * 最重要監査その10 — ウォークフォワード検証 · 実運用ルール固定 · 監査のみ
 */
import type {
  ForwardOosOverfitVerdict,
  ForwardOosPeriodMetrics,
  ForwardPassedTradeRecord,
  ForwardWalkForwardAuditReport,
  ForwardWalkForwardFoldRow,
  ForwardWalkForwardPeriodMetrics,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import {
  buildOosPeriodMetrics,
  tradesInSignalRange,
} from './forwardValidationOosValidationAudit';
import { collectOperationalExecutedTrades } from './forwardValidationOperationalRebacktestAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const FIXED_CONDITIONS_JA =
  'ADX+MACD+52w+SPY63 · VIX≥24 · 同時3枠 · 1日1ETF(DGRO>VYM>SPLG>SCHD) — 学習期間で確定';

export const WALK_FORWARD_FOLDS: {
  foldId: number;
  trainFrom: string;
  trainTo: string;
  testYear: string;
}[] = [
  { foldId: 1, trainFrom: '2018-01-01', trainTo: '2020-12-31', testYear: '2021' },
  { foldId: 2, trainFrom: '2018-01-01', trainTo: '2021-12-31', testYear: '2022' },
  { foldId: 3, trainFrom: '2018-01-01', trainTo: '2022-12-31', testYear: '2023' },
  { foldId: 4, trainFrom: '2018-01-01', trainTo: '2023-12-31', testYear: '2024' },
  { foldId: 5, trainFrom: '2018-01-01', trainTo: '2024-12-31', testYear: '2025' },
  { foldId: 6, trainFrom: '2018-01-01', trainTo: '2025-12-31', testYear: '2026' },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function yearBounds(year: string, auditEnd: string): { from: string; to: string } {
  const from = `${year}-01-01`;
  const yearEnd = year === '2026' ? auditEnd : `${year}-12-31`;
  const to = yearEnd <= auditEnd ? yearEnd : auditEnd;
  return { from, to };
}

function toWalkForwardMetrics(m: ForwardOosPeriodMetrics): ForwardWalkForwardPeriodMetrics {
  return {
    labelJa: m.labelJa,
    fromDate: m.fromDate,
    toDate: m.toDate,
    tradeCount: m.tradeCount,
    winCount: m.winCount,
    winRatePct: m.winRatePct,
    avgReturnPct: m.avgReturnPct,
    maxDrawdownPct: m.maxDrawdownPct,
    cumulativeReturnPct: m.cumulativeReturnPct,
  };
}

/** 成績劣化率 = (学習 − 検証) / 学習 × 100。正=検証が悪化 */
export function degradationPct(trainVal: number | null, testVal: number | null): number | null {
  if (trainVal == null || testVal == null || trainVal === 0) return null;
  return round3(((trainVal - testVal) / Math.abs(trainVal)) * 100);
}

function buildPeriodMetrics(
  labelJa: string,
  fromDate: string,
  toDate: string,
  trades: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
): ForwardWalkForwardPeriodMetrics {
  const m = buildOosPeriodMetrics('in_sample', labelJa, fromDate, toDate, trades, bundle);
  return toWalkForwardMetrics(m);
}

export function buildWalkForwardFold(
  fold: (typeof WALK_FORWARD_FOLDS)[number],
  executed: ForwardPassedTradeRecord[],
  bundle: ForwardOhlcvBundle,
  auditEnd: string,
): ForwardWalkForwardFoldRow {
  const { from: testFrom, to: testTo } = yearBounds(fold.testYear, auditEnd);
  const trainTrades = tradesInSignalRange(executed, fold.trainFrom, fold.trainTo);
  const testTrades = tradesInSignalRange(executed, testFrom, testTo);

  const train = buildPeriodMetrics(
    `学習 ${fold.trainFrom.slice(0, 4)}-${fold.trainTo.slice(0, 4)}`,
    fold.trainFrom,
    fold.trainTo,
    trainTrades,
    bundle,
  );
  const test = buildPeriodMetrics(`検証 ${fold.testYear}`, testFrom, testTo, testTrades, bundle);

  const hasTest = test.tradeCount > 0;

  return {
    foldId: fold.foldId,
    trainFrom: fold.trainFrom,
    trainTo: fold.trainTo,
    testYear: fold.testYear,
    train,
    test,
    winRateDegradationPct: hasTest ? degradationPct(train.winRatePct, test.winRatePct) : null,
    avgReturnDegradationPct: hasTest ? degradationPct(train.avgReturnPct, test.avgReturnPct) : null,
    cumulativeDegradationPct: hasTest
      ? degradationPct(train.cumulativeReturnPct, test.cumulativeReturnPct)
      : null,
  };
}

export function evaluateWalkForwardOverfit(input: {
  folds: ForwardWalkForwardFoldRow[];
  avgWinRateDegradationPct: number | null;
  avgReturnDegradationPct: number | null;
}): { verdict: ForwardOosOverfitVerdict; verdictJa: string } {
  const withTest = input.folds.filter((f) => f.test.tradeCount > 0);
  if (withTest.length === 0) {
    return {
      verdict: 'mild',
      verdictJa: '検証年に実行トレードなし — 劣化率評価不可。',
    };
  }

  const wrDegs = withTest
    .map((f) => f.winRateDegradationPct)
    .filter((v): v is number => v != null);
  const severeWr = wrDegs.filter((d) => d > 20).length;
  const improved = wrDegs.filter((d) => d < 0).length;
  const avgWr = input.avgWinRateDegradationPct;
  const avgRet = input.avgReturnDegradationPct;

  if (avgWr != null && avgWr <= 5 && (avgRet == null || avgRet <= 10)) {
    return {
      verdict: 'none',
      verdictJa:
        `過剰適合なし: 平均勝率劣化率${avgWr}% · 平均利益率劣化率${avgRet ?? '—'}% · ` +
        `改善/横ばい ${improved}/${withTest.length}年。`,
    };
  }
  if (severeWr >= 2 || (avgWr != null && avgWr > 25)) {
    return {
      verdict: 'clear',
      verdictJa:
        `過剰適合（強）: 平均勝率劣化率${avgWr ?? '—'}% · ${severeWr}年で勝率20%超劣化。`,
    };
  }
  if (avgWr != null && avgWr > 12) {
    return {
      verdict: 'suspected',
      verdictJa:
        `過剰適合の疑い: 平均勝率劣化率${avgWr}% · 平均利益率劣化率${avgRet ?? '—'}%。`,
    };
  }
  return {
    verdict: 'mild',
    verdictJa:
      `軽度の乖離: 平均勝率劣化率${avgWr ?? '—'}% · 検証${withTest.length}年中${improved}年は改善。`,
  };
}

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

function formatMetricsLine(m: ForwardWalkForwardPeriodMetrics): string {
  return (
    `${m.tradeCount}件 · 勝率${m.winRatePct}% · 均R${m.avgReturnPct ?? '—'}% · ` +
    `DD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`
  );
}

function formatFoldSection(f: ForwardWalkForwardFoldRow): string[] {
  return [
    `【${f.foldId}】学習 ${f.trainFrom.slice(0, 4)}-${f.trainTo.slice(0, 4)} → 検証 ${f.testYear}`,
    `  学習: ${formatMetricsLine(f.train)}`,
    `  検証: ${formatMetricsLine(f.test)}`,
    `  劣化率: 勝率${f.winRateDegradationPct ?? '—'}% · 均R${f.avgReturnDegradationPct ?? '—'}% · 累積${f.cumulativeDegradationPct ?? '—'}%`,
  ];
}

export function auditWalkForward(input: {
  bundle: ForwardOhlcvBundle;
}): ForwardWalkForwardAuditReport {
  const auditEnd = input.bundle.latestDate;
  const executed = collectOperationalExecutedTrades({
    bundle: input.bundle,
    fromDate: EXTENDED_AUDIT_START,
  });

  const folds = WALK_FORWARD_FOLDS.map((fold) =>
    buildWalkForwardFold(fold, executed, input.bundle, auditEnd),
  );

  const testTradesUnion = tradesInSignalRange(executed, '2021-01-01', auditEnd);
  const aggregateTest = buildPeriodMetrics(
    'WF統合検証（2021〜）',
    '2021-01-01',
    auditEnd,
    testTradesUnion,
    input.bundle,
  );

  const foldsWithTest = folds.filter((f) => f.test.tradeCount > 0);
  const avgWinRateDegradationPct = mean(
    foldsWithTest
      .map((f) => f.winRateDegradationPct)
      .filter((v): v is number => v != null),
  );
  const avgReturnDegradationPct = mean(
    foldsWithTest
      .map((f) => f.avgReturnDegradationPct)
      .filter((v): v is number => v != null),
  );

  const { verdict, verdictJa } = evaluateWalkForwardOverfit({
    folds,
    avgWinRateDegradationPct,
    avgReturnDegradationPct,
  });

  const verdictLabel: Record<ForwardOosOverfitVerdict, string> = {
    none: '過剰適合なし',
    mild: '軽度の乖離',
    suspected: '過剰適合の疑い',
    clear: '過剰適合（強）',
  };

  const humanLines = [
    '【最重要監査その10】ウォークフォワード検証',
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '監査のみ · ルール変更なし · 最適化なし',
    '',
    '■ 各フォールド',
    ...folds.flatMap(formatFoldSection),
    '',
    '■ WF統合成績（全検証年 2021〜 合算 · 実運用連続シミュレーション）',
    formatMetricsLine(aggregateTest),
    '',
    `■ 劣化率サマリ: 平均勝率劣化${avgWinRateDegradationPct ?? '—'}% · 平均均R劣化${avgReturnDegradationPct ?? '—'}% · 検証あり${foldsWithTest.length}/6年`,
    '',
    `■ 過剰適合評価: 【${verdictLabel[verdict]}】`,
    verdictJa,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    folds,
    aggregateTest,
    avgWinRateDegradationPct,
    avgReturnDegradationPct,
    foldsWithTestTrades: foldsWithTest.length,
    overfitVerdict: verdict,
    overfitVerdictJa: verdictJa,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runWalkForwardAudit(): Promise<ForwardWalkForwardAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditWalkForward({ bundle });
}

export function formatWalkForwardCsv(report: ForwardWalkForwardAuditReport): string {
  const lines = [
    'foldId,trainFrom,trainTo,testYear,phase,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct,winRateDegradationPct,avgReturnDegradationPct',
    ...report.folds.flatMap((f) => [
      [
        f.foldId,
        f.trainFrom,
        f.trainTo,
        f.testYear,
        'train',
        f.train.tradeCount,
        f.train.winRatePct,
        f.train.avgReturnPct ?? '',
        f.train.maxDrawdownPct ?? '',
        f.train.cumulativeReturnPct,
        '',
        '',
      ].join(','),
      [
        f.foldId,
        f.trainFrom,
        f.trainTo,
        f.testYear,
        'test',
        f.test.tradeCount,
        f.test.winRatePct,
        f.test.avgReturnPct ?? '',
        f.test.maxDrawdownPct ?? '',
        f.test.cumulativeReturnPct,
        f.winRateDegradationPct ?? '',
        f.avgReturnDegradationPct ?? '',
      ].join(','),
    ]),
    '',
    'aggregate,test,2021,,test',
    [
      '',
      '',
      '',
      '',
      'test',
      report.aggregateTest.tradeCount,
      report.aggregateTest.winRatePct,
      report.aggregateTest.avgReturnPct ?? '',
      report.aggregateTest.maxDrawdownPct ?? '',
      report.aggregateTest.cumulativeReturnPct,
      report.avgWinRateDegradationPct ?? '',
      report.avgReturnDegradationPct ?? '',
    ].join(','),
    '',
    `overfitVerdict,${report.overfitVerdict}`,
  ];
  return lines.join('\n');
}
