/**
 * 最重要監査その65 — Malaysia v2 · YTL Power依存リスク · 監査64固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV2AdoptionGrade,
  ForwardMalaysiaV2AuditReport,
  ForwardMalaysiaV2ScenarioId,
  ForwardMalaysiaV2ScenarioRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { BOOTSTRAP_MC_RUNS, runBootstrapMonteCarlo } from './forwardValidationBootstrapMcAudit';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
import {
  collectExecutedTradesForUniverse,
  combinations,
  fetchMalaysiaV1AuditBundle,
  MALAYSIA_V1_AUDIT_START,
  MALAYSIA_V1_UNIVERSE,
} from './forwardValidationMalaysiaV1Audit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import {
  computeCalendar7030Split,
  judgeWf7030Overfit,
} from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const RM3000 = 3000;
const BOOTSTRAP_SEED = 65_001;
const V1_BASELINE = ['6742', '5326'] as const;

const FIXED_CONDITIONS_JA =
  '監査64 MY v1思想 · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700@RM3000';

/** ④セクター分散 — 金融/インフラ/電力/医療 各1銘柄均等 */
export const MALAYSIA_V2_SECTOR_EQUAL_SYMBOLS = ['1023', '5398', '5347', '5225'] as const;

const SECTOR_LABELS_JA: Record<string, string> = {
  '1023': '金融(CIMB)',
  '5398': 'インフラ(GAMUDA)',
  '5347': '電力(TENAGA)',
  '5225': '医療(IHH)',
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function resolveAuditFromDate(toDate: string, fromDate?: string): string {
  if (fromDate) return fromDate;
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function bestTwoStockSymbols(
  bundle: SurvivorshipOhlcvBundle,
  pool: string[],
  fromDate: string,
  toDate: string,
  cachedTemplates: ReturnType<typeof precomputeTradeTemplates>,
): string[] {
  if (pool.length <= 2) return [...pool];
  const combos = combinations(pool, 2);
  let best: { symbols: string[]; mar: number; cumulative: number } | null = null;
  for (const combo of combos) {
    const trades = collectExecutedTradesForUniverse(
      bundle,
      combo,
      fromDate,
      toDate,
      cachedTemplates,
    );
    if (trades.length < 2) continue;
    const phase = buildWalkForward31PhaseMetrics('x', fromDate, toDate, trades);
    const mar = phase.mar ?? -999;
    const cumulative = phase.cumulativeReturnPct;
    if (
      !best ||
      mar > best.mar ||
      (Math.abs(mar - best.mar) < 0.01 && cumulative > best.cumulative)
    ) {
      best = { symbols: combo, mar, cumulative };
    }
  }
  return best?.symbols ?? pool.slice(0, 2);
}

function buildWfOosSummary(
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardMalaysiaV2ScenarioRow['wfOos'] {
  const split = computeCalendar7030Split(fromDate, toDate);
  const trainTrades = tradesInSignalRange(trades, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(trades, split.testFrom, split.testTo);
  const train = buildWalkForward31PhaseMetrics('train', split.trainFrom, split.trainTo, trainTrades);
  const test = buildWalkForward31PhaseMetrics('test', split.testFrom, split.testTo, testTrades);
  const cumulativeDegradationPct = degradationPct(
    train.cumulativeReturnPct,
    test.cumulativeReturnPct,
  );
  return {
    trainCumulativePct: train.cumulativeReturnPct,
    testCumulativePct: test.cumulativeReturnPct,
    cumulativeDegradationPct,
    testWinRatePct: test.winRatePct,
    overfitVerdictJa: judgeWf7030Overfit({ train, test, cumulativeDegradationPct }),
  };
}

function buildScenarioRow(input: {
  scenarioId: ForwardMalaysiaV2ScenarioId;
  labelJa: string;
  symbols: string[];
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
}): ForwardMalaysiaV2ScenarioRow {
  const { scenarioId, labelJa, symbols, trades, fromDate, toDate } = input;
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  const years = calendarYears(fromDate, toDate);
  const cagr =
    phase.cumulativeReturnPct > -100
      ? round3((Math.pow(1 + phase.cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;

  const mc = runBootstrapMonteCarlo({
    pool: trades,
    symbols,
    initialCapitalMYR: RM3000,
    runs: BOOTSTRAP_MC_RUNS,
    seed: BOOTSTRAP_SEED + scenarioId.length,
  });

  const path = simulateLotSizingPath({
    trades,
    symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
  });

  return {
    scenarioId,
    labelJa,
    symbols: [...symbols],
    tradeCount: phase.tradeCount,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    cagr,
    bootstrap: {
      runs: mc.runs,
      bankruptcyRatePct: mc.bankruptcyRatePct,
      meanCumulativePct: mc.meanCumulativePct,
      p5CumulativePct: mc.p5CumulativePct,
      worstMaxDrawdownPct: mc.worstMaxDrawdownPct,
    },
    wfOos: buildWfOosSummary(trades, fromDate, toDate),
  };
}

export function gradeMalaysiaV2Adoption(input: {
  baseline: ForwardMalaysiaV2ScenarioRow;
  exBoth: ForwardMalaysiaV2ScenarioRow;
  sectorEqual: ForwardMalaysiaV2ScenarioRow;
  exYtl: ForwardMalaysiaV2ScenarioRow;
}): { grade: ForwardMalaysiaV2AdoptionGrade; verdictJa: string; recommendedId: ForwardMalaysiaV2ScenarioId } {
  const { baseline, exBoth, sectorEqual, exYtl } = input;

  const deRisked = [exBoth, sectorEqual].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;

  const ytlShare =
    baseline.cumulativeReturnPct > 0
      ? round3(
          ((baseline.cumulativeReturnPct - exYtl.cumulativeReturnPct) /
            baseline.cumulativeReturnPct) *
            100,
        )
      : null;

  if (
    deRisked.cumulativeReturnPct >= 40 &&
    deRisked.winRatePct >= 75 &&
    deRisked.bootstrap.bankruptcyRatePct === 0 &&
    deRisked.wfOos.testCumulativePct > 0 &&
    (deRisked.wfOos.cumulativeDegradationPct ?? 99) < 60
  ) {
    return {
      grade: 'A',
      recommendedId: deRisked.scenarioId,
      verdictJa: `A 即運用 — ${deRisked.labelJa} · 累積${deRisked.cumulativeReturnPct}% · YTL依存${ytlShare ?? '—'}% · OOS${deRisked.wfOos.testCumulativePct}%`,
    };
  }

  if (
    exBoth.cumulativeReturnPct > 0 &&
    exBoth.bootstrap.bankruptcyRatePct === 0 &&
    exBoth.wfOos.testCumulativePct >= 0
  ) {
    return {
      grade: 'B',
      recommendedId: exBoth.scenarioId,
      verdictJa: `B 運用可能 — YTL+99除外でも累積${exBoth.cumulativeReturnPct}% · セクター分散${sectorEqual.cumulativeReturnPct}% · 段階移行`,
    };
  }

  if (exYtl.cumulativeReturnPct > 0 || sectorEqual.cumulativeReturnPct > 0) {
    return {
      grade: 'C',
      recommendedId: sectorEqual.scenarioId,
      verdictJa: `C 要改善 — YTL依存${ytlShare ?? '—'}% · 除外後累積${exBoth.cumulativeReturnPct}% · ロット縮小`,
    };
  }

  return {
    grade: 'D',
    recommendedId: 'baseline_v1',
    verdictJa: `D 不採用 — YTL除外で成績崩壊 · v1維持不可`,
  };
}

export function buildMalaysiaV2AuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
}): ForwardMalaysiaV2AuditReport | null {
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate, input.fromDate);
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const allSymbols = input.bundle.fetchedSymbols;
  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: allSymbols,
    fromDate,
    toDate,
  });

  const baselineTrades = collectExecutedTradesForUniverse(
    input.bundle,
    [...V1_BASELINE],
    fromDate,
    toDate,
    cachedTemplates,
  );
  const baseline = buildScenarioRow({
    scenarioId: 'baseline_v1',
    labelJa: 'v1基準（6742/5326）',
    symbols: [...V1_BASELINE],
    trades: baselineTrades,
    fromDate,
    toDate,
  });

  const poolExYtl = allSymbols.filter((s) => s !== '6742');
  const symbolsExYtl = bestTwoStockSymbols(
    input.bundle,
    poolExYtl,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const exYtl = buildScenarioRow({
    scenarioId: 'ex_ytl',
    labelJa: `①YTL除外（${symbolsExYtl.join('/')}）`,
    symbols: symbolsExYtl,
    trades: collectExecutedTradesForUniverse(
      input.bundle,
      symbolsExYtl,
      fromDate,
      toDate,
      cachedTemplates,
    ),
    fromDate,
    toDate,
  });

  const poolEx99 = allSymbols.filter((s) => s !== '5326');
  const symbolsEx99 = bestTwoStockSymbols(
    input.bundle,
    poolEx99,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const ex99 = buildScenarioRow({
    scenarioId: 'ex_99',
    labelJa: `②99SM除外（${symbolsEx99.join('/')}）`,
    symbols: symbolsEx99,
    trades: collectExecutedTradesForUniverse(
      input.bundle,
      symbolsEx99,
      fromDate,
      toDate,
      cachedTemplates,
    ),
    fromDate,
    toDate,
  });

  const poolExBoth = allSymbols.filter((s) => s !== '6742' && s !== '5326');
  const symbolsExBoth = bestTwoStockSymbols(
    input.bundle,
    poolExBoth,
    fromDate,
    toDate,
    cachedTemplates,
  );
  const exBoth = buildScenarioRow({
    scenarioId: 'ex_both',
    labelJa: `③YTL+99同時除外（${symbolsExBoth.join('/')}）`,
    symbols: symbolsExBoth,
    trades: collectExecutedTradesForUniverse(
      input.bundle,
      symbolsExBoth,
      fromDate,
      toDate,
      cachedTemplates,
    ),
    fromDate,
    toDate,
  });

  const sectorSymbols = [...MALAYSIA_V2_SECTOR_EQUAL_SYMBOLS].filter((s) =>
    allSymbols.includes(s),
  );
  const sectorEqual = buildScenarioRow({
    scenarioId: 'sector_equal',
    labelJa: `④セクター分散均等（${sectorSymbols.map((s) => SECTOR_LABELS_JA[s] ?? s).join(' · ')}）`,
    symbols: sectorSymbols,
    trades: collectExecutedTradesForUniverse(
      input.bundle,
      sectorSymbols,
      fromDate,
      toDate,
      cachedTemplates,
    ),
    fromDate,
    toDate,
  });

  const scenarios = [baseline, exYtl, ex99, exBoth, sectorEqual];
  const { grade, verdictJa, recommendedId } = gradeMalaysiaV2Adoption({
    baseline,
    exYtl,
    exBoth,
    sectorEqual,
  });

  const ytlDependencyPct =
    baseline.cumulativeReturnPct > 0
      ? round3(
          ((baseline.cumulativeReturnPct - exYtl.cumulativeReturnPct) /
            baseline.cumulativeReturnPct) *
            100,
        )
      : null;

  const fmt = (r: ForwardMalaysiaV2ScenarioRow) =>
    `${r.labelJa}: 累積${r.cumulativeReturnPct}% · WR${r.winRatePct}% · MaxDD${r.maxDrawdownPct}% · MC破産${r.bootstrap.bankruptcyRatePct}% · OOS${r.wfOos.testCumulativePct}%`;

  const answer1Ja = `① YTL除外: ${fmt(exYtl)}`;
  const answer2Ja = `② 99SM除外: ${fmt(ex99)}`;
  const answer3Ja = `③ YTL+99同時除外: ${fmt(exBoth)}`;
  const answer4Ja = `④ セクター分散: ${fmt(sectorEqual)}`;
  const answer5Ja = `⑤ MaxDD: v1=${baseline.maxDrawdownPct}% → ③=${exBoth.maxDrawdownPct}% · ④=${sectorEqual.maxDrawdownPct}%`;
  const answer6Ja = `⑥ Bootstrap MC1000: ${scenarios.map((s) => `${s.scenarioId}破産${s.bootstrap.bankruptcyRatePct}%/p5${s.bootstrap.p5CumulativePct}%`).join(' · ')}`;
  const answer7Ja = `⑦ WF OOS: ${scenarios.map((s) => `${s.scenarioId}劣化${s.wfOos.cumulativeDegradationPct ?? '—'}%/${s.wfOos.overfitVerdictJa}`).join(' | ')}`;

  const consistencyNoteJa =
    '監査64整合: v1 YTL依存リスク検証 · 監査65=v2 · ルール変更なし · 推奨=' + recommendedId;

  const humanSummaryJa = [
    '監査65 Malaysia v2 YTL依存リスク',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `v1基準: 累積${baseline.cumulativeReturnPct}% · YTL依存${ytlDependencyPct ?? '—'}%`,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    answer6Ja,
    answer7Ja,
    verdictJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    v1BaselineSymbols: [...V1_BASELINE],
    scenarios,
    recommendedScenarioId: recommendedId,
    ytlDependencyPct,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answer1Ja,
    answer2Ja,
    answer3Ja,
    answer4Ja,
    answer5Ja,
    answer6Ja,
    answer7Ja,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMalaysiaV2Audit(): Promise<ForwardMalaysiaV2AuditReport | null> {
  const bundle = await fetchMalaysiaV1AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV2AuditReport({ bundle });
}

export function formatMalaysiaV2Csv(report: ForwardMalaysiaV2AuditReport): string {
  const lines = [
    `# 最重要監査その65 Malaysia v2 YTL依存 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# YTL依存${report.ytlDependencyPct ?? '—'}% · ${report.adoptionVerdictJa}`,
    '',
    'section,scenarioId,label,symbols,trades,cumulative,winRate,PF,sharpe,maxDD,cagr',
    ...report.scenarios.map((s) =>
      [
        'scenario',
        s.scenarioId,
        `"${s.labelJa}"`,
        `"${s.symbols.join('/')}"`,
        s.tradeCount,
        s.cumulativeReturnPct,
        s.winRatePct,
        s.profitFactor ?? '',
        s.sharpe ?? '',
        s.maxDrawdownPct ?? '',
        s.cagr ?? '',
      ].join(','),
    ),
    '',
    'section,scenarioId,bankruptcyRate,p5Cum,worstMaxDD,meanCum',
    ...report.scenarios.map((s) =>
      [
        'bootstrap',
        s.scenarioId,
        s.bootstrap.bankruptcyRatePct,
        s.bootstrap.p5CumulativePct,
        s.bootstrap.worstMaxDrawdownPct,
        s.bootstrap.meanCumulativePct,
      ].join(','),
    ),
    '',
    'section,scenarioId,trainCum,testCum,degradation,testWR,overfit',
    ...report.scenarios.map((s) =>
      [
        'wf_oos',
        s.scenarioId,
        s.wfOos.trainCumulativePct,
        s.wfOos.testCumulativePct,
        s.wfOos.cumulativeDegradationPct ?? '',
        s.wfOos.testWinRatePct,
        `"${s.wfOos.overfitVerdictJa}"`,
      ].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', '1', `"${report.answer1Ja}"`].join(','),
    ['answer', '2', `"${report.answer2Ja}"`].join(','),
    ['answer', '3', `"${report.answer3Ja}"`].join(','),
    ['answer', '4', `"${report.answer4Ja}"`].join(','),
    ['answer', '5', `"${report.answer5Ja}"`].join(','),
    ['answer', '6', `"${report.answer6Ja}"`].join(','),
    ['answer', '7', `"${report.answer7Ja}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['verdict', 'recommended', report.recommendedScenarioId].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
