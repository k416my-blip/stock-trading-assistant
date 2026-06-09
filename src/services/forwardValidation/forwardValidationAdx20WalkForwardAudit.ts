/**
 * 最重要監査その22 — ADX20優位ウォークフォワード検証 · 2018-2020学習 / 2021-検証 · 監査のみ
 */
import { FORWARD_ADX_MIN } from '../../constants/forwardValidation';
import type {
  ForwardAdx20WalkForwardAuditReport,
  ForwardAdx20WalkForwardPhaseMetrics,
  ForwardAdx20WalkForwardTestOnlyTradeRow,
  ForwardAdx20WalkForwardVerdict,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import type { ForwardOhlcvBundle } from './forwardValidationEngine';
import { fetchForwardOhlcvBundle } from './forwardValidationEngine';
import { collectAdx20OnlyFullTrades } from './forwardValidationAdx20ValidationAudit';
import { runAdxThresholdOperational } from './forwardValidationAdxSensitivityAudit';
import { buildAdxYearlyThresholdMetrics } from './forwardValidationAdxYearlyOptimalAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';

const ADX20 = 20;
const ADX25 = FORWARD_ADX_MIN;

export const ADX20_WF_TRAIN_FROM = '2018-01-01';
export const ADX20_WF_TRAIN_TO = '2020-12-31';
export const ADX20_WF_TEST_FROM = '2021-01-01';

const FIXED_CONDITIONS_JA =
  'VIX≥24 · MACD · 52週高値 · SPY63 · 同時3枠 · 1日1ETF · 利確+3% · 最大25営業日';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function pickThresholdWinner(
  adx20: ForwardAdx20WalkForwardPhaseMetrics,
  adx25: ForwardAdx20WalkForwardPhaseMetrics,
): 'adx20' | 'adx25' | 'tie' {
  if (adx20.cumulativeReturnPct > adx25.cumulativeReturnPct) return 'adx20';
  if (adx25.cumulativeReturnPct > adx20.cumulativeReturnPct) return 'adx25';
  return 'tie';
}

export function buildTestOnlyAdx20TradeRows(
  trades: ForwardPassedTradeRecord[],
): ForwardAdx20WalkForwardTestOnlyTradeRow[] {
  return trades.map((t) => ({
    signalDate: t.signalDate,
    symbol: t.symbol,
    adx14: t.adx14,
    returnPct: t.returnPct,
    holdDays: t.holdDays,
  }));
}

export function evaluateAdx20WalkForward(input: {
  phase1Winner: 'adx20' | 'adx25' | 'tie';
  testSuperior: 'adx20' | 'adx25' | 'tie';
  trainAdx20: ForwardAdx20WalkForwardPhaseMetrics;
  trainAdx25: ForwardAdx20WalkForwardPhaseMetrics;
  testAdx20: ForwardAdx20WalkForwardPhaseMetrics;
  testAdx25: ForwardAdx20WalkForwardPhaseMetrics;
}): {
  verdict: ForwardAdx20WalkForwardVerdict;
  verdictJa: string;
  futureAdx20Superior: boolean;
  adoptionValid: boolean;
  recommendedAdxThreshold: 20 | 25;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
} {
  const { phase1Winner, testSuperior, trainAdx20, trainAdx25, testAdx20, testAdx25 } = input;
  const futureAdx20Superior = testSuperior === 'adx20';
  const testDelta = round3(testAdx20.cumulativeReturnPct - testAdx25.cumulativeReturnPct);

  if (phase1Winner === 'adx20' && testSuperior === 'adx20') {
    return {
      verdict: 'adx20_adoption_valid',
      verdictJa:
        `学習期間ADX20優位（累積${trainAdx20.cumulativeReturnPct}% vs ${trainAdx25.cumulativeReturnPct}%）→ ` +
        `テスト期間もADX20優位（${testAdx20.cumulativeReturnPct}% vs ${testAdx25.cumulativeReturnPct}%、Δ${testDelta}%）。過剰最適化の疑いは低い。`,
      futureAdx20Superior: true,
      adoptionValid: true,
      recommendedAdxThreshold: 20,
      answer1Ja: `はい。2021以降のテスト期間でもADX20累積${testAdx20.cumulativeReturnPct}%がADX25の${testAdx25.cumulativeReturnPct}%を上回った（Δ+${testDelta}%）。`,
      answer2Ja: '妥当。学習で選んだADX20が未来期間でも優位を維持。',
      answer3Ja: 'ADX>20を推奨。',
    };
  }

  if (phase1Winner === 'adx20' && testSuperior === 'adx25') {
    return {
      verdict: 'overfit_suspected',
      verdictJa:
        `学習期間ADX20優位（${trainAdx20.cumulativeReturnPct}% vs ${trainAdx25.cumulativeReturnPct}%）だが、 ` +
        `テスト期間はADX25優位（${testAdx25.cumulativeReturnPct}% vs ${testAdx20.cumulativeReturnPct}%）。過剰最適化疑い。`,
      futureAdx20Superior: false,
      adoptionValid: false,
      recommendedAdxThreshold: 25,
      answer1Ja: `いいえ。2021以降はADX25累積${testAdx25.cumulativeReturnPct}%がADX20の${testAdx20.cumulativeReturnPct}%を上回った。`,
      answer2Ja: '妥当性に疑義。学習期間のADX20優位は未来期間で再現せず。',
      answer3Ja: 'ADX>25（現行）を推奨。',
    };
  }

  if (phase1Winner === 'adx25') {
    return {
      verdict: 'adx25_preferred',
      verdictJa:
        `学習期間からADX25優位（${trainAdx25.cumulativeReturnPct}% vs ${trainAdx20.cumulativeReturnPct}%）。ADX20採用根拠なし。`,
      futureAdx20Superior: testSuperior === 'adx20',
      adoptionValid: false,
      recommendedAdxThreshold: 25,
      answer1Ja:
        testSuperior === 'adx20'
          ? `テスト期間のみADX20優位（${testAdx20.cumulativeReturnPct}% vs ${testAdx25.cumulativeReturnPct}%）だが、学習期間ではADX25が勝っている。`
          : `いいえ。テスト期間もADX25優位または同点（ADX20 ${testAdx20.cumulativeReturnPct}% / ADX25 ${testAdx25.cumulativeReturnPct}%）。`,
      answer2Ja: '不採用。学習期間時点でADX25が優位。',
      answer3Ja: 'ADX>25（現行）を推奨。',
    };
  }

  const adoptionValid = phase1Winner === 'adx20' && testSuperior === 'adx20';
  return {
    verdict: 'mixed',
    verdictJa:
      `混合: 学習${phase1Winner} · テスト${testSuperior}。` +
      `学習 ADX20=${trainAdx20.cumulativeReturnPct}% ADX25=${trainAdx25.cumulativeReturnPct}% / ` +
      `テスト ADX20=${testAdx20.cumulativeReturnPct}% ADX25=${testAdx25.cumulativeReturnPct}%。`,
    futureAdx20Superior: testSuperior === 'adx20',
    adoptionValid,
    recommendedAdxThreshold: adoptionValid ? 20 : 25,
    answer1Ja:
      testSuperior === 'adx20'
        ? `テスト期間はADX20優位（${testAdx20.cumulativeReturnPct}% vs ${testAdx25.cumulativeReturnPct}%）だが、学習期間は同点。`
        : `テスト期間でADX20優位なし（ADX20 ${testAdx20.cumulativeReturnPct}% / ADX25 ${testAdx25.cumulativeReturnPct}%）。`,
    answer2Ja: adoptionValid
      ? '条件付き妥当。'
      : '学習同点またはテスト劣後のため、ADX20全面採用は慎重に。',
    answer3Ja: adoptionValid ? 'ADX>20を推奨。' : 'ADX>25（現行）を推奨。',
  };
}

function fmtMetric(v: number | null, suffix = '%'): string {
  return v != null ? `${v}${suffix}` : '—';
}

function formatPhaseMetrics(label: string, m: ForwardAdx20WalkForwardPhaseMetrics): string {
  return (
    `${label}: ${m.tradeCount}件 · WR${m.winRatePct}% · 均R${fmtMetric(m.avgReturnPct)} · ` +
    `累積${m.cumulativeReturnPct}% · 最大DD${fmtMetric(m.maxDrawdownPct)}`
  );
}

function formatCompareBlock(
  adx20: ForwardAdx20WalkForwardPhaseMetrics,
  adx25: ForwardAdx20WalkForwardPhaseMetrics,
): string[] {
  return [
    formatPhaseMetrics('ADX>20', adx20),
    formatPhaseMetrics('ADX>25', adx25),
    `Δ累積(20-25): ${round3(adx20.cumulativeReturnPct - adx25.cumulativeReturnPct)}% · 優位: ${
      pickThresholdWinner(adx20, adx25) === 'adx20'
        ? 'ADX20'
        : pickThresholdWinner(adx20, adx25) === 'adx25'
          ? 'ADX25'
          : '同点'
    }`,
  ];
}

export function auditAdx20WalkForward(input: {
  bundle: ForwardOhlcvBundle;
  trainFrom?: string;
  trainTo?: string;
  testFrom?: string;
}): ForwardAdx20WalkForwardAuditReport {
  const trainFrom = input.trainFrom ?? ADX20_WF_TRAIN_FROM;
  const trainTo = input.trainTo ?? ADX20_WF_TRAIN_TO;
  const testFrom = input.testFrom ?? ADX20_WF_TEST_FROM;
  const testTo = input.bundle.latestDate;

  const adx20All = runAdxThresholdOperational(input.bundle, EXTENDED_AUDIT_START, testTo, ADX20);
  const adx25All = runAdxThresholdOperational(input.bundle, EXTENDED_AUDIT_START, testTo, ADX25);

  const trainAdx20Trades = tradesInSignalRange(adx20All, trainFrom, trainTo);
  const trainAdx25Trades = tradesInSignalRange(adx25All, trainFrom, trainTo);
  const testAdx20Trades = tradesInSignalRange(adx20All, testFrom, testTo);
  const testAdx25Trades = tradesInSignalRange(adx25All, testFrom, testTo);

  const trainAdx20 = buildAdxYearlyThresholdMetrics(trainAdx20Trades);
  const trainAdx25 = buildAdxYearlyThresholdMetrics(trainAdx25Trades);
  const testAdx20 = buildAdxYearlyThresholdMetrics(testAdx20Trades);
  const testAdx25 = buildAdxYearlyThresholdMetrics(testAdx25Trades);

  const phase1Winner = pickThresholdWinner(trainAdx20, trainAdx25);
  const testSuperior = pickThresholdWinner(testAdx20, testAdx25);

  const testOnlyAdx20Trades = buildTestOnlyAdx20TradeRows(
    collectAdx20OnlyFullTrades(input.bundle, EXTENDED_AUDIT_START, testTo).filter(
      (t) => t.signalDate >= testFrom,
    ),
  );

  const evalResult = evaluateAdx20WalkForward({
    phase1Winner,
    testSuperior,
    trainAdx20,
    trainAdx25,
    testAdx20,
    testAdx25,
  });

  const verdictLabel: Record<ForwardAdx20WalkForwardVerdict, string> = {
    adx20_adoption_valid: 'ADX20採用妥当',
    overfit_suspected: '過剰最適化疑い',
    adx25_preferred: 'ADX25優先',
    mixed: '混合',
  };

  const humanLines = [
    `【最重要監査その22】ADX20優位ウォークフォワード ${trainFrom} ～ ${testTo}`,
    `固定条件: ${FIXED_CONDITIONS_JA}`,
    '実運用シミュレーション · シグナル日で期間分割 · テスト期間は閾値調整禁止',
    '監査のみ · ルール変更なし',
    '',
    `■ Phase1 学習期間 ${trainFrom} ～ ${trainTo}`,
    ...formatCompareBlock(trainAdx20, trainAdx25),
    `→ Phase1勝者: ${phase1Winner === 'adx20' ? 'ADX>20' : phase1Winner === 'adx25' ? 'ADX>25' : '同点'}`,
    '',
    `■ Phase2 テスト期間 ${testFrom} ～ ${testTo}（Phase1勝者固定 · 比較のみ）`,
    ...formatCompareBlock(testAdx20, testAdx25),
    '',
    `■ 2021以降 ADX20のみ実行トレード（${testOnlyAdx20Trades.length}件）`,
    ...(testOnlyAdx20Trades.length > 0
      ? testOnlyAdx20Trades.map(
          (t) =>
            `${t.signalDate} · ${t.symbol} · ADX${t.adx14} · R${t.returnPct}% · ${t.holdDays}日`,
        )
      : ['（該当なし）']),
    '',
    `■ 判定: 【${verdictLabel[evalResult.verdict]}】`,
    evalResult.verdictJa,
    '',
    '■ 必須回答',
    `1. 未来期間でもADX20優位だったか → ${evalResult.answer1Ja}`,
    `2. ADX20採用は妥当か → ${evalResult.answer2Ja}`,
    `3. 推奨ADX閾値 → ${evalResult.answer3Ja}`,
  ];

  return {
    auditedAt: new Date().toISOString(),
    fromDate: EXTENDED_AUDIT_START,
    toDate: testTo,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    trainFrom,
    trainTo,
    testFrom,
    testTo,
    trainAdx20,
    trainAdx25,
    testAdx20,
    testAdx25,
    phase1Winner,
    testSuperior,
    testOnlyAdx20Trades,
    verdict: evalResult.verdict,
    verdictJa: evalResult.verdictJa,
    futureAdx20Superior: evalResult.futureAdx20Superior,
    adoptionValid: evalResult.adoptionValid,
    recommendedAdxThreshold: evalResult.recommendedAdxThreshold,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    humanSummaryJa: humanLines.join('\n'),
  };
}

export async function runAdx20WalkForwardAudit(): Promise<ForwardAdx20WalkForwardAuditReport | null> {
  const bundle = await fetchForwardOhlcvBundle(EXTENDED_AUDIT_START);
  if (!bundle) return null;
  return auditAdx20WalkForward({ bundle });
}

export function formatAdx20WalkForwardCsv(report: ForwardAdx20WalkForwardAuditReport): string {
  const phaseRow = (phase: string, label: string, m: ForwardAdx20WalkForwardPhaseMetrics) =>
    [phase, label, m.tradeCount, m.winRatePct, m.avgReturnPct ?? '', m.maxDrawdownPct ?? '', m.cumulativeReturnPct].join(
      ',',
    );

  const onlyRows = report.testOnlyAdx20Trades.map((t) =>
    [t.signalDate, t.symbol, t.adx14, t.returnPct, t.holdDays].join(','),
  );

  return [
    'phase,threshold,tradeCount,winRatePct,avgReturnPct,maxDrawdownPct,cumulativeReturnPct',
    phaseRow('train', 'adx20', report.trainAdx20),
    phaseRow('train', 'adx25', report.trainAdx25),
    phaseRow('test', 'adx20', report.testAdx20),
    phaseRow('test', 'adx25', report.testAdx25),
    '',
    'signalDate,symbol,adx14,returnPct,holdDays',
    ...onlyRows,
    '',
    `phase1Winner,${report.phase1Winner}`,
    `testSuperior,${report.testSuperior}`,
    `verdict,${report.verdict}`,
    `recommendedAdxThreshold,${report.recommendedAdxThreshold}`,
  ].join('\n');
}
