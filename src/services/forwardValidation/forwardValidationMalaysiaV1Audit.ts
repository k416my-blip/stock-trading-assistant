/**
 * 最重要監査その64 — Malaysia Version v1 · US版思想移植 · 監査のみ
 */
import type {
  ForwardMalaysiaV1AdoptionGrade,
  ForwardMalaysiaV1AuditReport,
  ForwardMalaysiaV1HybridRow,
  ForwardMalaysiaV1PortfolioRow,
  ForwardMalaysiaV1Rm3000Plan,
  ForwardMalaysiaV1SymbolGrade,
  ForwardMalaysiaV1SymbolMetrics,
  ForwardMalaysiaV1UsCompareRow,
  ForwardPassedTradeRecord,
} from '../../types/forwardValidation';
import { buildYahooChartUrl } from '../quoteProviders/yahooFinanceQuote';
import { fetchHttpWithRetry } from '../quoteProviders/providerFetchUtil';
import type { OhlcvBar } from './case4Indicators';
import { RM700_SPEC } from './forwardValidationDynamicLotAudit';
import { simulateLotSizingPath } from './forwardValidationLotSizeAudit';
import { BOOTSTRAP_MC_RUNS, runBootstrapMonteCarlo } from './forwardValidationBootstrapMcAudit';
import { collectFullHistoryExecutedTrades } from './forwardValidationMonteCarloAudit';
import {
  buildTradesFromTemplate,
  fetchRobustnessAuditBundle,
  precomputeTradeTemplates,
  ROBUSTNESS_ETF_UNIVERSE,
} from './forwardValidationRobustnessAudit';
import { simulateOperationalWinRate } from './forwardValidationEtfUniverseAudit';
import { portfolioMaxDrawdownPct } from './forwardValidationOperationalAllocationAudit';
import { buildWalkForward31PhaseMetrics } from './forwardValidationWalkForward31Audit';
import type { SurvivorshipOhlcvBundle } from './forwardValidationSurvivorshipAudit';
import { parseYahooChartBars } from '../../utils/yahooChartParser';
import { buildYahooOhlcvUrl } from './yahooOhlcvFetch';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';

export const MALAYSIA_V1_AUDIT_START = '2010-01-01';
const ADX_MIN = 20;
const VIX_THRESHOLD = 24;
const TAKE_PROFIT_PCT = 4;
const MAX_HOLD_DAYS = 25;
const CASH_RESERVE_PCT = 15;
const RM3000 = 3000;
const BOOTSTRAP_SEED = 64_001;

export const MALAYSIA_V1_UNIVERSE = [
  { symbol: '1155', yahooSymbol: '1155.KL', nameJa: 'MAYBANK' },
  { symbol: '1023', yahooSymbol: '1023.KL', nameJa: 'CIMB' },
  { symbol: '1295', yahooSymbol: '1295.KL', nameJa: 'PUBLIC BANK' },
  { symbol: '5347', yahooSymbol: '5347.KL', nameJa: 'TENAGA' },
  { symbol: '6742', yahooSymbol: '6742.KL', nameJa: 'YTL POWER' },
  { symbol: '5398', yahooSymbol: '5398.KL', nameJa: 'GAMUDA' },
  { symbol: '5225', yahooSymbol: '5225.KL', nameJa: 'IHH' },
  { symbol: '5326', yahooSymbol: '5326.KL', nameJa: '99 SPEED MART' },
] as const;

const US_FIXED_CONDITIONS_JA =
  'HDV/DGRO/QQQ/SCHD · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15% · RM700/枠@RM3000';

const MALAYSIA_FIXED_CONDITIONS_JA =
  'MAYBANK/CIMB/PUBLIC/TENAGA/YTL/GAMUDA/IHH/99SM · ADX>20 · VIX≥24 · 52週高値 · SPY63 · +4%/25日 · 損切なし · 勝率重み · 3枠 · 現金15%';

type DividendEvent = { date: string; amount: number };
type OhlcvBarWithVolume = OhlcvBar & { volume: number };

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

function tradeSharpe(returns: number[], years: number): number | null {
  if (returns.length < 2) return null;
  const mu = mean(returns);
  const sigma = std(returns);
  if (mu == null || sigma <= 1e-9) return null;
  return round3((mu / sigma) * Math.sqrt(Math.max(returns.length / years, 1)));
}

export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first!, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

