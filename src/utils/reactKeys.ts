import type { Market } from '../types';

/** 銘柄リスト用（市場＋コード＋インデックス） */
export function stockListKey(market: Market, symbol: string, index: number): string {
  return `${market}-${symbol}-${index}`;
}

/** 保有ポジション用（安定した position id） */
export function positionKey(positionId: string): string {
  return `position-${positionId}`;
}

/** 配分候補・通知履歴など id + index */
export function recordListKey(id: string, index: number): string {
  return `${id}-${index}`;
}
