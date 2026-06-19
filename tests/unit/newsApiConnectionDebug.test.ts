import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyNewsApiFailureKind,
  failureKindLabelJa,
  maskNewsApiResponseBody,
  runNewsApiConnectionTest,
  summarizeNewsApiResponseBody,
} from '../../src/services/newsApiConnectionDebug';

describe('newsApiConnectionDebug helpers', () => {
  it('classifies HTTP status codes', () => {
    expect(classifyNewsApiFailureKind({ httpStatus: 401 })).toBe('invalid_key');
    expect(classifyNewsApiFailureKind({ httpStatus: 429 })).toBe('plan_or_rate_limit');
    expect(classifyNewsApiFailureKind({ httpStatus: 426 })).toBe('plan_or_rate_limit');
    expect(classifyNewsApiFailureKind({ httpStatus: 400 })).toBe('bad_request');
    expect(classifyNewsApiFailureKind({ httpStatus: 0, networkError: true })).toBe('network_error');
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
    expect(failureKindLabelJa('network_error')).toContain('network');
  });
});

describe('runNewsApiConnectionTest', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const auth = (init?.headers as Record<string, string>) ?? {};
        if (String(url).includes('top-headlines')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                status: 'ok',
                articles: [{ title: 'US business headline' }],
              }),
          };
        }
        return {
          ok: false,
          status: 426,
          text: async () =>
            JSON.stringify({
              status: 'error',
              code: 'upgradeRequired',
              message: 'only localhost',
            }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adopts stage A top-headlines on device', async () => {
    const result = await runNewsApiConnectionTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.ok).toBe(true);
    expect(result.adoptedStage).toBe('A');
    expect(result.httpStatus).toBe(200);
    expect(result.probes.length).toBe(4);
  });
});
