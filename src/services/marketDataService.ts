/**
 * 唯一の外部市場データ API ゲートウェイ（Twelve Data）。
 * 外部 HTTP はこのファイル内の fetchTwelveData のみ。
 * FIFO リクエストキュー・同時実行1・銘柄60秒間隔・429グローバルバックオフは本モジュール末尾の marketDataRequestQueue。
 * 分析・インテリジェンス層は normalizedMarketData 経由のキャッシュ読み取りのみ。
 */
import {
  MARKET_DATA_MAX_CONCURRENT,
  MARKET_DATA_MIN_INTERVAL_MS,
  MARKET_DATA_RATE_LIMIT_BACKOFF_INITIAL_MS,
  MARKET_DATA_RATE_LIMIT_BACKOFF_MAX_MS,
  MARKET_DATA_SYMBOL_COOLDOWN_MS,
  QUOTE_ATTEMPT_TIMEOUT_MS,
  TWELVE_DATA_QUOTE_TIMEOUT_MS,
  TWELVE_DATA_BASE_URL,
} from '../constants/marketData';
import {
  OHLCV_MIN_HISTORY_DAYS,
  OHLCV_OUTPUT_SIZE,
} from '../constants/quantValidation';
import { SAMPLE_STOCKS } from '../data/sampleStocks';
import { devLog } from '../utils/devLog';
import type { Currency, Market } from '../types';
import type { QuoteProviderId } from '../types/quoteProvider';
import type {
  ExchangeRateResult,
  MarketDataErrorKind,
  MarketQuote,
  TimeSeriesBar,
  TimeSeriesResult,
  TwelveDataSymbolParams,
} from '../types/marketData';
import { isDev } from '../utils/isDev';
import { recordMarketDataCall } from './apiCostTracker';
import { secureLog } from './secureLogger';
import { verboseLog } from './productionLogger';
import { isValidQuotePrice } from '../utils/safeNumeric';
import { recordBursaFormatSuccess, type BursaFormatId } from './bursaSymbolFormat';
import {
  isBareBursaTicker,
  isMalaysiaMarket,
  normalizeBursaSymbol,
} from '../utils/normalizeBursaSymbol';
import {
  classifyMarketDataError,
  userMessageForErrorKind,
} from './marketDataErrors';
import { recordApiCallOutcome } from './marketDataDiagnostics';
import {
  probeErrorFromMarketData,
  QuoteProbeSession,
} from './marketDataProbe';
import { loadOHLCVCache, saveOHLCVCache, ohlcvCacheKey } from './ohlcvCacheService';
import { barsToAdjustedOHLCV } from './priceAdjustmentService';
import { getTwelveDataQuoteAttempts, toTwelveDataSymbol, type TwelveDataQuoteAttempt } from './marketDataSymbols';
import {
  logQuoteFetchFailure,
  marketDataErrorToFailureLog,
} from './quoteFetchDiagnostics';
import {
  logTwelveDataApiKeyDiagnostic,
  logTwelveDataRequestUrl,
} from '../utils/quoteFetchDebugLog';
import { logTwelveDataApiResponse } from '../utils/twelveDataResponseLog';
import { normalizeTwelveDataApiKey } from './apiKeyValidation';
import {
  logPriceFetchDuplicateBlocked,
  logQueueActive,
  logQueueFinished,
} from './productionOpsLog';

export type GetQuoteForMarketOptions = {
  probe?: QuoteProbeSession;
  timeoutMs?: number;
  /** 全 symbol 形式試行の合計上限（プロバイダーチェーン用） */
  maxTotalMs?: number;
};

export type MarketDataErrorOptions = {
  httpStatus?: number;
  rawMessage?: string;
  lastProvider?: QuoteProviderId;
  requestUrl?: string;
  normalizedSymbol?: string;
  responseBody?: string;
};

export class MarketDataError extends Error {
  readonly kind: MarketDataErrorKind;
  readonly httpStatus?: number;
  readonly rawMessage: string;
  readonly lastProvider?: QuoteProviderId;
  readonly requestUrl?: string;
  readonly normalizedSymbol?: string;
  readonly responseBody?: string;

  constructor(
    kind: MarketDataErrorKind,
    message: string,
    options?: MarketDataErrorOptions,
  ) {
    super(message);
    this.name = 'MarketDataError';
    this.kind = kind;
    this.httpStatus = options?.httpStatus;
    this.rawMessage = options?.rawMessage ?? message;
    this.lastProvider = options?.lastProvider;
    this.requestUrl = options?.requestUrl;
    this.normalizedSymbol = options?.normalizedSymbol;
    this.responseBody = options?.responseBody;
  }
}

