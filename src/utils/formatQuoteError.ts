import { BURSA_TWELVE_DATA_UNSUPPORTED } from '../constants/marketData';
import {
  YAHOO_CHART_PARSE_FAILED_MESSAGE,
  YAHOO_SYMBOL_NOT_FOUND_MESSAGE,
} from '../constants/yahooFinance';
import { MarketDataError } from '../services/marketDataService';
import { toUserFriendlyPriceError } from '../services/marketDataErrors';
import { sanitizeErrorForUi } from './sanitizeUiError';
import { TimeoutError } from './withTimeout';
import type { Market } from '../types';

/** 画面表示用 — 巨大 JSON や生レスポンスは出さない */
export function formatQuoteErrorForUser(err: unknown, market?: Market): string {
  if (err instanceof MarketDataError) {
    const kind = err.kind;
    const raw = (err.rawMessage ?? err.message).toLowerCase();
    if (/network request failed|failed to fetch|econnrefused|enotfound/.test(raw)) {
      return 'ネットワークエラー';
    }
    const friendly = sanitizeErrorForUi(toUserFriendlyPriceError(err), err.message);

    if (
      err.message.includes(YAHOO_SYMBOL_NOT_FOUND_MESSAGE) ||
      friendly.includes(YAHOO_SYMBOL_NOT_FOUND_MESSAGE)
    ) {
      return YAHOO_SYMBOL_NOT_FOUND_MESSAGE;
    }

    if (kind === 'empty_response') {
      return sanitizeErrorForUi(err.message, YAHOO_CHART_PARSE_FAILED_MESSAGE);
    }

    if (market === 'bursa' && (kind === 'symbol_invalid' || kind === 'unsupported_exchange')) {
      return BURSA_TWELVE_DATA_UNSUPPORTED;
    }

    return friendly;
  }

  if (err instanceof TimeoutError) {
    return sanitizeErrorForUi(err.message, 'リクエストがタイムアウトしました');
  }

  if (err instanceof Error) {
    return sanitizeErrorForUi(err.message);
  }

  return sanitizeErrorForUi(String(err));
}
