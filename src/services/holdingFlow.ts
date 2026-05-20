import { HOLDING_ERRORS, LIVE_ANALYSIS_BUY_GUIDANCE_JA } from '../constants/holdingErrors';
import { isValidQuotePrice } from '../utils/safeNumeric';
import type { Market } from '../types';

export function shouldBlockLiveAnalysisBuy(isPractice: boolean, side: 'buy' | 'sell'): boolean {
  return !isPractice && side === 'buy';
}

export function liveAnalysisBuyBlockedMessage(): string {
  return LIVE_ANALYSIS_BUY_GUIDANCE_JA;
}

export type ManualHoldingValidation =
  | { ok: true; symbol: string; shares: number; averageBuyPrice: number }
  | { ok: false; error: string };

export function validateManualHoldingInput(input: {
  symbol: string;
  shares: number;
  averageBuyPrice: number;
  market: Market;
}): ManualHoldingValidation {
  const symbol = input.symbol.trim().toUpperCase();
  if (!symbol || symbol.length > 12) {
    return { ok: false, error: HOLDING_ERRORS.invalidSymbol };
  }
  if (!Number.isFinite(input.shares) || input.shares <= 0) {
    return { ok: false, error: HOLDING_ERRORS.invalidQuantity };
  }
  if (!isValidQuotePrice(input.averageBuyPrice)) {
    return { ok: false, error: HOLDING_ERRORS.noPrice };
  }
  return { ok: true, symbol, shares: input.shares, averageBuyPrice: input.averageBuyPrice };
}
