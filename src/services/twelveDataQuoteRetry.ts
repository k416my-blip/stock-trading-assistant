import { MARKET_DATA_MESSAGES, QUOTE_RETRY_DELAYS_MS } from '../constants/marketData';
import { MarketDataError } from './marketDataService';

export type QuoteRetryProgress = {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
};

function isRetryableQuoteError(err: unknown): boolean {
  if (err instanceof MarketDataError) {
    return (
      err.kind === 'network_timeout' ||
      err.kind === 'rate_limit' ||
      err.kind === 'server_error' ||
      err.kind === 'empty_response'
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|タイムアウト|429|rate limit|network|fetch failed/i.test(msg);
}

export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 最大3回（初回 + 2秒後 + 5秒後）で quote 取得をリトライ */
export async function fetchQuoteWithRetry<T>(
  fetchOnce: () => Promise<T>,
  options?: {
    onRetry?: (progress: QuoteRetryProgress) => void;
  },
): Promise<T> {
  const maxAttempts = QUOTE_RETRY_DELAYS_MS.length + 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = QUOTE_RETRY_DELAYS_MS[attempt - 1] ?? 0;
      options?.onRetry?.({ attempt, maxAttempts, delayMs: delay });
      await delayMs(delay);
    }
    try {
      return await fetchOnce();
    } catch (err) {
      lastError = err;
      const isLast = attempt >= maxAttempts - 1;
      if (isLast || !isRetryableQuoteError(err)) {
        throw err;
      }
    }
  }

  throw lastError ?? new MarketDataError('unknown', MARKET_DATA_MESSAGES.fetchFailed);
}
