/**
 * Maybank分析 — Metro に出る診断ログの実出力キャプチャ（fetch はモック）
 * 実行: npx vitest run tests/unit/maybankMetroLogCapture.test.ts
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PortfolioPosition } from '../../src/types';
import { buildConciergeShortAnswer } from '../../src/services/conciergeShortAnswerFromEvidence';

const USER_MESSAGE = 'Maybankを分析して';

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

const METRO_TAGS = [
  '[TARGET_RESOLVE]',
  '[NEWS_FETCH_TARGET]',
  '[CONCIERGE_TARGET_SYMBOL]',
  '[CONCIERGE_SHORT_ANSWER]',
  '[EVIDENCE_TRACE]',
] as const;

function captureMetroLogs(run: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    const line = args.map(String).join(' ');
    if (METRO_TAGS.some((t) => line.startsWith(t))) {
      lines.push(line);
    }
    orig.apply(console, args);
  };
  return run().then(() => {
    console.warn = orig;
    return lines;
  });
}

describe('Maybank Metro log capture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints TARGET_RESOLVE, NEWS_FETCH_TARGET, CONCIERGE_TARGET_SYMBOL, CONCIERGE_SHORT_ANSWER', async () => {
    vi.mock('../../src/services/conciergeNewsFetchProbe', async (importOriginal) => {
      const mod = await importOriginal<typeof import('../../src/services/conciergeNewsFetchProbe')>();
      const { logNewsFetchTarget } = await import('../../src/services/conciergeTargetSymbolLog');
      return {
        ...mod,
        fetchConciergeNewsEvidence: vi.fn(
          async (
            stock: Parameters<typeof mod.fetchConciergeNewsEvidence>[0],
            _keys: Parameters<typeof mod.fetchConciergeNewsEvidence>[1],
            userMessage?: string,
            options?: Parameters<typeof mod.fetchConciergeNewsEvidence>[3],
          ) => {
            logNewsFetchTarget({
              symbol: stock.symbol,
              query: mod.buildConciergeNewsQuery(stock, userMessage),
              source: options?.source ?? 'chat',
            });
            return {
              headlines: [{ title: 'Maybank profit', sentiment: '中立', fetchedAtIso: '', ageSeconds: 0 }],
              newsSummaryJa: 'test',
              newsSource: 'RSS',
              fromCache: false,
              row: { source: 'newsapi', ok: true, detailJa: '1', headlineCount: 1, provider: 'rss' },
            };
          },
        ),
      };
    });
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

    const lines = await captureMetroLogs(async () => {
      const { buildConciergeEvidenceBundle } = await import('../../src/services/conciergeEvidenceBuilder');
      const { buildProbeAppState } = await import('../helpers/buildProbeAppState');
      const state = { ...buildProbeAppState(0), portfolio: onlyEtf };
      const evidence = await buildConciergeEvidenceBundle({
        state,
        userMessage: USER_MESSAGE,
        apiKeys: {
          newsApiKey: '',
          snsApiKey: '',
          earningsApiKey: '',
          redditApiKey: '',
          xApiKey: '',
        },
        analysisMode: 'balanced',
      });
      buildConciergeShortAnswer(undefined, '小口の買い', evidence, 'test-msg-1');
    });

    // eslint-disable-next-line no-console
    console.log('\n--- METRO LOG CAPTURE (Maybank) ---\n' + lines.join('\n') + '\n--- END ---\n');

    expect(lines.some((l) => l.startsWith('[TARGET_RESOLVE]'))).toBe(true);
    expect(lines.some((l) => l.startsWith('[NEWS_FETCH_TARGET]'))).toBe(true);
    expect(lines.some((l) => l.startsWith('[CONCIERGE_TARGET_SYMBOL]'))).toBe(true);
    expect(lines.some((l) => l.startsWith('[CONCIERGE_SHORT_ANSWER]'))).toBe(true);

    const resolve = JSON.parse(lines.find((l) => l.startsWith('[TARGET_RESOLVE]'))!.slice('[TARGET_RESOLVE]'.length));
    expect(resolve.targets).toEqual(['1155.KL']);

    const newsTarget = JSON.parse(
      lines.find((l) => l.startsWith('[NEWS_FETCH_TARGET]') && l.includes('chat'))!.slice(
        '[NEWS_FETCH_TARGET]'.length,
      ),
    );
    expect(newsTarget.symbol).toBe('1155.KL');
    expect(newsTarget.query).toBe('Malayan Banking Berhad');

    const short = JSON.parse(
      lines.find((l) => l.startsWith('[CONCIERGE_SHORT_ANSWER]') && l.includes('true'))!.slice(
        '[CONCIERGE_SHORT_ANSWER]'.length,
      ),
    );
    expect(short.hasEvidence).toBe(true);
    expect(short.factsCount).toBeGreaterThanOrEqual(7);
    expect(short.symbol).toContain('1155');
  });
});
