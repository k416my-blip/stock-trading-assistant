import { describe, expect, it } from 'vitest';
import { buildConciergeNewsQuery } from '../../src/services/conciergeNewsFetchProbe';
import type { StockFundamentals } from '../../src/types';

const maybankStock: StockFundamentals = {
  symbol: '1155',
  name: 'Malayan Banking Berhad',
  market: 'bursa',
  currency: 'MYR',
  price: 10,
  dividendYield: 0,
  per: 12,
  marketCap: 1e11,
  volume: 1e6,
  category: 'dividend',
};

describe('buildConciergeNewsQuery', () => {
  it('uses Maybank-only query when user asks about Maybank', () => {
    expect(buildConciergeNewsQuery(maybankStock, 'Maybankを分析して')).toBe('Malayan Banking Berhad');
  });

  it('uses stock name and symbol by default', () => {
    expect(buildConciergeNewsQuery(maybankStock)).toBe('Malayan Banking Berhad 1155');
  });
});
