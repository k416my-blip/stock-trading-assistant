import { describe, expect, it } from 'vitest';
import {
  buildOperationalNewsUrls,
  extractNewsApiErrorCode,
  extractNewsApiErrorMessage,
} from '../../src/services/newsApiFetchDebug';

describe('newsApiFetchDebug', () => {
  it('extracts apiKeyInvalid code and message', () => {
    const body = { status: 'error', code: 'apiKeyInvalid', message: 'Your API key is invalid.' };
    expect(extractNewsApiErrorCode(body)).toBe('apiKeyInvalid');
    expect(extractNewsApiErrorMessage(body)).toBe('Your API key is invalid.');
  });

  it('builds masked operational URLs for top-headlines and everything', () => {
    const urls = buildOperationalNewsUrls('Maybank', 'secret-key-12345');
    expect(urls.topHeadlines).toContain('https://newsapi.org/v2/top-headlines?');
    expect(urls.topHeadlines).toContain('q=Maybank');
    expect(urls.topHeadlines).toContain('apiKey=***');
    expect(urls.everything).toContain('https://newsapi.org/v2/everything?');
    expect(urls.everything).not.toContain('secret-key');
  });
});
