/**
 * 最重要監査その68 — Malaysia v2.1 ウェイト最適化 · 監査67固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV2WeightAuditReport,
  ForwardMalaysiaV2WeightGrade,
  ForwardMalaysiaV2WeightPatternId,
  ForwardMalaysiaV2WeightPatternRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import {
  collectExecutedTradesForUniverse,
  fetchMalaysiaV1AuditBundle,
  fetchYahooDividends,
  MALAYSIA_V1_AUDIT_START,
  MALAYSIA_V1_UNIVERSE,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import {
  simulateRm3000WeightedPath,
  type SymbolWeightSchemeDef,
} from './forwardValidationSymbolWeightAudit';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_68_RUNS = 10_000;
const RM3000 = 3000;
const CASH_RESERVE_PCT = 15;
const DEPLOYABLE_SCALE = (100 - CASH_RESERVE_PCT) / 100;
const BOOTSTRAP_SEED = 68_001;
const WF_TRAIN_PCT = 70;
const RUIN_EQUITY_PCT = 50;

export const MALAYSIA_V21_UNIVERSE = ['5347', '5398', '1023'] as const;

export const MALAYSIA_V2_WEIGHT_PATTERNS: {
  patternId: ForwardMalaysiaV2WeightPatternId;
  labelJa: string;
  weights: Record<string, number>;
}[] = [
  {
    patternId: 'w33_33_33',
    labelJa: '① 33/33/33',
    weights: { '5347': 33, '5398': 33, '1023': 33 },
  },
  {
    patternId: 'w20_60_20',
    labelJa: '② 20/60/20',
    weights: { '5347': 20, '5398': 60, '1023': 20 },
  },
  {
    patternId: 'w15_70_15',
    labelJa: '③ 15/70/15',
    weights: { '5347': 15, '5398': 70, '1023': 15 },
  },
  {
    patternId: 'w25_50_25',
    labelJa: '④ 25/50/25',
    weights: { '5347': 25, '5398': 50, '1023': 25 },
  },
  {
    patternId: 'w10_80_10',
    labelJa: '⑤ 10/80/10',
    weights: { '5347': 10, '5398': 80, '1023': 10 },
  },
  {
    patternId: 'w40_40_20',
    labelJa: '⑥ 40/40/20',
    weights: { '5347': 40, '5398': 40, '1023': 20 },
  },
  {
    patternId: 'w40_50_10',
    labelJa: '⑦ 40/50/10',
    weights: { '5347': 40, '5398': 50, '1023': 10 },
  },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
};

const FIXED_CONDITIONS_JA =
  'MY v2.1ウェイト · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700@RM3000 · 5347+5398+1023';

type DividendEvent = { date: string; amount: number };

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

function resolveAuditFromDate(toDate: string): string {
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  return computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START;
}

function dividendAccrualPct(
  dividends: DividendEvent[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): number {
  if (entryPrice <= 0) return 0;
  const divs = dividends.filter((d) => d.date > entryDate && d.date <= exitDate);
  return round3((divs.reduce((s, d) => s + d.amount, 0) / entryPrice) * 100);
}

function weightMultiplier(weights: Record<string, number>, symbol: string): number {
  const avg =
    mean(MALAYSIA_V21_UNIVERSE.map((s) => weights[s] ?? 0)) ?? 100 / MALAYSIA_V21_UNIVERSE.length;
  const w = weights[symbol] ?? avg;
  return avg > 0 ? w / avg : 1;
}

function applySlotWeightsToTrades(
  trades: ForwardPassedTradeRecord[],
  weights: Record<string, number>,
): ForwardPassedTradeRecord[] {
  return trades.map((t) => ({
    ...t,
    returnPct: round3(t.returnPct * weightMultiplier(weights, t.symbol)),
  }));
}

function buildWeightSchemeDef(weights: Record<string, number>): SymbolWeightSchemeDef {
  return {
    schemeId: 'equal',
    labelJa: 'MY v2.1 slot weight',
    universe: [...MALAYSIA_V21_UNIVERSE],
    selectionMode: 'win_rate',
    slotMode: 'weight_proportional',
    slotWeights: weights,
  };
}

function weightedSymbolDependencyPct(
  trades: ForwardPassedTradeRecord[],
  weights: Record<string, number>,
): Record<string, number> {
  const bySym = new Map<string, number>();
  for (const t of trades) {
    const mult = weightMultiplier(weights, t.symbol);
    bySym.set(t.symbol, (bySym.get(t.symbol) ?? 0) + t.returnPct * DEPLOYABLE_SCALE * mult);
  }
  const total = [...bySym.values()].reduce((s, v) => s + Math.max(v, 0), 0);
  const out: Record<string, number> = {};
  for (const [sym, val] of bySym) {
    out[sym] = total > 0 ? round3((Math.max(val, 0) / total) * 100) : 0;
  }
  return out;
}

function maxSingleDependencyPct(dep: Record<string, number>): number {
  return Math.max(0, ...Object.values(dep));
}

function formatWeightLabel(weights: Record<string, number>): string {
  return MALAYSIA_V21_UNIVERSE.map(
    (s) => `${SYMBOL_NAMES[s] ?? s}${weights[s] ?? 0}%`,
  ).join('/');
}

function isWeightedRuinPath(path: {
  minEquityMYR: number;
  finalEquityMYR: number;
}): boolean {
  const minPct = (path.minEquityMYR / RM3000) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

export function runBootstrapMonteCarloWeighted(input: {
  pool: ForwardPassedTradeRecord[];
  weights: Record<string, number>;
  runs?: number;
  seed?: number;
}): ForwardMalaysiaV2WeightPatternRow['bootstrap'] {
  const runs = input.runs ?? BOOTSTRAP_MC_68_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const def = buildWeightSchemeDef(input.weights);
  const cumulatives: number[] = [];
  const maxDds: number[] = [];
  let bankrupt = 0;

  for (let r = 0; r < runs; r++) {
    const sample = bootstrapSampleTrades(input.pool, rand, r);
    const path = simulateRm3000WeightedPath(sample, def);
    cumulatives.push(path.cumulativeReturnPct);
    maxDds.push(path.maxDrawdownPct);
    if (isWeightedRuinPath(path)) bankrupt++;
  }

  const sortedCum = [...cumulatives].sort((a, b) => a - b);
  const sortedDd = [...maxDds].sort((a, b) => a - b);

  return {
    runs,
    bankruptcyRatePct: round3((bankrupt / runs) * 100),
    p5CumulativePct: percentile(sortedCum, 5),
    worstCumulativePct: sortedCum[0] ?? 0,
    worstMaxDrawdownPct: sortedDd[0] ?? 0,
  };
}

function buildPatternRow(input: {
  patternId: ForwardMalaysiaV2WeightPatternId;
  labelJa: string;
  weights: Record<string, number>;
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  dividendMap: Record<string, DividendEvent[]>;
  seedOffset: number;
}): ForwardMalaysiaV2WeightPatternRow {
  const { patternId, labelJa, weights, trades, fromDate, toDate, dividendMap, seedOffset } =
    input;
  const weightedTrades = applySlotWeightsToTrades(trades, weights);
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, weightedTrades);
  const years = calendarYears(fromDate, toDate);
  const cagr =
    phase.cumulativeReturnPct > -100
      ? round3((Math.pow(1 + phase.cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;

  const divReturns = weightedTrades.map((t) =>
    round3(
      t.returnPct +
        dividendAccrualPct(dividendMap[t.symbol] ?? [], t.entryDate, t.exitDate, t.entryPrice) *
          weightMultiplier(weights, t.symbol),
    ),
  );
  const cumulativeWithDividendPct = round3(
    divReturns.reduce((s, r) => s + r, 0) * DEPLOYABLE_SCALE,
  );

  const path = simulateRm3000WeightedPath(trades, buildWeightSchemeDef(weights));

  const mc = runBootstrapMonteCarloWeighted({
    pool: trades,
    weights,
    runs: BOOTSTRAP_MC_68_RUNS,
    seed: BOOTSTRAP_SEED + seedOffset,
  });

  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const trainTrades = applySlotWeightsToTrades(
    tradesInSignalRange(trades, split.trainFrom, split.trainTo),
    weights,
  );
  const testTrades = applySlotWeightsToTrades(
    tradesInSignalRange(trades, split.testFrom, split.testTo),
    weights,
  );
  const train = buildWalkForward31PhaseMetrics('train', split.trainFrom, split.trainTo, trainTrades);
  const test = buildWalkForward31PhaseMetrics('test', split.testFrom, split.testTo, testTrades);
  const cumulativeDegradationPct = degradationPct(
    train.cumulativeReturnPct,
    test.cumulativeReturnPct,
  );

  const symDep = weightedSymbolDependencyPct(trades, weights);

  return {
    patternId,
    labelJa,
    weights: { ...weights },
    weightLabelJa: formatWeightLabel(weights),
    tradeCount: phase.tradeCount,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    cumulativeWithDividendPct,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: path.sharpe ?? phase.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    cagr,
    bootstrap: mc,
    wfOos: {
      trainCumulativePct: train.cumulativeReturnPct,
      testCumulativePct: test.cumulativeReturnPct,
      cumulativeDegradationPct,
      overfitVerdictJa: judgeWf7030Overfit({ train, test, cumulativeDegradationPct }),
    },
    symbolDependencyPct: symDep,
    maxSingleDependencyPct: maxSingleDependencyPct(symDep),
  };
}

function operationalScore(row: ForwardMalaysiaV2WeightPatternRow): number {
  const deg = row.wfOos.cumulativeDegradationPct ?? 50;
  const dd = Math.abs(row.maxDrawdownPct ?? 99);
  return (
    row.bootstrap.p5CumulativePct * 2 +
    row.bootstrap.worstCumulativePct +
    row.wfOos.testCumulativePct +
    (row.sharpe ?? 0) * 5 -
    deg * 0.3 -
    dd * 0.2 -
    row.maxSingleDependencyPct * 0.6
  );
}

export function pickRecommendedWeightPattern(
  patterns: ForwardMalaysiaV2WeightPatternRow[],
): ForwardMalaysiaV2WeightPatternId {
  const eligible = patterns.filter(
    (p) =>
      p.maxSingleDependencyPct < 60 &&
      p.bootstrap.bankruptcyRatePct === 0 &&
      p.wfOos.testCumulativePct > 0 &&
      p.cumulativeReturnPct > 0,
  );
  if (eligible.length === 0) {
    return [...patterns].sort((a, b) => operationalScore(b) - operationalScore(a))[0]!.patternId;
  }
  return [...eligible].sort((a, b) => operationalScore(b) - operationalScore(a))[0]!.patternId;
}

export function pickAdoptedWeightPattern(input: {
  patterns: ForwardMalaysiaV2WeightPatternRow[];
  recommendedId: ForwardMalaysiaV2WeightPatternId;
  dependencyUnder60Pct: boolean;
}): ForwardMalaysiaV2WeightPatternId {
  const rec = input.patterns.find((p) => p.patternId === input.recommendedId)!;
  if (
    input.dependencyUnder60Pct &&
    rec.bootstrap.bankruptcyRatePct === 0 &&
    rec.wfOos.testCumulativePct > 0
  ) {
    return input.recommendedId;
  }
  const baseline = input.patterns.find((p) => p.patternId === 'w33_33_33')!;
  if (rec.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.85) {
    return input.recommendedId;
  }
  return baseline.patternId;
}

export function gradeMalaysiaV2Weight(input: {
  patterns: ForwardMalaysiaV2WeightPatternRow[];
  recommendedId: ForwardMalaysiaV2WeightPatternId;
  adoptedId: ForwardMalaysiaV2WeightPatternId;
  dependencyUnder60Pct: boolean;
}): { grade: ForwardMalaysiaV2WeightGrade; verdictJa: string } {
  const rec = input.patterns.find((p) => p.patternId === input.recommendedId)!;
  const adopted = input.patterns.find((p) => p.patternId === input.adoptedId)!;
  const baseline = input.patterns.find((p) => p.patternId === 'w33_33_33')!;

  if (
    input.dependencyUnder60Pct &&
    adopted.bootstrap.bankruptcyRatePct === 0 &&
    adopted.wfOos.testCumulativePct > 0 &&
    adopted.maxSingleDependencyPct < 60 &&
    adopted.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.8
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${adopted.labelJa} · 最大依存${adopted.maxSingleDependencyPct}% · 累積${adopted.cumulativeReturnPct}%`,
    };
  }

  if (
    rec.maxSingleDependencyPct < baseline.maxSingleDependencyPct &&
    rec.cumulativeReturnPct > 0 &&
    rec.bootstrap.bankruptcyRatePct === 0
  ) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — ${rec.labelJa} · 最大依存${rec.maxSingleDependencyPct}% · 段階移行`,
    };
  }

  if (rec.cumulativeReturnPct > 0) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 最大依存${rec.maxSingleDependencyPct}% · 60%未満${input.dependencyUnder60Pct ? '達成' : '未達'}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — ウェイト調整で成績悪化 · 均等33/33/33維持',
  };
}

export async function buildMalaysiaV2WeightAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV2WeightAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: input.bundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const symbols = MALAYSIA_V21_UNIVERSE.filter((s) => input.bundle.fetchedSymbols.includes(s));
  const trades = collectExecutedTradesForUniverse(
    input.bundle,
    symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );

  const dividendMap: Record<string, DividendEvent[]> = {};
  await Promise.all(
    MALAYSIA_V1_UNIVERSE.filter((d) => symbols.includes(d.symbol)).map(async (def) => {
      dividendMap[def.symbol] = await fetchYahooDividends(def.yahooSymbol, fromDate);
    }),
  );

  const patterns: ForwardMalaysiaV2WeightPatternRow[] = MALAYSIA_V2_WEIGHT_PATTERNS.map(
    (def, i) =>
      buildPatternRow({
        patternId: def.patternId,
        labelJa: def.labelJa,
        weights: def.weights,
        trades,
        fromDate,
        toDate,
        dividendMap,
        seedOffset: i,
      }),
  );

  const baseline = patterns.find((p) => p.patternId === 'w33_33_33')!;
  const bestSharpe = [...patterns].sort((a, b) => (b.sharpe ?? -99) - (a.sharpe ?? -99))[0]!;
  const bestCumulative = [...patterns].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;
  const bestMaxDd = [...patterns].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 99) - Math.abs(b.maxDrawdownPct ?? 99),
  )[0]!;

  const dependencyUnder60Pct = patterns.some((p) => p.maxSingleDependencyPct < 60);
  const recommendedPatternId = pickRecommendedWeightPattern(patterns);
  const adoptedPatternId = pickAdoptedWeightPattern({
    patterns,
    recommendedId: recommendedPatternId,
    dependencyUnder60Pct,
  });

  const { grade, verdictJa } = gradeMalaysiaV2Weight({
    patterns,
    recommendedId: recommendedPatternId,
    adoptedId: adoptedPatternId,
    dependencyUnder60Pct,
  });

  const rec = patterns.find((p) => p.patternId === recommendedPatternId)!;
  const adopted = patterns.find((p) => p.patternId === adoptedPatternId)!;
  const fmtDep = (p: ForwardMalaysiaV2WeightPatternRow) =>
    Object.entries(p.symbolDependencyPct)
      .map(([s, v]) => `${SYMBOL_NAMES[s] ?? s}${v}%`)
      .join('/');

  const answerAJa = `A 最良Sharpe: ${bestSharpe.labelJa} · Sharpe${bestSharpe.sharpe ?? '—'} · 累積${bestSharpe.cumulativeReturnPct}% · ${bestSharpe.weightLabelJa}`;
  const answerBJa = `B 最良累積: ${bestCumulative.labelJa} · 累積${bestCumulative.cumulativeReturnPct}% · CAGR${bestCumulative.cagr ?? '—'}%`;
  const answerCJa = `C 最小MaxDD: ${bestMaxDd.labelJa} · MaxDD${bestMaxDd.maxDrawdownPct}% · 依存${fmtDep(bestMaxDd)}`;
  const answerDJa = dependencyUnder60Pct
    ? `D 60%未満: 達成可能 — ${patterns
        .filter((p) => p.maxSingleDependencyPct < 60)
        .map((p) => p.labelJa)
        .join(' · ')} · 最小${Math.min(...patterns.map((p) => p.maxSingleDependencyPct))}%`
    : `D 60%未満: 未達 — 最小依存${Math.min(...patterns.map((p) => p.maxSingleDependencyPct))}%（均等${baseline.maxSingleDependencyPct}%）`;
  const answerEJa = `E RM3000推奨: ${rec.labelJa} · ${rec.weightLabelJa} · 累積${rec.cumulativeReturnPct}% · MC破産${rec.bootstrap.bankruptcyRatePct}% · OOS${rec.wfOos.testCumulativePct}%`;
  const answerFJa = `F 最終採用: ${adopted.labelJa} · ${adopted.weightLabelJa} · 最大依存${adopted.maxSingleDependencyPct}% · 累積${adopted.cumulativeReturnPct}%`;

  const consistencyNoteJa =
    '監査67整合: 5347+5398+1023 · v2.1ウェイト最適化 · US版監査継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査68 Malaysia v2.1 ウェイト最適化',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `基準均等: ${fmtDep(baseline)} · 最大依存${baseline.maxSingleDependencyPct}%`,
    ...patterns.map(
      (p) =>
        `${p.labelJa} (${p.weightLabelJa}): 累積${p.cumulativeReturnPct}% · Sharpe${p.sharpe ?? '—'} · MaxDD${p.maxDrawdownPct}% · PF${p.profitFactor ?? '—'} · 最大依存${p.maxSingleDependencyPct}% · MC破産${p.bootstrap.bankruptcyRatePct}% · OOS${p.wfOos.testCumulativePct}%`,
    ),
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    verdictJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    baselinePatternId: 'w33_33_33',
    baselineDependencyPct: baseline.symbolDependencyPct,
    patterns,
    bestSharpePatternId: bestSharpe.patternId,
    bestCumulativePatternId: bestCumulative.patternId,
    bestMaxDdPatternId: bestMaxDd.patternId,
    recommendedPatternId,
    adoptedPatternId,
    dependencyUnder60Pct,
    adoptionGrade: grade,
    adoptionVerdictJa: verdictJa,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    answerFJa,
    consistencyNoteJa,
    humanSummaryJa,
  };
}

export async function runMalaysiaV2WeightAudit(): Promise<ForwardMalaysiaV2WeightAuditReport | null> {
  const bundle = await fetchMalaysiaV1AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV2WeightAuditReport({ bundle });
}

export function formatMalaysiaV2WeightCsv(report: ForwardMalaysiaV2WeightAuditReport): string {
  const lines = [
    `# 最重要監査その68 Malaysia v2.1 ウェイト最適化 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,patternId,label,weights,trades,cumulative,divCum,winRate,PF,sharpe,maxDD,cagr,maxDep,bankruptcy,p5,oosTest,oosDeg',
    ...report.patterns.map((p) =>
      [
        'pattern',
        p.patternId,
        `"${p.labelJa}"`,
        `"${p.weightLabelJa}"`,
        p.tradeCount,
        p.cumulativeReturnPct,
        p.cumulativeWithDividendPct,
        p.winRatePct,
        p.profitFactor ?? '',
        p.sharpe ?? '',
        p.maxDrawdownPct ?? '',
        p.cagr ?? '',
        p.maxSingleDependencyPct,
        p.bootstrap.bankruptcyRatePct,
        p.bootstrap.p5CumulativePct,
        p.wfOos.testCumulativePct,
        p.wfOos.cumulativeDegradationPct ?? '',
      ].join(','),
    ),
    '',
    'section,symbol,patternId,dependencyPct',
    ...report.patterns.flatMap((p) =>
      Object.entries(p.symbolDependencyPct).map(([sym, pct]) =>
        ['dependency', SYMBOL_NAMES[sym] ?? sym, p.patternId, pct].join(','),
      ),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['answer', 'F', `"${report.answerFJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['verdict', 'recommended', report.recommendedPatternId].join(','),
    ['verdict', 'adopted', report.adoptedPatternId].join(','),
    ['verdict', 'under60', report.dependencyUnder60Pct].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
