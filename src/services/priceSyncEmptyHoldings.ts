import { MARKET_DATA_MESSAGES } from '../constants/marketData';
import type { PortfolioPriceSyncState } from '../types/marketData';

/** 保有0件時の株価更新パネル表示（通信エラーではない） */
export const EMPTY_HOLDINGS_PRICE_SYNC_DETAIL = [
  MARKET_DATA_MESSAGES.noHoldingsTitle,
  MARKET_DATA_MESSAGES.noHoldingsHint,
  MARKET_DATA_MESSAGES.noFetchTargets,
].join('\n');

export function isEmptyHoldingsPriceSyncState(prev: PortfolioPriceSyncState): boolean {
  return (
    !prev.loading &&
    prev.displayStatus === 'idle' &&
    !prev.lastError &&
    !prev.lastResult &&
    prev.connectionDetail === EMPTY_HOLDINGS_PRICE_SYNC_DETAIL
  );
}

export function applyEmptyHoldingsPriceSyncState(
  prev: PortfolioPriceSyncState,
): PortfolioPriceSyncState {
  if (isEmptyHoldingsPriceSyncState(prev)) return prev;
  return {
    ...prev,
    loading: false,
    lastError: undefined,
    connectionDetail: EMPTY_HOLDINGS_PRICE_SYNC_DETAIL,
    displayStatus: 'idle',
    connectionPhase: undefined,
    lastResult: undefined,
    refreshingSymbols: [],
    currentSymbol: undefined,
    activeProvider: undefined,
    resolvedSymbol: undefined,
    quoteFetchDebug: undefined,
  };
}

export function clearStalePriceSyncErrors(prev: PortfolioPriceSyncState): PortfolioPriceSyncState {
  return {
    ...prev,
    lastError: undefined,
    connectionDetail: undefined,
    connectionPhase: undefined,
    displayStatus:
      prev.displayStatus === 'connection_failed' ? 'idle' : prev.displayStatus,
    lastResult:
      prev.displayStatus === 'connection_failed' || prev.lastError ? undefined : prev.lastResult,
  };
}
