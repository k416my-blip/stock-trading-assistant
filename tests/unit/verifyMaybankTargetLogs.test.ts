import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioPosition } from '../../src/types';

const onlyEtf: PortfolioPosition[] = [
  {
    id: 'p1',
    symbol: '0820EA',
    market: 'bursa',
    currency: 'MYR',
    shares: 100,
    averageBuyPrice: 1.5,
    currentPrice: 1.6,
    isStale: false,
    quoteAgeSeconds: 0,
    companyName: 'AHAM Shariah KLCI ETF',
    openedAt: new Date().toISOString(),
  },
];

describe('Maybank target Metro logs (0820EA-only portfolio)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits CONCIERGE_TARGET_SYMBOL with 1155 and Maybank query at evidence build start', async () => {
    vi.mock('../../src/services/conciergeNewsFetchProbe', () => ({
      buildConciergeNewsQuery: () => 'Malayan Banking Berhad',
      fetchConciergeNewsEvidence: vi.fn(async () => ({
        headlines: [{ title: 'Maybank earnings', sentiment: '中立', fetchedAtIso: '', ageSeconds: 0 }],
        newsSummaryJa: 'test',
        newsSource: 'RSS',
        fromCache: false,
        row: { source: 'newsapi', ok: true, detailJa: '1件', headlineCount: 1, provider: 'rss' },
      })),
    }));
    vi.mock('../../src/services/conciergeXFetchProbe', () => ({
      fetchConciergeXEvidence: vi.fn(async () => ({
        xSentiment: null,
        row: { source: 'x', ok: false, detailJa: 'skip' },
      })),
    }));
    vi.mock('../../src/services/conciergeSymbolFetchDiagnostics', () => ({
      probeConciergeSymbolQuotes: vi.fn(async () => ({
        twelve: { source: 'twelve_data', ok: false, detailJa: 'skip' },
        yahoo: { source: 'yahoo', ok: true, detailJa: 'ok', price: 10.5 },
      })),
      buildAnalysisDiagnostics: vi.fn(() => undefined),
    }));

    const { buildConciergeEvidenceBundle } = await import('../../src/services/conciergeEvidenceBuilder');
    const { buildProbeAppState } = await import('../helpers/buildProbeAppState');
    const base = buildProbeAppState(0);
    const state = { ...base, portfolio: onlyEtf };

    await buildConciergeEvidenceBundle({
      state,
      userMessage: 'Maybankを分析して',
      apiKeys: {
        newsApiKey: '',
        snsApiKey: '',
        earningsApiKey: '',
        redditApiKey: '',
        xApiKey: '',
      },
      analysisMode: 'balanced',
    });

    const targetCalls = vi
      .mocked(console.warn)
      .mock.calls.filter((c) => c[0] === '[CONCIERGE_TARGET_SYMBOL]');
    expect(targetCalls.length).toBeGreaterThanOrEqual(1);

    const first = JSON.parse(String(targetCalls[0]![1])) as Record<string, unknown>;
    expect(first.input).toBe('Maybankを分析して');
    expect(first.resolvedSymbol).toBe('1155.KL');
    expect(first.resolvedName).toContain('Malayan');
    expect(first.newsQueries).toEqual(['Malayan Banking Berhad']);

    const resolveLog = vi
      .mocked(console.warn)
      .mock.calls.find((c) => c[0] === '[TARGET_RESOLVE]');
    expect(resolveLog).toBeDefined();
    const resolved = JSON.parse(String(resolveLog![1])) as { targets: string[] };
    expect(resolved.targets).toEqual(['1155.KL']);
    expect(first.usedNewsTitles).toEqual([]);
  });
});
