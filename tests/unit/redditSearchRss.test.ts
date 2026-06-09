import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchRedditSearchRss } from '../../src/services/freeNewsFallback';

describe('fetchRedditSearchRss', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses Reddit search RSS and filters by Maybank keywords', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        text: async () =>
          `<?xml version="1.0"?><feed><title>reddit.com: search results - Maybank</title>` +
          `<entry><title>Maybank dividend discussion</title></entry>` +
          `<entry><title>Made the payment</title></entry>` +
          `<entry><title>1155 KLSE thread</title></entry></feed>`,
      })),
    );
    const items = await fetchRedditSearchRss({
      symbol: '1155',
      name: 'MALAYAN BANKING BERHAD',
      market: 'bursa',
      currency: 'MYR',
      price: 0,
      dividendYield: 0,
      per: 0,
      marketCap: 0,
      volume: 0,
      category: 'stable',
    });
    expect(items.length).toBe(2);
    expect(items.some((i) => i.title === 'Made the payment')).toBe(false);
    expect(items[0]?.source).toBe('Reddit RSS');
  });
});
