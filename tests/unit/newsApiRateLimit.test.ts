import { describe, expect, it } from 'vitest';
import {
  classifyNewsApiFailure,
  isNewsApiTempRateLimit,
  NEWSAPI_TEMP_RATE_LIMIT,
} from '../../src/constants/newsApiRateLimit';

describe('newsApiRateLimit', () => {
  const body =
    '{"status":"error","code":"rateLimited","message":"Developer accounts are limited to 100 requests over a 24 hour period (50 requests available every 12 hours)."}';

  it('detects temp rate limit from 429 + rateLimited code', () => {
    expect(
      isNewsApiTempRateLimit({ httpStatus: 429, responseBody: body }),
    ).toBe(true);
    expect(
      classifyNewsApiFailure({ httpStatus: 429, responseBody: body, hasApiKey: true }),
    ).toBe(NEWSAPI_TEMP_RATE_LIMIT);
  });

  it('does not treat 401 as temp rate limit', () => {
    expect(
      isNewsApiTempRateLimit({
        httpStatus: 401,
        responseBody: '{"status":"error","code":"apiKeyInvalid"}',
      }),
    ).toBe(false);
  });
});
