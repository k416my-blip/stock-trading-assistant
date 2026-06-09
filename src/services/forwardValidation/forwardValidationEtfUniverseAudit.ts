/**
 * 最重要監査その29 — ETFユニバース最適化 · ADX20 · +4%/25日 · 2018〜 · 監査のみ
 */
import { FORWARD_ETF_UNIVERSE, FORWARD_MAX_CONCURRENT } from '../../constants/forwardValidation';
import type {
  ForwardEtfUniverseAuditReport,
  ForwardEtfUniverseCohortId,
  ForwardEtfUniverseCohortMetrics,
  ForwardEtfUniverseModelRow,
  ForwardEtfUniversePriorityRow,
  ForwardEtfUniverseSymbolStats,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import {
  barIndexByDate,
  buildSpyRegimeMap,
  scanSignalAtBarAblation,
  type OhlcvBar,
  type SignalAblationOptions,
} from './case4Indicators';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { simulateExitWithStop } from './forwardValidationExitStrategyAudit';
import { filterVixGteTrades } from './forwardValidationVixSensitivityAudit';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import { EXTENDED_AUDIT_START } from './forwardValidationVix24ExtendedHistoryAudit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';

const VIX24 = 24;
const ADX20_ON: SignalAblationOptions = { adxMinOverride: 20 };
const TAKE_PROFIT_PCT = 4;
const MAX_HOLD_DAYS = 25;
const CASH_RESERVE_PCT = 15;
const CURRENT_4 = [...FORWARD_ETF_UNIVERSE] as string[];

/** 監査29 全比較対象（現行4 + 追加12） */
export const ETF_UNIVERSE_AUDIT_SYMBOLS = [
  'DGRO',
  'SCHD',
  'VYM',
  'SPLG',
  'VOO',
  'SPY',
  'IVV',
  'VIG',
  'HDV',
  'DIVO',
  'JEPI',
  'JEPQ',
  'QQQM',
  'QQQ',
  'VTI',
  'IWB',
] as const;

const DIVIDEND_SYMBOLS = ['DGRO', 'SCHD', 'VYM', 'VIG', 'HDV', 'DIVO', 'JEPI', 'JEPQ'] as const;
const INDEX_SYMBOLS = ['VOO', 'SPY', 'IVV', 'VTI', 'IWB', 'SPLG'] as const;
const GROWTH_SYMBOLS = ['QQQ', 'QQQM', 'DGRO'] as const;

const FIXED_CONDITIONS_JA =
  'ADX>20 · VIX≥24 · 52週高値 · SPY63 · 利確+4% · 最大25日 · 損切なし · 勝率重み · 同時3枠 · 現金15%';

type CohortDef = {
  id: ForwardEtfUniverseCohortId;
  labelJa: string;
  symbols: readonly string[];
};

export const ETF_UNIVERSE_COHORTS: CohortDef[] = [
  { id: 'current_4', labelJa: '① 現行4ETF', symbols: CURRENT_4 },
  { id: 'dividend_only', labelJa: '② 配当ETFのみ', symbols: DIVIDEND_SYMBOLS },
  { id: 'index_only', labelJa: '③ インデックスETFのみ', symbols: INDEX_SYMBOLS },
  { id: 'growth_only', labelJa: '④ 成長ETFのみ', symbols: GROWTH_SYMBOLS },
  { id: 'all_mixed', labelJa: '⑤ 全ETF混合', symbols: ETF_UNIVERSE_AUDIT_SYMBOLS },
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function mean(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return round3(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function std(vals: number[]): number {
  if (vals.length === 0) return 0;
  const m = mean(vals) ?? 0;
  return Math.sqrt(vals.reduce((a, x) => a + (x - m) ** 2, 0) / vals.length);
}

function calendarYears(fromDate: string, toDate: string): number {
  const ms = new Date(toDate).getTime() - new Date(fromDate).getTime();
  return Math.max(ms / (365.25 * 24 * 3600 * 1000), 1 / 365.25);
}

function uniqueSymbols(symbols: string[]): string[] {
  return [...new Set(symbols)];
}

function exitOrderedReturns(trades: ForwardPassedTradeRecord[]): number[] {
  return [...trades]
    .sort(
      (a, b) =>
        a.exitDate.localeCompare(b.exitDate) ||
        a.entryDate.localeCompare(b.entryDate) ||
        a.symbol.localeCompare(b.symbol),
    )
    .map((t) => t.returnPct);
}

function sortino(returns: number[]): number | null {
  const down = returns.filter((r) => r < 0);
  if (returns.length < 2 || down.length === 0) return null;
  const ds = std(down);
  return ds > 1e-9 ? round3(mean(returns)! / ds) : null;
}

function tradeSharpe(returns: number[], years: number): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3((mu / sigma) * Math.sqrt(Math.max(returns.length / years, 1)));
}

export function symbolWinRatesBeforeUniverse(
  trades: ForwardPassedTradeRecord[],
  beforeDate: string,
  symbols: string[],
): Record<string, number> {
  const prior = trades.filter((t) => t.signalDate < beforeDate);
  const out: Record<string, number> = {};
  for (const sym of symbols) {
    const rows = prior.filter((t) => t.symbol === sym);
    out[sym] =
      rows.length === 0 ? 0.5 : rows.filter((t) => t.returnPct > 0).length / rows.length;
  }
  return out;
}

export function dedupOneEtfPerDayWinRate(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
): ForwardPassedTradeRecord[] {
  const byDate = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of trades) {
    const list = byDate.get(t.signalDate) ?? [];
    list.push(t);
    byDate.set(t.signalDate, list);
  }
  const dates = [...byDate.keys()].sort();
  const out: ForwardPassedTradeRecord[] = [];
  for (const date of dates) {
    const rows = byDate.get(date)!;
    const wr = symbolWinRatesBeforeUniverse(trades, date, universeSymbols);
    const best = [...rows].sort((a, b) => {
      const diff = (wr[b.symbol] ?? 0.5) - (wr[a.symbol] ?? 0.5);
      if (Math.abs(diff) > 1e-9) return diff;
      return a.symbol.localeCompare(b.symbol);
    })[0]!;
    out.push(best);
  }
  return out;
}

export function simulateOperationalWinRate(
  trades: ForwardPassedTradeRecord[],
  universeSymbols: string[],
): { executed: ForwardPassedTradeRecord[]; skippedCount: number } {
  const candidates = dedupOneEtfPerDayWinRate(trades, universeSymbols);
  const sorted = [...candidates].sort(
    (a, b) =>
      a.entryDate.localeCompare(b.entryDate) ||
      a.signalDate.localeCompare(b.signalDate) ||
      a.symbol.localeCompare(b.symbol),
  );
  const open: ForwardPassedTradeRecord[] = [];
  const executed: ForwardPassedTradeRecord[] = [];
  let skippedCount = 0;

  for (const t of sorted) {
    const stillOpen = open.filter((o) => o.exitDate >= t.entryDate);
    open.length = 0;
    open.push(...stillOpen);
    if (open.length >= FORWARD_MAX_CONCURRENT) {
      skippedCount++;
      continue;
    }
    open.push(t);
    executed.push(t);
  }

  return { executed, skippedCount };
}

export function collectUniverseTrades(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  const trades: ForwardPassedTradeRecord[] = [];

  for (const signalDate of dates) {
    for (const symbol of symbols) {
      const bars = bundle.etfBars[symbol];
      if (!bars) continue;
      const signalIdx = barIndexByDate(bars, signalDate);
      if (signalIdx < 0) continue;

      const scan = scanSignalAtBarAblation(bars, signalIdx, regimeMap, ADX20_ON);
      if (!scan?.passes) continue;

      const entryIdx = signalIdx + 1;
      if (entryIdx >= bars.length) continue;

      const entryBar = bars[entryIdx]!;
      const sim = simulateExitWithStop(
        bars,
        entryIdx,
        MAX_HOLD_DAYS,
        TAKE_PROFIT_PCT,
        { kind: 'none' },
      );
      if (!sim) continue;

      const exitIdx = barIndexByDate(bars, sim.exitDate);
      const holdDays = exitIdx >= entryIdx ? exitIdx - entryIdx : 0;

      trades.push({
        id: `${signalDate}_${symbol}`,
        symbol: symbol as ForwardPassedTradeRecord['symbol'],
        signalDate,
        entryDate: entryBar.date,
        exitDate: sim.exitDate,
        entryPrice: round3(entryBar.close),
        exitPrice: sim.exitPrice,
        returnPct: sim.returnPct,
        holdDays,
        exitReason: sim.reason === 'take_profit' ? 'take_profit' : 'max_hold',
        adx14: scan.adx14,
        macdHistPct: scan.macdHistPct,
        dist52wPct: scan.dist52wPct,
        bucket: scan.bucket,
        spyRegime: regimeMap.get(signalDate) ?? 'unknown',
      });
    }
  }

  return trades.sort((a, b) => a.signalDate.localeCompare(b.signalDate));
}

export function runCohortOperational(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
): ForwardPassedTradeRecord[] {
  const available = symbols.filter((s) => bundle.fetchedSymbols.includes(s));
  const passed = collectUniverseTrades(bundle, available, fromDate, toDate);
  const filtered = filterVixGteTrades(passed, bundle.vixBars, VIX24);
  return simulateOperationalWinRate(filtered, available).executed;
}

export function buildCohortMetrics(
  cohort: CohortDef,
  symbols: string[],
  executed: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardEtfUniverseCohortMetrics {
  const wins = executed.filter((t) => t.returnPct > 0);
  const returns = executed.map((t) => t.returnPct);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const cumulativeReturnPct = round3(
    returns.reduce((s, r) => s + r, 0) * deployableScale,
  );
  const maxDrawdownPct = portfolioMaxDrawdownPct(
    exitOrderedReturns(executed).map((r) => r * deployableScale),
  );
  const years = calendarYears(fromDate, toDate);
  const cagr =
    cumulativeReturnPct > -100
      ? round3((Math.pow(1 + cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;
  const mar =
    cagr != null && maxDrawdownPct != null && maxDrawdownPct !== 0
      ? round3(cagr / Math.abs(maxDrawdownPct))
      : null;

  return {
    cohortId: cohort.id,
    labelJa: cohort.labelJa,
    symbols,
    tradeCount: executed.length,
    winRatePct: executed.length > 0 ? round3((wins.length / executed.length) * 100) : 0,
    avgReturnPct: mean(returns),
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    sortino: sortino(returns),
    maxDrawdownPct,
    cumulativeReturnPct,
    cagrPct: cagr,
    mar,
  };
}

export function buildPerSymbolStats(
  executed: ForwardPassedTradeRecord[],
): ForwardEtfUniverseSymbolStats[] {
  const bySym = new Map<string, ForwardPassedTradeRecord[]>();
  for (const t of executed) {
    const list = bySym.get(t.symbol) ?? [];
    list.push(t);
    bySym.set(t.symbol, list);
  }

  const rows: ForwardEtfUniverseSymbolStats[] = [];
  for (const [symbol, trades] of bySym) {
    const wins = trades.filter((t) => t.returnPct > 0);
    const returns = trades.map((t) => t.returnPct);
    const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
    rows.push({
      symbol,
      tradeCount: trades.length,
      winRatePct: trades.length > 0 ? round3((wins.length / trades.length) * 100) : 0,
      avgReturnPct: mean(returns),
      cumulativeReturnPct: round3(returns.reduce((s, r) => s + r, 0)),
      profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    });
  }

  return rows.sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct);
}

function scoreSymbol(row: ForwardEtfUniverseSymbolStats): number {
  const wr = row.winRatePct / 100;
  const avg = row.avgReturnPct ?? 0;
  return wr * avg * Math.sqrt(Math.max(row.tradeCount, 1));
}

export function buildRm3000Priority(
  rows: ForwardEtfUniverseSymbolStats[],
): ForwardEtfUniversePriorityRow[] {
  const sorted = [...rows].sort((a, b) => scoreSymbol(b) - scoreSymbol(a));
  return sorted.map((r, i) => ({
    rank: i + 1,
    symbol: r.symbol,
    winRatePct: r.winRatePct,
    tradeCount: r.tradeCount,
    cumulativeReturnPct: r.cumulativeReturnPct,
    noteJa:
      r.tradeCount === 0
        ? '実行件数なし'
        : r.winRatePct >= 90 && (r.avgReturnPct ?? 0) >= 3
          ? '高WR・高平均'
          : r.cumulativeReturnPct < 0
            ? '累積マイナス'
            : '標準',
  }));
}

export function buildEtfUniverseModelRows(input: {
  recommended: string[];
  perSymbol: ForwardEtfUniverseSymbolStats[];
}): ForwardEtfUniverseModelRow[] {
  const { recommended, perSymbol } = input;
  const bySym = new Map(perSymbol.map((r) => [r.symbol, r]));
  const pick = (syms: string[]) => syms.filter((s) => recommended.includes(s) || CURRENT_4.includes(s));

  const dividendTop = pick(['SCHD', 'VYM', 'HDV', 'VIG', 'DGRO']).slice(0, 4);
  const standard = recommended.slice(0, 4);
  const growthAdd = pick(['QQQM', 'QQQ', 'IVV', 'DGRO']).filter((s) => !standard.includes(s));
  const aggressive = uniqueSymbols([...standard.slice(0, 3), ...growthAdd]).slice(0, 4);

  const fmt = (syms: string[]) =>
    syms
      .map((s) => {
        const r = bySym.get(s);
        return r ? `${s}(WR${r.winRatePct}%·${r.tradeCount}件)` : s;
      })
      .join(' · ');

  return [
    {
      modelId: 'conservative',
      labelJa: '保守型',
      symbols: dividendTop.length >= 3 ? dividendTop : ['SCHD', 'VYM', 'HDV', 'VIG'],
      descriptionJa: `配当ETF中心 · 現金${CASH_RESERVE_PCT}% · ${fmt(dividendTop.length >= 3 ? dividendTop : ['SCHD', 'VYM', 'HDV', 'VIG'])}`,
    },
    {
      modelId: 'standard',
      labelJa: '標準型',
      symbols: standard,
      descriptionJa: `推奨4ETF · 勝率重み · 現金${CASH_RESERVE_PCT}% · ${fmt(standard)}`,
    },
    {
      modelId: 'aggressive',
      labelJa: '攻撃型',
      symbols: aggressive,
      descriptionJa: `成長ETF混合 · 現金10%推奨 · ${fmt(aggressive)}`,
    },
  ];
}

export function evaluateEtfUniverse(input: {
  cohortRows: ForwardEtfUniverseCohortMetrics[];
  perSymbolRows: ForwardEtfUniverseSymbolStats[];
  rm3000Priority: ForwardEtfUniversePriorityRow[];
}): {
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  recommended: string[];
  modelRows: ForwardEtfUniverseModelRow[];
} {
  const { cohortRows, perSymbolRows, rm3000Priority } = input;
  const current = cohortRows.find((r) => r.cohortId === 'current_4')!;
  const allMixed = cohortRows.find((r) => r.cohortId === 'all_mixed')!;

  const bestCohort = [...cohortRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0]!;

  const currentOptimal =
    current.cohortId === bestCohort.cohortId ||
    (allMixed.cumulativeReturnPct <= current.cumulativeReturnPct * 1.08 &&
      current.winRatePct >= allMixed.winRatePct - 3);

  const answer1Ja = currentOptimal
    ? `現行4ETFは実用的に最適: 累積${current.cumulativeReturnPct}%（全混合${allMixed.cumulativeReturnPct}%）· WR${current.winRatePct}% · 件数${current.tradeCount}。`
    : `現行4ETFは最適ではない: 最良コホート「${bestCohort.labelJa}」累積${bestCohort.cumulativeReturnPct}% vs 現行${current.cumulativeReturnPct}%。`;

  const excludeCandidates = perSymbolRows.filter(
    (r) =>
      r.tradeCount >= 2 &&
      (r.winRatePct < 75 || (r.avgReturnPct ?? 0) < 0 || r.cumulativeReturnPct < -2),
  );
  const answer2Ja =
    excludeCandidates.length === 0
      ? '除外必須ETFなし（全銘柄が最低限の実行成績）。'
      : `除外検討: ${excludeCandidates.map((r) => `${r.symbol}(WR${r.winRatePct}%·累積${r.cumulativeReturnPct}%)`).join(' · ')}。`;

  const baselineWr =
    mean(perSymbolRows.filter((r) => CURRENT_4.includes(r.symbol)).map((r) => r.winRatePct)) ??
    current.winRatePct;
  const addCandidates = perSymbolRows.filter(
    (r) =>
      !CURRENT_4.includes(r.symbol) &&
      r.tradeCount >= 2 &&
      r.winRatePct >= baselineWr - 5 &&
      r.cumulativeReturnPct > 5,
  );
  const answer3Ja =
    addCandidates.length === 0
      ? '現行4ETF以外への明確な追加推奨なし。'
      : `追加検討: ${addCandidates.map((r) => `${r.symbol}(WR${r.winRatePct}%·累積${r.cumulativeReturnPct}%)`).join(' · ')}。`;

  const recommended = rm3000Priority
    .filter((r) => r.tradeCount >= 1 && !excludeCandidates.some((e) => e.symbol === r.symbol))
    .slice(0, 6)
    .map((r) => r.symbol);

  const answer4Ja = `最終推奨: ${recommended.join(' · ')}（全混合${allMixed.tradeCount}件ベース）。`;

  const answer5Ja = `RM3000優先順位: ${rm3000Priority
    .slice(0, 8)
    .map((r) => `${r.rank}.${r.symbol}`)
    .join(' > ')}。`;

  const modelRows = buildEtfUniverseModelRows({ recommended, perSymbol: perSymbolRows });

  return { answer1Ja, answer2Ja, answer3Ja, answer4Ja, answer5Ja, recommended, modelRows };
}

export async function fetchEtfUniverseAuditBundle(
  startDate = EXTENDED_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const allSymbols = uniqueSymbols([...ETF_UNIVERSE_AUDIT_SYMBOLS]);
  const etfBars: Record<string, OhlcvBar[]> = {};
  const fetchedSymbols: string[] = [];
  const failedSymbols: string[] = [];
  const firstBarDates: Record<string, string> = {};

  for (const sym of allSymbols) {
    const { bars, result } = await fetchForwardOhlcvDetailed(sym, 15_000, startDate);
    if (!result.ok || bars.length < 80) {
      failedSymbols.push(sym);
      continue;
    }
    etfBars[sym] = bars;
    fetchedSymbols.push(sym);
    firstBarDates[sym] = bars[0]!.date;
  }

  if (!fetchedSymbols.some((s) => CURRENT_4.includes(s))) return null;

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, startDate);
  if (!spyFetch.result.ok) return null;

  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, startDate);
  const spyBars = spyFetch.bars;
  const vixBars = vixFetch.result.ok ? vixFetch.bars : [];

  const dateSet = new Set<string>();
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();
  const latestDate = tradingDates[tradingDates.length - 1] ?? '';

  return {
    etfBars,
    spyBars,
    vixBars,
    tradingDates,
    latestDate,
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

export function auditEtfUniverse(input: {
  bundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
}): ForwardEtfUniverseAuditReport {
  const fromDate = input.fromDate ?? EXTENDED_AUDIT_START;
  const toDate = input.bundle.latestDate;

  const cohortRows: ForwardEtfUniverseCohortMetrics[] = [];
  let allMixedExecuted: ForwardPassedTradeRecord[] = [];

  for (const cohort of ETF_UNIVERSE_COHORTS) {
    const available = cohort.symbols.filter((s) => input.bundle.fetchedSymbols.includes(s));
    const executed = runCohortOperational(input.bundle, [...cohort.symbols], fromDate, toDate);
    if (cohort.id === 'all_mixed') allMixedExecuted = executed;
    cohortRows.push(buildCohortMetrics(cohort, available, executed, fromDate, toDate));
  }

  const perSymbolRows = buildPerSymbolStats(allMixedExecuted);
  const rm3000Priority = buildRm3000Priority(perSymbolRows);
  const evalResult = evaluateEtfUniverse({ cohortRows, perSymbolRows, rm3000Priority });

  const current = cohortRows.find((r) => r.cohortId === 'current_4')!;
  const allMixed = cohortRows.find((r) => r.cohortId === 'all_mixed')!;

  const humanSummaryJa = [
    '【最重要監査その29 · ETFユニバース最適化】',
    FIXED_CONDITIONS_JA,
    `${fromDate}〜${toDate}`,
    '',
    ...cohortRows.map(
      (r) =>
        `${r.labelJa}: ${r.tradeCount}件 WR${r.winRatePct}% 累積${r.cumulativeReturnPct}% MAR${r.mar ?? '—'}`,
    ),
    '',
    evalResult.answer1Ja,
    evalResult.answer4Ja,
    evalResult.answer5Ja,
    '',
    `取得${input.bundle.fetchedSymbols.length}銘柄 / 失敗${input.bundle.failedSymbols.join(',') || 'なし'}`,
    `現行4 vs 全混合: 累積${current.cumulativeReturnPct}% vs ${allMixed.cumulativeReturnPct}%`,
  ].join('\n');

  return {
    auditedAt: new Date().toISOString(),
    fromDate,
    toDate,
    fixedConditionsJa: FIXED_CONDITIONS_JA,
    fetchedSymbols: input.bundle.fetchedSymbols,
    failedSymbols: input.bundle.failedSymbols,
    cohortRows,
    perSymbolRows,
    modelRows: evalResult.modelRows,
    rm3000Priority,
    answer1Ja: evalResult.answer1Ja,
    answer2Ja: evalResult.answer2Ja,
    answer3Ja: evalResult.answer3Ja,
    answer4Ja: evalResult.answer4Ja,
    answer5Ja: evalResult.answer5Ja,
    humanSummaryJa,
  };
}

export async function runEtfUniverseAudit(): Promise<ForwardEtfUniverseAuditReport | null> {
  const bundle = await fetchEtfUniverseAuditBundle();
  if (!bundle) return null;
  return auditEtfUniverse({ bundle });
}

export function formatEtfUniverseCsv(report: ForwardEtfUniverseAuditReport): string {
  const lines: string[] = [
    `# 最重要監査その29 ETFユニバース ${report.fromDate}〜${report.toDate}`,
    `# ${report.fixedConditionsJa}`,
    '',
    'cohortId,label,symbols,tradeCount,winRatePct,avgReturnPct,profitFactor,sharpe,sortino,maxDD,cumulative,cagr,mar',
  ];
  for (const r of report.cohortRows) {
    lines.push(
      [
        r.cohortId,
        `"${r.labelJa}"`,
        `"${r.symbols.join('+')}"`,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.sortino ?? '',
        r.maxDrawdownPct ?? '',
        r.cumulativeReturnPct,
        r.cagrPct ?? '',
        r.mar ?? '',
      ].join(','),
    );
  }
  lines.push('');
  lines.push('symbol,tradeCount,winRatePct,avgReturnPct,cumulative,profitFactor');
  for (const r of report.perSymbolRows) {
    lines.push(
      [
        r.symbol,
        r.tradeCount,
        r.winRatePct,
        r.avgReturnPct ?? '',
        r.cumulativeReturnPct,
        r.profitFactor ?? '',
      ].join(','),
    );
  }
  lines.push('');
  lines.push('rank,symbol,winRatePct,tradeCount,cumulative,note');
  for (const r of report.rm3000Priority) {
    lines.push(
      [r.rank, r.symbol, r.winRatePct, r.tradeCount, r.cumulativeReturnPct, `"${r.noteJa}"`].join(
        ',',
      ),
    );
  }
  lines.push('');
  lines.push('answer,content');
  lines.push(`1,"${report.answer1Ja.replace(/"/g, '""')}"`);
  lines.push(`2,"${report.answer2Ja.replace(/"/g, '""')}"`);
  lines.push(`3,"${report.answer3Ja.replace(/"/g, '""')}"`);
  lines.push(`4,"${report.answer4Ja.replace(/"/g, '""')}"`);
  lines.push(`5,"${report.answer5Ja.replace(/"/g, '""')}"`);
  lines.push('');
  lines.push('modelId,symbols,description');
  for (const m of report.modelRows) {
    lines.push([m.modelId, `"${m.symbols.join('+')}"`, `"${m.descriptionJa}"`].join(','));
  }
  return lines.join('\n');
}