function createMarketDataError(
  message: string,
  httpStatus?: number,
  overrideKind?: MarketDataErrorKind,
): MarketDataError {
  const kind = overrideKind ?? classifyMarketDataError(message, httpStatus);
  return new MarketDataError(kind, userMessageForErrorKind(kind), {
    httpStatus,
    rawMessage: message,
  });
}

const fxCache: Partial<Record<string, { rate: number; at: number }>> = {};
const FX_CACHE_TTL_MS = 15 * 60 * 1000;

let lastTwelveQuoteResponseStatus: number | undefined;

/** 直近 Twelve Data quote 成功時の HTTP ステータス（ログ用・1回消費） */
export function takeLastTwelveQuoteResponseStatus(): number | undefined {
  const status = lastTwelveQuoteResponseStatus;
  lastTwelveQuoteResponseStatus = undefined;
  return status;
}

type TwelveDataErrorBody = {
  status?: string;
  message?: string;
  code?: number | string;
};

export function buildRequestUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${TWELVE_DATA_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildDebugUrl(path: string, params: Record<string, string>): string {
  return buildRequestUrl(path, { ...params, apikey: '***' });
}

/** APIキーをマスクした診断用 URL */
export function buildSafeMarketDataUrl(path: string, params: Record<string, string>): string {
  return buildDebugUrl(path, params);
}

function buildRequestUrlWithoutKey(path: string, params: Record<string, string>): string {
  const safeParams = { ...params };
  delete safeParams.apikey;
  return buildRequestUrl(path, safeParams);
}

function logTwelveDataRequestDiagnostic(input: {
  symbol: string;
  endpoint: string;
  apiKey: string;
  requestUrlWithoutKey: string;
  responseStatus?: number;
  responseErrorMessage?: string;
  responseErrorBody?: unknown;
}): void {
  devLog('[TwelveData] REQUEST_DIAGNOSTIC', {
    provider: 'TwelveData',
    symbol: input.symbol,
    endpoint: input.endpoint,
    apiKeyPresent: input.apiKey.trim().length > 0,
    apiKeyPrefix: input.apiKey.trim() ? input.apiKey.trim().slice(0, 4) : '(none)',
    requestUrlWithoutKey: input.requestUrlWithoutKey,
    responseStatus: input.responseStatus,
    responseErrorMessage: input.responseErrorMessage,
    responseErrorBody: input.responseErrorBody,
  });
}

function resolveEffectiveHttpStatus(
  response: Response,
  data: TwelveDataErrorBody,
): number | undefined {
  if (typeof data.code === 'number') return data.code;
  if (typeof data.code === 'string') {
    const n = Number(data.code);
    if (Number.isFinite(n)) return n;
  }
  return response.ok ? undefined : response.status;
}

function isTwelveDataErrorResponse(data: TwelveDataErrorBody, responseOk: boolean): boolean {
  if (!responseOk) return true;
  if (data.status === 'error') return true;
  if (typeof data.code === 'number' && data.code >= 400) return true;
  if (typeof data.code === 'string') {
    const codeNum = Number(data.code);
    if (Number.isFinite(codeNum) && codeNum >= 400) return true;
  }
  return false;
}

type FetchTwelveDataOptions = {
  timeoutMs?: number;
  probe?: QuoteProbeSession;
  queueKey?: string;
};

export class MarketDataStaleRequestError extends Error {
  constructor(message = '市場データリクエストは新しい要求によりキャンセルされました') {
    super(message);
    this.name = 'MarketDataStaleRequestError';
  }
}

type QueueWaiter<T> = {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

type PendingQueueGroup = {
  key: string;
  generation: number;
  dispatchGeneration: number;
  run: () => Promise<unknown>;
  waiters: QueueWaiter<unknown>[];
  running: boolean;
};

/** FIFO／同時最大1／銘柄60秒クール／429時グローバル待機／pending同一キーデデュープ／競合時は旧ペンディングをキャンセル */
class InternalMarketDataRequestQueue {
  private fifo: PendingQueueGroup[] = [];
  private pendingByKey = new Map<string, PendingQueueGroup>();
  private keyGeneration = new Map<string, number>();
  private inFlight = 0;
  private pumpActive = false;
  private lastDispatchAt = 0;
  private symbolLastAt = new Map<string, number>();
  private rateLimitUntil = 0;
  private backoffMs = MARKET_DATA_RATE_LIMIT_BACKOFF_INITIAL_MS;

  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: QueueWaiter<T> = {
        resolve: resolve as (v: unknown) => void,
        reject,
      };

      const existing = this.pendingByKey.get(key);
      if (existing && !existing.running) {
        logPriceFetchDuplicateBlocked('queue_key_pending', {
          key,
          waiters: existing.waiters.length + 1,
          ...this.getSnapshot(),
        });
        existing.run = task as () => Promise<unknown>;
        existing.waiters.push(waiter as QueueWaiter<unknown>);
        void this.pump();
        return;
      }

      if (existing?.running) {
        logPriceFetchDuplicateBlocked('queue_key_in_flight', {
          key,
          ...this.getSnapshot(),
        });
        for (const w of existing.waiters) {
          w.reject(new MarketDataStaleRequestError());
        }
        existing.waiters = [];
      }

      const generation = (this.keyGeneration.get(key) ?? 0) + 1;
      this.keyGeneration.set(key, generation);

      const group: PendingQueueGroup = {
        key,
        generation,
        dispatchGeneration: 0,
        run: task as () => Promise<unknown>,
        waiters: [waiter as QueueWaiter<unknown>],
        running: false,
      };
      this.pendingByKey.set(key, group);
      this.fifo.push(group);
      void this.pump();
    });
  }

  noteRateLimit(): void {
    this.rateLimitUntil = Date.now() + this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, MARKET_DATA_RATE_LIMIT_BACKOFF_MAX_MS);
  }

  noteSuccess(): void {
    this.backoffMs = MARKET_DATA_RATE_LIMIT_BACKOFF_INITIAL_MS;
  }

  /** @internal 検証用 */
  resetCooldownsForTest(): void {
    this.symbolLastAt.clear();
    this.rateLimitUntil = 0;
    this.lastDispatchAt = 0;
    this.backoffMs = MARKET_DATA_RATE_LIMIT_BACKOFF_INITIAL_MS;
  }

  /**
   * 滞留した pending リクエストを解放（重複リクエストは行わない）。
   * 実行中の in-flight は完了まで待つが、新規 pending はすべて拒否する。
   */
  resetStuckPending(): { clearedPending: number } {
    let cleared = 0;
    for (const group of [...this.fifo]) {
      if (!group.running) {
        cleared += group.waiters.length;
        this.settleGroup(group, 'err', undefined, new MarketDataStaleRequestError('queue reset'));
      }
    }
    this.fifo = this.fifo.filter((g) => g.running);
    for (const [key, group] of [...this.pendingByKey.entries()]) {
      if (!group.running) {
        this.pendingByKey.delete(key);
      }
    }
    return { clearedPending: cleared };
  }

  getSnapshot(): {
    pending: number;
    inFlight: number;
    rateLimitUntil: number;
    backoffMs: number;
    uniqueKeys: number;
  } {
    return {
      pending: this.fifo.reduce((n, g) => n + g.waiters.length, 0),
      inFlight: this.inFlight,
      rateLimitUntil: this.rateLimitUntil,
      backoffMs: this.backoffMs,
      uniqueKeys: this.fifo.length,
    };
  }

  private removeGroup(group: PendingQueueGroup): void {
    this.pendingByKey.delete(group.key);
    this.fifo = this.fifo.filter((g) => g !== group);
  }

  private settleGroup(
    group: PendingQueueGroup,
    outcome: 'ok' | 'err',
    value?: unknown,
    err?: unknown,
  ): void {
    for (const w of group.waiters) {
      if (outcome === 'ok') w.resolve(value);
      else w.reject(err);
    }
    group.waiters = [];
    this.removeGroup(group);
  }

  private logQueueFinishedIfIdle(): void {
    const snap = this.getSnapshot();
    if (snap.inFlight === 0 && snap.uniqueKeys === 0) {
      logQueueFinished(snap);
    }
  }

  private async pump(): Promise<void> {
    if (this.pumpActive) return;
    this.pumpActive = true;
    try {
      while (this.inFlight < MARKET_DATA_MAX_CONCURRENT && this.fifo.length > 0) {
        await this.waitForRateLimit();
        const group = this.fifo[0];
        if (!group || group.running) break;

        await this.waitForSymbolCooldown(group.key);
        await this.waitMinInterval();

        group.running = true;
        group.dispatchGeneration = group.generation;
        this.inFlight += 1;
        logQueueActive({ key: group.key, ...this.getSnapshot() });
        this.symbolLastAt.set(group.key, Date.now());
        this.fifo.shift();

        void group
          .run()
          .then((result) => {
            this.noteSuccess();
            recordMarketDataCall(1);
            if (group.generation === group.dispatchGeneration) {
              this.settleGroup(group, 'ok', result);
            } else {
              this.removeGroup(group);
            }
          })
          .catch((error) => {
            if (group.generation === group.dispatchGeneration) {
              this.settleGroup(group, 'err', undefined, error);
            } else {
              this.removeGroup(group);
            }
          })
          .finally(() => {
            group.running = false;
            this.inFlight -= 1;
            this.logQueueFinishedIfIdle();
            void this.pump();
          });
      }
    } finally {
      this.pumpActive = false;
      if (this.fifo.length > 0 && this.inFlight < MARKET_DATA_MAX_CONCURRENT) {
        void this.pump();
      } else {
        this.logQueueFinishedIfIdle();
      }
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const wait = this.rateLimitUntil - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  private async waitForSymbolCooldown(key: string): Promise<void> {
    const last = this.symbolLastAt.get(key) ?? 0;
    const wait = MARKET_DATA_SYMBOL_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  private async waitMinInterval(): Promise<void> {
    const wait = MARKET_DATA_MIN_INTERVAL_MS - (Date.now() - this.lastDispatchAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastDispatchAt = Date.now();
  }
}

/** 集中リクエストキュー（このモジュール専用） */
export const marketDataRequestQueue = new InternalMarketDataRequestQueue();

export function enqueueMarketDataRequest<T>(key: string, task: () => Promise<T>): Promise<T> {
  return marketDataRequestQueue.enqueue(key, task);
}

/** キューに滞留した pending を安全に解放し、再試行を可能にする */
export function resetStuckMarketDataQueue(): { clearedPending: number } {
  return marketDataRequestQueue.resetStuckPending();
}

function throwIfProbeAborted(probe?: QuoteProbeSession): void {
  if (!probe?.shouldAbort()) return;
  const p = probe.getAbortError();
  throw new MarketDataError(p.kind, p.message, {
    rawMessage: p.rawMessage,
    httpStatus: p.httpStatus,
  });
}

async function fetchTwelveData<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>,
  options?: FetchTwelveDataOptions,
): Promise<T> {
  const queueKey = options?.queueKey ?? `${path}:${params.symbol ?? 'global'}`;
  return enqueueMarketDataRequest(queueKey, () =>
    fetchTwelveDataCore<T>(path, params, options),
  );
}

async function fetchTwelveDataCore<T extends Record<string, unknown>>(
  path: string,
  params: Record<string, string>,
  options?: FetchTwelveDataOptions,
): Promise<T> {
  const startedAt = Date.now();
  const finishApiCall = (errorKind?: MarketDataErrorKind) => {
    recordApiCallOutcome(Date.now() - startedAt, errorKind);
  };

  throwIfProbeAborted(options?.probe);
  const url = buildRequestUrl(path, params);
  const requestUrlWithoutKey = buildRequestUrlWithoutKey(path, params);
  const apiKeyForDiagnostic = (params.apikey ?? '').trim();
  if (!apiKeyForDiagnostic) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'), {
      rawMessage: 'apikey is empty before fetch',
      requestUrl: requestUrlWithoutKey,
    });
  }
  logTwelveDataRequestDiagnostic({
    symbol: params.symbol ?? 'unknown',
    endpoint: path,
    apiKey: apiKeyForDiagnostic,
    requestUrlWithoutKey,
  });
  logTwelveDataRequestUrl({
    ticker: params.symbol ?? 'unknown',
    path,
    queryParams: params,
    label: options?.queueKey,
  });
  if (isDev) {
    secureLog('[market-data] request', buildDebugUrl(path, params));
  }

  const timeoutMs = options?.timeoutMs ?? QUOTE_ATTEMPT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  devLog('[TWELVE REQUEST]', {
    exists: Boolean(apiKeyForDiagnostic?.trim()),
    url: requestUrlWithoutKey,
  });
  devLog('FETCH URL', url);
  devLog('[FETCH URL CHECK]', {
    hasApiKey: /apikey=[^&]+/.test(url),
    apiKeyEmpty: /apikey=&|apikey=$/.test(url),
  });

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
    devLog('[TWELVE RESPONSE]', {
      status: response.status,
      ok: response.ok,
    });
  } catch (networkErr) {
    const isAbort =
      networkErr instanceof Error &&
      (networkErr.name === 'AbortError' || networkErr.message.includes('aborted'));
    const raw = isAbort
      ? 'リクエストがタイムアウトしました'
      : networkErr instanceof Error
        ? networkErr.message
        : 'ネットワーク接続に失敗しました';
    const err = createMarketDataError(raw, undefined, 'network_timeout');
    logTwelveDataApiResponse({
      ticker: params.symbol ?? 'unknown',
      requestUrl: url,
      status: 0,
      body: { networkError: raw },
      elapsedMs: Date.now() - startedAt,
      errorMessage: raw,
    });
    logTwelveDataRequestDiagnostic({
      symbol: params.symbol ?? 'unknown',
      endpoint: path,
      apiKey: apiKeyForDiagnostic,
      requestUrlWithoutKey,
      responseStatus: 0,
      responseErrorMessage: raw,
      responseErrorBody: { networkError: raw },
    });
    logQuoteFetchFailure({
      provider: 'twelve_data',
      ticker: params.symbol ?? 'unknown',
      httpStatus: undefined,
      errorKind: err.kind,
      message: err.message,
      rawMessage: err.rawMessage,
      timedOut: isAbort,
      rateLimited: false,
      responseBody: { path, networkError: raw },
    });
    finishApiCall(err.kind);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const responseText = await response.text();
  devLog('[TWELVE STATUS]', response.status);
  devLog('[TWELVE BODY]', responseText.slice(0, 200));

  let data: T & TwelveDataErrorBody;
  try {
    data = JSON.parse(responseText) as T & TwelveDataErrorBody;
  } catch {
    const err = createMarketDataError('APIから空の応答が返されました', response.status, 'empty_response');
    logTwelveDataRequestDiagnostic({
      symbol: params.symbol ?? 'unknown',
      endpoint: path,
      apiKey: apiKeyForDiagnostic,
      requestUrlWithoutKey,
      responseStatus: response.status,
      responseErrorMessage: err.rawMessage,
      responseErrorBody: '(invalid JSON)',
    });
    logQuoteFetchFailure({
      provider: 'twelve_data',
      ticker: params.symbol ?? 'unknown',
      httpStatus: response.status,
      errorKind: err.kind,
      message: err.message,
      rawMessage: err.rawMessage,
      responseBody: '(invalid JSON)',
    });
    finishApiCall(err.kind);
    throw err;
  }

  logTwelveDataApiResponse({
    ticker: params.symbol ?? 'unknown',
    requestUrl: url,
    status: response.status,
    body: data,
    elapsedMs: Date.now() - startedAt,
  });

  if (isDev) {
    secureLog('[market-data] response status', response.status, 'status field', data.status);
  }

  if (isTwelveDataErrorResponse(data, response.ok)) {
    const message = data.message ?? `HTTP ${response.status}`;
    const effectiveStatus = resolveEffectiveHttpStatus(response, data);
    const err = createMarketDataError(message, effectiveStatus);
    logTwelveDataRequestDiagnostic({
      symbol: params.symbol ?? 'unknown',
      endpoint: path,
      apiKey: apiKeyForDiagnostic,
      requestUrlWithoutKey,
      responseStatus: response.status,
      responseErrorMessage: message,
      responseErrorBody: data,
    });
    logQuoteFetchFailure({
      provider: 'twelve_data',
      ticker: params.symbol ?? 'unknown',
      httpStatus: response.status,
      errorKind: err.kind,
      message: err.message,
      rawMessage: message,
      rateLimited: err.kind === 'rate_limit',
      responseBody: data,
    });
    if (err.kind === 'rate_limit') {
      marketDataRequestQueue.noteRateLimit();
    }
    finishApiCall(err.kind);
    throw err;
  }

  finishApiCall();
  marketDataRequestQueue.noteSuccess();
  lastTwelveQuoteResponseStatus = response.status;
  logTwelveDataRequestDiagnostic({
    symbol: params.symbol ?? 'unknown',
    endpoint: path,
    apiKey: apiKeyForDiagnostic,
    requestUrlWithoutKey,
    responseStatus: response.status,
  });
  return data;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseQuotePrice(data: Record<string, unknown>): number | null {
  return (
    parseNumber(data.price) ??
    parseNumber(data.close) ??
    parseNumber(data.previous_close) ??
    parseNumber(data.open)
  );
}

function logMissingQuoteFields(
  data: Record<string, unknown>,
  params: TwelveDataSymbolParams,
  market?: Market,
): void {
  if (isDev) {
    secureLog('[market-data] price missing in quote response (debug)', {
      symbol: params.symbol,
      market,
      exchange: params.exchange,
      mic_code: params.mic_code,
      responseKeys: Object.keys(data),
      price: data.price,
      close: data.close,
      previous_close: data.previous_close,
      status: data.status,
      message: data.message,
    });
  }
}

type GetQuoteOptions = {
  probe?: QuoteProbeSession;
  timeoutMs?: number;
};

export async function getQuote(
  apiKey: string,
  params: TwelveDataSymbolParams,
  currency: Currency,
  market?: Market,
  options?: GetQuoteOptions,
): Promise<MarketQuote> {
  logTwelveDataApiKeyDiagnostic(apiKey, 'getQuote');
  if (!apiKey.trim()) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'));
  }
  if (!params.symbol.trim()) {
    throw new MarketDataError('symbol_invalid', userMessageForErrorKind('symbol_invalid'));
  }
  if (market && isMalaysiaMarket(market) && isBareBursaTicker(params.symbol)) {
    throw new MarketDataError('symbol_invalid', 'Bursa銘柄は .KL 形式で送信してください', {
      rawMessage: `bare symbol rejected: ${params.symbol}`,
    });
  }

  const query: Record<string, string> = {
    symbol: params.symbol.trim(),
    apikey: apiKey.trim(),
  };
  if (params.exchange) query.exchange = params.exchange;
  if (params.mic_code) query.mic_code = params.mic_code;

  if (isDev) {
    secureLog('[market-data] quote', {
      symbol: params.symbol,
      market,
      exchange: params.exchange,
      mic_code: params.mic_code,
    });
  }

  const data = await fetchTwelveData<Record<string, unknown>>('/quote', query, {
    probe: options?.probe,
    timeoutMs: options?.timeoutMs,
    queueKey: market ? `quote:${market}:${params.symbol}` : `quote:${params.symbol}`,
  });
  const price = parseQuotePrice(data);

  if (!isValidQuotePrice(price)) {
    logMissingQuoteFields(data, params, market);
    const msg = data.message;
    const kind =
      typeof msg === 'string' && classifyMarketDataError(msg) === 'market_closed'
        ? 'market_closed'
        : 'empty_response';
    throw new MarketDataError(kind, userMessageForErrorKind(kind), {
      rawMessage: '株価データを読み取れませんでした（price/close/previous_close が空）',
    });
  }

  if (isDev) {
    secureLog('[market-data] parsed price', {
      symbol: params.symbol,
      market,
      exchange: params.exchange,
      price,
    });
  }

  return {
    symbol: String(data.symbol ?? params.symbol),
    exchange: String(data.exchange ?? params.exchange ?? ''),
    currency,
    price,
    datetime: typeof data.datetime === 'string' ? data.datetime : undefined,
    isDelayed: true,
  };
}

