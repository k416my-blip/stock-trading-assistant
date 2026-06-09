import {
  FORWARD_ETF_UNIVERSE,
  FORWARD_HOLD_DAYS,
  FORWARD_MAX_CONCURRENT,
  FORWARD_PRIORITY,
  FORWARD_SIGNAL_START,
  FORWARD_SYMBOL_WEIGHTS,
  FORWARD_TAKE_PROFIT_PCT,
  type ForwardEtfSymbol,
} from '../../constants/forwardValidation';
import type {
  ForwardOpenPosition,
  ForwardSignalRecord,
  ForwardValidationPersisted,
} from '../../types/forwardValidation';
import {
  buildSpyRegimeMap,
  barIndexByDate,
  scanSignalAtBar,
  type OhlcvBar,
} from './case4Indicators';
import {
  compareWithBacktestBaseline,
  computeForwardMetrics,
  maybeGenerateReports,
  normalizeSymbolWeights,
  refreshDailyReturnForSignalDate,
} from './forwardValidationMetrics';
import {
  loadForwardValidationState,
  saveForwardValidationState,
} from './forwardValidationStorage';
import { fetchForwardOhlcvDetailed } from './yahooOhlcvFetch';
import type { ForwardYahooFetchLog } from '../../types/forwardValidation';

export type ForwardOhlcvBundle = {
  etfBars: Record<ForwardEtfSymbol, OhlcvBar[]>;
  spyBars: OhlcvBar[];
  /** ^VIX 日足（取得失敗時は空配列） */
  vixBars?: OhlcvBar[];
  latestDate: string;
  tradingDates: string[];
  fetchLog: ForwardYahooFetchLog;
  symbolLatestDates: Record<string, string>;
};

function signalId(date: string, symbol: ForwardEtfSymbol): string {
  return `${date}_${symbol}`;
}

function nextTradingDate(dates: string[], current: string): string | null {
  const idx = dates.indexOf(current);
  if (idx < 0 || idx >= dates.length - 1) return null;
  return dates[idx + 1] ?? null;
}

function buildTradingDates(etfBars: Record<ForwardEtfSymbol, OhlcvBar[]>): string[] {
  const set = new Set<string>();
  for (const sym of FORWARD_ETF_UNIVERSE) {
    for (const b of etfBars[sym]) set.add(b.date);
  }
  return [...set].sort();
}

export async function fetchForwardOhlcvBundle(
  historyStartDate?: string,
): Promise<ForwardOhlcvBundle | null> {
  const fetchedAt = new Date().toISOString();
  const symbolResults = [];
  const etfBars = {} as Record<ForwardEtfSymbol, OhlcvBar[]>;
  const symbolLatestDates: Record<string, string> = {};

  for (const sym of FORWARD_ETF_UNIVERSE) {
    const { bars, result } = await fetchForwardOhlcvDetailed(sym, 15_000, historyStartDate);
    symbolResults.push(result);
    if (!result.ok) return null;
    etfBars[sym] = bars;
    if (result.latestDate) symbolLatestDates[sym] = result.latestDate;
  }

  const spyFetch = await fetchForwardOhlcvDetailed('SPY', 15_000, historyStartDate);
  symbolResults.push(spyFetch.result);
  if (!spyFetch.result.ok) return null;

  const vixFetch = await fetchForwardOhlcvDetailed('^VIX', 15_000, historyStartDate);
  symbolResults.push(vixFetch.result);

  const fetchLog: ForwardYahooFetchLog = {
    fetchedAt,
    successCount: symbolResults.filter((r) => r.ok).length,
    failureCount: symbolResults.filter((r) => !r.ok).length,
    symbols: symbolResults,
  };

  const tradingDates = buildTradingDates(etfBars);
  const latestDate = tradingDates[tradingDates.length - 1] ?? '';
  symbolLatestDates.SPY = spyFetch.result.latestDate ?? '';
  if (vixFetch.result.latestDate) symbolLatestDates.VIX = vixFetch.result.latestDate;

  return {
    etfBars,
    spyBars: spyFetch.bars,
    vixBars: vixFetch.result.ok ? vixFetch.bars : [],
    latestDate,
    tradingDates,
    fetchLog,
    symbolLatestDates,
  };
}

function hasSignal(state: ForwardValidationPersisted, date: string, symbol: ForwardEtfSymbol): boolean {
  return state.signals.some((s) => s.date === date && s.symbol === symbol);
}

