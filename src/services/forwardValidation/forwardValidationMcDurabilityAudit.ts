/**
 * 最重要監査その61 — モンテカルロ耐久監査 · RM700固定@RM3000 · 1000回 · 監査のみ
 */
import type {
  ForwardMcDurabilityAuditReport,
  ForwardMcDurabilityBaseline,
  ForwardMcDurabilityOperationalGrade,
  ForwardMcDurabilitySummary,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { isRuinPath } from './forwardValidationDurabilityAudit';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
import {
  collectFullHistoryExecutedTrades,
  mulberry32,
  percentile,
  shuffleInPlace,
} from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const MC_DURABILITY_RUNS = 1000;
const RM3000 = 3000;
const RM700 = 700;
const MC_SEED = 61_001;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

const STRATEGY_LABEL_JA = '現行採用戦略 · RM700固定/枠 · 資金RM3000';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function runRm700MonteCarlo(input: {
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  runs?: number;
  seed?: number;
  initialCapitalMYR?: number;
}): ForwardMcDurabilitySummary {
  const runs = input.runs ?? MC_DURABILITY_RUNS;
  const rand = mulberry32(input.seed ?? MC_SEED);
  const capital = input.initialCapitalMYR ?? RM3000;
  const cumulatives: number[] = [];
  const maxDds: number[] = [];
  let bankrupt = 0;

  for (let i = 0; i < runs; i++) {
    const shuffled = shuffleInPlace([...input.trades], rand);
    const path = simulateLotSizingPath({
      trades: shuffled,
      symbols: input.symbols,
      spec: RM700_SPEC,
      initialCapitalMYR: capital,
    });
    cumulatives.push(path.cumulativeReturnPct);
    maxDds.push(path.maxDrawdownPct);
    if (isRuinPath(path)) bankrupt++;
  }

  const sortedCum = [...cumulatives].sort((a, b) => a - b);
  const sortedDd = [...maxDds].sort((a, b) => a - b);

  return {
    runs,
    meanCumulativePct: mean(cumulatives) ?? 0,
    medianCumulativePct: percentile(sortedCum, 50),
    worstCumulativePct: sortedCum[0] ?? 0,
    p5CumulativePct: percentile(sortedCum, 5),
    p1CumulativePct: percentile(sortedCum, 1),
    meanMaxDrawdownPct: mean(maxDds) ?? 0,
    worstMaxDrawdownPct: sortedDd[0] ?? 0,
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    bankruptCount: bankrupt,
  };
}

export function gradeMcDurabilityOperational(input: {
  mc: ForwardMcDurabilitySummary;
  baseline: ForwardMcDurabilityBaseline;
}): { grade: ForwardMcDurabilityOperationalGrade; verdictJa: string } {
  const { mc, baseline } = input;

  if (
    mc.bankruptcyRatePct === 0 &&
    mc.p5CumulativePct > 10 &&
    mc.worstCumulativePct > 0 &&
    mc.worstMaxDrawdownPct > -40 &&
    baseline.minEquityPct > 70
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — 破産0% · 5%分位${mc.p5CumulativePct}% · 最悪累積${mc.worstCumulativePct}% · RM700@RM3000`,
    };
  }

  if (
    mc.bankruptcyRatePct <= 1 &&
    mc.p5CumulativePct > 0 &&
    mc.worstCumulativePct > -15 &&
    mc.worstMaxDrawdownPct > -50
  ) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — 破産${mc.bankruptcyRatePct}% · 5%分位${mc.p5CumulativePct}% · 最悪累積${mc.worstCumulativePct}%`,
    };
  }

  if (mc.bankruptcyRatePct <= 5 && mc.worstCumulativePct > -30) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 破産${mc.bankruptcyRatePct}% · 5%分位${mc.p5CumulativePct}% · ロット縮小検討`,
    };
  }

  return {
    grade: 'D',
    verdictJa: `D 不採用 — 破産${mc.bankruptcyRatePct}% · 最悪累積${mc.worstCumulativePct}% · ルール見直し`,
  };
}

export function buildMcDurabilityAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
  runs?: number;
}): ForwardMcDurabilityAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const runs = input.runs ?? MC_DURABILITY_RUNS;

  const trades = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const baselinePath = simulateLotSizingPath({
    trades,
    symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
  });

  const baseline: ForwardMcDurabilityBaseline = {
    tradeCount: baselinePath.tradeCount,
    cumulativeReturnPct: baselinePath.cumulativeReturnPct,
    maxDrawdownPct: baselinePath.maxDrawdownPct,
    sharpe: baselinePath.sharpe,
    profitFactor: baselinePath.profitFactor,
    minEquityPct: baselinePath.minEquityPct,
    finalEquityMYR: baselinePath.finalEquity,
  };

  const monteCarlo = runRm700MonteCarlo({ trades, symbols, runs });

  const { grade, verdictJa } = gradeMcDurabilityOperational({ mc: monteCarlo, baseline });

  const answerAJa = `A 破産率: ${monteCarlo.bankruptcyRatePct}%（${monteCarlo.bankruptCount}/${monteCarlo.runs}回）· 評価${monteCarlo.bankruptcyRatePct === 0 ? 'A' : monteCarlo.bankruptcyRatePct <= 1 ? 'B' : 'C'}`;

  const answerBJa = `B 最悪ケース: 累積${monteCarlo.worstCumulativePct}% · MaxDD${monteCarlo.worstMaxDrawdownPct}% · 1%分位累積${monteCarlo.p1CumulativePct}%`;

  const answerCJa = `C 5%分位: 累積${monteCarlo.p5CumulativePct}% · 中央値${monteCarlo.medianCumulativePct}% · 平均${monteCarlo.meanCumulativePct}%`;

  const answerDJa =
    `D RM3000妥当性: ${grade === 'A' || grade === 'B' ? '妥当' : grade === 'C' ? '条件付き' : '不十分'} · ` +
    `RM700/枠 · 最終RM${baseline.finalEquityMYR} · 最低資産${baseline.minEquityPct}% · 実績累積${baseline.cumulativeReturnPct}%`;

  const answerEJa = `E 最終判定: ${grade} — ${verdictJa.replace(/^[ABCD] /, '')}`;

  const consistencyNoteJa =
    '監査39-60整合: 現行採用RM700固定 · 監査53/60不採用動的Kelly · MC' +
    runs +
    '回 · ルール変更なし';

  const humanSummaryJa = [
    '監査61 モンテカルロ耐久',
    FIXED_CONDITIONS_JA,
    STRATEGY_LABEL_JA,
    `取引${trades.length}件 · MC${runs}回`,
    `実績累積${baseline.cumulativeReturnPct}% · MaxDD${baseline.maxDrawdownPct}%`,
    `MC平均累積${monteCarlo.meanCumulativePct}% · 中央値${monteCarlo.medianCumulativePct}% · 5%分位${monteCarlo.p5CumulativePct}%`,
    `MC最悪累積${monteCarlo.worstCumulativePct}% · 平均MaxDD${monteCarlo.meanMaxDrawdownPct}% · 最悪MaxDD${monteCarlo.worstMaxDrawdownPct}%`,
    verdictJa,
    answerAJa,
    answerCJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    strategyLabelJa: STRATEGY_LABEL_JA,
    referenceCapitalMYR: RM3000,
    lotPerSlotMYR: RM700,
    tradeCount: trades.length,
    baseline,
    monteCarlo,
    operationalGrade: grade,
    operationalVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMcDurabilityAudit(): Promise<ForwardMcDurabilityAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  return buildMcDurabilityAuditReport({ bundle });
}

export function formatMcDurabilityCsv(report: ForwardMcDurabilityAuditReport): string {
  const b = report.baseline;
  const m = report.monteCarlo;
  const lines = [
    `# 最重要監査その61 モンテカルロ耐久 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.strategyLabelJa} · ${report.operationalVerdictJa}`,
    '',
    'section,metric,value',
    ['baseline', 'trades', b.tradeCount].join(','),
    ['baseline', 'cumulativePct', b.cumulativeReturnPct].join(','),
    ['baseline', 'maxDDPct', b.maxDrawdownPct].join(','),
    ['baseline', 'sharpe', b.sharpe ?? ''].join(','),
    ['baseline', 'profitFactor', b.profitFactor ?? ''].join(','),
    ['baseline', 'minEquityPct', b.minEquityPct].join(','),
    ['baseline', 'finalMYR', b.finalEquityMYR].join(','),
    '',
    'section,metric,value',
    ['mc', 'runs', m.runs].join(','),
    ['mc', 'meanCumulativePct', m.meanCumulativePct].join(','),
    ['mc', 'medianCumulativePct', m.medianCumulativePct].join(','),
    ['mc', 'worstCumulativePct', m.worstCumulativePct].join(','),
    ['mc', 'p5CumulativePct', m.p5CumulativePct].join(','),
    ['mc', 'p1CumulativePct', m.p1CumulativePct].join(','),
    ['mc', 'meanMaxDrawdownPct', m.meanMaxDrawdownPct].join(','),
    ['mc', 'worstMaxDrawdownPct', m.worstMaxDrawdownPct].join(','),
    ['mc', 'bankruptcyRatePct', m.bankruptcyRatePct].join(','),
    ['mc', 'bankruptCount', m.bankruptCount].join(','),
    '',
    'section,key,value',
    ['verdict', 'operationalGrade', report.operationalGrade].join(','),
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
