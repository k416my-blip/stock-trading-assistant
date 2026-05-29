/** Yahoo Finance chart API レスポンスから最新価格を抽出 */

import type { PriceBar } from '../types';
import { normalizeQuotePrice } from './safeNumeric';

export type YahooChartJson = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number | string | null;
        previousClose?: number | string | null;
        currency?: string;
        symbol?: string;
        shortName?: string;
        longName?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

/** close 配列末尾から最後の有効数値（null 混在 OK） */
export function getLastValidNumber(arr: unknown): number | null {
  if (!Array.isArray(arr)) return null;

  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];

    if (typeof v === 'number' && Number.isFinite(v)) {
      return v;
    }
  }

  return null;
}

/** @deprecated use getLastValidNumber */
export const getLastValidClose = getLastValidNumber;

export function parseYahooPrice(json: unknown): number | null {
  const result = (json as YahooChartJson)?.chart?.result?.[0];

  if (!result) {
    return null;
  }

  const marketPrice = normalizeQuotePrice(result?.meta?.regularMarketPrice);
  if (marketPrice != null) {
    return marketPrice;
  }

  const closes = result?.indicators?.quote?.[0]?.close;
  const fromClose = getLastValidNumber(closes);
  return normalizeQuotePrice(fromClose);
}

/** @deprecated use parseYahooPrice */
export const parseYahooChartPrice = parseYahooPrice;

export function getYahooChartResult(json: unknown) {
  return (json as YahooChartJson)?.chart?.result?.[0];
}

/** 日足 OHLCV 配列（RSI 等のテクニカル用） */
export function parseYahooChartBars(json: unknown): PriceBar[] {
  const result = getYahooChartResult(json);
  if (!result) return [];

  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) return [];

  const bars: PriceBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = normalizeQuotePrice(quote.close?.[i]);
    if (close == null) continue;
    const ts = timestamps[i];
    const open = normalizeQuotePrice(quote.open?.[i]) ?? close;
    const high = normalizeQuotePrice(quote.high?.[i]) ?? close;
    const low = normalizeQuotePrice(quote.low?.[i]) ?? close;
    const volume = quote.volume?.[i];
    bars.push({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume: typeof volume === 'number' && Number.isFinite(volume) ? volume : 0,
    });
  }
  return bars;
}

/** 前日比%（meta の regularMarketPrice / previousClose） */
export function parseYahooChangePct(json: unknown): number | null {
  const meta = getYahooChartResult(json)?.meta;
  const price = normalizeQuotePrice(meta?.regularMarketPrice);
  const prev = normalizeQuotePrice(meta?.previousClose);
  if (price == null || prev == null || prev <= 0) return null;
  return ((price - prev) / prev) * 100;
}

/** 4707.KL デバッグ用 — close 配列を console のみに出力 */
export function logYahooCloseArrayFor4707(
  yahooSymbol: string,
  json: unknown,
  parsedPrice: number | null,
): void {
  const sym = yahooSymbol.trim().toUpperCase();
  if (sym !== '4707.KL' && sym !== '4707') return;

  const result = getYahooChartResult(json);
  const closes = result?.indicators?.quote?.[0]?.close;
  const marketPrice = result?.meta?.regularMarketPrice;

  console.log('[yahoo-parser] 4707.KL_CLOSE_ARRAY', {
    yahooSymbol: sym,
    regularMarketPrice: marketPrice,
    closeLength: Array.isArray(closes) ? closes.length : 0,
    closeTail: Array.isArray(closes) ? closes.slice(-8) : closes,
    lastValidClose: getLastValidNumber(closes),
    parsedPrice,
  });
}
