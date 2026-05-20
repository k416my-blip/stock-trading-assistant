import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppState } from '../../src/services/storage';
import {
  buildCentralIntelligenceWorldModel,
  resetCentralIntelligenceForTest,
} from '../../src/services/centralIntelligenceContext';
import {
  clearDiagnosticEvents,
  countDiagnosticsBySeverity,
  exportDiagnosticsReport,
  recordDiagnosticEvent,
} from '../../src/services/structuredDiagnostics';
import { containsForbiddenExpression } from '../../src/services/aiResponseSanitizer';
import { AI_SYSTEM_PROMPT } from '../../src/constants/aiStrategy';

describe('centralIntelligenceContext', () => {
  afterEach(() => {
    clearDiagnosticEvents();
    resetCentralIntelligenceForTest();
    vi.restoreAllMocks();
  });

  const baseInput = () => ({
    state: createDefaultAppState(),
    appMode: 'live' as const,
    degradedMode: false,
    bootMode: 'normal' as const,
    securityWarnings: [] as string[],
    recoveryRecommendations: [] as string[],
    killSwitches: {
      version: 1 as const,
      readOnlyMode: false,
      disableMarketRefresh: false,
      disableTradeSubmission: false,
    },
    priceSync: { loading: false, marketClosedHint: false },
    diagnosticsSummary: exportDiagnosticsReport().summary,
    diagnosticsSeverity: countDiagnosticsBySeverity(),
  });

  it('builds world model with system awareness scores', async () => {
    const model = await buildCentralIntelligenceWorldModel(baseInput());
    expect(model.systemAwareness.compositeConfidence).toBeGreaterThan(0);
    expect(model.systemAwareness.compositeConfidence).toBeLessThanOrEqual(100);
    expect(model.recommendations.length).toBeGreaterThan(0);
  });

  it('lowers confidence when degraded mode and stale holdings', async () => {
    const state = createDefaultAppState();
    state.portfolio = [
      {
        id: 'p1',
        symbol: '1155',
        market: 'bursa',
        currency: 'MYR',
        shares: 100,
        averageBuyPrice: 10,
        currentPrice: 10,
        openedAt: new Date().toISOString(),
        isStale: true,
        priceSource: 'api',
        lastSuccessfulFetchAt: new Date(Date.now() - 7200_000).toISOString(),
      },
    ];
    recordDiagnosticEvent({
      type: 'test',
      severity: 'error',
      module: 'test',
      message: 'diagnostics failure simulation',
    });

    const healthy = await buildCentralIntelligenceWorldModel(baseInput());
    const degraded = await buildCentralIntelligenceWorldModel({
      ...baseInput(),
      state,
      degradedMode: true,
      bootMode: 'safe',
      diagnosticsSeverity: countDiagnosticsBySeverity(),
    });

    expect(degraded.systemAwareness.compositeConfidence).toBeLessThan(
      healthy.systemAwareness.compositeConfidence,
    );
    expect(degraded.operations.degradedReasonsJa.length).toBeGreaterThan(0);
    expect(degraded.portfolioRisk.staleHoldingsCount).toBe(1);
  });

  it('reflects diagnostics failures in degradation reasons', async () => {
    recordDiagnosticEvent({
      type: 'test',
      severity: 'critical',
      module: 'test',
      message: 'critical path',
    });
    const model = await buildCentralIntelligenceWorldModel({
      ...baseInput(),
      degradedMode: true,
      diagnosticsSeverity: countDiagnosticsBySeverity(),
    });
    expect(
      model.systemAwareness.degradationReasonsJa.some((r) => r.includes('重大')),
    ).toBe(true);
  });

  it('adjusts recommendation confidence when rate limited', async () => {
    const { marketDataRequestQueue } = await import('../../src/services/marketDataRequestQueue');
    vi.spyOn(marketDataRequestQueue, 'getSnapshot').mockReturnValue({
      pending: 10,
      inFlight: 2,
      rateLimitUntil: Date.now() + 60_000,
      backoffMs: 4000,
      uniqueKeys: 3,
    });

    const model = await buildCentralIntelligenceWorldModel(baseInput());
    const rec = model.recommendations[0];
    expect(rec.adjustedConfidence).toBeLessThanOrEqual(rec.baseConfidence);
    expect(model.operations.rateLimitActive).toBe(true);
  });

  it('survives missing health report', async () => {
    const model = await buildCentralIntelligenceWorldModel({
      ...baseInput(),
      healthReport: null,
    });
    expect(model.operations.healthOverall).toBeNull();
    expect(model.systemAwareness.systemConfidence).toBeGreaterThan(0);
  });

  it('system prompt requires system-state aware JSON fields', () => {
    expect(AI_SYSTEM_PROMPT).toContain('systemStateReason');
    expect(AI_SYSTEM_PROMPT).toContain('systemAwareness');
    expect(containsForbiddenExpression('必ず買ってください')).toBe(true);
  });
});
