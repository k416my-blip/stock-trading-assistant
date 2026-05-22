import type { Market } from '../types';
import type { QuoteProviderId } from '../types/quoteProvider';
import { isMalaysiaMarket } from '../utils/normalizeBursaSymbol';

export const QUOTE_PROVIDER_LABELS: Record<QuoteProviderId, string> = {
  yahoo_finance: 'Yahoo Finance',
  alpha_vantage: 'Alpha Vantage',
  stooq: 'Stooq',
  rapidapi_yahoo: 'RapidAPI Yahoo Finance',
  twelve_data: 'Twelve Data',
};

/** Bursa: Yahoo → Alpha Vantage → Twelve Data */
export const BURSA_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'yahoo_finance',
  'alpha_vantage',
  'twelve_data',
];

/** その他市場: Yahoo → Alpha Vantage → Twelve Data */
export const DEFAULT_QUOTE_PROVIDER_ORDER: QuoteProviderId[] = [
  'yahoo_finance',
  'alpha_vantage',
  'twelve_data',
];

export function getQuoteProviderOrder(market: Market): QuoteProviderId[] {
  return isMalaysiaMarket(market) ? [...BURSA_QUOTE_PROVIDER_ORDER] : [...DEFAULT_QUOTE_PROVIDER_ORDER];
}

/** テスト用 Bursa 銘柄（Yahoo 形式） */
export const BURSA_TEST_YAHOO_SYMBOLS = ['1023.KL', '4707.KL', '5183.KL', '0820EA.KL'] as const;
