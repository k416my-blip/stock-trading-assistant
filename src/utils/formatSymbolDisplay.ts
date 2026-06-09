import type { Market } from '../types';
import { isMalaysiaMarket } from './normalizeBursaSymbol';

/** UI 統一: 7103・マレーシア（Spritzer） */
export const MARKET_REGION_LABEL_JA: Record<Market, string> = {
  bursa: 'マレーシア',
  us: 'アメリカ',
  hk: '香港',
};

export function displaySymbolCore(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  return s.replace(/\.(KL|HK|US)$/i, '').replace(/^(KLSE|BURSA):/i, '');
}

export type FormatSymbolDisplayInput = {
  symbol: string;
  market: Market | string;
  companyName?: string | null;
};

/**
 * 銘柄コード・市場・会社名を1行表示用に整形。
 * companyName が無い場合は「7103・マレーシア」のみ。
 */
export function formatSymbolDisplay(input: FormatSymbolDisplayInput): string {
  const core = displaySymbolCore(input.symbol);
  const marketKey = String(input.market).trim().toLowerCase();
  const region =
    marketKey === 'bursa' || marketKey === 'malaysia' || marketKey === 'my'
      ? MARKET_REGION_LABEL_JA.bursa
      : marketKey === 'us'
        ? MARKET_REGION_LABEL_JA.us
        : marketKey === 'hk'
          ? MARKET_REGION_LABEL_JA.hk
          : isMalaysiaMarket(input.market)
            ? MARKET_REGION_LABEL_JA.bursa
            : String(input.market);
  const base = `${core}・${region}`;
  const name = input.companyName?.trim();
  if (name && name !== core) {
    return `${base}（${name}）`;
  }
  return base;
}

export function formatSymbolDisplayFromPosition(position: {
  symbol: string;
  market: Market;
  companyName?: string | null;
}): string {
  return formatSymbolDisplay({
    symbol: position.symbol,
    market: position.market,
    companyName: position.companyName,
  });
}
