/**
 * 最重要監査その60 — Kelly発火条件最適化 · 監査59固定 · 発火率20-40% · ルール変更なし
 */
import type {
  ForwardKellyTriggerAdoptionGrade,
  ForwardKellyTriggerAuditReport,
  ForwardKellyTriggerPresetId,
  ForwardKellyTriggerPresetMetrics,
  ForwardKellyTriggerRm700Baseline,
} from '../../types/forwardValidation';
import { enrichVirtualMarketTrades } from './forwardValidationMarketChangeAudit';
import {
  type DynamicLotEnrichedTrade,
  KELLY25_SPEC,
  RM700_SPEC,
} from './forwardValidationDynamicLotAudit';
import {
  estimateBankruptcyRatePct,
  simulateLotSizingPath,
  type LotPathResult,
  type LotSizingSpec,
} from './forwardValidationLotSizeAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  fetchRobustnessAuditBundle,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { OhlcvBar } from './case4Indicators';

const RM3000 = 3000;
const MC_RUNS = 1000;
const TARGET_LOW_PCT = 20;
const TARGET_HIGH_PCT = 40;

const FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

export type KellyTriggerThresholds = {
  vixMin: number;
  qqqMa200MaxPct: number;
  ndx52wMaxPct: number;
};

export const KELLY_TRIGGER_PRESETS: {
  presetId: ForwardKellyTriggerPresetId;
  labelJa: string;
  conditionJa: string;
  thresholds: KellyTriggerThresholds;
}[] = [
  {
    presetId: 'current',
    labelJa: '① 現行',
    conditionJa: 'VIX≥30 OR QQQ200MA≤-10% OR NASDAQ52w≤-15%',
    thresholds: { vixMin: 30, qqqMa200MaxPct: -10, ndx52wMaxPct: -15 },
  },
  {
    presetId: 'strict',
    labelJa: '② 厳格',
    conditionJa: 'VIX≥35 OR QQQ200MA≤-15% OR NASDAQ52w≤-20%',
    thresholds: { vixMin: 35, qqqMa200MaxPct: -15, ndx52wMaxPct: -20 },
  },
  {
    presetId: 'ultra_strict',
    labelJa: '③ 超厳格',
    conditionJa: 'VIX≥40 OR QQQ200MA≤-20% OR NASDAQ52w≤-25%',
    thresholds: { vixMin: 40, qqqMa200MaxPct: -20, ndx52wMaxPct: -25 },
  },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function isKellyTriggerForPreset(
  trade: DynamicLotEnrichedTrade,
  thresholds: KellyTriggerThresholds,
): boolean {
  if ((trade.vixAtSignal ?? 0) >= thresholds.vixMin) return true;
  if ((trade.qqqMa200DevPct ?? 0) <= thresholds.qqqMa200MaxPct) return true;
  if ((trade.ndxDist52Pct ?? 0) <= thresholds.ndx52wMaxPct) return true;
  return false;
}

export function resolveKellyTriggerSpec(
  trade: DynamicLotEnrichedTrade,
  thresholds: KellyTriggerThresholds,
): LotSizingSpec {
  return isKellyTriggerForPreset(trade, thresholds) ? KELLY25_SPEC : RM700_SPEC;
}

function simulateRm700Baseline(input: {
  trades: DynamicLotEnrichedTrade[];
  symbols: string[];
  mcRuns: number;
}): { path: LotPathResult; bankruptcyRatePct: number } {
  const path = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
  });
  const bankruptcyRatePct = estimateBankruptcyRatePct({
    trades: input.trades,
    symbols: input.symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
    runs: input.mcRuns,
  });
  return { path, bankruptcyRatePct };
}

