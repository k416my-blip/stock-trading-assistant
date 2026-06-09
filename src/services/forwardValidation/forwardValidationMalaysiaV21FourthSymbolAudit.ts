/**
 * 最重要監査その69 — Malaysia v2.1 第4銘柄候補発掘 · 監査68固定 · ルール変更なし
 */
import type {
  ForwardMalaysiaV21FourthCandidateId,
  ForwardMalaysiaV21FourthCandidateRow,
  ForwardMalaysiaV21FourthGrade,
  ForwardMalaysiaV21FourthSymbolAuditReport,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { parseYahooChartBars } from '../../utils/yahooChartParser';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import { bootstrapSampleTrades } from './forwardValidationBootstrapMcAudit';
import { mulberry32, percentile } from './forwardValidationMonteCarloAudit';
import type { OhlcvBar } from './case4Indicators';
import {
  collectExecutedTradesForUniverse,
  fetchMalaysiaV1AuditBundle,
  fetchYahooDividends,
  MALAYSIA_V1_AUDIT_START,
  MALAYSIA_V1_UNIVERSE,
} from './forwardValidationMalaysiaV1Audit';
import { computeCalendarTrainTestSplit } from './forwardValidationMalaysiaV2DurabilityAudit';
import { MALAYSIA_V21_UNIVERSE } from './forwardValidationMalaysiaV2WeightAudit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import { pearsonCorrelation } from './forwardValidationReturnCorrelationAudit';
import { precomputeTradeTemplates } from './forwardValidationRobustnessAudit';
import {
  simulateRm3000WeightedPath,
  type SymbolWeightSchemeDef,
} from './forwardValidationSymbolWeightAudit';
import { buildYahooOhlcvUrl } from './yahooOhlcvFetch';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const BOOTSTRAP_MC_69_RUNS = 10_000;
const RM3000 = 3000;
const CASH_RESERVE_PCT = 15;
const DEPLOYABLE_SCALE = (100 - CASH_RESERVE_PCT) / 100;
const BOOTSTRAP_SEED = 69_001;
const WF_TRAIN_PCT = 70;
const RUIN_EQUITY_PCT = 50;

export const MALAYSIA_V69_EXTRA_UNIVERSE = [
  { symbol: '6888', yahooSymbol: '6888.KL', nameJa: 'AXIATA', sectorJa: '通信' },
  { symbol: '6947', yahooSymbol: '6947.KL', nameJa: 'CELCOMDIGI', sectorJa: '通信' },
  { symbol: '5211', yahooSymbol: '5211.KL', nameJa: 'SUNWAY', sectorJa: 'インフラ' },
  { symbol: '5878', yahooSymbol: '5878.KL', nameJa: 'KPJ', sectorJa: '医療' },
  { symbol: '3816', yahooSymbol: '3816.KL', nameJa: 'MISC', sectorJa: '港湾' },
] as const;

export const MALAYSIA_V69_CANDIDATE_DEFS: {
  candidateId: ForwardMalaysiaV21FourthCandidateId;
  symbol: string;
  nameJa: string;
  sectorJa: string;
}[] = [
  { candidateId: 'c_maybank', symbol: '1155', nameJa: 'MAYBANK', sectorJa: '銀行' },
  { candidateId: 'c_public', symbol: '1295', nameJa: 'PUBLIC BANK', sectorJa: '銀行' },
  { candidateId: 'c_axiata', symbol: '6888', nameJa: 'AXIATA', sectorJa: '通信' },
  { candidateId: 'c_celcomdigi', symbol: '6947', nameJa: 'CELCOMDIGI', sectorJa: '通信' },
  { candidateId: 'c_sunway', symbol: '5211', nameJa: 'SUNWAY', sectorJa: 'インフラ' },
  { candidateId: 'c_kpj', symbol: '5878', nameJa: 'KPJ', sectorJa: '医療' },
  { candidateId: 'c_ihh', symbol: '5225', nameJa: 'IHH', sectorJa: '医療' },
  { candidateId: 'c_misc', symbol: '3816', nameJa: 'MISC', sectorJa: '港湾' },
  { candidateId: 'c_ytl', symbol: '6742', nameJa: 'YTL POWER', sectorJa: '電力' },
  { candidateId: 'c_99sm', symbol: '5326', nameJa: '99 SPEED MART', sectorJa: '消費' },
];

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '1023': 'CIMB',
  '1155': 'MAYBANK',
  '1295': 'PUBLIC BANK',
  '6888': 'AXIATA',
  '6947': 'CELCOMDIGI',
  '5211': 'SUNWAY',
  '5878': 'KPJ',
  '5225': 'IHH',
  '3816': 'MISC',
  '6742': 'YTL POWER',
  '5326': '99 SPEED MART',
};

