import type { PortfolioPosition } from '../types';
import { safeShares } from './safeNumeric';

export function countActiveHoldings(portfolio: PortfolioPosition[] | null | undefined): number {
  if (!Array.isArray(portfolio)) return 0;
  return portfolio.filter((p) => safeShares(p.shares, 0) > 0).length;
}
