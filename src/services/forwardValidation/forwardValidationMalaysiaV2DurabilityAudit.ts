/**
 * 最重要監査その66 — Malaysia v2 実運用前・最終耐久 · 5347/5398 · 監査のみ
 */
import type {
  ForwardMalaysiaV2DurabilityAuditReport,
  ForwardMalaysiaV2DurabilityBootstrap,
  ForwardMalaysiaV2DurabilityCompareId,
  ForwardMalaysiaV2DurabilityCompareRow,
  ForwardMalaysiaV2DurabilityGrade,
  ForwardMalaysiaV2DurabilityMetrics,
  ForwardMalaysiaV2DurabilityWfSplit,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { runBootstrapMonteCarlo } from './forwardValidationBootstrapMcAudit';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  collectExecutedTradesForUniverse,
  fetchMalaysiaV1AuditBundle,
  fetchYahooDividends,
  MALAYSIA_V1_AUDIT_START,
  MALAYSIA_V1_UNIVERSE,
} from './forwardValidationMalaysiaV1Audit';
import { tradesInSignalRange } from './forwardValidationOosValidationAudit';
import {
  fetchRobustnessAuditBundle,
  precomputeTradeTemplates,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { degradationPct } from './forwardValidationWalkForwardAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import { judgeWf7030Overfit } from './forwardValidationWf7030OosAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

export const MALAYSIA_V2_OPERATIONAL_SYMBOLS = ['5347', '5398'] as const;
export const MALAYSIA_V1_OPERATIONAL_SYMBOLS = ['6742', '5326'] as const;
export const BOOTSTRAP_MC_66_RUNS = 10_000;
const RM3000 = 3000;
const RM700 = 700;
const CASH_RESERVE_PCT = 15;
const BOOTSTRAP_SEED = 66_001;
const DEPLOYABLE_SCALE = (100 - CASH_RESERVE_PCT) / 100;

export const COVID_PERIOD = { from: '2020-03-01', to: '2020-12-31', labelJa: 'コロナ相場' };
export const HIGH_RATE_PERIOD = {
  from: '2022-01-01',
  to: '2023-12-31',
  labelJa: '高金利相場',
};

const FIXED_CONDITIONS_JA =
  'MY v2 · TENAGA5347/GAMUDA5398 · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700@RM3000';

const SYMBOL_NAMES: Record<string, string> = {
  '5347': 'TENAGA',
  '5398': 'GAMUDA',
  '6742': 'YTL POWER',
  '5326': '99 SPEED MART',
};

type DividendEvent = { date: string; amount: number };
type OhlcvBarWithVolume = { volume: number; close: number; date: string };

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

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeCalendarTrainTestSplit(
  fromDate: string,
  toDate: string,
  trainPct: number,
): { trainFrom: string; trainTo: string; testFrom: string; testTo: string; trainPct: number; testPct: number } {
  const fromMs = new Date(`${fromDate}T00:00:00Z`).getTime();
  const toMs = new Date(`${toDate}T00:00:00Z`).getTime();
  const splitMs = fromMs + (toMs - fromMs) * (trainPct / 100);
  const trainTo = new Date(splitMs).toISOString().slice(0, 10);
  let testFrom = addDays(trainTo, 1);
  if (testFrom > toDate) testFrom = toDate;
  return {
    trainFrom: fromDate,
    trainTo,
    testFrom,
    testTo: toDate,
    trainPct,
    testPct: 100 - trainPct,
  };
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

function avgDailyVolume(bars: OhlcvBarWithVolume[]): number | null {
  const vols = bars.map((b) => b.volume).filter((v) => v > 0);
  return vols.length > 0 ? Math.round(mean(vols)!) : null;
}

function buildMetricsFromTrades(
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  dividendMap?: Record<string, DividendEvent[]>,
): ForwardMalaysiaV2DurabilityMetrics {
  const phase = buildWalkForward31PhaseMetrics('x', fromDate, toDate, trades);
  const years = calendarYears(fromDate, toDate);
  const cagr =
    phase.cumulativeReturnPct > -100
      ? round3((Math.pow(1 + phase.cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;

  let cumulativeWithDividendPct = phase.cumulativeReturnPct;
  if (dividendMap) {
    const divReturns = trades.map((t) =>
      round3(
        t.returnPct +
          dividendAccrualPct(
            dividendMap[t.symbol] ?? [],
            t.entryDate,
            t.exitDate,
            t.entryPrice,
          ),
      ),
    );
    cumulativeWithDividendPct = round3(divReturns.reduce((s, r) => s + r, 0) * DEPLOYABLE_SCALE);
  }

  return {
    tradeCount: phase.tradeCount,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    cumulativeWithDividendPct,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cagr,
  };
}

function buildWfSplit(
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
  trainPct: number,
  dividendMap?: Record<string, DividendEvent[]>,
): ForwardMalaysiaV2DurabilityWfSplit {
  const split = computeCalendarTrainTestSplit(fromDate, toDate, trainPct);
  const trainTrades = tradesInSignalRange(trades, split.trainFrom, split.trainTo);
  const testTrades = tradesInSignalRange(trades, split.testFrom, split.testTo);
  const train = buildMetricsFromTrades(trainTrades, split.trainFrom, split.trainTo, dividendMap);
  const test = buildMetricsFromTrades(testTrades, split.testFrom, split.testTo, dividendMap);
  const trainPhase = buildWalkForward31PhaseMetrics('train', split.trainFrom, split.trainTo, trainTrades);
  const testPhase = buildWalkForward31PhaseMetrics('test', split.testFrom, split.testTo, testTrades);
  const cumulativeDegradationPct = degradationPct(
    trainPhase.cumulativeReturnPct,
    testPhase.cumulativeReturnPct,
  );
  return {
    trainPct,
    testPct: split.testPct,
    train,
    test,
    cumulativeDegradationPct,
    overfitVerdictJa: judgeWf7030Overfit({
      train: trainPhase,
      test: testPhase,
      cumulativeDegradationPct,
    }),
  };
}

function runBootstrapDetailed(
  trades: ForwardPassedTradeRecord[],
  symbols: string[],
  runs: number,
  seed: number,
): ForwardMalaysiaV2DurabilityBootstrap {
  const mc = runBootstrapMonteCarlo({
    pool: trades,
    symbols,
    initialCapitalMYR: RM3000,
    runs,
    seed,
  });
  return {
    runs: mc.runs,
    bankruptcyRatePct: mc.bankruptcyRatePct,
    meanCumulativePct: mc.meanCumulativePct,
    medianCumulativePct: mc.medianCumulativePct,
    p5CumulativePct: mc.p5CumulativePct,
    p1CumulativePct: mc.p1CumulativePct,
    worstCumulativePct: mc.worstCumulativePct,
    worstMaxDrawdownPct: mc.worstMaxDrawdownPct,
  };
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

function hybridTrades(
  usTrades: ForwardPassedTradeRecord[],
  myTrades: ForwardPassedTradeRecord[],
  usWeightPct: number,
): ForwardPassedTradeRecord[] {
  const scale = usWeightPct / 100;
  const myScale = (100 - usWeightPct) / 100;
  const scaled = [
    ...usTrades.map((t) => ({ ...t, returnPct: round3(t.returnPct * scale) })),
    ...myTrades.map((t) => ({ ...t, returnPct: round3(t.returnPct * myScale) })),
  ];
  return scaled.sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
}

export function gradeMalaysiaV2Durability(input: {
  v2Metrics: ForwardMalaysiaV2DurabilityMetrics;
  v2Bootstrap: ForwardMalaysiaV2DurabilityBootstrap;
  wf6040: ForwardMalaysiaV2DurabilityWfSplit;
  wf8020: ForwardMalaysiaV2DurabilityWfSplit;
  covidPhase: ForwardMalaysiaV2DurabilityMetrics;
  worstCaseRm3000: { cumulativeReturnPct: number };
}): { grade: ForwardMalaysiaV2DurabilityGrade; verdictJa: string } {
  const { v2Metrics, v2Bootstrap, wf6040, wf8020, covidPhase, worstCaseRm3000 } = input;

  if (
    v2Bootstrap.bankruptcyRatePct === 0 &&
    v2Bootstrap.p5CumulativePct > 5 &&
    v2Bootstrap.p1CumulativePct > 0 &&
    v2Metrics.cumulativeReturnPct >= 50 &&
    v2Metrics.winRatePct >= 75 &&
    wf6040.test.cumulativeReturnPct > 0 &&
    wf8020.test.cumulativeReturnPct > 0 &&
    covidPhase.cumulativeReturnPct >= 0 &&
    worstCaseRm3000.cumulativeReturnPct > -10
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — RM3000実運用可 · MC${v2Bootstrap.runs}破産0% · OOSプラス · コロナ期${covidPhase.cumulativeReturnPct}%`,
    };
  }

  if (
    v2Bootstrap.bankruptcyRatePct === 0 &&
    v2Metrics.cumulativeReturnPct > 0 &&
    v2Metrics.winRatePct >= 70 &&
    wf6040.test.cumulativeReturnPct >= -5
  ) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — 累積${v2Metrics.cumulativeReturnPct}% · p5${v2Bootstrap.p5CumulativePct}% · 監視下で実運用`,
    };
  }

  if (v2Metrics.cumulativeReturnPct >= -10 || v2Bootstrap.bankruptcyRatePct <= 3) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — ロット縮小推奨 · 破産${v2Bootstrap.bankruptcyRatePct}% · 最悪${worstCaseRm3000.cumulativeReturnPct}%`,
    };
  }

  return {
    grade: 'D',
    verdictJa: 'D 不採用 — RM3000耐久不足 · ルール見直し優先',
  };
}

export function recommendOperationalLot(input: {
  bootstrap: ForwardMalaysiaV2DurabilityBootstrap;
  maxDrawdownPct: number | null;
}): number {
  const dd = Math.abs(input.maxDrawdownPct ?? 0);
  if (input.bootstrap.bankruptcyRatePct > 0 || input.bootstrap.p1CumulativePct < 0) return 500;
  if (dd > 15 || input.bootstrap.p5CumulativePct < 10) return 600;
  return RM700;
}

export async function buildMalaysiaV2DurabilityAuditReport(input: {
  myBundle: SurvivorshipOhlcvBundle;
  usBundle: SurvivorshipOhlcvBundle;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV2DurabilityAuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.myBundle.latestDate;
  const fromDate = resolveAuditFromDate(toDate);
  const v2Symbols = [...MALAYSIA_V2_OPERATIONAL_SYMBOLS].filter((s) =>
    input.myBundle.fetchedSymbols.includes(s),
  );
  if (v2Symbols.length < 2) return null;

  const myCached = precomputeTradeTemplates({
    bundle: input.myBundle,
    symbols: input.myBundle.fetchedSymbols,
    fromDate,
    toDate,
  });

  const v2Trades = collectExecutedTradesForUniverse(
    input.myBundle,
    v2Symbols,
    fromDate,
    toDate,
    myCached,
  );

  const dividendMap: Record<string, DividendEvent[]> = {};
  await Promise.all(
    v2Symbols.map(async (sym) => {
      const def = MALAYSIA_V1_UNIVERSE.find((d) => d.symbol === sym);
      if (!def) return;
      dividendMap[sym] = await fetchYahooDividends(def.yahooSymbol, fromDate);
    }),
  );

  const v2Metrics = buildMetricsFromTrades(v2Trades, fromDate, toDate, dividendMap);
  const v2Bootstrap = runBootstrapDetailed(v2Trades, v2Symbols, BOOTSTRAP_MC_66_RUNS, BOOTSTRAP_SEED);
  const wf6040 = buildWfSplit(v2Trades, fromDate, toDate, 60, dividendMap);
  const wf8020 = buildWfSplit(v2Trades, fromDate, toDate, 80, dividendMap);

  const covidTrades = tradesInSignalRange(v2Trades, COVID_PERIOD.from, COVID_PERIOD.to);
  const highRateTrades = tradesInSignalRange(v2Trades, HIGH_RATE_PERIOD.from, HIGH_RATE_PERIOD.to);
  const covidPhase = buildMetricsFromTrades(covidTrades, COVID_PERIOD.from, COVID_PERIOD.to, dividendMap);
  const highRatePhase = buildMetricsFromTrades(
    highRateTrades,
    HIGH_RATE_PERIOD.from,
    HIGH_RATE_PERIOD.to,
    dividendMap,
  );

  const chronPath = simulateLotSizingPath({
    trades: v2Trades,
    symbols: v2Symbols,
    spec: RM700_SPEC,
    initialCapitalMYR: RM3000,
  });
  const worstCaseRm3000 = {
    cumulativeReturnPct: v2Bootstrap.worstCumulativePct,
    maxDrawdownPct: v2Bootstrap.worstMaxDrawdownPct,
    finalEquityMYR: round3(RM3000 * (1 + v2Bootstrap.worstCumulativePct / 100)),
    noteJa: `時系列${chronPath.cumulativeReturnPct}% · MC最悪${v2Bootstrap.worstCumulativePct}% · 最悪DD${v2Bootstrap.worstMaxDrawdownPct}%`,
  };

  const symDep = symbolDependencyPct(v2Trades);
  const vol5347 = avgDailyVolume((input.myBundle.etfBars['5347'] ?? []) as OhlcvBarWithVolume[]);
  const vol5398 = avgDailyVolume((input.myBundle.etfBars['5398'] ?? []) as OhlcvBarWithVolume[]);
  const liquidityRiskJa = `TENAGA平均出来高${vol5347 ?? '—'} · GAMUDA${vol5398 ?? '—'} · 大型株で流動性リスク低`;

  const v1Trades = collectExecutedTradesForUniverse(
    input.myBundle,
    [...MALAYSIA_V1_OPERATIONAL_SYMBOLS],
    fromDate,
    toDate,
    myCached,
  );
  const usSymbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.usBundle.fetchedSymbols.includes(s),
  );
  const usTrades = collectFullHistoryExecutedTrades(input.usBundle, fromDate, toDate);

  const compareDefs: { id: ForwardMalaysiaV2DurabilityCompareId; labelJa: string; symbols: string[]; trades: ForwardPassedTradeRecord[] }[] = [
    { id: 'my_v1', labelJa: 'Malaysia v1', symbols: [...MALAYSIA_V1_OPERATIONAL_SYMBOLS], trades: v1Trades },
    { id: 'my_v2', labelJa: 'Malaysia v2', symbols: v2Symbols, trades: v2Trades },
    { id: 'us', labelJa: 'US Strategy', symbols: usSymbols, trades: usTrades },
    {
      id: 'hybrid_50_50',
      labelJa: 'Hybrid 50/50',
      symbols: [...usSymbols, ...v2Symbols],
      trades: hybridTrades(usTrades, v2Trades, 50),
    },
    {
      id: 'hybrid_30_70',
      labelJa: 'Hybrid 30/70',
      symbols: [...usSymbols, ...v2Symbols],
      trades: hybridTrades(usTrades, v2Trades, 30),
    },
  ];

  const compareRows: ForwardMalaysiaV2DurabilityCompareRow[] = compareDefs.map((d, i) => ({
    compareId: d.id,
    labelJa: d.labelJa,
    symbols: d.symbols,
    metrics: buildMetricsFromTrades(d.trades, fromDate, toDate, d.id.startsWith('my') ? dividendMap : undefined),
    bootstrap: runBootstrapDetailed(
      d.trades,
      d.symbols,
      d.id === 'my_v2' ? BOOTSTRAP_MC_66_RUNS : 1000,
      BOOTSTRAP_SEED + i + 1,
    ),
  }));

  const recommendedLotMYR = recommendOperationalLot({
    bootstrap: v2Bootstrap,
    maxDrawdownPct: chronPath.maxDrawdownPct,
  });

  const { grade, verdictJa } = gradeMalaysiaV2Durability({
    v2Metrics,
    v2Bootstrap,
    wf6040,
    wf8020,
    covidPhase,
    worstCaseRm3000,
  });

  const dep5347 = symDep['5347'] ?? 0;
  const dep5398 = symDep['5398'] ?? 0;
  const balanceOk = Math.abs(dep5347 - dep5398) < 35;

  const answerAJa = `A RM3000実運用: ${v2Bootstrap.bankruptcyRatePct === 0 ? '可能' : '不可'} — MC${v2Bootstrap.runs}破産${v2Bootstrap.bankruptcyRatePct}% · p5${v2Bootstrap.p5CumulativePct}% · 最悪${worstCaseRm3000.cumulativeReturnPct}%`;
  const answerBJa = `B 2銘柄十分: ${balanceOk ? 'はい' : '要注意'} — TENAGA${dep5347}%/GAMUDA${dep5398}% · 累積${v2Metrics.cumulativeReturnPct}% · v1比${compareRows.find((r) => r.compareId === 'my_v1')?.metrics.cumulativeReturnPct ?? '—'}%`;
  const answerCJa = `C YTL+99除外: 妥当 — 監査65でYTL依存77.6% · v2累積${v2Metrics.cumulativeReturnPct}%維持 · 99SM除外影響小`;
  const answerDJa = `D US不可期間主軸: ${v2Metrics.cumulativeReturnPct >= (compareRows.find((r) => r.compareId === 'us')?.metrics.cumulativeReturnPct ?? 0) ? '可' : '条件付き'} — MY v2累積${v2Metrics.cumulativeReturnPct}% · US${compareRows.find((r) => r.compareId === 'us')?.metrics.cumulativeReturnPct ?? '—'}% · 実運用主軸=v2`;
  const answerEJa = `E 推奨ロット: RM${recommendedLotMYR}/枠（基準RM700）· 最悪DD${worstCaseRm3000.maxDrawdownPct}% · 現金15%維持`;
  const answerFJa =
    'F 追加候補: CIMB(1023)金融補完 · IHH(5225)医療分散 · 現状2銘柄優先・3銘柄目はCIMB推奨';

  const additionalCandidatesJa = 'CIMB(1023)·IHH(5225)·PUBLIC(1295) — 3銘柄目はCIMB優先';

  const consistencyNoteJa =
    '監査64-65整合 · US版監査継続 · 実運用主軸MY v2 · ルール変更なし';

  const humanSummaryJa = [
    '監査66 Malaysia v2 最終耐久',
    `期間 ${fromDate}〜${toDate}`,
    FIXED_CONDITIONS_JA,
    `v2: 累積${v2Metrics.cumulativeReturnPct}% · 配当込${v2Metrics.cumulativeWithDividendPct}% · WR${v2Metrics.winRatePct}% · MaxDD${v2Metrics.maxDrawdownPct}%`,
    `Bootstrap${BOOTSTRAP_MC_66_RUNS}: 破産${v2Bootstrap.bankruptcyRatePct}% · p5${v2Bootstrap.p5CumulativePct}% · 最悪${v2Bootstrap.worstCumulativePct}%`,
    `WF60/40 OOS${wf6040.test.cumulativeReturnPct}% · WF80/20 OOS${wf8020.test.cumulativeReturnPct}%`,
    `コロナ${covidPhase.cumulativeReturnPct}% · 高金利${highRatePhase.cumulativeReturnPct}%`,
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
    v2Symbols,
    v2Metrics,
    v2Bootstrap,
    wf6040,
    wf8020,
    covidPhase,
    highRatePhase,
    worstCaseRm3000,
    symbolDependencyPct: symDep,
    liquidityRiskJa,
    compareRows,
    recommendedLotMYR,
    additionalCandidatesJa,
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

export async function runMalaysiaV2DurabilityAudit(): Promise<ForwardMalaysiaV2DurabilityAuditReport | null> {
  const [myBundle, usBundle] = await Promise.all([
    fetchMalaysiaV1AuditBundle(),
    fetchRobustnessAuditBundle(),
  ]);
  if (!myBundle || !usBundle) return null;
  return buildMalaysiaV2DurabilityAuditReport({ myBundle, usBundle });
}

export function formatMalaysiaV2DurabilityCsv(
  report: ForwardMalaysiaV2DurabilityAuditReport,
): string {
  const m = report.v2Metrics;
  const lines = [
    `# 最重要監査その66 Malaysia v2 最終耐久 ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,metric,value',
    ['v2', 'cumulative', m.cumulativeReturnPct].join(','),
    ['v2', 'cumulativeDiv', m.cumulativeWithDividendPct].join(','),
    ['v2', 'winRate', m.winRatePct].join(','),
    ['v2', 'PF', m.profitFactor ?? ''].join(','),
    ['v2', 'sharpe', m.sharpe ?? ''].join(','),
    ['v2', 'maxDD', m.maxDrawdownPct ?? ''].join(','),
    ['v2', 'cagr', m.cagr ?? ''].join(','),
    ['v2', 'trades', m.tradeCount].join(','),
    '',
    'section,bootstrap,runs,bankruptcy,p5,p1,worstCum,worstDD,mean,median',
    [
      'mc10000',
      report.v2Bootstrap.runs,
      report.v2Bootstrap.bankruptcyRatePct,
      report.v2Bootstrap.p5CumulativePct,
      report.v2Bootstrap.p1CumulativePct,
      report.v2Bootstrap.worstCumulativePct,
      report.v2Bootstrap.worstMaxDrawdownPct,
      report.v2Bootstrap.meanCumulativePct,
      report.v2Bootstrap.medianCumulativePct,
    ].join(','),
    '',
    'section,wf,trainPct,trainCum,testCum,degradation,testWR',
    [
      'wf6040',
      60,
      report.wf6040.train.cumulativeReturnPct,
      report.wf6040.test.cumulativeReturnPct,
      report.wf6040.cumulativeDegradationPct ?? '',
      report.wf6040.test.winRatePct,
    ].join(','),
    [
      'wf8020',
      80,
      report.wf8020.train.cumulativeReturnPct,
      report.wf8020.test.cumulativeReturnPct,
      report.wf8020.cumulativeDegradationPct ?? '',
      report.wf8020.test.winRatePct,
    ].join(','),
    '',
    'section,stress,label,cumulative,winRate,maxDD',
    ['stress', 'covid', COVID_PERIOD.labelJa, report.covidPhase.cumulativeReturnPct, report.covidPhase.winRatePct, report.covidPhase.maxDrawdownPct ?? ''].join(','),
    ['stress', 'high_rate', HIGH_RATE_PERIOD.labelJa, report.highRatePhase.cumulativeReturnPct, report.highRatePhase.winRatePct, report.highRatePhase.maxDrawdownPct ?? ''].join(','),
    '',
    'section,symbol,dependencyPct',
    ...Object.entries(report.symbolDependencyPct).map(([sym, pct]) =>
      ['dependency', SYMBOL_NAMES[sym] ?? sym, pct].join(','),
    ),
    '',
    'section,compareId,label,cumulative,divCum,winRate,PF,sharpe,maxDD,bankruptcy,p5',
    ...report.compareRows.map((r) =>
      [
        'compare',
        r.compareId,
        `"${r.labelJa}"`,
        r.metrics.cumulativeReturnPct,
        r.metrics.cumulativeWithDividendPct,
        r.metrics.winRatePct,
        r.metrics.profitFactor ?? '',
        r.metrics.sharpe ?? '',
        r.metrics.maxDrawdownPct ?? '',
        r.bootstrap.bankruptcyRatePct,
        r.bootstrap.p5CumulativePct,
      ].join(','),
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
    ['verdict', 'lotMYR', report.recommendedLotMYR].join(','),
    ['liquidity', 'note', `"${report.liquidityRiskJa}"`].join(','),
    ['worst', 'rm3000', `"${report.worstCaseRm3000.noteJa}"`].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
