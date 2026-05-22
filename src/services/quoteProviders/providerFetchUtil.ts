import type { MarketDataErrorKind } from '../../types/marketData';
import type { QuoteProviderId } from '../../types/quoteProvider';
import {
  QUOTE_FETCH_ACCEPT,
  QUOTE_FETCH_USER_AGENT,
  QUOTE_HTTP_BACKOFF_MS,
  QUOTE_HTTP_MAX_ATTEMPTS,
  QUOTE_HTTP_TIMEOUT_MS,
  YAHOO_HTML_BLOCK_MESSAGE,
} from '../../constants/quoteFetch';
import { QUOTE_ATTEMPT_TIMEOUT_MS } from '../../constants/marketData';
import {
  isHtmlResponse,
  logHttpFetchError,
  logHttpResponseDetail,
} from '../../utils/httpFetchDiagnostics';

export class ProviderSkippedError extends Error {
  readonly provider: QuoteProviderId;

  constructor(provider: QuoteProviderId, reason: string) {
    super(reason);
    this.name = 'ProviderSkippedError';
    this.provider = provider;
  }
}

export type ProviderFetchError = {
  kind: MarketDataErrorKind;
  message: string;
  rawMessage: string;
  httpStatus?: number;
  rateLimited?: boolean;
  responseBody?: string;
  requestUrl?: string;
};

export function defaultQuoteFetchHeaders(extra?: HeadersInit): HeadersInit {
  return {
    Accept: QUOTE_FETCH_ACCEPT,
    'User-Agent': QUOTE_FETCH_USER_AGENT,
    ...extra,
  };
}

export function classifyProviderHttpError(
  status: number,
  bodyText: string,
  contentType = '',
): ProviderFetchError {
  if (isHtmlResponse(contentType, bodyText)) {
    const msg =
      status === 403 || status === 429
        ? `${YAHOO_HTML_BLOCK_MESSAGE} (HTTP ${status})`
        : YAHOO_HTML_BLOCK_MESSAGE;
    return {
      kind: status === 429 ? 'rate_limit' : 'api_key',
      message: msg,
      rawMessage: msg,
      httpStatus: status,
      rateLimited: status === 429,
      responseBody: bodyText.slice(0, 800),
    };
  }

  const lower = bodyText.toLowerCase();
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many')) {
    return {
      kind: 'rate_limit',
      message: 'レート制限',
      rawMessage: 'レート制限',
      httpStatus: status,
      rateLimited: true,
      responseBody: bodyText.slice(0, 800),
    };
  }
  if (status === 401 || status === 403) {
    return {
      kind: 'api_key',
      message: status === 403 ? 'アクセス拒否 (403)' : 'APIキーまたはアクセス権限エラー',
      rawMessage: `HTTP ${status}`,
      httpStatus: status,
      responseBody: bodyText.slice(0, 800),
    };
  }
  if (status === 404 || lower.includes('not found') || lower.includes('invalid symbol')) {
    return {
      kind: 'symbol_invalid',
      message: '銘柄が見つかりません',
      rawMessage: '銘柄が見つかりません',
      httpStatus: status,
      responseBody: bodyText.slice(0, 800),
    };
  }
  if (status >= 500) {
    return {
      kind: 'server_error',
      message: 'サーバーエラー',
      rawMessage: 'サーバーエラー',
      httpStatus: status,
      responseBody: bodyText.slice(0, 800),
    };
  }
  return {
    kind: 'unknown',
    message: `HTTP ${status}`,
    rawMessage: `HTTP ${status}`,
    httpStatus: status,
    responseBody: bodyText.slice(0, 800),
  };
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number; symbol?: string } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? QUOTE_ATTEMPT_TIMEOUT_MS ?? QUOTE_HTTP_TIMEOUT_MS;
  const symbol = options.symbol ?? 'unknown';
  console.log('[quote-api] FETCH_BEFORE', { symbol, url, timeoutMs });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    console.log('[quote-api] FETCH_AFTER', {
      symbol,
      url,
      status: response.status,
      statusText: response.statusText,
    });
    return response;
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.includes('aborted'));
    throw {
      kind: 'network_timeout' as const,
      message: isAbort ? 'リクエストがタイムアウトしました' : 'ネットワークエラー',
      rawMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type HttpFetchWithBodyResult = {
  response: Response;
  bodyText: string;
  contentType: string;
};

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 指数バックオフ付き HTTP 取得（最大3回） */
export async function fetchHttpWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number; logLabel?: string; symbol?: string } = {},
): Promise<HttpFetchWithBodyResult> {
  const label = options.logLabel ?? 'quote';
  const symbol = options.symbol ?? label;
  const timeoutMs = options.timeoutMs ?? QUOTE_HTTP_TIMEOUT_MS;
  const headers = defaultQuoteFetchHeaders(options.headers);
  let lastError: ProviderFetchError | unknown;

  for (let attempt = 0; attempt < QUOTE_HTTP_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const backoff = QUOTE_HTTP_BACKOFF_MS[attempt - 1] ?? 2_000;
      await delayMs(backoff);
    }

    try {
      console.log('[quote-api] FETCH_BEFORE', {
        symbol,
        url,
        timeoutMs,
        attempt: attempt + 1,
        label,
      });
      const response = await fetchWithTimeout(url, {
        ...options,
        headers,
        timeoutMs,
        symbol,
      });
      const bodyText = await response.text();
      const contentType = response.headers.get('content-type') ?? '';
      console.log('[quote-api] FETCH_AFTER', {
        symbol,
        url,
        status: response.status,
        responseBody: bodyText,
        contentType,
        attempt: attempt + 1,
      });
      logHttpResponseDetail({
        label,
        url,
        response,
        bodyText,
        attempt: attempt + 1,
      });
      return { response, bodyText, contentType };
    } catch (err) {
      lastError = err;
      logHttpFetchError({ label, url, attempt: attempt + 1, error: err });
      const fetchErr = err as ProviderFetchError;
      const retryable =
        fetchErr.kind === 'network_timeout' ||
        fetchErr.kind === 'server_error' ||
        fetchErr.kind === 'rate_limit';
      if (!retryable || attempt >= QUOTE_HTTP_MAX_ATTEMPTS - 1) {
        throw err;
      }
    }
  }

  throw lastError ?? {
    kind: 'network_timeout' as const,
    message: 'リクエストがタイムアウトしました',
    rawMessage: 'リクエストがタイムアウトしました',
  };
}

export function readEnvKey(...names: string[]): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of names) {
    const v = process.env[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}
