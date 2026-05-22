import type { Market } from '../types';
import { normalizeYahooSymbol } from './normalizeYahooSymbol';

/** 各プロバイダー共通の Yahoo Finance ティッカー形式（API送信前に正規化） */
export function toYahooFinanceSymbol(
  market: Market,
  apiSymbol: string,
  normalizedSymbol: string,
): string {
  return normalizeYahooSymbol(apiSymbol || normalizedSymbol, market);
}
