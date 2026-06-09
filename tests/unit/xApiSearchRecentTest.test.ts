import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  runXApiSearchRecentTest,
  xApiSearchRecentTestErrorReasonJa,
} from '../../src/services/xApiSearchRecentTest';

vi.mock('../../src/services/safeApiKey', () => ({
  resolveApiKeyForConnectionTest: vi.fn(async (_id: string, input?: string) => input ?? ''),
  safeGetApiKey: vi.fn(async () => ''),
}));

vi.mock('../../src/services/xBearerToken', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/xBearerToken')>();
  return {
    ...actual,
    resolveXBearerToken: (raw: string) => actual.normalizeBearerToken(raw),
  };
});

describe('xApiSearchRecentTestErrorReasonJa', () => {
  it('maps status codes to Japanese reasons', () => {
    expect(xApiSearchRecentTestErrorReasonJa(401)).toBe('Bearer Token無効または権限不足');
    expect(xApiSearchRecentTestErrorReasonJa(403)).toBe('X APIプラン制限');
    expect(xApiSearchRecentTestErrorReasonJa(429)).toBe('レート制限');
  });
});

describe('runXApiSearchRecentTest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              { text: 'Maybank earnings beat' },
              { text: 'KLCI banks rally' },
              { text: 'Maybank dividend' },
            ],
          }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses Bearer header and returns first 3 texts on success', async () => {
    const token = 'a'.repeat(40);
    const result = await runXApiSearchRecentTest(token);
    expect(result.ok).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.tweetCount).toBe(3);
    expect(result.tweetTexts).toHaveLength(3);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.twitter.com/2/tweets/search/recent?query=Maybank&max_results=10',
      expect.objectContaining({
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  });

  it('returns 403 reason and full body on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => '{"title":"Forbidden","detail":"plan limit"}',
      })),
    );
    const result = await runXApiSearchRecentTest('a'.repeat(40));
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect(result.errorReason).toBe('X APIプラン制限');
    expect(result.responseBody).toContain('Forbidden');
  });

  it('fails when 200 but data empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [] }),
      })),
    );
    const result = await runXApiSearchRecentTest('a'.repeat(40));
    expect(result.ok).toBe(false);
    expect(result.errorReason).toContain('data件数');
  });

  it('reports missing token', async () => {
    const result = await runXApiSearchRecentTest('');
    expect(result.ok).toBe(false);
    expect(result.errorReason).toContain('未設定');
  });
});
