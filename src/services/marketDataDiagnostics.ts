import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { MarketDataErrorKind, PriceSyncResult } from '../types/marketData';
import { isPortfolioRefreshInFlight } from './portfolioRefreshCoordinator';

type DiagnosticsPersisted = {
  version: 1;
  dayKey: string;
  totalRefreshCount: number;
  manualRefreshCount: number;
  autoRefreshCount: number;
  totalApiCalls: number;
  apiCallsToday: number;
  successfulPriceFetchCount: number;
  failedPriceFetchCount: number;
  totalFetchLatencyMs: number;
  latencySampleCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  invalidSymbolCount: number;
  bursaCacheHitCount: number;
  bursaFullProbeCount: number;
  lastRefreshAt?: string;
  lastSuccessfulRefreshAt?: string;
  lastApiCallsPerRefresh?: number;
  lastHoldingsBefore?: number;
  lastHoldingsAfter?: number;
};

export type MarketDataDiagnosticsSnapshot = {
  totalRefreshCount: number;
  manualRefreshCount: number;
  autoRefreshCount: number;
  lastApiCallsPerRefresh: number;
  totalApiCalls: number;
  apiCallsToday: number;
  successfulPriceFetchCount: number;
  failedPriceFetchCount: number;
  successRatePercent: number | null;
  averageFetchLatencyMs: number | null;
  timeoutCount: number;
  rateLimitCount: number;
  invalidSymbolCount: number;
  lastRefreshAt?: string;
  lastSuccessfulRefreshAt?: string;
  refreshInFlight: boolean;
  bursaCacheHitCount: number;
  bursaFullProbeCount: number;
  lastHoldingsBefore?: number;
  lastHoldingsAfter?: number;
};

const EMPTY: DiagnosticsPersisted = {
  version: 1,
  dayKey: todayKey(),
  totalRefreshCount: 0,
  manualRefreshCount: 0,
  autoRefreshCount: 0,
  totalApiCalls: 0,
  apiCallsToday: 0,
  successfulPriceFetchCount: 0,
  failedPriceFetchCount: 0,
  totalFetchLatencyMs: 0,
  latencySampleCount: 0,
  timeoutCount: 0,
  rateLimitCount: 0,
  invalidSymbolCount: 0,
  bursaCacheHitCount: 0,
  bursaFullProbeCount: 0,
};

let state: DiagnosticsPersisted = { ...EMPTY };
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let refreshSessionActive = false;
let refreshSessionApiCalls = 0;
const listeners = new Set<() => void>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function safeNotify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* UI購読の失敗で診断を止めない */
    }
  }
}

function rollDayIfNeeded(): void {
  const key = todayKey();
  if (state.dayKey !== key) {
    state.dayKey = key;
    state.apiCallsToday = 0;
  }
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistDiagnostics();
  }, 400);
}

async function persistDiagnostics(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.marketDataDiagnostics, JSON.stringify(state));
  } catch {
    /* 診断の保存失敗は無視 */
  }
}

function parsePersisted(raw: string): DiagnosticsPersisted | null {
  try {
    const parsed = JSON.parse(raw) as DiagnosticsPersisted;
    if (parsed?.version !== 1) return null;
    return {
      ...EMPTY,
      ...parsed,
      dayKey: typeof parsed.dayKey === 'string' ? parsed.dayKey : todayKey(),
    };
  } catch {
    return null;
  }
}

export async function hydrateMarketDataDiagnostics(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.marketDataDiagnostics);
        if (raw) {
          const parsed = parsePersisted(raw);
          if (parsed) state = parsed;
        }
      } catch {
        state = { ...EMPTY };
      }
      rollDayIfNeeded();
      hydrated = true;
      safeNotify();
    })();
  }
  await hydratePromise;
}

