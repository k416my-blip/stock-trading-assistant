import { LOT_RULES } from '../constants/capitalAllocation';
import type { Market } from '../types';
import type { LotRule } from '../types/capitalAllocation';

export function getLotRule(market: Market): LotRule {
  return LOT_RULES[market];
}

/** ロット単位に丸め（切り捨て）。0なら無効 */
export function roundToLotSize(shares: number, market: Market): { shares: number; noteJa: string } {
  const rule = getLotRule(market);
  if (shares <= 0) {
    return { shares: 0, noteJa: `${rule.labelJa} — 予算不足` };
  }
  if (rule.fractionalAllowed) {
    const rounded = Math.max(rule.minLot, Math.floor(shares));
    return {
      shares: rounded,
      noteJa: rounded < shares ? `小数株 — ${rounded}株に調整` : `${rule.labelJa}`,
    };
  }
  const lots = Math.floor(shares / rule.lotSize);
  const rounded = lots * rule.lotSize;
  if (rounded < rule.minLot) {
    return { shares: 0, noteJa: `${rule.labelJa} — 最低${rule.minLot}株未満` };
  }
  return {
    shares: rounded,
    noteJa: `${rule.labelJa} — ${rounded}株`,
  };
}

export function validateLotForMarket(
  shares: number,
  market: Market,
): { valid: boolean; noteJa: string } {
  const rule = getLotRule(market);
  if (shares <= 0) return { valid: false, noteJa: '株数0' };
  if (rule.fractionalAllowed && shares >= rule.minLot) {
    return { valid: true, noteJa: rule.labelJa };
  }
  if (shares % rule.lotSize !== 0) {
    return { valid: false, noteJa: `${rule.lotSize}株単位でない` };
  }
  if (shares < rule.minLot) {
    return { valid: false, noteJa: `最低${rule.minLot}株` };
  }
  return { valid: true, noteJa: rule.labelJa };
}
