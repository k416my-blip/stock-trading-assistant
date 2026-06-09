/**
 * 最重要監査その63 — 完全OOS · Walk Forward 70/30 · 監査62固定 · ルール変更なし
 */
import type {
  ForwardPassedTradeRecord,
  ForwardWalkForward31PhaseMetrics,
  ForwardWf7030OosAdoptionGrade,
  ForwardWf7030OosAuditReport,
  ForwardWf7030OosSplit,
} from '../../types/forwardValidation';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const TRAIN_PCT = 70;
const TEST_PCT = 30;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 期間をカレンダー70/30で分割 */
export function computeCalendar7030Split(fromDate: string, toDate: string): ForwardWf7030OosSplit {
  const fromMs = new Date(`${fromDate}T00:00:00Z`).getTime();
  const toMs = new Date(`${toDate}T00:00:00Z`).getTime();
  const splitMs = fromMs + (toMs - fromMs) * (TRAIN_PCT / 100);
  const trainTo = new Date(splitMs).toISOString().slice(0, 10);
  let testFrom = addDays(trainTo, 1);
  if (testFrom > toDate) testFrom = toDate;
  return {
    trainFrom: fromDate,
    trainTo,
    testFrom,
    testTo: toDate,
    trainPct: TRAIN_PCT,
    testPct: TEST_PCT,
  };
}

export function formatWf7030PhaseLine(m: ForwardWalkForward31PhaseMetrics): string {
  return (
    `${m.tradeCount}件 · WR${m.winRatePct}% · PF${m.profitFactor ?? '—'} · ` +
    `Sharpe${m.sharpe ?? '—'} · MaxDD${m.maxDrawdownPct ?? '—'}% · 累積${m.cumulativeReturnPct}%`
  );
}

export function judgeWf7030Overfit(input: {
  train: ForwardWalkForward31PhaseMetrics;
  test: ForwardWalkForward31PhaseMetrics;
  cumulativeDegradationPct: number | null;
}): string {
  const { train, test, cumulativeDegradationPct } = input;

  if (test.tradeCount === 0) {
    return '過学習判定不能 — OOS取引0件 · データ不足';
  }
  if (test.cumulativeReturnPct < 0) {
    return `過学習疑い強 — OOS累積${test.cumulativeReturnPct}%（IS${train.cumulativeReturnPct}%）`;
  }
  if ((cumulativeDegradationPct ?? 0) > 60) {
    return `劣化大 — 累積劣化率${cumulativeDegradationPct}% · OOSはプラス維持`;
  }
  if ((cumulativeDegradationPct ?? 0) > 35) {
    return `軽度劣化 — 累積劣化率${cumulativeDegradationPct}% · 過学習リスク低〜中`;
  }
  return `過学習なし — OOS累積${test.cumulativeReturnPct}% · 劣化率${cumulativeDegradationPct ?? '—'}%`;
}

export function gradeWf7030Oos(input: {
  train: ForwardWalkForward31PhaseMetrics;
  test: ForwardWalkForward31PhaseMetrics;
  cumulativeDegradationPct: number | null;
}): { grade: ForwardWf7030OosAdoptionGrade; verdictJa: string } {
  const { train, test, cumulativeDegradationPct } = input;

  if (
    test.tradeCount >= 3 &&
    test.cumulativeReturnPct >= 10 &&
    test.winRatePct >= 80 &&
    (test.profitFactor ?? 0) >= 1.2 &&
    test.cumulativeReturnPct > 0 &&
    (cumulativeDegradationPct ?? 0) < 50
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — OOS累積${test.cumulativeReturnPct}% · WR${test.winRatePct}% · 劣化率${cumulativeDegradationPct ?? '—'}%`,
    };
  }

  if (
    test.tradeCount >= 2 &&
    test.cumulativeReturnPct > 0 &&
    test.winRatePct >= 75 &&
    (test.profitFactor ?? 0) >= 1
  ) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — OOS累積${test.cumulativeReturnPct}% · WR${test.winRatePct}% · IS累積${train.cumulativeReturnPct}%`,
    };
  }

  if (test.cumulativeReturnPct >= -3 || (test.tradeCount > 0 && test.winRatePct >= 70)) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — OOS累積${test.cumulativeReturnPct}% · 劣化率${cumulativeDegradationPct ?? '—'}% · 監視強化`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — OOS累積${test.cumulativeReturnPct}% · IS${train.cumulativeReturnPct}% · ルール見直し`,
  };
}