function simulatePreset(input: {
  preset: (typeof KELLY_TRIGGER_PRESETS)[number];
  trades: DynamicLotEnrichedTrade[];
  symbols: string[];
  mcRuns: number;
  rm700: ForwardKellyTriggerRm700Baseline;
}): ForwardKellyTriggerPresetMetrics {
  const { thresholds } = input.preset;
  const resolveSpec = (trade: DynamicLotEnrichedTrade) =>
    resolveKellyTriggerSpec(trade, thresholds);
  const kellyTriggerCount = input.trades.filter((t) =>
    isKellyTriggerForPreset(t, thresholds),
  ).length;
  const path = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
    resolveSpec,
  });
  const bankruptcyRatePct = estimateBankruptcyRatePct({
    trades: input.trades,
    symbols: input.symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
    runs: input.mcRuns,
    resolveSpec,
  });
  const triggerRate = round3((kellyTriggerCount / input.trades.length) * 100);
  const deltaCum = round3(path.cumulativeReturnPct - input.rm700.cumulativeReturnPct);
  const deltaDd = round3(
    Math.abs(input.rm700.maxDrawdownPct) - Math.abs(path.maxDrawdownPct),
  );
  const deltaSharpe =
    path.sharpe != null && input.rm700.sharpe != null
      ? round3(path.sharpe - input.rm700.sharpe)
      : null;

  return {
    presetId: input.preset.presetId,
    labelJa: input.preset.labelJa,
    conditionJa: input.preset.conditionJa,
    vixMin: thresholds.vixMin,
    qqqMa200ThresholdPct: thresholds.qqqMa200MaxPct,
    ndx52wThresholdPct: thresholds.ndx52wMaxPct,
    tradeCount: path.tradeCount,
    kellyTriggerCount,
    kellyTriggerRatePct: triggerRate,
    cumulativeReturnPct: path.cumulativeReturnPct,
    maxDrawdownPct: path.maxDrawdownPct,
    sharpe: path.sharpe,
    profitFactor: path.profitFactor,
    bankruptcyRatePct,
    minEquityPct: path.minEquityPct,
    finalEquityMYR: path.finalEquity,
    avgSlotMYR: path.avgSlotMYR,
    deltaCumulativeVsRm700Pt: deltaCum,
    deltaMaxDDVsRm700Pt: deltaDd,
    deltaSharpeVsRm700: deltaSharpe,
    inTargetTriggerBand: triggerRate >= TARGET_LOW_PCT && triggerRate <= TARGET_HIGH_PCT,
  };
}

export function pickOptimalKellyPreset(
  rows: ForwardKellyTriggerPresetMetrics[],
): ForwardKellyTriggerPresetMetrics | null {
  if (rows.length === 0) return null;

  const scoreRow = (r: ForwardKellyTriggerPresetMetrics): number => {
    const targetMid = (TARGET_LOW_PCT + TARGET_HIGH_PCT) / 2;
    const bandPenalty = r.inTargetTriggerBand
      ? 0
      : Math.min(Math.abs(r.kellyTriggerRatePct - TARGET_LOW_PCT), Math.abs(r.kellyTriggerRatePct - TARGET_HIGH_PCT));
    const bandBonus = r.inTargetTriggerBand ? 20 - Math.abs(r.kellyTriggerRatePct - targetMid) : 0;
    return (
      bandBonus +
      r.deltaMaxDDVsRm700Pt * 3 +
      r.deltaCumulativeVsRm700Pt * 0.5 +
      (r.deltaSharpeVsRm700 ?? 0) * 2 -
      bandPenalty * 0.8
    );
  };

  return [...rows].sort((a, b) => scoreRow(b) - scoreRow(a))[0] ?? null;
}

