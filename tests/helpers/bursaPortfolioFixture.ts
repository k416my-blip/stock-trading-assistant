import type { PortfolioPosition } from '../../src/types';

export function bursaTestHolding(
  partial: Partial<PortfolioPosition> & Pick<PortfolioPosition, 'symbol'>,
): PortfolioPosition {
  return {
    id: `h-${partial.symbol}`,
    market: 'bursa',
    currency: 'MYR',
    shares: 100,
    averageBuyPrice: 10,
    currentPrice: partial.currentPrice ?? 10,
    companyName: partial.companyName ?? partial.symbol,
    openedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

export const emptyYahooFundamentals = {
  ok: false as const,
  yahooSymbol: '0000.KL',
  requestUrl: '',
  fetched: [] as string[],
  missing: ['all'] as string[],
  companyName: null,
  sector: null,
  revenue: null,
  operatingIncome: null,
  profit: null,
  eps: null,
  marketCap: null,
  pe: null,
  dividendYieldPct: null,
  revenueGrowthPct: null,
  profitMarginPct: null,
  debtToEquity: null,
  freeCashflow: null,
  operatingCashflow: null,
  businessDescription: null,
};