function processEntriesForDate(
  state: ForwardValidationPersisted,
  date: string,
  bundle: ForwardOhlcvBundle,
): ForwardValidationPersisted {
  let next = { ...state, signals: [...state.signals], openPositions: [...state.openPositions] };
  const pending = next.signals.filter(
    (s) => s.status === 'pending_entry' && s.entryDate === date,
  );
  const bySignalDate = new Map<string, ForwardSignalRecord[]>();
  for (const sig of pending) {
    const arr = bySignalDate.get(sig.date) ?? [];
    arr.push(sig);
    bySignalDate.set(sig.date, arr);
  }

  for (const sig of pending) {
    const bars = bundle.etfBars[sig.symbol];
    const idx = barIndexByDate(bars, date);
    if (idx < 0) continue;
    const entryPrice = bars[idx]!.close;
    const batch = bySignalDate.get(sig.date) ?? [sig];
    const weightMap = normalizeSymbolWeights(batch.map((p) => p.symbol));
    const weight = weightMap.get(sig.symbol) ?? FORWARD_SYMBOL_WEIGHTS[sig.symbol];

    next.signals = next.signals.map((s) =>
      s.id === sig.id
        ? { ...s, status: 'open' as const, entryPrice, entryDate: date }
        : s,
    );
    const pos: ForwardOpenPosition = {
      id: `pos_${sig.id}`,
      signalId: sig.id,
      signalDate: sig.date,
      symbol: sig.symbol,
      entryDate: date,
      entryPrice,
      weight,
      adx14: sig.adx14,
      macdHistPct: sig.macdHistPct,
      barsHeld: 0,
    };
    next.openPositions.push(pos);
  }
  return next;
}

function closePosition(
  state: ForwardValidationPersisted,
  pos: ForwardOpenPosition,
  exit: { exitDate: string; exitPrice: number; returnPct: number; reason: 'take_profit' | 'max_hold' },
): ForwardValidationPersisted {
  const trade = {
    id: `trade_${pos.id}`,
    signalId: pos.signalId,
    signalDate: pos.signalDate,
    exitDate: exit.exitDate,
    symbol: pos.symbol,
    entryPrice: pos.entryPrice,
    exitPrice: exit.exitPrice,
    returnPct: exit.returnPct,
    weight: pos.weight,
    exitReason: exit.reason,
    adx14: pos.adx14,
    macdHistPct: pos.macdHistPct,
  };
  let next: ForwardValidationPersisted = {
    ...state,
    openPositions: state.openPositions.filter((p) => p.id !== pos.id),
    closedTrades: [...state.closedTrades, trade],
    signals: state.signals.map((s) =>
      s.id === pos.signalId ? { ...s, status: 'closed' as const } : s,
    ),
  };
  next = refreshDailyReturnForSignalDate(next, pos.signalDate);
  return next;
}

function updateOpenPositionsForDate(
  state: ForwardValidationPersisted,
  date: string,
  bundle: ForwardOhlcvBundle,
): ForwardValidationPersisted {
  let next = state;
  for (const pos of [...state.openPositions]) {
    const bars = bundle.etfBars[pos.symbol];
    const idx = barIndexByDate(bars, date);
    if (idx < 0) continue;
    const entryIdx = barIndexByDate(bars, pos.entryDate);
    if (entryIdx < 0) continue;

    const target = pos.entryPrice * (1 + FORWARD_TAKE_PROFIT_PCT / 100);
    const bar = bars[idx]!;
    if (bar.high >= target) {
      next = closePosition(next, pos, {
        exitDate: date,
        exitPrice: target,
        returnPct: FORWARD_TAKE_PROFIT_PCT,
        reason: 'take_profit',
      });
      continue;
    }

    const barsHeld = idx - entryIdx;
    if (barsHeld >= FORWARD_HOLD_DAYS) {
      const returnPct = Math.round(((bar.close / pos.entryPrice - 1) * 100) * 1000) / 1000;
      next = closePosition(next, pos, {
        exitDate: date,
        exitPrice: bar.close,
        returnPct,
        reason: 'max_hold',
      });
      continue;
    }

    next = {
      ...next,
      openPositions: next.openPositions.map((p) =>
        p.id === pos.id ? { ...p, barsHeld } : p,
      ),
    };
  }
  return next;
}

function assignEntryDates(
  signalDate: string,
  tradingDates: string[],
): { entryDate: string | null; canSimulateNow: boolean } {
  const entryDate = nextTradingDate(tradingDates, signalDate);
  return { entryDate, canSimulateNow: entryDate != null };
}

