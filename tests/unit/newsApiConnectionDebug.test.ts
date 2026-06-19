import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyNewsApiFailureKind,
  failureKindLabelJa,
  maskNewsApiResponseBody,
  runNewsApiConnectionTest,
  summarizeNewsApiResponseBody,
} from '../../src/services/newsApiConnectionDebug';
import { isNewsApiDeveloperProductionBlocked } from '../../src/constants/newsApiRateLimit';

describe('newsApiConnectionDebug helpers', () => {
  it('classifies HTTP status codes', () => {
    expect(classifyNewsApiFailureKind({ httpStatus: 401 })).toBe('invalid_key');
    expect(classifyNewsApiFailureKind({ httpStatus: 429 })).toBe('plan_or_rate_limit');
    expect(classifyNewsApiFailureKind({ httpStatus: 426 })).toBe('production_blocked');
    expect(classifyNewsApiFailureKind({ httpStatus: 400 })).toBe('bad_request');
    expect(classifyNewsApiFailureKind({ httpStatus: 0, networkError: true })).toBe('network_error');
  });

  it('detects developer production block', () => {
    expect(
      isNewsApiDeveloperProductionBlocked({
        httpStatus: 426,
        responseBody: JSON.stringify({ code: 'upgradeRequired', message: 'localhost only' }),
      }),
    ).toBe(true);
  });

  it('masks api keys in response body', () => {
    const masked = maskNewsApiResponseBody(
      '{"apiKey":"secret1234567890"}',
      'secret1234567890',
    );
    expect(masked).not.toContain('secret1234567890');
    expect(masked).toContain('***');
  });

  it('summarizes error JSON', () => {
    const summary = summarizeNewsApiResponseBody(
      JSON.stringify({ status: 'error', code: 'rateLimited', message: 'too many' }),
    );
    expect(summary).toContain('rateLimited');
  });

  it('maps failure labels', () => {
    expect(failureKindLabelJa('invalid_key')).toContain('401');
    expect(failureKindLabelJa('production_blocked')).toContain('426');
  });
});

describe('runNewsApiConnectionTest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('news.google.com')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              '<rss><channel><title>Google News</title><item><title>Maybank rises</title></item></channel></rss>',
          };
        }
        if (String(url).includes('top-headlines')) {
          return {
            ok: false,
            status: 426,
            text: async () =>
              JSON.stringify({
                status: 'error',
                code: 'upgradeRequired',
                message: 'You can only use localhost on Developer plan',
              }),
          };
        }
        return {
          ok: false,
          status: 426,
          text: async () =>
            JSON.stringify({ status: 'error', code: 'upgradeRequired', message: 'only localhost' }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rescues with RSS when NewsAPI returns 426 on device', async () => {
    const result = await runNewsApiConnectionTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.productionBlocked).toBe(true);
    expect(result.rssFallbackOk).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.adoptedNewsSource).toBe('rss');
    expect(result.probes.length).toBe(9);
  });

  it('rescues with RSS when NewsAPI returns 401 invalid key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('news.google.com')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              '<rss><channel><item><title>Maybank update</title></item></channel></rss>',
          };
        }
        return {
          ok: false,
          status: 401,
          text: async () =>
            JSON.stringify({
              status: 'error',
              code: 'apiKeyInvalid',
              message: 'Invalid API key.',
            }),
        };
      }),
    );
    const result = await runNewsApiConnectionTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.newsApiKeyInvalid).toBe(true);
    expect(result.rssFallbackOk).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.adoptedNewsSource).toBe('rss');
    expect(result.errorReasonJa).toContain('401');
  });
});
