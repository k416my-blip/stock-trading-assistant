import type { QuoteProviderId } from '../types/quoteProvider';

export type PriceSourceLogTag = 'twelve' | 'yahoo_finance' | 'alpha_fallback';

export function priceSourceLogTag(provider: QuoteProviderId): PriceSourceLogTag | string {
  if (provider === 'twelve_data') return 'twelve';
  if (provider === 'yahoo_finance' || provider === 'rapidapi_yahoo') return 'yahoo_finance';
  if (provider === 'alpha_vantage') return 'alpha_fallback';
  return provider;
}

export function logProviderSwitch(
  from: 'twelve' | string,
  to: 'yahoo_fallback' | string,
  reason: 'timeout' | string,
): void {
  console.log('[PROVIDER SWITCH]', { from, to, reason });
}

export function logPriceSourceSuccess(
  provider: QuoteProviderId,
  symbol: string,
  price: number,
  responseStatus?: number,
): void {
  const payload: {
    source: PriceSourceLogTag | string;
    symbol: string;
    price: number;
    responseStatus?: number;
  } = {
    source: priceSourceLogTag(provider),
    symbol,
    price,
  };
  if (responseStatus != null) {
    payload.responseStatus = responseStatus;
  }
  console.log('[PRICE SOURCE]', payload);
}
