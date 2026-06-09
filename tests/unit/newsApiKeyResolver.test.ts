import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { inspectNewsApiKeySources, keysMatch, resolveNewsApiKeyForOperational } from '../../src/services/newsApiKeyResolver';

vi.mock('../../src/services/secretStorage', () => ({
  getSecret: vi.fn(async (id: string) => (id === 'newsApiKey' ? 'secure-store-key-12345678' : '')),
}));

vi.mock('../../src/services/apiKeys', () => ({
  loadApiKey: vi.fn(async () => 'secure-store-key-12345678'),
}));

vi.mock('../../src/services/analysisApiKeys', () => ({
  loadAnalysisApiKeys: vi.fn(async () => ({
    newsApiKey: 'secure-store-key-12345678',
    snsApiKey: '',
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: '',
  })),
}));

describe('newsApiKeyResolver', () => {
  beforeEach(() => {
    vi.stubEnv('EXPO_PUBLIC_NEWS_API_KEY', '');
    vi.stubEnv('NEWS_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('prefers SecureStore over stale empty react state', async () => {
    const resolved = await resolveNewsApiKeyForOperational({
      newsApiKey: '',
      snsApiKey: '',
      earningsApiKey: '',
      redditApiKey: '',
      xApiKey: '',
    });
    expect(resolved.origin).toBe('secure_store');
    expect(resolved.key).toBe('secure-store-key-12345678');
  });

  it('detects mismatch between state and connection test key', async () => {
    const sources = await inspectNewsApiKeySources('wrong-key-99999999');
    expect(sources.reactState.exists).toBe(true);
    expect(keysMatch('wrong-key-99999999', 'secure-store-key-12345678')).toBe(false);
  });
});
