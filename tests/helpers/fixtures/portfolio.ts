import type { PortfolioPosition } from '../../../src/types';

export function createTestPosition(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  const now = '2026-01-15T10:00:00.000Z';
  return {
    id: 'us-aapl-test',
    symbol: 'AAPL',
    market: 'us',
    currency: 'USD',
    shares: 10,
    averageBuyPrice: 100,
    currentPrice: 105,
    priceSource: 'api',
    priceFetchStatus: 'ok',
    isStale: false,
    lastSuccessfulFetchAt: now,
    openedAt: now,
    ...overrides,
  };
}

export function createStalePosition(): PortfolioPosition {
  const old = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  return createTestPosition({
    priceFetchStatus: 'failed',
    isStale: true,
    lastSuccessfulFetchAt: old,
    currentPrice: 100,
  });
}
