import type { Currency, Market } from './index';

export type PriceSource = 'manual' | 'api';

export type PriceFetchStatus = 'ok' | 'failed' | 'pending';

/** Twelve Data / 通信エラーの分類 */
export type MarketDataErrorKind =
  | 'rate_limit'
  | 'symbol_invalid'
  | 'empty_response'
  | 'market_closed'
  | 'network_timeout'
  | 'server_error'
  | 'unsupported_exchange'
  | 'api_key'
  | 'unknown';

export interface MarketQuote {
  symbol: string;
  exchange: string;
  currency: Currency;
  price: number;
  datetime?: string;
  /** 遅延データの可能性 */
  isDelayed?: boolean;
}

export interface TimeSeriesBar {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeSeriesResult {
  symbol: string;
  interval: string;
  bars: TimeSeriesBar[];
}

export interface ExchangeRateResult {
  from: Currency;
  to: Currency;
  rate: number;
  datetime?: string;
}

export interface TwelveDataSymbolParams {
  symbol: string;
  exchange?: string;
  mic_code?: string;
}

export interface PriceSyncFailure {
  positionId: string;
  symbol: string;
  name: string;
  market: Market;
  /** ユーザー向け理由（日本語） */
  reason: string;
  /** 分類（デバッグ・集計用） */
  errorKind?: MarketDataErrorKind;
}

export interface PriceSyncResult {
  ok: boolean;
  updatedCount: number;
  failures: PriceSyncFailure[];
  marketClosedHint: boolean;
  error?: string;
}

export interface PriceRefreshOptions {
  /** true: 自動更新（アラート・定期通知を抑制） */
  silent?: boolean;
  /** silent 時のデバウンス（ミリ秒） */
  debounceMs?: number;
}

export interface PortfolioPriceSyncState {
  loading: boolean;
  lastSuccessAt?: string;
  lastError?: string;
  marketClosedHint: boolean;
  lastResult?: PriceSyncResult;
}
