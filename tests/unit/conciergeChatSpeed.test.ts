import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildProbeAppState } from '../helpers/buildProbeAppState';
import { resetConciergeChatPerfForTest } from '../../src/services/conciergeChatPerfLog';
import { buildConciergeChatContext } from '../../src/services/conciergeChatContextBuilder';
import { DEFAULT_AI_PREFERENCES } from '../../src/services/aiPreferencesStorage';
import { createDefaultProviderHealth } from '../../src/services/apiHealthDashboard';

vi.mock('../../src/services/conciergeEvidenceBuilder', () => ({
  buildConciergeEvidenceBundle: vi.fn(async () => ({
    generatedAt: new Date().toISOString(),
    analysisMode: 'balanced',
    symbols: [{ symbol: '1155', market: 'bursa', companyName: 'Maybank' }],
    globalSummaryJa: '1銘柄',
    cacheNotesJa: [],
    actionGuide: { primaryActionJa: 'hold', rationaleJa: 'test' },
    riskControl: {
      allowSpeculativeAi: true,
      overallConfidencePct: 80,
      globalStaleWarningJa: null,
      analysisBlockedJa: null,
    },
  })),
}));

vi.mock('../../src/services/marketRegimeConciergeEngine', () => ({
  buildGlobalMarketAnalysis: vi.fn(async () => ({
    regimeId: 'neutral',
    summaryJa: '中立',
  })),
}));

vi.mock('../../src/services/portfolioIntelligenceBuilder', () => ({
  buildPortfolioIntelligenceBundle: vi.fn(async () => ({
    portfolioRisk: { concentrationScore: 0.2 },
    journalRecent: [],
    predictionsPending: [],
    similarCasesJa: [],
    lossPatterns: [],
    successPatterns: [],
  })),
}));

vi.mock('../../src/services/aiContextBuilder', () => ({
  buildAiStrategyContext: vi.fn(async (input) => ({
    ...input,
    marketRegimeLabel: '中立',
    staleHoldingsCount: 0,
    holdings: [],
    watchlist: [],
    operations: { degradedMode: false },
    concierge: { conversationMode: 'analysis', topic: 'strategy' },
    evidenceData: input.evidenceData,
  })),
}));

describe('concierge chat speed path', () => {
  beforeEach(() => {
    resetConciergeChatPerfForTest();
    vi.clearAllMocks();
  });

  it('Maybank分析 — 深層レイヤ省略でコンテキスト構築が短時間', async () => {
    const started = Date.now();
    const state = buildProbeAppState(0);
    const { context, evidenceData } = await buildConciergeChatContext({
      userMessage: 'Maybankを分析して',
      state,
      isPractice: false,
      analysisApiKeys: {
        newsApiKey: '',
        snsApiKey: '',
        earningsApiKey: '',
        redditApiKey: '',
        xApiKey: '',
      },
      aiPreferences: DEFAULT_AI_PREFERENCES,
      marketRegime: { regime: 'neutral', labelJa: '中立' } as never,
      healthReport: { summaryJa: 'ok', checks: [] } as never,
      degradedMode: false,
      bootMode: 'normal' as never,
      securityWarnings: [],
      recoveryRecommendations: [],
      killSwitches: { readOnlyMode: false, version: 1, disableMarketRefresh: false, disableTradeSubmission: false },
      priceSync: { loading: false, marketClosedHint: false } as never,
      diagnosticsSummary: '',
      diagnosticsSeverity: { critical: 0, warning: 0, info: 0, error: 0 },
      apiDash: {
        degradedByApis: false,
        openAiLabelJa: 'OK',
        newsLabelJa: 'OK',
        anyQuotaLimited: false,
        anyStaleWarning: false,
        providers: { openai: createDefaultProviderHealth('openai') },
      } as never,
    });
    const elapsed = Date.now() - started;
    expect(evidenceData.symbols[0]?.symbol).toBe('1155');
    expect(context).toBeTruthy();
    expect(elapsed).toBeLessThan(500);
  });
});