export function buildWf7030OosAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
}): ForwardWf7030OosAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const split = computeCalendar7030Split(fromDate, toDate);

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const trainTrades = tradesInSignalRange(executed, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(executed, split.testFrom, split.testTo);

  const train = buildWalkForward31PhaseMetrics(
    `前半${TRAIN_PCT}%（ルール決定期間）`,
    split.trainFrom,
    split.trainTo,
    trainTrades,
  );
  const test = buildWalkForward31PhaseMetrics(
    `後半${TEST_PCT}%（OOS検証のみ）`,
    split.testFrom,
    split.testTo,
    testTrades,
  );

  const cumulativeDegradationPct = degradationPct(
    train.cumulativeReturnPct,
    test.cumulativeReturnPct,
  );
  const winRateDegradationPct = degradationPct(train.winRatePct, test.winRatePct);
  const sharpeDegradationPct = degradationPct(train.sharpe, test.sharpe);
  const maxDrawdownDegradationPct = degradationPct(
    train.maxDrawdownPct != null ? Math.abs(train.maxDrawdownPct) : null,
    test.maxDrawdownPct != null ? Math.abs(test.maxDrawdownPct) : null,
  );

  const overfitVerdictJa = judgeWf7030Overfit({ train, test, cumulativeDegradationPct });
  const { grade, verdictJa } = gradeWf7030Oos({ train, test, cumulativeDegradationPct });

  const answerAJa = `A 前半成績（${split.trainFrom}〜${split.trainTo}）: ${formatWf7030PhaseLine(train)}`;
  const answerBJa = `B 後半成績（${split.testFrom}〜${split.testTo}）: ${formatWf7030PhaseLine(test)}`;
  const answerCJa =
    `C 劣化率: 累積${cumulativeDegradationPct ?? '—'}% · WR${winRateDegradationPct ?? '—'}% · ` +
    `Sharpe${sharpeDegradationPct ?? '—'}% · MaxDD${maxDrawdownDegradationPct ?? '—'}%`;
  const answerDJa = `D 過学習判定: ${overfitVerdictJa}`;
  const answerEJa = `E 最終採用判定: ${grade} — ${verdictJa.replace(/^[ABCD] /, '')}`;

  const consistencyNoteJa =
    '監査39-62整合: 完全OOS · 監査54/31と相補 · 監査62Bootstrap良好 → WF70/30で未見データ検証 · ルール変更なし';

  const humanSummaryJa = [
    '監査63 Walk Forward OOS 70/30',
    FIXED_CONDITIONS_JA,
    `分割 ${split.trainFrom}〜${split.trainTo}（${TRAIN_PCT}%）| ${split.testFrom}〜${split.testTo}（${TEST_PCT}%）`,
    `前半: ${formatWf7030PhaseLine(train)}`,
    `後半: ${formatWf7030PhaseLine(test)}`,
    overfitVerdictJa,
    verdictJa,
    answerCJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    split,
    train,
    test,
    cumulativeDegradationPct,
    winRateDegradationPct,
    sharpeDegradationPct,
    maxDrawdownDegradationPct,
    overfitVerdictJa,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runWf7030OosAudit(): Promise<ForwardWf7030OosAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildWf7030OosAuditReport({ bundle });
}

export function formatWf7030OosCsv(report: ForwardWf7030OosAuditReport): string {
  const phases = [
    { phase: 'train', m: report.train },
    { phase: 'test', m: report.test },
  ];
  const lines = [
    `# 最重要監査その63 Walk Forward OOS 70/30 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 前半${report.split.trainFrom}〜${report.split.trainTo} · 後半${report.split.testFrom}〜${report.split.testTo}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,phase,fromDate,toDate,trades,winRatePct,profitFactor,sharpe,maxDD,cumulative',
    ...phases.map(({ phase, m }) =>
      [
        'phase',
        phase,
        m.fromDate,
        m.toDate,
        m.tradeCount,
        m.winRatePct,
        m.profitFactor ?? '',
        m.sharpe ?? '',
        m.maxDrawdownPct ?? '',
        m.cumulativeReturnPct,
      ].join(','),
    ),
    '',
    'section,metric,value',
    ['degradation', 'cumulativePct', report.cumulativeDegradationPct ?? ''].join(','),
    ['degradation', 'winRatePct', report.winRateDegradationPct ?? ''].join(','),
    ['degradation', 'sharpePct', report.sharpeDegradationPct ?? ''].join(','),
    ['degradation', 'maxDDPct', report.maxDrawdownDegradationPct ?? ''].join(','),
    ['verdict', 'adoptionGrade', report.adoptionGrade].join(','),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