const FIXED_CONDITIONS_JA =
  'MY v2.1第4銘柄 · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700@RM3000 · 均等ウェイト';

type DividendEvent = { date: string; amount: number };
type OhlcvBarWithVolume = OhlcvBar & { volume: number };

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

function equalWeights(symbols: string[]): Record<string, number> {
  const pct = round3(100 / symbols.length);
  return Object.fromEntries(symbols.map((s) => [s, pct]));
}

function weightMultiplier(weights: Record<string, number>, symbol: string): number {
  const syms = Object.keys(weights);
  const avg = mean(syms.map((s) => weights[s] ?? 0)) ?? 100 / syms.length;
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

function buildWeightScheme(symbols: string[]): SymbolWeightSchemeDef {
  return {
    schemeId: 'equal',
    labelJa: 'MY v2.1 equal weight',
    universe: symbols,
    selectionMode: 'win_rate',
    slotMode: 'weight_proportional',
    slotWeights: equalWeights(symbols),
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

function monthlyReturnMap(trades: ForwardPassedTradeRecord[]): Map<string, number> {
  const byMonth = new Map<string, number>();
  for (const t of trades) {
    const month = t.signalDate.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + t.returnPct);
  }
  return byMonth;
}

export function correlationBetweenTradeSeries(
  tradesA: ForwardPassedTradeRecord[],
  tradesB: ForwardPassedTradeRecord[],
): number | null {
  const mapA = monthlyReturnMap(tradesA);
  const mapB = monthlyReturnMap(tradesB);
  const months = [...mapA.keys()].filter((m) => mapB.has(m)).sort();
  if (months.length < 3) return null;
  const xs = months.map((m) => mapA.get(m)!);
  const ys = months.map((m) => mapB.get(m)!);
  return pearsonCorrelation(xs, ys);
}

export function avgCorrelationWithBaseSymbols(input: {
  candidateTrades: ForwardPassedTradeRecord[];
  baseSoloTrades: Record<string, ForwardPassedTradeRecord[]>;
  baseSymbols: readonly string[];
}): number | null {
  const corrs = input.baseSymbols
    .map((s) => correlationBetweenTradeSeries(input.candidateTrades, input.baseSoloTrades[s] ?? []))
    .filter((c): c is number => c != null);
  return corrs.length > 0 ? mean(corrs) : null;
}

function isWeightedRuinPath(path: {
  minEquityMYR: number;
  finalEquityMYR: number;
}): boolean {
  const minPct = (path.minEquityMYR / RM3000) * 100;
  return minPct <= RUIN_EQUITY_PCT || path.finalEquityMYR <= 0;
}

function runBootstrapWeighted(input: {
  pool: ForwardPassedTradeRecord[];
  symbols: string[];
  runs?: number;
  seed?: number;
}): ForwardMalaysiaV21FourthCandidateRow['bootstrap'] {
  const runs = input.runs ?? BOOTSTRAP_MC_69_RUNS;
  const rand = mulberry32(input.seed ?? BOOTSTRAP_SEED);
  const def = buildWeightScheme(input.symbols);
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

async function fetchMalaysiaBarsWithVolume(
  yahooSymbol: string,
  startDate: string,
): Promise<{ bars: OhlcvBarWithVolume[]; ok: boolean }> {
  const url = buildYahooOhlcvUrl(yahooSymbol, startDate);
  try {
    const { response, bodyText } = await fetchHttpWithRetry(url, {
      timeoutMs: 15_000,
      logLabel: 'forward_validation_ohlcv',
      symbol: yahooSymbol,
    });
    if (!response.ok) return { bars: [], ok: false };
    const raw = parseYahooChartBars(JSON.parse(bodyText) as unknown);
    const bars: OhlcvBarWithVolume[] = raw.map((b) => ({
      date: b.date,
      open: b.open ?? b.close,
      high: b.high ?? b.close,
      low: b.low ?? b.close,
      close: b.close,
      volume: b.volume ?? 0,
    }));
    return { bars, ok: bars.length >= 80 };
  } catch {
    return { bars: [], ok: false };
  }
}

export async function fetchMalaysiaV69AuditBundle(
  startDate = MALAYSIA_V1_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const base = await fetchMalaysiaV1AuditBundle(startDate);
  if (!base) return null;

  const etfBars = { ...base.etfBars };
  const fetchedSymbols = [...base.fetchedSymbols];
  const failedSymbols = [...base.failedSymbols];
  const firstBarDates = { ...base.firstBarDates };

  for (const def of MALAYSIA_V69_EXTRA_UNIVERSE) {
    if (fetchedSymbols.includes(def.symbol)) continue;
    const { bars, ok } = await fetchMalaysiaBarsWithVolume(def.yahooSymbol, startDate);
    if (!ok) {
      failedSymbols.push(def.symbol);
      continue;
    }
    etfBars[def.symbol] = bars;
    fetchedSymbols.push(def.symbol);
    firstBarDates[def.symbol] = bars[0]!.date;
  }

  const dateSet = new Set<string>(base.tradingDates);
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();

  return {
    etfBars,
    spyBars: base.spyBars,
    vixBars: base.vixBars,
    tradingDates,
    latestDate: tradingDates[tradingDates.length - 1] ?? base.latestDate,
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

function buildCandidateRow(input: {
  candidateId: ForwardMalaysiaV21FourthCandidateId;
  labelJa: string;
  sectorJa: string;
  addedSymbol: string | null;
  symbols: string[];
  trades: ForwardPassedTradeRecord[];
  fromDate: string;
  toDate: string;
  dividendMap: Record<string, DividendEvent[]>;
  baseSoloTrades: Record<string, ForwardPassedTradeRecord[]>;
  seedOffset: number;
  fetchOk: boolean;
}): ForwardMalaysiaV21FourthCandidateRow {
  const {
    candidateId,
    labelJa,
    sectorJa,
    addedSymbol,
    symbols,
    trades,
    fromDate,
    toDate,
    dividendMap,
    baseSoloTrades,
    seedOffset,
    fetchOk,
  } = input;

  const weights = equalWeights(symbols);
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

  const path = simulateRm3000WeightedPath(trades, buildWeightScheme(symbols));
  const mc = runBootstrapWeighted({
    pool: trades,
    symbols,
    runs: BOOTSTRAP_MC_69_RUNS,
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
  const candidateTrades = addedSymbol ? baseSoloTrades[addedSymbol] ?? [] : [];
  const avgCorrelationWithBase =
    addedSymbol != null
      ? avgCorrelationWithBaseSymbols({
          candidateTrades,
          baseSoloTrades,
          baseSymbols: MALAYSIA_V21_UNIVERSE,
        })
      : null;
  const gamudaCorrelation =
    addedSymbol != null
      ? correlationBetweenTradeSeries(candidateTrades, baseSoloTrades['5398'] ?? [])
      : null;

  return {
    candidateId,
    labelJa,
    sectorJa,
    addedSymbol,
    symbols: [...symbols],
    tradeCount: phase.tradeCount,
    avgCorrelationWithBase,
    gamudaCorrelation,
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
    fetchOk,
  };
}

function candidateScore(row: ForwardMalaysiaV21FourthCandidateRow): number {
  if (row.candidateId === 'baseline_v21') return -999;
  const deg = row.wfOos.cumulativeDegradationPct ?? 50;
  const dd = Math.abs(row.maxDrawdownPct ?? 99);
  const corrBonus = row.avgCorrelationWithBase != null ? Math.abs(row.avgCorrelationWithBase) * -8 : 0;
  return (
    row.bootstrap.p5CumulativePct * 2 +
    row.wfOos.testCumulativePct +
    (row.sharpe ?? 0) * 5 +
    corrBonus -
    deg * 0.3 -
    dd * 0.2 -
    row.maxSingleDependencyPct * 0.6
  );
}

export function pickBestAddCandidate(
  candidates: ForwardMalaysiaV21FourthCandidateRow[],
): ForwardMalaysiaV21FourthCandidateId {
  const pool = candidates.filter((c) => c.candidateId !== 'baseline_v21' && c.fetchOk);
  const eligible = pool.filter(
    (c) =>
      c.bootstrap.bankruptcyRatePct === 0 &&
      c.wfOos.testCumulativePct > 0 &&
      c.maxSingleDependencyPct < 60,
  );
  const ranked = (eligible.length > 0 ? eligible : pool).sort(
    (a, b) => candidateScore(b) - candidateScore(a),
  );
  return ranked[0]?.candidateId ?? 'baseline_v21';
}

export function pickLowestCorrelationCandidate(
  candidates: ForwardMalaysiaV21FourthCandidateRow[],
): ForwardMalaysiaV21FourthCandidateId {
  const pool = candidates.filter(
    (c) => c.candidateId !== 'baseline_v21' && c.fetchOk && c.avgCorrelationWithBase != null,
  );
  if (pool.length === 0) return 'baseline_v21';
  return [...pool].sort(
    (a, b) => Math.abs(a.avgCorrelationWithBase!) - Math.abs(b.avgCorrelationWithBase!),
  )[0]!.candidateId;
}

export function pickRecommendedFourSymbol(
  candidates: ForwardMalaysiaV21FourthCandidateRow[],
  baseline: ForwardMalaysiaV21FourthCandidateRow,
): ForwardMalaysiaV21FourthCandidateId {
  const pool = candidates.filter((c) => c.candidateId !== 'baseline_v21' && c.fetchOk);
  const eligible = pool.filter(
    (c) =>
      c.maxSingleDependencyPct < baseline.maxSingleDependencyPct - 2 &&
      c.bootstrap.bankruptcyRatePct === 0 &&
      c.wfOos.testCumulativePct > 0,
  );
  if (eligible.length === 0) {
    return 'baseline_v21';
  }
  return [...eligible].sort((a, b) => candidateScore(b) - candidateScore(a))[0]!.candidateId;
}

export function gradeMalaysiaV21Fourth(input: {
  candidates: ForwardMalaysiaV21FourthCandidateRow[];
  recommendedId: ForwardMalaysiaV21FourthCandidateId;
  dependencyUnder50Pct: boolean;
}): { grade: ForwardMalaysiaV21FourthGrade; verdictJa: string } {
  const rec = input.candidates.find((c) => c.candidateId === input.recommendedId)!;
  const baseline = input.candidates.find((c) => c.candidateId === 'baseline_v21')!;

  if (
    input.recommendedId !== 'baseline_v21' &&
    input.dependencyUnder50Pct &&
    rec.bootstrap.bankruptcyRatePct === 0 &&
    rec.wfOos.testCumulativePct > 0 &&
    rec.maxSingleDependencyPct < 50
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即採用 — ${rec.labelJa} · 最大依存${rec.maxSingleDependencyPct}% · 累積${rec.cumulativeReturnPct}%`,
    };
  }

  if (
    input.recommendedId !== 'baseline_v21' &&
    rec.maxSingleDependencyPct < baseline.maxSingleDependencyPct - 3 &&
    rec.bootstrap.bankruptcyRatePct === 0 &&
    rec.cumulativeReturnPct >= baseline.cumulativeReturnPct * 0.85
  ) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — ${rec.labelJa} · 依存${baseline.maxSingleDependencyPct}%→${rec.maxSingleDependencyPct}% · RM10000段階追加`,
    };
  }

  if (baseline.cumulativeReturnPct > 0) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — 第4銘柄未確定 · 50%未満${input.dependencyUnder50Pct ? '達成' : '未達'} · v2.1維持`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — 第4銘柄追加で成績悪化',
  };
}

export async function buildMalaysiaV21FourthSymbolAuditReport(input: {
  bundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV21FourthSymbolAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.bundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const baseSymbols = [...MALAYSIA_V21_UNIVERSE];

  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.bundle,
    symbols: input.bundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const allSymbols = new Set([
    ...baseSymbols,
    ...MALAYSIA_V69_CANDIDATE_DEFS.map((c) => c.symbol),
  ]);

  const dividendMap: Record<string, DividendEvent[]> = {};
  await Promise.all(
    [...MALAYSIA_V1_UNIVERSE, ...MALAYSIA_V69_EXTRA_UNIVERSE]
      .filter((d) => allSymbols.has(d.symbol))
      .map(async (def) => {
        dividendMap[def.symbol] = await fetchYahooDividends(def.yahooSymbol, fromDate);
      }),
  );

  const baseSoloTrades: Record<string, ForwardPassedTradeRecord[]> = {};
  for (const sym of allSymbols) {
    if (!input.bundle.fetchedSymbols.includes(sym)) continue;
    baseSoloTrades[sym] = collectExecutedTradesForUniverse(
      input.bundle,
      [sym],
      fromDate,
      toDate,
      cachedTemplates,
    );
  }

  const baselineTrades = collectExecutedTradesForUniverse(
    input.bundle,
    baseSymbols.filter((s) => input.bundle.fetchedSymbols.includes(s)),
    fromDate,
    toDate,
    cachedTemplates,
  );

  const candidates: ForwardMalaysiaV21FourthCandidateRow[] = [
    buildCandidateRow({
      candidateId: 'baseline_v21',
      labelJa: '⓪ v2.1現行3銘柄',
      sectorJa: '基準',
      addedSymbol: null,
      symbols: baseSymbols.filter((s) => input.bundle.fetchedSymbols.includes(s)),
      trades: baselineTrades,
      fromDate,
      toDate,
      dividendMap,
      baseSoloTrades,
      seedOffset: 0,
      fetchOk: true,
    }),
    ...MALAYSIA_V69_CANDIDATE_DEFS.map((def, i) => {
      const fetchOk = input.bundle.fetchedSymbols.includes(def.symbol);
      const symbols = [
        ...baseSymbols.filter((s) => input.bundle.fetchedSymbols.includes(s)),
        ...(fetchOk ? [def.symbol] : []),
      ];
      const trades = fetchOk
        ? collectExecutedTradesForUniverse(
            input.bundle,
            symbols,
            fromDate,
            toDate,
            cachedTemplates,
          )
        : [];
      return buildCandidateRow({
        candidateId: def.candidateId,
        labelJa: `④+${def.nameJa}`,
        sectorJa: def.sectorJa,
        addedSymbol: def.symbol,
        symbols,
        trades,
        fromDate,
        toDate,
        dividendMap,
        baseSoloTrades,
        seedOffset: i + 1,
        fetchOk,
      });
    }),
  ];

  const baseline = candidates.find((c) => c.candidateId === 'baseline_v21')!;
  const bestAddCandidateId = pickBestAddCandidate(candidates);
  const lowestCorrelationCandidateId = pickLowestCorrelationCandidate(candidates);
  const recommendedFourSymbolId = pickRecommendedFourSymbol(candidates, baseline);
  const dependencyUnder50Pct = candidates.some(
    (c) => c.candidateId !== 'baseline_v21' && c.maxSingleDependencyPct < 50,
  );

  const rm3000CompositionId: ForwardMalaysiaV21FourthCandidateId = 'baseline_v21';
  const rm10000CompositionId =
    recommendedFourSymbolId !== 'baseline_v21' ? recommendedFourSymbolId : 'baseline_v21';

  const { grade, verdictJa } = gradeMalaysiaV21Fourth({
    candidates,
    recommendedId: recommendedFourSymbolId,
    dependencyUnder50Pct,
  });

  const best = candidates.find((c) => c.candidateId === bestAddCandidateId)!;
  const lowCorr = candidates.find((c) => c.candidateId === lowestCorrelationCandidateId)!;
  const recFour = candidates.find((c) => c.candidateId === recommendedFourSymbolId)!;
  const rm3k = candidates.find((c) => c.candidateId === rm3000CompositionId)!;
  const rm10k = candidates.find((c) => c.candidateId === rm10000CompositionId)!;

  const fmtSymbols = (c: ForwardMalaysiaV21FourthCandidateRow) =>
    c.symbols.map((s) => SYMBOL_NAMES[s] ?? s).join('+');
  const fmtDep = (c: ForwardMalaysiaV21FourthCandidateRow) =>
    Object.entries(c.symbolDependencyPct)
      .map(([s, v]) => `${SYMBOL_NAMES[s] ?? s}${v}%`)
      .join('/');

  const answerAJa = `A 最良追加候補: ${best.labelJa} · 累積${best.cumulativeReturnPct}% · Sharpe${best.sharpe ?? '—'} · 最大依存${best.maxSingleDependencyPct}% · r=${best.avgCorrelationWithBase ?? '—'}`;
  const answerBJa = `B 相関最小: ${lowCorr.labelJa} · r=${lowCorr.avgCorrelationWithBase ?? '—'} · GAMUDA r=${lowCorr.gamudaCorrelation ?? '—'}`;
  const answerCJa = dependencyUnder50Pct
    ? `C 50%未満: 達成可能 — ${candidates
        .filter((c) => c.candidateId !== 'baseline_v21' && c.maxSingleDependencyPct < 50)
        .map((c) => c.labelJa)
        .join(' · ')}`
    : `C 50%未満: 未達 — 最小依存${Math.min(
        ...candidates.filter((c) => c.candidateId !== 'baseline_v21').map((c) => c.maxSingleDependencyPct),
      )}%（基準${baseline.maxSingleDependencyPct}%）`;
  const answerDJa =
    recommendedFourSymbolId === 'baseline_v21'
      ? `D 4銘柄版: v2.1現行維持 · ${fmtSymbols(baseline)} · 最大依存${baseline.maxSingleDependencyPct}%`
      : `D 4銘柄版: ${recFour.labelJa} · ${fmtSymbols(recFour)} · 最大依存${recFour.maxSingleDependencyPct}%`;
  const answerEJa = `E RM3000: ${rm3k.labelJa} · ${fmtSymbols(rm3k)} · 均等33% · 累積${rm3k.cumulativeReturnPct}% · MC破産${rm3k.bootstrap.bankruptcyRatePct}%`;
  const answerFJa =
    rm10000CompositionId === 'baseline_v21'
      ? `F RM10000: v2.1維持+複利 · ${fmtSymbols(rm3k)} · 第4銘柄見送り`
      : `F RM10000: ${rm10k.labelJa} · ${fmtSymbols(rm10k)} · 均等25% · 依存${fmtDep(rm10k)}`;

  const consistencyNoteJa =
    '監査68整合: 5347+5398+1023均等 · v2.1第4銘柄発掘 · US版監査継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査69 Malaysia v2.1 第4銘柄候補発掘',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `基準v2.1: ${fmtDep(baseline)} · 累積${baseline.cumulativeReturnPct}% · 最大依存${baseline.maxSingleDependencyPct}%`,
    ...candidates
      .filter((c) => c.candidateId !== 'baseline_v21')
      .map(
        (c) =>
          `${c.labelJa} [${c.sectorJa}]: r=${c.avgCorrelationWithBase ?? '—'} · 累積${c.cumulativeReturnPct}% · Sharpe${c.sharpe ?? '—'} · MaxDD${c.maxDrawdownPct}% · 最大依存${c.maxSingleDependencyPct}% · MC破産${c.bootstrap.bankruptcyRatePct}% · OOS${c.wfOos.testCumulativePct}%${c.fetchOk ? '' : ' · 取得失敗'}`,
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
    baseSymbols,
    candidates,
    bestAddCandidateId,
    lowestCorrelationCandidateId,
    recommendedFourSymbolId,
    rm3000CompositionId,
    rm10000CompositionId,
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

export async function runMalaysiaV21FourthSymbolAudit(): Promise<ForwardMalaysiaV21FourthSymbolAuditReport | null> {
  const bundle = await fetchMalaysiaV69AuditBundle();
  if (!bundle) return null;
  return buildMalaysiaV21FourthSymbolAuditReport({ bundle });
}

export function formatMalaysiaV21FourthSymbolCsv(
  report: ForwardMalaysiaV21FourthSymbolAuditReport,
): string {
  const lines = [
    `# 最重要監査その69 Malaysia v2.1 第4銘柄 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,candidateId,label,sector,added,symbols,trades,avgCorr,gamudaCorr,cumulative,divCum,winRate,PF,sharpe,maxDD,cagr,maxDep,bankruptcy,p5,oosTest,oosDeg,fetchOk',
    ...report.candidates.map((c) =>
      [
        'candidate',
        c.candidateId,
        `"${c.labelJa}"`,
        `"${c.sectorJa}"`,
        c.addedSymbol ?? '',
        `"${c.symbols.join('/')}"`,
        c.tradeCount,
        c.avgCorrelationWithBase ?? '',
        c.gamudaCorrelation ?? '',
        c.cumulativeReturnPct,
        c.cumulativeWithDividendPct,
        c.winRatePct,
        c.profitFactor ?? '',
        c.sharpe ?? '',
        c.maxDrawdownPct ?? '',
        c.cagr ?? '',
        c.maxSingleDependencyPct,
        c.bootstrap.bankruptcyRatePct,
        c.bootstrap.p5CumulativePct,
        c.wfOos.testCumulativePct,
        c.wfOos.cumulativeDegradationPct ?? '',
        c.fetchOk,
      ].join(','),
    ),
    '',
    'section,symbol,candidateId,dependencyPct',
    ...report.candidates.flatMap((c) =>
      Object.entries(c.symbolDependencyPct).map(([sym, pct]) =>
        ['dependency', SYMBOL_NAMES[sym] ?? sym, c.candidateId, pct].join(','),
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
    ['verdict', 'bestAdd', report.bestAddCandidateId].join(','),
    ['verdict', 'lowCorr', report.lowestCorrelationCandidateId].join(','),
    ['verdict', 'fourSymbol', report.recommendedFourSymbolId].join(','),
    ['verdict', 'under50', report.dependencyUnder50Pct].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
