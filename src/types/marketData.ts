import type { Currency, Market } from './index';

export type { Market };
import type { QuoteFetchDebugInfo } from './quoteFetchDebug';
import type { QuoteProviderId } from './quoteProvider';

export type { QuoteProviderId };

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

/** 株価更新 UI 表示ステータス */
export type PriceSyncDisplayStatus =
  | 'idle'
  | 'fetching'
  | 'partial_failure'
  | 'cached'
  | 'mock'
  | 'connection_failed'
  | 'complete';

/** プロバイダーごとの取得試行結果（UI: Yahoo: 403 など） */
export interface ProviderQuoteAttempt {
  provider: QuoteProviderId;
  message: string;
  shortLabel: string;
  httpStatus?: number;
}

export interface PriceSyncFailure {
  positionId: string;
  symbol: string;
  name: string;
  market: Market;
  /** ユーザー保有の元 symbol（例: 5183） */
  originalSymbol?: string;
  /** Yahoo 正規化後 symbol（例: 5183.KL） */
  normalizedYahooSymbol?: string;
  /** 最後に試した API 送信 symbol */
  sentSymbol?: string;
  /** 失敗時点で保持していた価格 */
  lastSavedPrice?: number;
  /** ユーザー向け理由（日本語） */
  reason: string;
  /** キャッシュ価格で表示継続 */
  usedCache?: boolean;
  /** 分類（デバッグ・集計用） */
  errorKind?: MarketDataErrorKind;
  provider?: QuoteProviderId;
  httpStatus?: number;
  timedOut?: boolean;
  rateLimited?: boolean;
  rawMessage?: string;
  /** 各プロバイダーの失敗概要 */
  providerAttempts?: ProviderQuoteAttempt[];
  /** 保存済み価格で表示継続（API失敗だがUIは正常） */
  usedSavedPrice?: boolean;
}

export interface PriceSyncResult {
  ok: boolean;
  updatedCount: number;
  failures: PriceSyncFailure[];
  marketClosedHint: boolean;
  error?: string;
  /** UI バッジ用 */
  displayStatus?: PriceSyncDisplayStatus;
  /** 全体タイムアウト */
  timedOut?: boolean;
  /** 一部成功・一部失敗 */
  partialSuccess?: boolean;
  /** 表示継続できた銘柄数（ライブ取得 + 保存済み価格フォールバック） */
  successCount: number;
  /** 価格を表示できない銘柄数 */
  failedCount: number;
  /** successCount > 0 かつ failedCount > 0 */
  partialFailure: boolean;
  /** successCount === 0（全銘柄・プロバイダー失敗） */
  totalFailure: boolean;
  /** 直近の成功プロバイダー（UI表示） */
  lastPriceProvider?: QuoteProviderId;
}

export interface PriceRefreshOptions {
  /** true: 自動更新（アラート・定期通知を抑制） */
  silent?: boolean;
  /** silent 時のデバウンス（ミリ秒） */
  debounceMs?: number;
  /** 指定銘柄のみ再取得（失敗銘柄リトライ） */
  symbolsOnly?: Array<{ market: Market; symbol: string }>;
}

export type PortfolioSyncProgress = {
  phase: ApiConnectionPhase;
  symbol?: string;
  /** Twelve Data 送信 symbol（例: 4707.KL） */
  sentSymbol?: string;
  /** 確定した正式 symbol */
  resolvedSymbol?: string;
  /** 試行中の価格取得元 */
  provider?: QuoteProviderId;
  detail?: string;
  attempt?: number;
  debug?: QuoteFetchDebugInfo;
};

/** Twelve Data 接続フェーズ（UI表示用） */
export type ApiConnectionPhase =
  | 'idle'
  | 'connecting'
  | 'symbol_exploring'
  | 'retrying'
  | 'success'
  | 'timeout'
  | 'rate_limit'
  | 'cached'
  | 'error';

export interface PortfolioPriceSyncState {
  loading: boolean;
  lastSuccessAt?: string;
  lastError?: string;
  marketClosedHint: boolean;
  lastResult?: PriceSyncResult;
  /** 取得中の銘柄キー（market:symbol） */
  refreshingSymbols?: string[];
  displayStatus?: PriceSyncDisplayStatus;
  /** API接続状態 */
  connectionPhase?: ApiConnectionPhase;
  connectionDetail?: string;
  currentSymbol?: string;
  /** 現在試行中の価格取得元 */
  activeProvider?: QuoteProviderId;
  /** 直近成功した価格取得元 */
  lastPriceProvider?: QuoteProviderId;
  /** 正式 symbol 探索・取得デバッグ */
  quoteFetchDebug?: QuoteFetchDebugInfo;
  resolvedSymbol?: string;
}
