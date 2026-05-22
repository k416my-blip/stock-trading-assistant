import type { QuoteProviderId } from './quoteProvider';

/** 株価取得デバッグ（UI表示用） */
export type QuoteFetchDebugInfo = {
  coreSymbol?: string;
  shortName?: string;
  requestUrl?: string;
  responseCode?: number;
  resolvedSymbol?: string;
  price?: number;
  provider?: QuoteProviderId;
  triedSymbols?: string[];
  /** UI用の短文のみ */
  lastError?: string;
};
