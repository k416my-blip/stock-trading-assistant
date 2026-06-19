import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchNewsApiWithFallback } from '../../src/services/newsApiClient';

describe('fetchNewsApiWithFallback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns top-headlines articles when available', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          status: 'ok',
          articles: [{ title: 'Maybank earnings beat' }],
        }),
    } as Response);

    const result = await fetchNewsApiWithFallback('Maybank', 'abcdefghijklmnopqrstuvwxyz', 5);
    expect(result.ok).toBe(true);
    expect(result.endpoint).toBe('top-headlines');
    expect(result.titles).toEqual(['Maybank earnings beat']);
  });

  it('falls back from blocked everything to top-headlines error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'ok', articles: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 426,
        text: async () =>
          JSON.stringify({
            status: 'error',
            code: 'upgradeRequired',
            message: 'only available on localhost',
          }),
      } as Response);

    const result = await fetchNewsApiWithFallback('Maybank', 'abcdefghijklmnopqrstuvwxyz', 5);
    expect(result.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
