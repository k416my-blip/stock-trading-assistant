/**
 * 最重要監査その67 — Malaysia v2 分散化 · GAMUDA依存解消 · 監査66固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV2DiversificationAuditReport,
  ForwardMalaysiaV2DiversificationGrade,
  ForwardMalaysiaV2DiversificationPatternId,
  ForwardMalaysiaV2DiversificationPatternRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { runBootstrapMonteCarlo } from './forwardValidationBootstrapMcAudit';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
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
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_67_RUNS = 10_000;
const RM3000 = 3000;
const CASH_RESERVE_PCT = 15;
const DEPLOYABLE_SCALE = (100 - CASH_RESERVE_PCT) / 100;
const BOOTSTRAP_SEED = 67_001;
const WF_TRAIN_PCT = 70;

export const MALAYSIA_V2_DIVERSIFICATION_PATTERNS: {
  patternId: ForwardMalaysiaV2DiversificationPatternId;
  labelJa: string;
  symbols: string[];
}[] = [
  { patternId: 'p2', labelJa: '① 5347+5398（現行v2）', symbols: ['5347', '5398'] },
  { patternId: 'p3_cimb', labelJa: '② 5347+5398+1023', symbols: ['5347', '5398', '1023'] },
  { patternId: 'p3_ihh', labelJa: '③ 5347+5398+5225', symbols: ['5347', '5398', '5225'] },
  { patternId: 'p4', labelJa: '④ 5347+5398+1023+5225', symbols: ['5347', '5398', '1023', '5225'] },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '5225': 'IHH',
};

const FIXED_CONDITIONS_JA =
  'MY v2分散化 · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700@RM3000';

type DividendEvent = { date: string; amount: number };

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
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

function symbolDependencyPct(trades: ForwardPassedTradeRecord[]): Record<string, number> {
  const bySym = new Map<string, number>();
  for (const t of trades) {
    bySym.set(t.symbol, (bySym.get(t.symbol) ?? 0) + t.returnPct * DEPLOYABLE_SCALE);
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

function buildPatternRow(input: {
  patternId: ForwardMalaysiaV2DiversificationPatternId;
  labelJa: string;
  symbols: string[];
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  dividendMap: Record<string, DividendEvent[]>;
  seedOffset: number;
}): ForwardMalaysiaV2DiversificationPatternRow {
  const { patternId, labelJa, symbols, trades, fromDate, toDate, dividendMap, seedOffset } =
    input;
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  const years = calendarYears(fromDate, toDate);
  const cagr =
    phase.cumulativeReturnPct > -100
      ? round3((Math.pow(1 + phase.cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;

  const divReturns = trades.map((t) =>
    round3(
      t.returnPct +
        dividendAccrualPct(dividendMap[t.symbol] ?? [], t.entryDate, t.exitDate, t.entryPrice),
    ),
  );
  const cumulativeWithDividendPct = round3(
    divReturns.reduce((s, r) => s + r, 0) * DEPLOYABLE_SCALE,
  );

  const path = simulateLotSizingPath({
    trades,
    symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
  });

  const mc = runBootstrapMonteCarlo({
    pool: trades,
    symbols,
    initialCapitalMYR: RM3000,
    runs: BOOTSTRAP_MC_67_RUNS,
    seed: BOOTSTRAP_SEED + seedOffset,
  });

  const split = computeCalendarTrainTestSplit(fromDate, toDate, WF_TRAIN_PCT);
  const trainTrades = tradesInSignalRange(trades, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(trades, split.testFrom, split.testTo);
  const train = buildWalkForward31PhaseMetrics('train', split.trainFrom, split.trainTo, trainTrades);
  const test = buildWalkForward31PhaseMetrics('test', split.testFrom, split.testTo, testTrades);
  const cumulativeDegradationPct = degradationPct(
    train.cumulativeReturnPct,
    test.cumulativeReturnPct,
  );

  const symDep = symbolDependencyPct(trades);

  return {
    patternId,
    labelJa,
    symbols: [...symbols],
    tradeCount: phase.tradeCount,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    cumulativeWithDividendPct,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: path.maxDrawdownPct,
    cagr,
    bootstrap: {
      runs: mc.runs,
      bankruptcyRatePct: mc.bankruptcyRatePct,
      p5CumulativePct: mc.p5CumulativePct,
      worstCumulativePct: mc.worstCumulativePct,
      worstMaxDrawdownPct: mc.worstMaxDrawdownPct,
    },
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

function stabilityScore(row: ForwardMalaysiaV2DiversificationPatternRow): number {
  const deg = row.wfOos.cumulativeDegradationPct ?? 50;
  const dd = Math.abs(row.maxDrawdownPct ?? 99);
  return (
    row.bootstrap.p5CumulativePct * 2 +
    row.bootstrap.worstCumulativePct +
    row.wfOos.testCumulativePct -
    deg * 0.3 -
    dd * 0.2 -
    row.maxSingleDependencyPct * 0.5
  );
}

export function pickRecommendedPattern(
  patterns: ForwardMalaysiaV2DiversificationPatternRow[],
): ForwardMalaysiaV2DiversificationPatternId {
  const eligible = patterns.filter(
    (p) =>
      p.maxSingleDependencyPct < 50 &&
      p.bootstrap.bankruptcyRatePct === 0 &&
      p.wfOos.testCumulativePct > 0,
  );
  if (eligible.length === 0) {
    return [...patterns].sort((a, b) => a.maxSingleDependencyPct - b.maxSingleDependencyPct)[0]!
      .patternId;
  }
  return [...eligible].sort((a, b) => stabilityScore(b) - stabilityScore(a))[0]!.patternId;
}

export function gradeMalaysiaV2Diversification(input: {
  patterns: ForwardMalaysiaV2DiversificationPatternRow[];
  recommendedId: ForwardMalaysiaV2DiversificationPatternId;
  dependencyUnder50Pct: boolean;
}): { grade: ForwardMalaysiaV2DiversificationGrade; verdictJa: string } {
  const rec = input.patterns.find((p) => p.patternId === input.recommendedId)!;
  const baseline = input.patterns.find((p) => p.patternId === 'p2')!;

  if (
    input.dependencyUnder50Pct &&
    rec.bootstrap.bankruptcyRatePct === 0 &&
    rec.wfOos.testCumulativePct > 0 &&
    rec.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.7 &&
    rec.maxSingleDependencyPct < 50
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${rec.labelJa} · GAMUDA${baseline.maxSingleDependencyPct}%→${rec.symbolDependencyPct['5398'] ?? '—'}% · 累積${rec.cumulativeReturnPct}%`,
    };
  }

  if (
    rec.maxSingleDependencyPct < baseline.maxSingleDependencyPct - 10 &&
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
      verdictJa: `C 要改善 — 最大依存${rec.maxSingleDependencyPct}% · 50%未満${input.dependencyUnder50Pct ? '達成' : '未達'}`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — 分散追加で成績悪化 · v2現行維持',
  };
}

export async function buildMalaysiaV2DiversificationAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV2DiversificationAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: input.bundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const allSymbols = new Set(
    MALAYSIA_V2_DIVERSIFICATION_PATTERNS.flatMap((p) => p.symbols),
  );
  const dividendMap: Record<string, DividendEvent[]> = {};
  await Promise.all(
    MALAYSIA_V1_UNIVERSE.filter((d) => allSymbols.has(d.symbol)).map(async (def) => {
      dividendMap[def.symbol] = await fetchYahooDividends(def.yahooSymbol, fromDate);
    }),
  );

  const patterns: ForwardMalaysiaV2DiversificationPatternRow[] =
    MALAYSIA_V2_DIVERSIFICATION_PATTERNS.map((def, i) => {
      const symbols = def.symbols.filter((s) => input.bundle.fetchedSymbols.includes(s));
      const trades = collectExecutedTradesForUniverse(
        input.bundle,
        symbols,
        fromDate,
        toDate,
        cachedTemplates,
      );
      return buildPatternRow({
        patternId: def.patternId,
        labelJa: def.labelJa,
        symbols,
        trades,
        fromDate,
        toDate,
        dividendMap,
        seedOffset: i,
      });
    });

  const baseline = patterns.find((p) => p.patternId === 'p2')!;
  const bestSharpe = [...patterns].sort((a, b) => (b.sharpe ?? -99) - (a.sharpe ?? -99))[0]!;
  const bestMaxDd = [...patterns].sort(
    (a, b) => Math.abs(a.maxDrawdownPct ?? 99) - Math.abs(b.maxDrawdownPct ?? 99),
  )[0]!;
  const bestStability = [...patterns].sort((a, b) => stabilityScore(b) - stabilityScore(a))[0]!;
  const bestGrowth = [...patterns].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;

  const recommendedPatternId = pickRecommendedPattern(patterns);
  const dependencyUnder50Pct = patterns.some((p) => p.maxSingleDependencyPct < 50);

  const { grade, verdictJa } = gradeMalaysiaV2Diversification({
    patterns,
    recommendedId: recommendedPatternId,
    dependencyUnder50Pct,
  });

  const rec = patterns.find((p) => p.patternId === recommendedPatternId)!;
  const fmtDep = (p: ForwardMalaysiaV2DiversificationPatternRow) =>
    Object.entries(p.symbolDependencyPct)
      .map(([s, v]) => `${SYMBOL_NAMES[s] ?? s}${v}%`)
      .join('/');

  const answerAJa = `A 最高Sharpe: ${bestSharpe.labelJa} · Sharpe${bestSharpe.sharpe ?? '—'} · 累積${bestSharpe.cumulativeReturnPct}%`;
  const answerBJa = `B 最小MaxDD: ${bestMaxDd.labelJa} · MaxDD${bestMaxDd.maxDrawdownPct}% · 依存${fmtDep(bestMaxDd)}`;
  const answerCJa = `C 最安定: ${bestStability.labelJa} · p5${bestStability.bootstrap.p5CumulativePct}% · OOS${bestStability.wfOos.testCumulativePct}% · 最大依存${bestStability.maxSingleDependencyPct}%`;
  const answerDJa = `D 最高成長: ${bestGrowth.labelJa} · 累積${bestGrowth.cumulativeReturnPct}% · CAGR${bestGrowth.cagr ?? '—'}%`;
  const answerEJa = `E 実運用推奨: ${rec.labelJa} · ${fmtDep(rec)} · 累積${rec.cumulativeReturnPct}% · MC破産${rec.bootstrap.bankruptcyRatePct}%`;
  const answerFJa = dependencyUnder50Pct
    ? `F 50%未満: 達成可能 — ${patterns.filter((p) => p.maxSingleDependencyPct < 50).map((p) => p.patternId).join('/')} · 最小${Math.min(...patterns.map((p) => p.maxSingleDependencyPct))}%`
    : `F 50%未満: 未達 — 最小依存${Math.min(...patterns.map((p) => p.maxSingleDependencyPct))}%（GAMUDA${baseline.symbolDependencyPct['5398']}%）`;

  const consistencyNoteJa =
    '監査66整合: GAMUDA86.5%依存解消 · 監査67=v2分散化 · US版監査継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査67 Malaysia v2 分散化',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `現行v2依存: ${fmtDep(baseline)}`,
    ...patterns.map(
      (p) =>
        `${p.labelJa}: 累積${p.cumulativeReturnPct}% · Sharpe${p.sharpe ?? '—'} · MaxDD${p.maxDrawdownPct}% · 最大依存${p.maxSingleDependencyPct}%`,
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
    baselineDependencyPct: baseline.symbolDependencyPct,
    patterns,
    bestSharpePatternId: bestSharpe.patternId,
    bestMaxDdPatternId: bestMaxDd.patternId,
    bestStabilityPatternId: bestStability.patternId,
    bestGrowthPatternId: bestGrowth.patternId,
    recommendedPatternId,
    dependencyUnder50Pct,
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

export async function runMalaysiaV2DiversificationAudit(): Promise<ForwardMalaysiaV2DiversificationAuditReport | null> {
  const bundle = await fetchMalaysiaV1AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV2DiversificationAuditReport({ bundle });
}

export function formatMalaysiaV2DiversificationCsv(
  report: ForwardMalaysiaV2DiversificationAuditReport,
): string {
  const lines = [
    `# 最重要監査その67 Malaysia v2 分散化 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,patternId,label,symbols,trades,cumulative,divCum,winRate,PF,sharpe,maxDD,cagr,maxDep,bankruptcy,p5,oosTest,oosDeg',
    ...report.patterns.map((p) =>
      [
        'pattern',
        p.patternId,
        `"${p.labelJa}"`,
        `"${p.symbols.join('/')}"`,
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
    ['verdict', 'under50', report.dependencyUnder50Pct].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
