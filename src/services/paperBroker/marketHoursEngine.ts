import type { Market } from '../../types';
import type { MarketSession } from '../../types/paperBroker';

export function resolveMarketSession(market: Market, now = new Date()): MarketSession {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return 'holiday';

  const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60;

  if (market === 'us') {
    if (hourUtc >= 13.5 && hourUtc < 14) return 'premarket';
    if (hourUtc >= 14 && hourUtc < 21) return 'open';
    return 'closed';
  }
  if (market === 'hk') {
    if (hourUtc >= 1 && hourUtc < 1.5) return 'premarket';
    if (hourUtc >= 1.5 && hourUtc < 8) return 'open';
    return 'closed';
  }
  // bursa ~ UTC+8 9:00-17:00 => 1-9 UTC
  if (hourUtc >= 1 && hourUtc < 9) return 'open';
  return 'closed';
}

export function marketSessionLabelJa(session: MarketSession): string {
  switch (session) {
    case 'open':
      return '市場オープン';
    case 'premarket':
      return 'プレマーケット';
    case 'holiday':
      return '休場';
    default:
      return 'クローズ';
  }
}

export function canSubmitPaperOrderInSession(session: MarketSession): boolean {
  return session === 'open' || session === 'premarket';
}