export function subscribeMarketDataDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMarketDataDiagnosticsSnapshot(): MarketDataDiagnosticsSnapshot {
  rollDayIfNeeded();
  const attempts = state.successfulPriceFetchCount + state.failedPriceFetchCount;
  const successRatePercent =
    attempts > 0
      ? Math.round((state.successfulPriceFetchCount / attempts) * 1000) / 10
      : null;
  const averageFetchLatencyMs =
    state.latencySampleCount > 0
      ? Math.round(state.totalFetchLatencyMs / state.latencySampleCount)
      : null;

  return {
    totalRefreshCount: state.totalRefreshCount,
    manualRefreshCount: state.manualRefreshCount,
    autoRefreshCount: state.autoRefreshCount,
    lastApiCallsPerRefresh: state.lastApiCallsPerRefresh ?? 0,
    totalApiCalls: state.totalApiCalls,
    apiCallsToday: state.apiCallsToday,
    successfulPriceFetchCount: state.successfulPriceFetchCount,
    failedPriceFetchCount: state.failedPriceFetchCount,
    successRatePercent,
    averageFetchLatencyMs,
    timeoutCount: state.timeoutCount,
    rateLimitCount: state.rateLimitCount,
    invalidSymbolCount: state.invalidSymbolCount,
    lastRefreshAt: state.lastRefreshAt,
    lastSuccessfulRefreshAt: state.lastSuccessfulRefreshAt,
    refreshInFlight: refreshSessionActive || isPortfolioRefreshInFlight(),
    bursaCacheHitCount: state.bursaCacheHitCount,
    bursaFullProbeCount: state.bursaFullProbeCount,
    lastHoldingsBefore: state.lastHoldingsBefore,
    lastHoldingsAfter: state.lastHoldingsAfter,
  };
}

export async function resetMarketDataDiagnostics(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  state = { ...EMPTY, dayKey: todayKey() };
  hydrated = true;
  hydratePromise = null;
  refreshSessionActive = false;
  refreshSessionApiCalls = 0;
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.marketDataDiagnostics);
  } catch {
    /* ignore */
  }
  safeNotify();
}

export function recordRefreshSessionStart(silent: boolean): void {
  try {
    rollDayIfNeeded();
    refreshSessionActive = true;
    refreshSessionApiCalls = 0;
    state.totalRefreshCount += 1;
    if (silent) {
      state.autoRefreshCount += 1;
    } else {
      state.manualRefreshCount += 1;
    }
    state.lastRefreshAt = new Date().toISOString();
    schedulePersist();
    safeNotify();
  } catch {
    /* ignore */
  }
}

export function recordRefreshSessionEnd(params: {
  result: PriceSyncResult;
  holdingsBefore: number;
  holdingsAfter: number;
}): void {
  try {
    refreshSessionActive = false;
    state.lastApiCallsPerRefresh = refreshSessionApiCalls;
    state.lastHoldingsBefore = params.holdingsBefore;
    state.lastHoldingsAfter = params.holdingsAfter;
    state.successfulPriceFetchCount += params.result.updatedCount;
    state.failedPriceFetchCount += params.result.failures.length;

    const hadSuccess = params.result.updatedCount > 0;
    if (hadSuccess || (params.result.ok && params.result.failures.length === 0)) {
      state.lastSuccessfulRefreshAt = new Date().toISOString();
    }

    schedulePersist();
    safeNotify();
  } catch {
    refreshSessionActive = false;
  }
}

export function recordApiCallOutcome(latencyMs: number, errorKind?: MarketDataErrorKind): void {
  try {
    rollDayIfNeeded();
    const latency = Number.isFinite(latencyMs) && latencyMs >= 0 ? latencyMs : 0;

    state.totalApiCalls += 1;
    state.apiCallsToday += 1;
    state.totalFetchLatencyMs += latency;
    state.latencySampleCount += 1;

    if (refreshSessionActive) {
      refreshSessionApiCalls += 1;
    }

    if (errorKind === 'network_timeout') {
      state.timeoutCount += 1;
    }
    if (errorKind === 'rate_limit') {
      state.rateLimitCount += 1;
    }
    if (errorKind === 'symbol_invalid') {
      state.invalidSymbolCount += 1;
    }

    schedulePersist();
    safeNotify();
  } catch {
    /* ignore */
  }
}

export function recordInvalidSymbolSkip(): void {
  try {
    state.invalidSymbolCount += 1;
    schedulePersist();
    safeNotify();
  } catch {
    /* ignore */
  }
}

export function recordBursaCacheProbe(): void {
  try {
    state.bursaCacheHitCount += 1;
    schedulePersist();
    safeNotify();
  } catch {
    /* ignore */
  }
}

export function recordBursaFullProbe(): void {
  try {
    state.bursaFullProbeCount += 1;
    schedulePersist();
    safeNotify();
  } catch {
    /* ignore */
  }
}