function takeNewSignalsForDate(
  state: ForwardValidationPersisted,
  date: string,
  bundle: ForwardOhlcvBundle,
  regimeMap: Map<string, import('./case4Indicators').Regime>,
): ForwardValidationPersisted {
  if (date < FORWARD_SIGNAL_START) return state;

  const candidates: Array<{
    symbol: ForwardEtfSymbol;
    scan: NonNullable<ReturnType<typeof scanSignalAtBar>>;
  }> = [];

  for (const symbol of FORWARD_ETF_UNIVERSE) {
    if (hasSignal(state, date, symbol)) continue;
    const bars = bundle.etfBars[symbol];
    const idx = barIndexByDate(bars, date);
    if (idx < 0) continue;
    const scan = scanSignalAtBar(bars, idx, regimeMap);
    if (!scan?.passes) continue;
    candidates.push({ symbol, scan });
  }

  if (candidates.length === 0) return state;

  const taken = [...candidates]
    .sort((a, b) => FORWARD_PRIORITY[b.symbol] - FORWARD_PRIORITY[a.symbol])
    .slice(0, FORWARD_MAX_CONCURRENT);

  const { entryDate } = assignEntryDates(date, bundle.tradingDates);
  const now = new Date().toISOString();
  const next: ForwardValidationPersisted = {
    ...state,
    signals: [...state.signals],
  };

  for (const { symbol, scan } of taken) {
    const id = signalId(date, symbol);
    const record: ForwardSignalRecord = {
      id,
      date,
      symbol,
      adx14: scan.adx14,
      macdHistPct: scan.macdHistPct,
      dist52wPct: scan.dist52wPct,
      bucket: scan.bucket,
      entryPrice: null,
      entryDate,
      status: entryDate ? 'pending_entry' : 'skipped',
      createdAt: now,
    };
    next.signals.push(record);
  }

  return next;
}

export function processForwardValidationRange(
  state: ForwardValidationPersisted,
  bundle: ForwardOhlcvBundle,
  fromDate: string,
  toDate: string,
): ForwardValidationPersisted {
  const regimeMap = buildSpyRegimeMap(bundle.spyBars);
  const dates = bundle.tradingDates.filter((d) => d >= fromDate && d <= toDate);
  let next = state;

  for (const date of dates) {
    next = processEntriesForDate(next, date, bundle);
    next = updateOpenPositionsForDate(next, date, bundle);
    next = takeNewSignalsForDate(next, date, bundle, regimeMap);
  }

  next = {
    ...next,
    lastRunDate: toDate,
    lastRunAt: new Date().toISOString(),
    yahooLatestDate: bundle.latestDate,
    lastFetchAt: bundle.fetchLog.fetchedAt,
    yahooFetchLog: bundle.fetchLog,
  };
  next = maybeGenerateReports(next);
  return next;
}

export type ForwardValidationRunResult = {
  state: ForwardValidationPersisted;
  metrics: ReturnType<typeof computeForwardMetrics>;
  comparison: ReturnType<typeof compareWithBacktestBaseline>;
  bundle: ForwardOhlcvBundle;
  processedDates: string[];
  fetchLog: ForwardYahooFetchLog;
};

export async function runForwardValidation(options?: {
  force?: boolean;
}): Promise<ForwardValidationRunResult | null> {
  const bundle = await fetchForwardOhlcvBundle();
  if (!bundle) return null;

  let state = await loadForwardValidationState();
  const today = bundle.latestDate;

  state = {
    ...state,
    lastFetchAt: bundle.fetchLog.fetchedAt,
    yahooLatestDate: bundle.latestDate,
    yahooFetchLog: bundle.fetchLog,
  };

  if (!options?.force && state.lastRunDate === today) {
    await saveForwardValidationState(state);
    const metrics = computeForwardMetrics(state);
    return {
      state,
      metrics,
      comparison: compareWithBacktestBaseline(metrics),
      bundle,
      processedDates: [],
      fetchLog: bundle.fetchLog,
    };
  }

  const fromDate = (() => {
    if (state.lastRunDate == null) return FORWARD_SIGNAL_START;
    if (options?.force && state.lastRunDate === today) return today;
    const next = nextTradingDate(bundle.tradingDates, state.lastRunDate);
    return next ?? today;
  })();

  if (fromDate > today) {
    await saveForwardValidationState(state);
    const metrics = computeForwardMetrics(state);
    return {
      state,
      metrics,
      comparison: compareWithBacktestBaseline(metrics),
      bundle,
      processedDates: [],
      fetchLog: bundle.fetchLog,
    };
  }

  state = processForwardValidationRange(state, bundle, fromDate, today);
  await saveForwardValidationState(state);

  const metrics = computeForwardMetrics(state);
  return {
    state,
    metrics,
    comparison: compareWithBacktestBaseline(metrics),
    bundle,
    processedDates: bundle.tradingDates.filter((d) => d >= fromDate && d <= today),
    fetchLog: bundle.fetchLog,
  };
}

export { computeForwardMetrics, compareWithBacktestBaseline, maybeGenerateReports };