export async function fetchYahooDividends(
  yahooSymbol: string,
  startDate: string,
): Promise<DividendEvent[]> {
  const period1 = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000);
  const url = new URL(buildYahooChartUrl(yahooSymbol));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('events', 'div');

  try {
    const { response, bodyText } = await fetchHttpWithRetry(url.toString(), {
      timeoutMs: 15_000,
      logLabel: 'forward_validation_dividends',
      symbol: yahooSymbol,
    });
    if (!response.ok) return [];
    const json = JSON.parse(bodyText) as {
      chart?: { result?: Array<{ events?: { dividends?: Record<string, number> } }> };
    };
    const divMap = json.chart?.result?.[0]?.events?.dividends ?? {};
    return Object.entries(divMap)
      .map(([ts, val]) => {
        const amount =
          typeof val === 'number'
            ? val
            : typeof val === 'object' && val != null && 'amount' in val
              ? Number((val as { amount: number }).amount)
              : 0;
        return {
          date: new Date(Number(ts) * 1000).toISOString().slice(0, 10),
          amount,
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function dailyReturnVolatilityPct(bars: OhlcvBar[]): number | null {
  if (bars.length < 30) return null;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!.close;
    if (prev <= 0) continue;
    rets.push(((bars[i]!.close - prev) / prev) * 100);
  }
  if (rets.length < 20) return null;
  return round3(std(rets) * Math.sqrt(252));
}

function avgDailyVolume(bars: OhlcvBarWithVolume[]): number | null {
  const vols = bars.map((b) => b.volume).filter((v) => v > 0);
  return vols.length > 0 ? Math.round(mean(vols)!) : null;
}

function dividendYieldPct(dividends: DividendEvent[], bars: OhlcvBar[], toDate: string): number | null {
  if (bars.length === 0) return null;
  const lastPrice = bars[bars.length - 1]!.close;
  if (lastPrice <= 0) return null;
  const cutoff = new Date(`${toDate}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const trailing = dividends.filter((d) => d.date >= cutoffIso && d.date <= toDate);
  const annualDiv = trailing.reduce((s, d) => s + d.amount, 0);
  return round3((annualDiv / lastPrice) * 100);
}

function dividendAccrualPct(
  dividends: DividendEvent[],
  entryDate: string,
  exitDate: string,
  entryPrice: number,
): number {
  if (entryPrice <= 0) return 0;
  const divs = dividends.filter((d) => d.date > entryDate && d.date <= exitDate);
  const total = divs.reduce((s, d) => s + d.amount, 0);
  return round3((total / entryPrice) * 100);
}

export function gradeMalaysiaSymbol(input: {
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
}): { grade: ForwardMalaysiaV1SymbolGrade; gradeJa: string } {
  const { tradeCount, winRatePct, cumulativeReturnPct, profitFactor, sharpe, maxDrawdownPct } =
    input;
  const dd = Math.abs(maxDrawdownPct ?? 99);

  if (
    tradeCount >= 5 &&
    winRatePct >= 85 &&
    cumulativeReturnPct >= 25 &&
    (profitFactor ?? 0) >= 2 &&
    (sharpe ?? 0) >= 1.2 &&
    dd <= 20
  ) {
    return { grade: 'S', gradeJa: 'S 最優秀' };
  }
  if (
    tradeCount >= 3 &&
    winRatePct >= 80 &&
    cumulativeReturnPct >= 10 &&
    (profitFactor ?? 0) >= 1.3 &&
    dd <= 25
  ) {
    return { grade: 'A', gradeJa: 'A 優良' };
  }
  if (tradeCount >= 2 && winRatePct >= 70 && cumulativeReturnPct >= 0) {
    return { grade: 'B', gradeJa: 'B 可' };
  }
  return { grade: 'C', gradeJa: 'C 要検討' };
}

type CachedTemplates = ReturnType<typeof precomputeTradeTemplates>;

export function collectExecutedTradesForUniverse(
  bundle: SurvivorshipOhlcvBundle,
  symbols: string[],
  fromDate: string,
  toDate: string,
  cachedTemplates?: CachedTemplates,
): ForwardPassedTradeRecord[] {
  const symbolSet = new Set(symbols);
  const templates = (cachedTemplates ?? precomputeTradeTemplates({ bundle, symbols, fromDate, toDate })).filter(
    (t) => symbolSet.has(t.symbol),
  );
  const passed = buildTradesFromTemplate(
    templates,
    ADX_MIN,
    VIX_THRESHOLD,
    TAKE_PROFIT_PCT,
    MAX_HOLD_DAYS,
  );
  return simulateOperationalWinRate(passed, symbols).executed;
}

function buildPortfolioMetrics(
  labelJa: string,
  symbols: string[],
  trades: ForwardPassedTradeRecord[],
  fromDate: string,
  toDate: string,
): ForwardMalaysiaV1PortfolioRow {
  const phase = buildWalkForward31PhaseMetrics(labelJa, fromDate, toDate, trades);
  const years = calendarYears(fromDate, toDate);
  const cagr =
    phase.cumulativeReturnPct > -100
      ? round3((Math.pow(1 + phase.cumulativeReturnPct / 100, 1 / years) - 1) * 100)
      : null;
  return {
    size: symbols.length,
    symbols: [...symbols],
    labelJa,
    tradeCount: phase.tradeCount,
    cumulativeReturnPct: phase.cumulativeReturnPct,
    winRatePct: phase.winRatePct,
    profitFactor: phase.profitFactor,
    sharpe: phase.sharpe,
    maxDrawdownPct: phase.maxDrawdownPct,
    cagr,
    mar: phase.mar,
  };
}

function rankPortfolioRows(rows: ForwardMalaysiaV1PortfolioRow[]): ForwardMalaysiaV1PortfolioRow[] {
  return [...rows].sort((a, b) => {
    const marA = a.mar ?? -999;
    const marB = b.mar ?? -999;
    if (Math.abs(marA - marB) > 0.01) return marB - marA;
    const sharpeDiff = (b.sharpe ?? -999) - (a.sharpe ?? -999);
    if (Math.abs(sharpeDiff) > 0.01) return sharpeDiff;
    return b.cumulativeReturnPct - a.cumulativeReturnPct;
  });
}

function buildSymbolMetrics(input: {
  def: (typeof MALAYSIA_V1_UNIVERSE)[number];
  bundle: SurvivorshipOhlcvBundle;
  dividends: DividendEvent[];
  fromDate: string;
  toDate: string;
  cachedTemplates: CachedTemplates;
}): ForwardMalaysiaV1SymbolMetrics {
  const { def, bundle, dividends, fromDate, toDate, cachedTemplates } = input;
  const trades = collectExecutedTradesForUniverse(
    bundle,
    [def.symbol],
    fromDate,
    toDate,
    cachedTemplates,
  );
  const returns = trades.map((t) => t.returnPct);
  const divReturns = trades.map((t) =>
    round3(t.returnPct + dividendAccrualPct(dividends, t.entryDate, t.exitDate, t.entryPrice)),
  );
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const totalReturnPct = round3(returns.reduce((s, r) => s + r, 0) * deployableScale);
  const totalReturnWithDividendPct = round3(divReturns.reduce((s, r) => s + r, 0) * deployableScale);
  const years = calendarYears(fromDate, toDate);
  const grossWin = returns.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(returns.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const bars = (bundle.etfBars[def.symbol] ?? []) as OhlcvBarWithVolume[];
  const { grade, gradeJa } = gradeMalaysiaSymbol({
    tradeCount: trades.length,
    winRatePct: trades.length > 0 ? round3((returns.filter((r) => r > 0).length / trades.length) * 100) : 0,
    cumulativeReturnPct: totalReturnPct,
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    maxDrawdownPct: portfolioMaxDrawdownPct(exitOrderedReturns(trades).map((r) => r * deployableScale)),
  });

  return {
    symbol: def.symbol,
    nameJa: def.nameJa,
    yahooSymbol: def.yahooSymbol,
    fromDate,
    toDate,
    years: round3(years),
    tradeCount: trades.length,
    totalReturnPct,
    totalReturnWithDividendPct,
    winRatePct: trades.length > 0 ? round3((returns.filter((r) => r > 0).length / trades.length) * 100) : 0,
    profitFactor: grossLoss > 0 ? round3(grossWin / grossLoss) : null,
    sharpe: tradeSharpe(returns, years),
    maxDrawdownPct: portfolioMaxDrawdownPct(exitOrderedReturns(trades).map((r) => r * deployableScale)),
    cagr:
      totalReturnPct > -100
        ? round3((Math.pow(1 + totalReturnPct / 100, 1 / years) - 1) * 100)
        : null,
    dividendYieldPct: dividendYieldPct(dividends, bars, toDate),
    volatilityPct: dailyReturnVolatilityPct(bars),
    avgDailyVolume: avgDailyVolume(bars),
    grade,
    gradeJa,
  };
}

function buildUsCompareRows(
  us: ForwardMalaysiaV1PortfolioRow,
  my: ForwardMalaysiaV1PortfolioRow,
  usLiquidity: number | null,
  myLiquidity: number | null,
): ForwardMalaysiaV1UsCompareRow[] {
  const pick = (usScore: number, myScore: number): 'US' | 'MY' | 'tie' => {
    if (Math.abs(usScore - myScore) < 0.05) return 'tie';
    return usScore > myScore ? 'US' : 'MY';
  };
  return [
    {
      dimensionJa: 'A 成長性（CAGR）',
      usValueJa: `${us.cagr ?? '—'}%`,
      myValueJa: `${my.cagr ?? '—'}%`,
      winner: pick(us.cagr ?? 0, my.cagr ?? 0),
    },
    {
      dimensionJa: 'B 安定性（Sharpe・WR）',
      usValueJa: `Sharpe${us.sharpe ?? '—'} · WR${us.winRatePct}%`,
      myValueJa: `Sharpe${my.sharpe ?? '—'} · WR${my.winRatePct}%`,
      winner: pick((us.sharpe ?? 0) + us.winRatePct / 100, (my.sharpe ?? 0) + my.winRatePct / 100),
    },
    {
      dimensionJa: 'C 配当性',
      usValueJa: 'ETF配当込み（価格主体）',
      myValueJa: '個別株配当利回り高',
      winner: 'MY',
    },
    {
      dimensionJa: 'D 流動性',
      usValueJa: usLiquidity != null ? `平均出来高${usLiquidity}` : '—',
      myValueJa: myLiquidity != null ? `平均出来高${myLiquidity}` : '—',
      winner: pick(usLiquidity ?? 0, myLiquidity ?? 0),
    },
    {
      dimensionJa: 'E ドローダウン耐性',
      usValueJa: `${us.maxDrawdownPct ?? '—'}%`,
      myValueJa: `${my.maxDrawdownPct ?? '—'}%`,
      winner: pick(Math.abs(my.maxDrawdownPct ?? 99), Math.abs(us.maxDrawdownPct ?? 99)),
    },
  ];
}

function simulateHybridSleeve(
  usTrades: ForwardPassedTradeRecord[],
  myTrades: ForwardPassedTradeRecord[],
  usWeightPct: number,
  myWeightPct: number,
  fromDate: string,
  toDate: string,
): ForwardMalaysiaV1HybridRow {
  const deployableScale = (100 - CASH_RESERVE_PCT) / 100;
  const usReturns = usTrades.map((t) => t.returnPct * deployableScale * (usWeightPct / 100));
  const myReturns = myTrades.map((t) => t.returnPct * deployableScale * (myWeightPct / 100));
  const combined = [...usReturns, ...myReturns];
  const years = calendarYears(fromDate, toDate);
  const usCum = round3(usReturns.reduce((s, r) => s + r, 0));
  const myCum = round3(myReturns.reduce((s, r) => s + r, 0));
  const combinedCumulativePct = round3(usCum + myCum);
  const ordered = [
    ...usTrades.map((t, i) => ({ date: t.exitDate, r: usReturns[i]! })),
    ...myTrades.map((t, i) => ({ date: t.exitDate, r: myReturns[i]! })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const maxDrawdownPct = portfolioMaxDrawdownPct(ordered.map((o) => o.r));

  return {
    usWeightPct,
    myWeightPct,
    labelJa: `US ${usWeightPct}% / MY ${myWeightPct}%`,
    usCumulativePct: usCum,
    myCumulativePct: myCum,
    combinedCumulativePct,
    combinedSharpe: tradeSharpe(combined, years),
    combinedMaxDrawdownPct: maxDrawdownPct,
  };
}

function buildRm3000Plan(input: {
  variantJa: string;
  trades: ForwardPassedTradeRecord[];
  symbols: string[];
  lotMYR: number;
}): ForwardMalaysiaV1Rm3000Plan {
  const spec = { ...RM700_SPEC, lotMYR: input.lotMYR };
  const path = simulateLotSizingPath({
    trades: input.trades,
    symbols: input.symbols,
    spec,
    initialCapitalMYR: RM3000,
  });
  const mc = runBootstrapMonteCarlo({
    pool: input.trades,
    symbols: input.symbols,
    initialCapitalMYR: RM3000,
    runs: BOOTSTRAP_MC_RUNS,
    seed: BOOTSTRAP_SEED,
  });
  return {
    variantJa: input.variantJa,
    recommendedLotMYR: input.lotMYR,
    expectedReturnPct: path.cumulativeReturnPct,
    expectedMaxDrawdownPct: path.maxDrawdownPct,
    bankruptcyRatePct: mc.bankruptcyRatePct,
    noteJa: `RM${input.lotMYR}/枠 · 期待累積${path.cumulativeReturnPct}% · MC破産${mc.bankruptcyRatePct}% · p5累積${mc.p5CumulativePct}%`,
  };
}

export function gradeMalaysiaV1Adoption(input: {
  bestMy: ForwardMalaysiaV1PortfolioRow;
  usBaseline: ForwardMalaysiaV1PortfolioRow;
  topSymbolGrades: ForwardMalaysiaV1SymbolGrade[];
}): { grade: ForwardMalaysiaV1AdoptionGrade; verdictJa: string } {
  const sCount = input.topSymbolGrades.filter((g) => g === 'S' || g === 'A').length;
  const { bestMy, usBaseline } = input;

  if (
    bestMy.tradeCount >= 8 &&
    bestMy.cumulativeReturnPct >= 20 &&
    bestMy.winRatePct >= 80 &&
    sCount >= 3 &&
    (bestMy.sharpe ?? 0) >= 1
  ) {
    return {
      grade: 'A',
      verdictJa: `A 即運用 — MY最適${bestMy.symbols.join('/')} · 累積${bestMy.cumulativeReturnPct}% · S/A銘柄${sCount}件`,
    };
  }
  if (bestMy.tradeCount >= 5 && bestMy.cumulativeReturnPct > 0 && bestMy.winRatePct >= 75) {
    return {
      grade: 'B',
      verdictJa: `B 運用可能 — MY累積${bestMy.cumulativeReturnPct}% · US累積${usBaseline.cumulativeReturnPct}% · ハイブリッド併用推奨`,
    };
  }
  if (bestMy.cumulativeReturnPct >= -5 || bestMy.winRatePct >= 65) {
    return {
      grade: 'C',
      verdictJa: `C 要改善 — MY累積${bestMy.cumulativeReturnPct}% · 銘柄選定・ロット縮小で段階導入`,
    };
  }
  return {
    grade: 'D',
    verdictJa: `D 不採用 — MY成績${bestMy.cumulativeReturnPct}% · US単独維持`,
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

export async function fetchMalaysiaV1AuditBundle(
  startDate = MALAYSIA_V1_AUDIT_START,
): Promise<SurvivorshipOhlcvBundle | null> {
  const etfBars: Record<string, OhlcvBar[]> = {};
  const fetchedSymbols: string[] = [];
  const failedSymbols: string[] = [];
  const firstBarDates: Record<string, string> = {};

  for (const def of MALAYSIA_V1_UNIVERSE) {
    const { bars, ok } = await fetchMalaysiaBarsWithVolume(def.yahooSymbol, startDate);
    if (!ok) {
      failedSymbols.push(def.symbol);
      continue;
    }
    etfBars[def.symbol] = bars;
    fetchedSymbols.push(def.symbol);
    firstBarDates[def.symbol] = bars[0]!.date;
  }

  if (fetchedSymbols.length < 4) return null;

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, startDate);
  if (!spyFetch.result.ok) return null;
  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, startDate);

  const dateSet = new Set<string>();
  for (const sym of fetchedSymbols) {
    for (const b of etfBars[sym] ?? []) dateSet.add(b.date);
  }
  const tradingDates = [...dateSet].sort();

  return {
    etfBars,
    spyBars: spyFetch.bars,
    vixBars: vixFetch.result.ok ? vixFetch.bars : [],
    tradingDates,
    latestDate: tradingDates[tradingDates.length - 1] ?? '',
    fetchedSymbols,
    failedSymbols,
    firstBarDates,
  };
}

export async function buildMalaysiaV1AuditReport(input: {
  myBundle: SurvivorshipOhlcvBundle;
  usBundle: SurvivorshipOhlcvBundle;
  fromDate?: string;
  auditedAt?: string;
}): Promise<ForwardMalaysiaV1AuditReport | null> {
  const auditedAt = input.auditedAt ?? new Date().toISOString();
  const toDate = input.myBundle.latestDate;
  const tenYearAgo = new Date(`${toDate}T00:00:00Z`);
  tenYearAgo.setUTCFullYear(tenYearAgo.getUTCFullYear() - 10);
  const computedFrom = tenYearAgo.toISOString().slice(0, 10);
  const fromDate =
    input.fromDate ??
    (computedFrom >= MALAYSIA_V1_AUDIT_START ? computedFrom : MALAYSIA_V1_AUDIT_START);

  const mySymbols = input.myBundle.fetchedSymbols;
  const cachedTemplates = precomputeTradeTemplates({
    bundle: input.myBundle,
    symbols: mySymbols,
    fromDate,
    toDate,
  });

  const dividendMap: Record<string, DividendEvent[]> = {};
  await Promise.all(
    MALAYSIA_V1_UNIVERSE.filter((d) => mySymbols.includes(d.symbol)).map(async (def) => {
      dividendMap[def.symbol] = await fetchYahooDividends(def.yahooSymbol, fromDate);
    }),
  );

  const symbolRows: ForwardMalaysiaV1SymbolMetrics[] = [];
  for (const def of MALAYSIA_V1_UNIVERSE) {
    if (!mySymbols.includes(def.symbol)) continue;
    const symFrom = input.myBundle.firstBarDates[def.symbol] ?? fromDate;
    const symStart = symFrom > fromDate ? symFrom : fromDate;
    symbolRows.push(
      buildSymbolMetrics({
        def,
        bundle: input.myBundle,
        dividends: dividendMap[def.symbol] ?? [],
        fromDate: symStart,
        toDate,
        cachedTemplates,
      }),
    );
  }
  symbolRows.sort((a, b) => {
    const order = { S: 0, A: 1, B: 2, C: 3 };
    const g = order[a.grade] - order[b.grade];
    if (g !== 0) return g;
    return b.totalReturnWithDividendPct - a.totalReturnWithDividendPct;
  });

  const bestPortfolioBySize: ForwardMalaysiaV1PortfolioRow[] = [];
  for (const size of [2, 3, 4, 5] as const) {
    const combos = combinations(mySymbols, size);
    const rows: ForwardMalaysiaV1PortfolioRow[] = [];
    for (const combo of combos) {
      const trades = collectExecutedTradesForUniverse(
        input.myBundle,
        combo,
        fromDate,
        toDate,
        cachedTemplates,
      );
      if (trades.length < size) continue;
      rows.push(
        buildPortfolioMetrics(`${size}銘柄 ${combo.join('/')}`, combo, trades, fromDate, toDate),
      );
    }
    const best = rankPortfolioRows(rows)[0];
    if (best) bestPortfolioBySize.push(best);
  }

  const usSymbols = [...ROBUSTNESS_ETF_UNIVERSE].filter((s) =>
    input.usBundle.fetchedSymbols.includes(s),
  );
  const usTrades = collectFullHistoryExecutedTrades(input.usBundle, fromDate, toDate);
  const usBaseline = buildPortfolioMetrics(
    'US版4ETF',
    usSymbols,
    usTrades,
    fromDate,
    toDate,
  );

  const bestMy =
    rankPortfolioRows(bestPortfolioBySize)[0] ??
    buildPortfolioMetrics(
      'MY全銘柄',
      mySymbols,
      collectExecutedTradesForUniverse(
        input.myBundle,
        mySymbols,
        fromDate,
        toDate,
        cachedTemplates,
      ),
      fromDate,
      toDate,
    );

  const myBestTrades = collectExecutedTradesForUniverse(
    input.myBundle,
    bestMy.symbols,
    fromDate,
    toDate,
    cachedTemplates,
  );

  const usLiquidity = mean(
    usSymbols
      .map((s) => avgDailyVolume(input.usBundle.etfBars[s] ?? []))
      .filter((v): v is number => v != null),
  );
  const myLiquidity = mean(
    bestMy.symbols
      .map((s) => avgDailyVolume(input.myBundle.etfBars[s] ?? []))
      .filter((v): v is number => v != null),
  );

  const usCompareRows = buildUsCompareRows(usBaseline, bestMy, usLiquidity, myLiquidity);

  const hybridRows: ForwardMalaysiaV1HybridRow[] = [
    simulateHybridSleeve(usTrades, myBestTrades, 50, 50, fromDate, toDate),
    simulateHybridSleeve(usTrades, myBestTrades, 70, 30, fromDate, toDate),
    simulateHybridSleeve(usTrades, myBestTrades, 30, 70, fromDate, toDate),
  ];

  const myLot =
    bestMy.maxDrawdownPct != null && Math.abs(bestMy.maxDrawdownPct) > 25 ? 500 : 700;
  const hybridLot = 500;

  const rm3000Plans: ForwardMalaysiaV1Rm3000Plan[] = [
    buildRm3000Plan({
      variantJa: 'US版',
      trades: usTrades,
      symbols: usSymbols,
      lotMYR: 700,
    }),
    buildRm3000Plan({
      variantJa: 'Malaysia版',
      trades: myBestTrades,
      symbols: bestMy.symbols,
      lotMYR: myLot,
    }),
    ...hybridRows.map((h) => {
      const lot = h.usWeightPct === 50 ? hybridLot : h.usWeightPct >= 70 ? 600 : 400;
      const merged = [...usTrades, ...myBestTrades].sort((a, b) =>
        a.entryDate.localeCompare(b.entryDate),
      );
      const path = simulateLotSizingPath({
        trades: merged,
        symbols: [...usSymbols, ...bestMy.symbols],
        spec: { ...RM700_SPEC, lotMYR: lot },
        initialCapitalMYR: RM3000,
      });
      const mc = runBootstrapMonteCarlo({
        pool: merged,
        symbols: [...usSymbols, ...bestMy.symbols],
        initialCapitalMYR: RM3000,
        runs: BOOTSTRAP_MC_RUNS,
        seed: BOOTSTRAP_SEED + h.usWeightPct,
      });
      return {
        variantJa: `Hybrid ${h.labelJa}`,
        recommendedLotMYR: lot,
        expectedReturnPct: path.cumulativeReturnPct,
        expectedMaxDrawdownPct: path.maxDrawdownPct,
        bankruptcyRatePct: mc.bankruptcyRatePct,
        noteJa: `合成累積${h.combinedCumulativePct}% · RM${lot}/枠 · MC破産${mc.bankruptcyRatePct}%`,
      };
    }),
  ];

  const { grade, verdictJa } = gradeMalaysiaV1Adoption({
    bestMy,
    usBaseline,
    topSymbolGrades: symbolRows.map((r) => r.grade),
  });

  const answerAJa = `A 個別銘柄: ${symbolRows.map((r) => `${r.nameJa}(${r.grade}·累積${r.totalReturnWithDividendPct}%·WR${r.winRatePct}%)`).join(' · ')}`;
  const answerBJa = `B ベストPF: ${bestPortfolioBySize.map((p) => `${p.size}銘柄=${p.symbols.join('/')} 累積${p.cumulativeReturnPct}%`).join(' | ')}`;
  const answerCJa = `C US比較: ${usCompareRows.map((r) => `${r.dimensionJa}→${r.winner}`).join(' · ')}`;
  const answerDJa = `D ハイブリッド: ${hybridRows.map((h) => `${h.labelJa} 合成${h.combinedCumulativePct}%`).join(' · ')}`;
  const answerEJa = `E RM3000: ${rm3000Plans.map((p) => `${p.variantJa} ロットRM${p.recommendedLotMYR} 期待${p.expectedReturnPct}% DD${p.expectedMaxDrawdownPct}% 破産${p.bankruptcyRatePct}%`).join(' | ')}`;

  const consistencyNoteJa =
    '監査53-63整合: US版思想そのまま移植 · VIX/SPY63維持 · 監査64=Malaysia v1初版 · US版継続 · ルール変更なし';

  const humanSummaryJa = [
    '監査64 Malaysia Version v1',
    `期間 ${fromDate}〜${toDate}`,
    MALAYSIA_FIXED_CONDITIONS_JA,
    answerAJa,
    answerBJa,
    answerCJa,
    answerDJa,
    answerEJa,
    verdictJa,
    consistencyNoteJa,
  ].join('\n');

  return {
    auditedAt,
    fromDate,
    toDate,
    usFixedConditionsJa: US_FIXED_CONDITIONS_JA,
    malaysiaFixedConditionsJa: MALAYSIA_FIXED_CONDITIONS_JA,
    symbolRows,
    bestPortfolioBySize,
    usBaseline,
    usCompareRows,
    hybridRows,
    rm3000Plans,
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

export async function runMalaysiaV1Audit(): Promise<ForwardMalaysiaV1AuditReport | null> {
  const [myBundle, usBundle] = await Promise.all([
    fetchMalaysiaV1AuditBundle(),
    fetchRobustnessAuditBundle(),
  ]);
  if (!myBundle || !usBundle) return null;
  return buildMalaysiaV1AuditReport({ myBundle, usBundle });
}

export function formatMalaysiaV1Csv(report: ForwardMalaysiaV1AuditReport): string {
  const lines = [
    `# 最重要監査その64 Malaysia v1 ${report.fromDate}〜${report.toDate}`,
    `# ${report.malaysiaFixedConditionsJa}`,
    `# ${report.adoptionVerdictJa}`,
    '',
    'section,symbol,name,grade,trades,totalReturn,totalReturnDiv,winRate,PF,sharpe,maxDD,cagr,divYield,volatility',
    ...report.symbolRows.map((r) =>
      [
        'symbol',
        r.symbol,
        r.nameJa,
        r.grade,
        r.tradeCount,
        r.totalReturnPct,
        r.totalReturnWithDividendPct,
        r.winRatePct,
        r.profitFactor ?? '',
        r.sharpe ?? '',
        r.maxDrawdownPct ?? '',
        r.cagr ?? '',
        r.dividendYieldPct ?? '',
        r.volatilityPct ?? '',
      ].join(','),
    ),
    '',
    'section,size,symbols,trades,cumulative,winRate,PF,sharpe,maxDD,cagr,mar',
    ...report.bestPortfolioBySize.map((p) =>
      [
        'portfolio',
        p.size,
        `"${p.symbols.join('/')}"`,
        p.tradeCount,
        p.cumulativeReturnPct,
        p.winRatePct,
        p.profitFactor ?? '',
        p.sharpe ?? '',
        p.maxDrawdownPct ?? '',
        p.cagr ?? '',
        p.mar ?? '',
      ].join(','),
    ),
    ['portfolio', 'US', `"${report.usBaseline.symbols.join('/')}"`, report.usBaseline.tradeCount, report.usBaseline.cumulativeReturnPct, report.usBaseline.winRatePct, report.usBaseline.profitFactor ?? '', report.usBaseline.sharpe ?? '', report.usBaseline.maxDrawdownPct ?? '', report.usBaseline.cagr ?? '', report.usBaseline.mar ?? ''].join(','),
    '',
    'section,dimension,us,my,winner',
    ...report.usCompareRows.map((r) =>
      ['compare', r.dimensionJa, `"${r.usValueJa}"`, `"${r.myValueJa}"`, r.winner].join(','),
    ),
    '',
    'section,hybrid,usPct,myPct,usCum,myCum,combined,sharpe,maxDD',
    ...report.hybridRows.map((h) =>
      ['hybrid', h.labelJa, h.usWeightPct, h.myWeightPct, h.usCumulativePct, h.myCumulativePct, h.combinedCumulativePct, h.combinedSharpe ?? '', h.combinedMaxDrawdownPct ?? ''].join(','),
    ),
    '',
    'section,variant,lotMYR,expectedReturn,maxDD,bankruptcyRate,note',
    ...report.rm3000Plans.map((p) =>
      ['rm3000', p.variantJa, p.recommendedLotMYR, p.expectedReturnPct, p.expectedMaxDrawdownPct, p.bankruptcyRatePct, `"${p.noteJa}"`].join(','),
    ),
    '',
    'section,answer,content',
    ['answer', 'A', `"${report.answerAJa}"`].join(','),
    ['answer', 'B', `"${report.answerBJa}"`].join(','),
    ['answer', 'C', `"${report.answerCJa}"`].join(','),
    ['answer', 'D', `"${report.answerDJa}"`].join(','),
    ['answer', 'E', `"${report.answerEJa}"`].join(','),
    ['verdict', 'grade', report.adoptionGrade].join(','),
    ['consistency', 'note', `"${report.consistencyNoteJa}"`].join(','),
  ];
  return lines.join('\n');
}
