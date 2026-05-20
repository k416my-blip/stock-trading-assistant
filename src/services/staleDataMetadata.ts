import { STALE_QUOTE_MAX_AGE_MS } from '../constants/marketData';

export interface QuoteStaleMetadata {
  lastSuccessfulFetchAt?: string;
  quoteAgeMs: number;
  /** 最終成功取得からの経過秒（UI・分析向け） */
  quoteAgeSeconds: number;
  isStale: boolean;
}

export function computeQuoteStaleMetadata(
  fetchedAt: string | undefined,
  lastSuccessfulFetchAt?: string,
  maxAgeMs: number = STALE_QUOTE_MAX_AGE_MS,
): QuoteStaleMetadata {
  const anchor = lastSuccessfulFetchAt ?? fetchedAt;
  if (!anchor) {
    return {
      lastSuccessfulFetchAt: undefined,
      quoteAgeMs: Number.POSITIVE_INFINITY,
      quoteAgeSeconds: Number.POSITIVE_INFINITY,
      isStale: true,
    };
  }
  const quoteAgeMs = Math.max(0, Date.now() - new Date(anchor).getTime());
  return {
    lastSuccessfulFetchAt: lastSuccessfulFetchAt ?? fetchedAt,
    quoteAgeMs,
    quoteAgeSeconds: Math.floor(quoteAgeMs / 1000),
    isStale: quoteAgeMs > maxAgeMs,
  };
}

export function mergeStaleMetadata<T extends QuoteStaleMetadata>(
  base: T,
  fetchedAt: string,
  success: boolean,
): T {
  const lastSuccessfulFetchAt = success ? fetchedAt : base.lastSuccessfulFetchAt;
  const meta = computeQuoteStaleMetadata(fetchedAt, lastSuccessfulFetchAt);
  return { ...base, ...meta };
}
