import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runNewsApiEverythingTest } from '../../src/services/newsApiEverythingTest';

vi.mock('../../src/services/safeApiKey', () => ({
  resolveApiKeyForConnectionTest: vi.fn(async (_id: string, input?: string) => input ?? ''),
  safeGetApiKey: vi.fn(async () => ''),
}));

describe('runNewsApiEverythingTest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'ok',
            articles: [{ title: 'Maybank profit rises' }, { title: 'KLCI update' }],
          }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses X-Api-Key header and returns titles on success', async () => {
    const result = await runNewsApiEverythingTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.ok).toBe(true);
    expect(result.articleCount).toBe(2);
    expect(result.titles).toEqual(['Maybank profit rises', 'KLCI update']);
    expect(fetch).toHaveBeenCalledWith(
      'https://newsapi.org/v2/everything?q=Maybank&pageSize=5',
      expect.objectContaining({
        headers: { 'X-Api-Key': 'abcdefghijklmnopqrstuvwxyz123456' },
      }),
    );
  });

  it('returns HTTP status and body on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => '{"status":"error","code":"apiKeyInvalid","message":"Invalid API key"}',
      })),
    );
    const result = await runNewsApiEverythingTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(401);
    expect(result.responseBody).toContain('apiKeyInvalid');
    expect(result.errorReason).toBe('HTTP 401');
  });

  it('reports missing key', async () => {
    const result = await runNewsApiEverythingTest('');
    expect(result.ok).toBe(false);
    expect(result.errorReason).toContain('未設定');
  });
});
