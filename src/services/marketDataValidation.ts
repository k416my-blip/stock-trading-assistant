import { TWELVE_DATA_EXCHANGE } from '../constants/marketData';
import type { Market } from '../types';
import { isMalaysiaMarket, normalizeBursaSymbol } from '../utils/normalizeBursaSymbol';
import { normalizeBursaCoreSymbol } from './bursaSymbolFormat';

export type SymbolValidationResult =
  | { ok: true; normalizedSymbol: string; apiSymbol: string }
  | { ok: false; reason: string };

const US_TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;
/** 4707 / 1023 / 7103 / 0820EA など（4桁+英字サフィックス最大3・ETF対応） */
const BURSA_CORE_TICKER = /^(?:KLSE|BURSA:)?[0-9]{3,4}[A-Z]{0,3}$/i;
/** MAYBANK / CIMB など英字ティッカー */
const BURSA_ALPHA_TICKER = /^[A-Z]{2,12}$/i;
const HK_TICKER = /^[0-9]{1,5}(\.HK)?$/i;

function looksLikeCompanyName(symbol: string): boolean {
  const s = symbol.trim();
  if (!s) return true;
  if (/\s/.test(s)) return true;
  if (/[\u3040-\u9fff\u4e00-\u9fff\uac00-\ud7af]/.test(s)) return true;
  return false;
}

function normalizeForStorage(market: Market, symbol: string): string {
  const raw = symbol.trim().toUpperCase();
  if (market === 'hk') {
    const core = raw.replace(/\.HK$/i, '').replace(/^0+/, '') || '0';
    return core.padStart(4, '0');
  }
  if (isMalaysiaMarket(market)) {
    return normalizeBursaCoreSymbol(raw);
  }
  return raw.replace(/\.US$/i, '');
}

function matchesMarketTicker(market: Market, normalized: string): boolean {
  if (market === 'us') return US_TICKER.test(normalized);
  if (isMalaysiaMarket(market)) {
    return BURSA_CORE_TICKER.test(normalized) || BURSA_ALPHA_TICKER.test(normalized);
  }
  if (market === 'hk') return HK_TICKER.test(normalized) || HK_TICKER.test(`${normalized}.HK`);
  return false;
}

function apiSymbolForMarket(market: Market, trimmed: string): string {
  if (isMalaysiaMarket(market)) {
    return normalizeBursaSymbol(trimmed);
  }
  return normalizeForStorage(market, trimmed);
}

/** API呼び出し前に銘柄・市場を検証（空 / null / undefined を拒否） */
export function validatePositionSymbol(
  market: Market | undefined,
  symbol: string | null | undefined,
): SymbolValidationResult {
  if (!market) {
    return { ok: false, reason: '銘柄コード未設定' };
  }
  if (!TWELVE_DATA_EXCHANGE[market] && market !== 'us') {
    return { ok: false, reason: '銘柄コード未設定' };
  }

  if (symbol == null) {
    return { ok: false, reason: '銘柄コード未設定' };
  }
  if (typeof symbol !== 'string') {
    return { ok: false, reason: '銘柄コード未設定' };
  }

  const trimmed = symbol.trim();
  if (!trimmed) {
    return { ok: false, reason: '銘柄コード未設定' };
  }
  if (looksLikeCompanyName(trimmed)) {
    return { ok: false, reason: '銘柄コード未設定' };
  }

  const normalized = normalizeForStorage(market, trimmed);
  if (!matchesMarketTicker(market, normalized)) {
    return { ok: false, reason: '銘柄コード未設定' };
  }

  const apiSymbol = apiSymbolForMarket(market, trimmed);
  if (isMalaysiaMarket(market) && !apiSymbol.endsWith('.KL')) {
    return { ok: false, reason: 'Bursa銘柄は .KL 形式が必要です' };
  }

  return { ok: true, normalizedSymbol: normalized, apiSymbol };
}
