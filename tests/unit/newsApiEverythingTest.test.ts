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
      vi.fn(async (url: string) => ({
        ok: String(url).includes('top-headlines'),
        status: String(url).includes('top-headlines') ? 200 : 426,
        text: async () =>
          String(url).includes('top-headlines')
            ? JSON.stringify({
                status: 'ok',
                articles: [{ title: 'Maybank profit rises' }],
              })
            : JSON.stringify({
                status: 'error',
                code: 'upgradeRequired',
                message: 'only localhost',
              }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uses stage A top-headlines with dual auth probes', async () => {
    const result = await runNewsApiEverythingTest('abcdefghijklmnopqrstuvwxyz123456');
    expect(result.ok).toBe(true);
    expect(result.adoptedStage).toBe('A');
    expect(result.httpStatus).toBe(200);
    expect(result.probes.length).toBeGreaterThan(0);
  });

  it('reports missing key', async () => {
    const result = await runNewsApiEverythingTest('');
    expect(result.ok).toBe(false);
    expect(result.errorReasonJa).toContain('未設定');
  });
});