async function tryQuoteAttempts(
  apiKey: string,
  market: Market,
  symbol: string,
  currency: Currency,
  attempts: TwelveDataQuoteAttempt[],
  probe?: QuoteProbeSession,
  timeoutMs?: number,
  maxTotalMs?: number,
): Promise<MarketQuote> {
  let lastError: MarketDataError | null = null;
  let lastSymbolInvalid: MarketDataError | null = null;
  const startedAt = Date.now();

  for (const attempt of attempts) {
    throwIfProbeAborted(probe);

    const elapsed = Date.now() - startedAt;
    if (maxTotalMs != null && elapsed >= maxTotalMs) {
      throw new MarketDataError('network_timeout', userMessageForErrorKind('network_timeout'), {
        rawMessage: 'Twelve Data がタイムアウトしました',
      });
    }

    const perAttemptCap =
      maxTotalMs != null
        ? Math.min(timeoutMs ?? TWELVE_DATA_QUOTE_TIMEOUT_MS, maxTotalMs - elapsed)
        : timeoutMs;
    if (perAttemptCap != null && perAttemptCap <= 0) {
      throw new MarketDataError('network_timeout', userMessageForErrorKind('network_timeout'), {
        rawMessage: 'Twelve Data がタイムアウトしました',
      });
    }

    try {
      devLog('[TwelveData] QUOTE_SYMBOL_ATTEMPT', {
        market,
        inputSymbol: symbol,
        attempt: attempt.attempt,
        apiSymbol: attempt.symbol,
        exchange: attempt.exchange,
        mic_code: attempt.mic_code,
        formatId: attempt.formatId,
      });
      if (isDev) {
        secureLog('[market-data] quote attempt', attempt.attempt);
      }
      const quote = await getQuote(
        apiKey,
        {
          symbol: attempt.symbol,
          exchange: attempt.exchange,
          mic_code: attempt.mic_code,
        },
        currency,
        market,
        { probe, timeoutMs },
      );

      if (!isValidQuotePrice(quote.price)) {
        throw new MarketDataError('empty_response', userMessageForErrorKind('empty_response'), {
          rawMessage: '株価が無効です（0以下または非数）',
        });
      }

      if (isMalaysiaMarket(market) && attempt.formatId) {
        await recordBursaFormatSuccess(symbol, attempt.formatId as BursaFormatId, attempt.attempt);
        if (isDev) {
          secureLog('[market-data] Bursa fetch succeeded', {
            inputSymbol: symbol,
            winningAttempt: attempt.attempt,
            apiSymbol: attempt.symbol,
            formatId: attempt.formatId,
          });
        }
      }

      return quote;
    } catch (err) {
      const mdErr =
        err instanceof MarketDataError
          ? err
          : createMarketDataError(err instanceof Error ? err.message : '取得に失敗しました');
      lastError = mdErr;
      probe?.noteFailure(probeErrorFromMarketData(mdErr));

      if (probe?.shouldAbort()) {
        throwIfProbeAborted(probe);
      }

      if (mdErr.kind === 'symbol_invalid' || mdErr.kind === 'unsupported_exchange') {
        lastSymbolInvalid = mdErr;
      }

      logQuoteFetchFailure(
        marketDataErrorToFailureLog('twelve_data', symbol, market, mdErr, {
          exchange: attempt.exchange,
          mic_code: attempt.mic_code,
          attempt: attempt.attempt,
        }),
      );
    }
  }

  throw lastSymbolInvalid ?? lastError ?? new MarketDataError('unknown', userMessageForErrorKind('unknown'));
}

