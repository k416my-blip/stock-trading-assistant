import { EXECUTION_CRITICAL_STALE_MS, EXECUTION_SAFETY_MESSAGES } from '../constants/executionSafety';
import type { PortfolioPosition } from '../types';
import { isValidQuotePrice, safePrice } from '../utils/safeNumeric';
import { computeQuoteStaleMetadata } from './staleDataMetadata';

export type ExecutionMarketDataAssessment = {
  allowed: boolean;
  blockedByStale: boolean;
  quoteUnavailable: boolean;
  quoteAgeSeconds?: number;
  reasonJa?: string;
};

export function assessExecutionMarketData(
  requestedPrice: number,
  position?: PortfolioPosition,
): ExecutionMarketDataAssessment {
  if (!isValidQuotePrice(requestedPrice)) {
    return {
      allowed: false,
      blockedByStale: false,
      quoteUnavailable: true,
      reasonJa: EXECUTION_SAFETY_MESSAGES.quoteUnavailable,
    };
  }

  if (!position) {
    return { allowed: true, blockedByStale: false, quoteUnavailable: false, quoteAgeSeconds: 0 };
  }

  const anchor =
    position.lastSuccessfulFetchAt ?? position.lastApiPriceAt ?? position.currentPriceUpdatedAt;
  const stale = computeQuoteStaleMetadata(
    position.currentPriceUpdatedAt,
    anchor,
    EXECUTION_CRITICAL_STALE_MS,
  );

  const displayPrice = safePrice(position.currentPrice, position.averageBuyPrice, 0);
  if (!isValidQuotePrice(displayPrice) && position.priceSource !== 'manual') {
    return {
      allowed: false,
      blockedByStale: false,
      quoteUnavailable: true,
      quoteAgeSeconds: stale.quoteAgeSeconds,
      reasonJa: EXECUTION_SAFETY_MESSAGES.quoteUnavailable,
    };
  }

  const criticallyStale =
    position.isStale === true ||
    stale.isStale ||
    (position.priceFetchStatus === 'failed' && stale.quoteAgeMs > EXECUTION_CRITICAL_STALE_MS);

  if (criticallyStale && position.priceSource !== 'manual') {
    return {
      allowed: false,
      blockedByStale: true,
      quoteUnavailable: false,
      quoteAgeSeconds: stale.quoteAgeSeconds,
      reasonJa: EXECUTION_SAFETY_MESSAGES.staleExecutionBlocked,
    };
  }

  return {
    allowed: true,
    blockedByStale: false,
    quoteUnavailable: false,
    quoteAgeSeconds: stale.quoteAgeSeconds,
  };
}
