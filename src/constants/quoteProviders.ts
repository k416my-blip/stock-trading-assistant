import type { Market } from '../types';
import type { QuoteProviderId } from '../types/quoteProvider';
import { isUsableApiKey } from '../services/apiKeyValidation';

export const QUOTE_PROVIDER_LABELS: Record<QuoteProviderId, string> = {
  yahoo_finance: 'Yahoo Finance',
  alpha_vantage: 'Alpha Vantage',
  stooq: 'Stooq',
  rapidapi_yahoo: 'RapidAPI Yahoo Finance',
  twelve_data: 'Twelve Data',
};

/** Twelve Data APIキーあり: Twelve → Yahoo → Alpha */
export const TWELVE_FIRST_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'twelve_data',
  'yahoo_finance',
  'alpha_vantage',
];

/** APIキーなし: Yahoo → Alpha */
export const NO_TWELVE_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'yahoo_finance',
  'alpha_vantage',
];

/** @deprecated 互換用 — getQuoteProviderOrder を使用 */
export const BURSA_QUOTE_PROVIDER_ORDER = TWELVE_FIRST_QUOTE_PROVIDER_ORDER;
/** @deprecated 互換用 — getQuoteProviderOrder を使用 */
export const DEFAULT_QUOTE_PROVIDER_ORDER = TWELVE_FIRST_QUOTE_PROVIDER_ORDER;

export function getQuoteProviderOrder(
  _market: Market,
  twelveDataApiKey?: string,
): QuoteProviderId[] {
  if (isUsableApiKey(twelveDataApiKey)) {
    return [...TWELVE_FIRST_QUOTE_PROVIDER_ORDER];
  }
  return [...NO_TWELVE_QUOTE_PROVIDER_ORDER];
}

/** テスト用 Bursa 銘柄（Yahoo 形式） */
export const BURSA_TEST_YAHOO_SYMBOLS = ['1023.KL', '4707.KL', '5183.KL', '0820EA.KL'] as const;