/** 市場別シンボル候補を順に試して株価を取得 */
export async function getQuoteForMarket(
  apiKey: string,
  market: Market,
  symbol: string,
  currency: Currency,
  options?: GetQuoteForMarketOptions,
): Promise<MarketQuote> {
  const probe = options?.probe;
  const apiSymbol = isMalaysiaMarket(market) ? normalizeBursaSymbol(symbol) : symbol;

  const attempts = getTwelveDataQuoteAttempts(market, apiSymbol);
  return tryQuoteAttempts(
    apiKey,
    market,
    symbol,
    currency,
    attempts,
    probe,
    options?.timeoutMs,
    options?.maxTotalMs,
  );
}

/** @deprecated 互換用 — Bursa は normalizeBursaSymbol で *.KL のみ送信 */
export function resolveBursaApiSymbol(symbol: string): string {
  return normalizeBursaSymbol(symbol);
}

export type TimeSeriesAdjustMode = 'all' | 'splits' | 'dividends' | 'none';

export async function getTimeSeries(
  apiKey: string,
  symbol: string,
  interval: string,
  exchange?: string,
  outputsize = 30,
  adjust: TimeSeriesAdjustMode = 'none',
): Promise<TimeSeriesResult> {
  if (!apiKey.trim()) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'));
  }

  const query: Record<string, string> = {
    symbol,
    interval,
    outputsize: String(outputsize),
    apikey: apiKey.trim(),
    order: 'ASC',
  };
  if (exchange) query.exchange = exchange;
  if (adjust !== 'none') query.adjust = adjust;

  const data = await fetchTwelveData<{
    meta?: { symbol?: string; interval?: string };
    values?: Record<string, string>[];
  }>('/time_series', query);

  const values = Array.isArray(data.values) ? data.values : [];
  let bars: TimeSeriesBar[] = values
    .map((row) => ({
      datetime: row.datetime ?? '',
      open: parseNumber(row.open) ?? 0,
      high: parseNumber(row.high) ?? 0,
      low: parseNumber(row.low) ?? 0,
      close: parseNumber(row.close) ?? 0,
      volume: parseNumber(row.volume) ?? 0,
    }))
    .filter((b) => b.close > 0);
  if (bars.length >= 2 && bars[0].datetime > bars[bars.length - 1].datetime) {
    bars = bars.reverse();
  }

  return {
    symbol: data.meta?.symbol ?? symbol,
    interval: data.meta?.interval ?? interval,
    bars,
  };
}

