import { NOTIFICATION_COOLDOWN_MS } from '../constants/notifications';
import type { Market } from '../types';
import type { MarketDataErrorKind } from '../types/marketData';
import { priceErrorCategory } from './marketDataErrors';

const lastNotifiedAt = new Map<string, number>();

export const PRICE_FETCH_NOTIFY_COOLDOWN_MS = NOTIFICATION_COOLDOWN_MS;

function cooldownKey(market: Market, symbol: string, errorKind: MarketDataErrorKind): string {
  return `${market}:${symbol}:${priceErrorCategory(errorKind)}`;
}

/** 同一銘柄・同一エラー種別は30分に1回まで */
export function shouldNotifyPriceFetchError(
  market: Market,
  symbol: string,
  errorKind: MarketDataErrorKind,
  now = Date.now(),
): boolean {
  const key = cooldownKey(market, symbol, errorKind);
  const last = lastNotifiedAt.get(key);
  if (last != null && now - last < PRICE_FETCH_NOTIFY_COOLDOWN_MS) {
    return false;
  }
  lastNotifiedAt.set(key, now);
  return true;
}

let lastAggregatedNotifyAt = 0;

/** 一括更新の失敗サマリー通知（全体で30分に1回） */
export function shouldNotifyAggregatedPriceFailures(now = Date.now()): boolean {
  if (now - lastAggregatedNotifyAt < PRICE_FETCH_NOTIFY_COOLDOWN_MS) {
    return false;
  }
  lastAggregatedNotifyAt = now;
  return true;
}

export function resetPriceNotifyCooldownForTests(): void {
  lastNotifiedAt.clear();
  lastAggregatedNotifyAt = 0;
}
