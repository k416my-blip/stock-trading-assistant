import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: () => ({ remove: () => {} }),
  },
}));
import { apiRequestOrchestrator, orchestrateApiRequest } from '../../src/services/apiRequestOrchestrator';
import {
  buildApiCostDashboard,
  recordNewsApiCall,
  recordOpenAiTokenEstimate,
  resetApiCostTrackerForTest,
} from '../../src/services/apiCostTracker';
import { compressAiStrategyContextForApi } from '../../src/services/aiContextCompressor';
import { minimalAiStrategyContext } from '../helpers/aiContextFixture';
import {
  canSendGlobalNotification,
  recordGlobalNotificationSent,
  shouldPauseApiRequests,
  teardownPerformanceCostRuntimeForTest,
} from '../../src/services/performanceCostRuntime';
import { isUnifiedCacheFresh } from '../../src/services/unifiedCacheLayer';

describe('performanceCost layer', () => {
  it('dedupes orchestrated requests by key', async () => {
    let runs = 0;
    const p1 = orchestrateApiRequest('test:SYM', async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 42;
    });
    const p2 = orchestrateApiRequest('test:SYM', async () => {
      runs += 1;
      return 99;
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(runs).toBe(1);
  });

  it('tracks API cost estimates', () => {
    resetApiCostTrackerForTest();
    recordOpenAiTokenEstimate(1200);
    recordNewsApiCall(2);
    const dash = buildApiCostDashboard();
    expect(dash.openAiEstimatedTokens).toBe(1200);
    expect(dash.newsApiCalls).toBe(2);
  });

  it('compresses AI context holdings', () => {
    const ctx = minimalAiStrategyContext({
      holdings: Array.from({ length: 20 }, (_, i) => ({
        symbol: `S${i}`,
        market: 'us',
        shares: 1,
        priceSource: 'cache',
        isStale: false,
        quoteAgeSeconds: 60,
        hasPrice: true,
      })),
    });
    const compressed = compressAiStrategyContextForApi(ctx);
    expect(compressed.holdings.length).toBeLessThanOrEqual(8);
  });

  it('unified cache freshness', () => {
    const now = Date.now();
    const fresh = isUnifiedCacheFresh(new Date(now - 1000).toISOString(), 5000, now);
    const stale = isUnifiedCacheFresh(new Date(now - 10000).toISOString(), 5000, now);
    expect(fresh).toBe(true);
    expect(stale).toBe(false);
  });

  it('global notification throttle', () => {
    teardownPerformanceCostRuntimeForTest();
    expect(canSendGlobalNotification()).toBe(true);
    for (let i = 0; i < 6; i++) recordGlobalNotificationSent();
    expect(canSendGlobalNotification()).toBe(false);
  });

  it('orchestrator snapshot', () => {
    expect(apiRequestOrchestrator.getSnapshot().inFlight).toBeGreaterThanOrEqual(0);
    expect(typeof shouldPauseApiRequests).toBe('function');
  });
});