export function gradeKellyTriggerAdoption(input: {
  optimal: ForwardKellyTriggerPresetMetrics | null;
  rm700: ForwardKellyTriggerRm700Baseline;
}): { grade: ForwardKellyTriggerAdoptionGrade; verdictJa: string } {
  const { optimal, rm700 } = input;
  if (!optimal) {
    return { grade: 'C', verdictJa: 'C 不採用 — 最適条件未特定 · 現行RM700維持' };
  }

  const inBand = optimal.inTargetTriggerBand;
  const ddOk = optimal.deltaMaxDDVsRm700Pt >= 0.5;
  const cumOk = optimal.deltaCumulativeVsRm700Pt >= -1.5;
  const bkOk = optimal.bankruptcyRatePct <= rm700.bankruptcyRatePct;

  if (inBand && ddOk && cumOk && bkOk && optimal.deltaMaxDDVsRm700Pt >= 1) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${optimal.labelJa} · 発火${optimal.kellyTriggerRatePct}% · MaxDD改善${optimal.deltaMaxDDVsRm700Pt}pt · 累積差${optimal.deltaCumulativeVsRm700Pt}pt`,
    };
  }

  if ((inBand || optimal.kellyTriggerRatePct < 73) && (ddOk || optimal.deltaMaxDDVsRm700Pt >= 0.3)) {
    return {
      grade: 'B',
      verdictJa: `B 参考 — ${optimal.labelJa} · 発火${optimal.kellyTriggerRatePct}% · MaxDD改善${optimal.deltaMaxDDVsRm700Pt}pt · 累積差${optimal.deltaCumulativeVsRm700Pt}pt · 現行RM700維持も可`,
    };
  }

  return {
    grade: 'C',
    verdictJa: `C 不採用 — 発火率${optimal.kellyTriggerRatePct}% · 改善不足 · 現行RM700維持（監査53/59整合）`,
  };
}

export function buildKellyTriggerAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  tnxBars: OhlcvBar[];
  fromDate?: string;
  auditedAt?: string;
  mcRuns?: number;
}): ForwardKellyTriggerAuditReport | null {
  const symbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.bundle.fetchedSymbols.includes(s),
  );
  if (symbols.length < 2) return null;

  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const mcRuns = input.mcRuns ?? MC_RUNS;

  const executed = collectFullHistoryExecutedTrades(input.bundle, fromDate, toDate);
  const enriched = enrichVirtualMarketTrades(executed, input.bundle, input.tnxBars);

  const { path: rm700Path, bankruptcyRatePct: rm700Bk } = simulateRm700Baseline({
    trades: enriched,
    symbols,
    mcRuns,
  });
  const rm700Baseline: ForwardKellyTriggerRm700Baseline = {
    tradeCount: rm700Path.tradeCount,
    cumulativeReturnPct: rm700Path.cumulativeReturnPct,
    maxDrawdownPct: rm700Path.maxDrawdownPct,
    sharpe: rm700Path.sharpe,
    profitFactor: rm700Path.profitFactor,
    bankruptcyRatePct: rm700Bk,
    finalEquityMYR: rm700Path.finalEquity,
  };

  const presetRows = KELLY_TRIGGER_PRESETS.map((preset) =>
    simulatePreset({ preset, trades: enriched, symbols, mcRuns, rm700: rm700Baseline }),
  );

  const optimal = pickOptimalKellyPreset(presetRows);
  const { grade, verdictJa } = gradeKellyTriggerAdoption({ optimal, rm700: rm700Baseline });

  const answerAJa = optimal
    ? `A 最適発火条件: ${optimal.labelJa} — ${optimal.conditionJa}`
    : 'A 最適発火条件: 未特定 — 評価C';

  const answerBJa = optimal
    ? `B 発火率: ${optimal.kellyTriggerRatePct}%（${optimal.kellyTriggerCount}/${enriched.length}件）· 目標${TARGET_LOW_PCT}-${TARGET_HIGH_PCT}% · ${optimal.inTargetTriggerBand ? '帯内' : '帯外'}`
    : `B 発火率: — · 目標${TARGET_LOW_PCT}-${TARGET_HIGH_PCT}%`;

  const answerCJa = optimal
    ? `C RM700との差: 累積${optimal.deltaCumulativeVsRm700Pt >= 0 ? '+' : ''}${optimal.deltaCumulativeVsRm700Pt}pt · MaxDD+${optimal.deltaMaxDDVsRm700Pt}pt · Sharpe${(optimal.deltaSharpeVsRm700 ?? 0) >= 0 ? '+' : ''}${optimal.deltaSharpeVsRm700 ?? '—'} · 破産${optimal.bankruptcyRatePct}%`
    : 'C RM700との差: —';

  const answerDJa = optimal
    ? `D 採用価値: ${optimal.inTargetTriggerBand ? '発火率適正' : '発火率未達'} · MaxDD${optimal.deltaMaxDDVsRm700Pt >= 1 ? '有意改善' : '微改善'} · 評価${grade}`
    : 'D 採用価値: 低 — 評価C';

  const answerEJa = `E 最終判定: ${grade} — ${verdictJa.replace(/^[ABC] /, '')}`;

  const consistencyNoteJa =
    '監査39-59整合: ルール変更なし · 監査59発火73%過多 → 本監査20-40%最適化 · 監査53 RM700基準 · MC' +
    mcRuns +
    '回';

  const presetSummary = presetRows
    .map(
      (r) =>
        `${r.labelJa}発火${r.kellyTriggerRatePct}%·累積${r.cumulativeReturnPct}%·MaxDD${r.maxDrawdownPct}%`,
    )
    .join(' · ');

  const humanSummaryJa = [
    '監査60 Kelly発火条件最適化',
    FIXED_CONDITIONS_JA,
    `全期間${enriched.length}取引 · 目標発火${TARGET_LOW_PCT}-${TARGET_HIGH_PCT}%`,
    `RM700基準累積${rm700Baseline.cumulativeReturnPct}% · MaxDD${rm700Baseline.maxDrawdownPct}%`,
    presetSummary,
    verdictJa,
    answerAJa,
    answerBJa,
    answerEJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    referenceCapitalMYR: RM3000,
    fullHistoryTradeCount: enriched.length,
    targetTriggerRateLowPct: TARGET_LOW_PCT,
    targetTriggerRateHighPct: TARGET_HIGH_PCT,
    rm700Baseline,
    presetRows,
    optimalPresetId: optimal?.presetId ?? null,
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

export async function runKellyTriggerAudit(): Promise<ForwardKellyTriggerAuditReport | null> {
  const bundle = await fetchRobustnessAuditBundle();
  if (!bundle) return null;
  const tnxFetch = await fetchForwardOhlcvDetailed('^TNX', 15_000, EXTENDED_AUDIT_START);
  const tnxBars = tnxFetch.result.ok ? tnxFetch.bars : [];
  return buildKellyTriggerAuditReport({ bundle, tnxBars });
}

export function formatKellyTriggerCsv(report: ForwardKellyTriggerAuditReport): string {
  const b = report.rm700Baseline;
  const lines = [
    `# 最重要監査その60 Kelly発火条件最適化 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# 目標発火率${report.targetTriggerRateLowPct}-${report.targetTriggerRateHighPct}% · ${report.adoptionVerdictJa}`,
    '',
    'section,baseline,trades,cumulative,maxDD,sharpe,pf,bankruptcyPct,finalMYR',
    [
      'rm700',
      'RM700固定基準',
      b.tradeCount,
      b.cumulativeReturnPct,
      b.maxDrawdownPct,
      b.sharpe ?? '',
      b.profitFactor ?? '',
      b.bankruptcyRatePct,
      b.finalEquityMYR,
    ].join(','),
    '',
    'section,presetId,label,condition,vixMin,qqqMa200,ndx52w,triggers,triggerPct,cumulative,maxDD,sharpe,pf,bankruptcyPct,deltaCum,deltaDD,inBand',
    ...report.presetRows.map((r) =>
      [
        'preset',
        r.presetId,
        `"${r.labelJa}"`,
        `"${r.conditionJa}"`,
        r.vixMin,
        r.qqqMa200ThresholdPct,
        r.ndx52wThresholdPct,
        r.kellyTriggerCount,
        r.kellyTriggerRatePct,
        r.cumulativeReturnPct,
        r.maxDrawdownPct,
        r.sharpe ?? '',
        r.profitFactor ?? '',
        r.bankruptcyRatePct,
        r.deltaCumulativeVsRm700Pt,
        r.deltaMaxDDVsRm700Pt,
        r.inTargetTriggerBand ? 1 : 0,
      ].join(','),
    ),
    '',
    'section,key,value',
    ['verdict', 'adoptionGrade', report.adoptionGrade].join(','),
    ['verdict', 'optimalPresetId', report.optimalPresetId ?? ''].join(','),
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
