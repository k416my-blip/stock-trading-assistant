import type { PriceRefreshOptions, PriceSyncResult } from '../types/marketData';
import { emptyPriceSyncResult } from './holdingPriceCore';
import {
  logAutoUpdateSkipped,
  logPriceFetchDuplicateBlocked,
  logPriceFetchStart,
} from './productionOpsLog';

let pauseApiRequests: () => boolean = () => false;

/** アプリ起動後に performanceCostRuntime からバインド（verify では未バインド＝停止しない） */
export function bindPortfolioRefreshApiPause(check: () => boolean): void {
  pauseApiRequests = check;
}

const MIN_SILENT_GAP_MS = 8_000;
const MIN_MANUAL_GAP_MS = 1_500;
const DEFAULT_DEBOUNCE_MS = 2_500;

let inFlight: Promise<PriceSyncResult> | null = null;
let lastManualStartedAt = 0;
let debouncedSilent: Promise<PriceSyncResult> | null = null;
let lastCompletedAt = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function emptyOk(): PriceSyncResult {
  return emptyPriceSyncResult();
}

export function isPortfolioRefreshInFlight(): boolean {
  return inFlight != null;
}

export function getPortfolioRefreshCoordinatorSnapshot(): {
  inFlight: boolean;
  debouncedSilentPending: boolean;
  lastCompletedAt: number;
} {
  return {
    inFlight: inFlight != null,
    debouncedSilentPending: debouncedSilent != null,
    lastCompletedAt,
  };
}

/** 同時実行を1本にまとめ、自動更新は間引く */
export function requestPortfolioPriceRefresh(
  execute: () => Promise<PriceSyncResult>,
  options: PriceRefreshOptions = {},
): Promise<PriceSyncResult> {
  const silent = options.silent ?? false;
  const trigger = options.trigger ?? (silent ? 'auto' : 'manual');

  if (pauseApiRequests()) {
    logAutoUpdateSkipped('background_or_offline', { trigger, silent });
    return Promise.resolve({
      ...emptyOk(),
      displayStatus: 'cached',
      error: 'バックグラウンドまたはオフライン — キャッシュ表示',
    });
  }

  const now = Date.now();

  if (inFlight) {
    logPriceFetchDuplicateBlocked('in_flight', { trigger, silent });
    return inFlight;
  }

  if (!silent && now - lastManualStartedAt < MIN_MANUAL_GAP_MS) {
    logPriceFetchDuplicateBlocked('manual_throttle', {
      trigger,
      gapMs: now - lastManualStartedAt,
      minGapMs: MIN_MANUAL_GAP_MS,
    });
    return Promise.resolve(emptyOk());
  }

  if (silent && debouncedSilent) {
    logPriceFetchDuplicateBlocked('debounced_silent_pending', { trigger });
    return debouncedSilent;
  }

  if (silent && now - lastCompletedAt < MIN_SILENT_GAP_MS) {
    logAutoUpdateSkipped('throttled_silent_gap', {
      trigger,
      gapMs: now - lastCompletedAt,
      minGapMs: MIN_SILENT_GAP_MS,
    });
    return Promise.resolve(emptyOk());
  }

  const runNow = (): Promise<PriceSyncResult> => {
    if (!silent) lastManualStartedAt = Date.now();
    logPriceFetchStart({
      trigger,
      silent,
      coordinator: getPortfolioRefreshCoordinatorSnapshot(),
    });
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
          logPriceFetchDuplicateBlocked('debounce_wait_in_flight', { trigger });
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
    debouncedSilent = null;
  }

  return runNow();
}

export function resetPortfolioRefreshCoordinator(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  debouncedSilent = null;
  inFlight = null;
  lastCompletedAt = 0;
  lastManualStartedAt = 0;
}
