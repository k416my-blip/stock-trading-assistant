import type { Currency } from './index';
import type { MarketQuote } from './marketData';

export type QuoteProviderId =
  | 'yahoo_finance'
  | 'alpha_vantage'
  | 'stooq'
  | 'rapidapi_yahoo'
  | 'twelve_data';

export type ProviderQuote = MarketQuote & {
  provider: QuoteProviderId;
  companyName?: string;
};
