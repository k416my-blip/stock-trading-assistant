import type { PriceRefreshOptions, PriceSyncResult } from '../types/marketData';
import { isDev } from '../utils/isDev';

const MIN_SILENT_GAP_MS = 8_000;
const DEFAULT_DEBOUNCE_MS = 2_500;

let inFlight: Promise<PriceSyncResult> | null = null;
let debouncedSilent: Promise<PriceSyncResult> | null = null;
let lastCompletedAt = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function emptyOk(): PriceSyncResult {
  return { ok: true, updatedCount: 0, failures: [], marketClosedHint: false };
}

export function isPortfolioRefreshInFlight(): boolean {
  return inFlight != null;
}

/** 同時実行を1本にまとめ、自動更新は間引く */
export function requestPortfolioPriceRefresh(
  execute: () => Promise<PriceSyncResult>,
  options: PriceRefreshOptions = {},
): Promise<PriceSyncResult> {
  const silent = options.silent ?? false;

  if (inFlight) {
    return inFlight;
  }

  if (silent && debouncedSilent) {
    return debouncedSilent;
  }

  const now = Date.now();
  if (silent && now - lastCompletedAt < MIN_SILENT_GAP_MS) {
    if (isDev) {
      console.log('[portfolio-refresh] skipped (throttled silent refresh)');
    }
    return Promise.resolve(emptyOk());
  }

  const runNow = (): Promise<PriceSyncResult> => {
    inFlight = execute().finally(() => {
      inFlight = null;
      lastCompletedAt = Date.now();
    });
    return inFlight;
  };

  if (silent) {
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    debouncedSilent = new Promise((resolve) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        debouncedSilent = null;
        if (inFlight) {
          inFlight.then(resolve);
          return;
        }
        runNow().then(resolve);
      }, debounceMs);
    });
    return debouncedSilent;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  return runNow();
}

export function resetPortfolioRefreshCoordinator(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  debouncedSilent = null;
  inFlight = null;
  lastCompletedAt = 0;
}