export async function getExchangeRate(
  apiKey: string,
  fromCurrency: Currency,
  toCurrency: Currency,
): Promise<ExchangeRateResult> {
  if (fromCurrency === toCurrency) {
    return { from: fromCurrency, to: toCurrency, rate: 1 };
  }

  const cacheKey = `${fromCurrency}/${toCurrency}`;
  const cached = fxCache[cacheKey];
  if (cached && Date.now() - cached.at < FX_CACHE_TTL_MS) {
    return { from: fromCurrency, to: toCurrency, rate: cached.rate };
  }

  if (!apiKey.trim()) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'));
  }

  const data = await fetchTwelveData<Record<string, unknown>>(
    '/exchange_rate',
    {
      symbol: `${fromCurrency}/${toCurrency}`,
      apikey: apiKey.trim(),
    },
    { queueKey: `fx:${fromCurrency}:${toCurrency}` },
  );

  const rate = parseNumber(data.rate) ?? parseNumber(data.close);
  if (rate == null) {
    throw new MarketDataError('empty_response', userMessageForErrorKind('empty_response'), {
      rawMessage: '為替レートを読み取れませんでした',
    });
  }

  fxCache[cacheKey] = { rate, at: Date.now() };

  return {
    from: fromCurrency,
    to: toCurrency,
    rate,
    datetime: typeof data.datetime === 'string' ? data.datetime : undefined,
  };
}

