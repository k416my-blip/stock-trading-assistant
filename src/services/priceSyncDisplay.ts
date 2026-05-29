import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import {
  attachPriceSyncUxState,
  derivePriceSyncUxCounts,
  failureHasDisplayablePrice,
} from './priceSyncNotifications';
import type {
  ApiConnectionPhase,
  PriceSyncDisplayStatus,
  PriceSyncFailure,
  PriceSyncResult,
} from '../types/marketData';

export function apiConnectionPhaseLabel(phase: ApiConnectionPhase | undefined): string {
  switch (phase) {
    case 'connecting':
      return MARKET_DATA_MESSAGES.apiConnecting;
    case 'symbol_exploring':
      return MARKET_DATA_MESSAGES.symbolExploring;
    case 'retrying':
      return MARKET_DATA_MESSAGES.apiRetrying;
    case 'success':
      return MARKET_DATA_MESSAGES.apiSuccess;
    case 'timeout':
      return MARKET_DATA_MESSAGES.apiTimeout;
    case 'rate_limit':
      return MARKET_DATA_MESSAGES.apiRateLimit;
    case 'cached':
      return MARKET_DATA_MESSAGES.showingCache;
    case 'error':
      return MARKET_DATA_MESSAGES.connectionFailed;
    default:
      return '';
  }
}

export function derivePriceSyncDisplayStatus(
  loading: boolean,
  result?: PriceSyncResult,
): PriceSyncDisplayStatus {
  if (loading) return 'fetching';
  if (!result) return 'idle';
  if (result.displayStatus) return result.displayStatus;
  if (result.error === MARKET_DATA_MESSAGES.apiKeyInvalid) return 'cached';
  const { successCount, failedCount, partialFailure, totalFailure } = derivePriceSyncUxCounts(result);
  if (result.timedOut && successCount === 0) return 'connection_failed';
  if (partialFailure) return 'partial_failure';
  if (totalFailure && failedCount > 0) {
    if (result.failures.every(isPerSymbolUnsupportedFailure)) return 'partial_failure';
    const allHaveFallback = result.failures.every((f) => failureHasDisplayablePrice(f));
    if (allHaveFallback) return 'cached';
    const anyCache = result.failures.some((f) => f.usedCache || f.usedSavedPrice);
    return anyCache ? 'cached' : 'connection_failed';
  }
  return result.ok ? 'complete' : 'connection_failed';
}

export function priceSyncStatusLabel(status: PriceSyncDisplayStatus): string {
  switch (status) {
    case 'fetching':
      return MARKET_DATA_MESSAGES.loading;
    case 'partial_failure':
      return MARKET_DATA_MESSAGES.partialFailure;
    case 'cached':
      return MARKET_DATA_MESSAGES.showingCache;
    case 'mock':
      return MARKET_DATA_MESSAGES.usingMock;
    case 'connection_failed':
      return '';
    case 'complete':
      return MARKET_DATA_MESSAGES.refreshComplete;
    default:
      return '';
  }
}

function isPerSymbolUnsupportedFailure(failure: PriceSyncFailure): boolean {
  return failure.priceStatus === 'PLAN_UNSUPPORTED' || failure.priceStatus === 'INVALID_SYMBOL';
}

export function finalizePriceSyncResult(
  result: Omit<
    PriceSyncResult,
    'displayStatus' | 'partialSuccess' | 'successCount' | 'failedCount' | 'partialFailure' | 'totalFailure'
  >,
): PriceSyncResult {
  const withFlags = attachPriceSyncUxState(result);
  return {
    ...withFlags,
    displayStatus: derivePriceSyncDisplayStatus(false, withFlags),
  };
}
