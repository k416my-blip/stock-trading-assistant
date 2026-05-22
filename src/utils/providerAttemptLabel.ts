import { QUOTE_PROVIDER_LABELS } from '../constants/quoteProviders';
import type { MarketDataErrorKind } from '../types/marketData';
import type { QuoteProviderId } from '../types/quoteProvider';

const PROVIDER_UI_SHORT: Record<QuoteProviderId, string> = {
  yahoo_finance: 'Yahoo',
  twelve_data: 'TwelveData',
  stooq: 'Stooq',
  alpha_vantage: 'AlphaVantage',
  rapidapi_yahoo: 'RapidAPI',
};

export function providerUiShortName(provider: QuoteProviderId): string {
  return PROVIDER_UI_SHORT[provider] ?? QUOTE_PROVIDER_LABELS[provider];
}

export function providerAttemptShortLabel(
  httpStatus?: number,
  errorKind?: MarketDataErrorKind | 'timeout' | 'unknown',
  message?: string,
): string {
  if (httpStatus === 403) return '403';
  if (httpStatus === 429) return '429';
  if (errorKind === 'network_timeout') return 'timeout';
  if (errorKind === 'symbol_invalid') return 'no symbol';
  if (errorKind === 'rate_limit') return '429';
  if (errorKind === 'api_key' && httpStatus === 403) return '403';
  const lower = (message ?? '').toLowerCase();
  if (lower.includes('html') || lower.includes('ブロック')) return 'blocked';
  if (httpStatus != null) return String(httpStatus);
  return errorKind ?? 'failed';
}

export function formatProviderAttemptLine(
  provider: QuoteProviderId,
  shortLabel: string,
): string {
  return `${providerUiShortName(provider)}: ${shortLabel}`;
}
