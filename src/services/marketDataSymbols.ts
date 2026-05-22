import { TWELVE_DATA_EXCHANGE, TWELVE_DATA_MIC } from '../constants/marketData';
import type { Market } from '../types';
import type { TwelveDataSymbolParams } from '../types/marketData';
import { isMalaysiaMarket, normalizeBursaSymbol } from '../utils/normalizeBursaSymbol';

export type TwelveDataQuoteAttempt = TwelveDataSymbolParams & {
  /** デバッグ用ラベル */
  attempt: string;
  formatId?: string;
};

function stripMarketSuffix(symbol: string, suffix: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith(suffix)) {
    return upper.slice(0, -suffix.length);
  }
  return upper;
}

/** Twelve Data 用の複数リクエスト候補（失敗時に順に試行） */
export function getTwelveDataQuoteAttempts(market: Market, symbol: string): TwelveDataQuoteAttempt[] {
  const raw = symbol.trim().toUpperCase();

  if (market === 'us') {
    const base = stripMarketSuffix(raw, '.US');
    return [{ symbol: base, attempt: 'us-plain' }];
  }

  if (isMalaysiaMarket(market)) {
    const apiSymbol = normalizeBursaSymbol(symbol);
    const exchange = TWELVE_DATA_EXCHANGE.bursa;
    const mic = TWELVE_DATA_MIC.bursa;
    return [
      {
        symbol: apiSymbol,
        exchange,
        mic_code: mic,
        attempt: 'bursa-dotkl-xkls',
        formatId: 'dotkl-xkls',
      },
    ];
  }

  if (market === 'hk') {
    const numeric = stripMarketSuffix(raw, '.HK').replace(/^0+/, '') || '0';
    const padded = numeric.padStart(4, '0');
    const exchange = TWELVE_DATA_EXCHANGE.hk;
    const mic = TWELVE_DATA_MIC.hk;
    return [
      { symbol: padded, exchange, mic_code: mic, attempt: 'hk-padded-xhkg' },
      { symbol: `${padded}.HK`, exchange, mic_code: mic, attempt: 'hk-dot-hk-xhkg' },
      { symbol: `${padded}.HK`, attempt: 'hk-dot-hk' },
    ];
  }

  return [
    {
      symbol: raw,
      exchange: TWELVE_DATA_EXCHANGE[market],
      mic_code: TWELVE_DATA_MIC[market],
      attempt: 'default',
    },
  ];
}

export function toTwelveDataSymbol(market: Market, symbol: string): TwelveDataSymbolParams {
  const [first] = getTwelveDataQuoteAttempts(market, symbol);
  return {
    symbol: first.symbol,
    exchange: first.exchange,
    mic_code: first.mic_code,
  };
}
