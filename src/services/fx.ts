import { FX_TO_MYR } from '../constants/rakutenTrade';
import type { Currency } from '../types';
import { getCachedFxToMYR } from './marketDataService';

export function toMYR(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  const rate = getCachedFxToMYR(currency, FX_TO_MYR[currency]);
  const converted = amount * rate;
  return Number.isFinite(converted) ? converted : 0;
}
