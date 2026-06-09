import { describe, expect, it } from 'vitest';
import { buildBursaAnnouncementsRssUrl } from '../../src/services/conciergeRssNewsProbe';
import type { StockFundamentals } from '../../src/types';

describe('conciergeRssNewsProbe', () => {
  it('builds Bursa announcement Google RSS URL for bursa stocks', () => {
    const stock: StockFundamentals = {
      symbol: '1155.KL',
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
    const url = buildBursaAnnouncementsRssUrl(stock);
    expect(url).toContain('news.google.com/rss/search');
    expect(url).toContain('Bursa');
    expect(url).toContain('ceid=MY');
  });
});