export function getCachedFxToMYR(currency: Currency, fallback: number): number {
  if (currency === 'MYR') return 1;
  const cached = fxCache[`${currency}/MYR`];
  if (cached && Date.now() - cached.at < FX_CACHE_TTL_MS) {
    return cached.rate;
  }
  return fallback;
}

/** 日次OHLCV（分割・配当調整オプション） */
export async function getDailyOHLCV(
  apiKey: string,
  market: Market,
  symbol: string,
  outputsize: number,
  adjust: TimeSeriesAdjustMode = 'all',
): Promise<TimeSeriesResult> {
  const params = toTwelveDataSymbol(market, symbol);
  return getTimeSeries(
    apiKey,
    params.symbol,
    '1day',
    params.exchange,
    outputsize,
    adjust,
  );
}

export async function testTwelveDataConnection(apiKey: string): Promise<MarketQuote> {
  const trimmed = normalizeTwelveDataApiKey(apiKey);
  if (!trimmed) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'));
  }
  return getQuote(trimmed, { symbol: 'AAPL' }, 'USD', 'us');
}

/** OHLCV キャッシュを API から更新（分析層は呼ばない — UI / 運用層のみ） */
export async function refreshOHLCVCache(
  apiKey: string,
  options?: { maxSymbols?: number; forceRefresh?: boolean },
): Promise<{ refreshed: number; skipped: number }> {
  if (!apiKey.trim()) {
    throw new MarketDataError('api_key', userMessageForErrorKind('api_key'));
  }

  const maxSymbols = options?.maxSymbols ?? 12;
  const stocks = SAMPLE_STOCKS.filter((s) => s.volume > 100_000).slice(0, maxSymbols);
  const cache = await loadOHLCVCache();
  let refreshed = 0;
  let skipped = 0;

  for (const stock of stocks) {
    const key = ohlcvCacheKey(stock.symbol, stock.market);
    const existing = cache[key];
    if (existing && !options?.forceRefresh) {
      skipped += 1;
      continue;
    }

    try {
      const raw = await getDailyOHLCV(apiKey, stock.market, stock.symbol, OHLCV_OUTPUT_SIZE, 'all');
      const bars = barsToAdjustedOHLCV(raw.bars, true);
      if (bars.length < OHLCV_MIN_HISTORY_DAYS) {
        skipped += 1;
        continue;
      }
      cache[key] = {
        symbol: stock.symbol,
        market: stock.market,
        bars,
        fetchedAt: new Date().toISOString(),
        adjustMode: 'all',
      };
      refreshed += 1;
    } catch (e) {
      if (e instanceof MarketDataError && e.kind === 'symbol_invalid') {
        skipped += 1;
        continue;
      }
      throw e;
    }
  }

  await saveOHLCVCache(cache);
  return { refreshed, skipped };
}
