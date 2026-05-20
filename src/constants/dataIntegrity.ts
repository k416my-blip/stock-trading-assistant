import type { Market } from '../types';

/** ステール・クォート上限（ms） */
export const STALE_QUOTE_MAX_AGE_MS = 15 * 60 * 1000;

/** OHLCV ステール（時間） */
export const STALE_OHLCV_HOURS = 36;

/** 欠損ローソク修復 */
export const MAX_GAP_DAYS_TO_REPAIR = 3;
export const SPLIT_JUMP_THRESHOLD = 0.35;
export const BAD_TICK_JUMP_PCT = 25;
export const CROSS_SOURCE_DIVERGENCE_PCT = 4;
export const TIMESTAMP_DRIFT_WARN_MS = 5 * 60 * 1000;

/** 流動性異常 */
export const LIQUIDITY_VOLUME_Z_THRESHOLD = 2.8;

/** 信頼度減衰 */
export const CONFIDENCE_DECAY_PER_HOUR_STALE = 3;
export const CONFIDENCE_OUTAGE_PENALTY = 15;

/** 簡易取引所休日（YYYY-MM-DD, 主要米国祝日代理） */
export const US_MARKET_HOLIDAYS_2025_2026: string[] = [
  '2025-01-01',
  '2025-01-20',
  '2025-02-17',
  '2025-04-18',
  '2025-05-26',
  '2025-06-19',
  '2025-07-04',
  '2025-09-01',
  '2025-11-27',
  '2025-12-25',
  '2026-01-01',
  '2026-01-19',
  '2026-02-16',
  '2026-04-03',
  '2026-05-25',
  '2026-06-19',
  '2026-07-03',
  '2026-09-07',
  '2026-11-26',
  '2026-12-25',
];

/** Bursa 主要休場（代理） */
export const MY_MARKET_HOLIDAYS_2025_2026: string[] = [
  '2025-01-01',
  '2025-01-29',
  '2025-01-30',
  '2025-02-01',
  '2025-04-18',
  '2025-05-01',
  '2025-05-12',
  '2025-06-07',
  '2025-08-31',
  '2025-09-16',
  '2025-12-25',
  '2026-01-01',
];

export const MARKET_SESSION_LABEL: Record<Market, string> = {
  us: '米国（NYSE/CNASD 代理）',
  bursa: 'マレーシア（Bursa）',
  hk: '香港（HKEX 代理）',
};

export function holidaysForMarket(market: Market): string[] {
  if (market === 'bursa') return MY_MARKET_HOLIDAYS_2025_2026;
  if (market === 'hk') return US_MARKET_HOLIDAYS_2025_2026;
  return US_MARKET_HOLIDAYS_2025_2026;
}
