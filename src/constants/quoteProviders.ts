import type { Market } from '../types';
import type { QuoteProviderId } from '../types/quoteProvider';

export const QUOTE_PROVIDER_LABELS: Record<QuoteProviderId, string> = {
  yahoo_finance: 'Yahoo Finance',
  alpha_vantage: 'Alpha Vantage',
  stooq: 'Stooq',
  rapidapi_yahoo: 'RapidAPI Yahoo Finance',
  twelve_data: 'Twelve Data',
};

/** Yahoo → Twelve → Alpha（APIキー有無に関係なく Yahoo 最優先） */
export const QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'yahoo_finance',
  'twelve_data',
  'alpha_vantage',
];

/** @deprecated use QUOTE_PROVIDER_ORDER */
export const TWELVE_FIRST_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'twelve_data',
  'yahoo_finance',
  'alpha_vantage',
];

/** @deprecated use QUOTE_PROVIDER_ORDER */
export const NO_TWELVE_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'yahoo_finance',
  'alpha_vantage',
];

/** @deprecated 互換用 — getQuoteProviderOrder を使用 */
export const BURSA_QUOTE_PROVIDER_ORDER = QUOTE_PROVIDER_ORDER;
/** @deprecated 互換用 — getQuoteProviderOrder を 사용 */
export const DEFAULT_QUOTE_PROVIDER_ORDER = QUOTE_PROVIDER_ORDER;

export function getQuoteProviderOrder(
  _market: Market,
  _twelveDataApiKey?: string,
): QuoteProviderId[] {
  return [...QUOTE_PROVIDER_ORDER];
}

/** 実価格として扱うプロバイダ（Twelve / Yahoo いずれかで PASS） */
export function isLivePriceProvider(provider?: string | null): boolean {
  return (
    provider === 'twelve_data' ||
    provider === 'yahoo_finance' ||
    provider === 'rapidapi_yahoo'
  );
}

/** テスト用 Bursa 銘柄（Yahoo 形式） */
export const BURSA_TEST_YAHOO_SYMBOLS = ['1023.KL', '4707.KL', '5183.KL', '0820EA.KL'] as const;
