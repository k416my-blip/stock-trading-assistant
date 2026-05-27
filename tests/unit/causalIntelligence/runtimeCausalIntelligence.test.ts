import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetCausalIntelligenceForTest,
  initCausalIntelligence,
  observeCausalIntelligence,
  shouldRunCausalIntelligenceSample,
  getCausalIntelligenceDashboard,
  buildCausalIntelligenceExportBundle,
} from '../../../src/causalIntelligence';

function baseInput() {
  return {
    eventLoopLagMs: 120,
    renderFps: 18,
    renderBurstRate: 4,
    jsHeapMb: 105,
    memoryTrendPct: 32,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 35,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 3,
    renderStormRisk: 0.18,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1500,
    recoverySuccessRate: 0.9,
    continuityScore: 86,
    jsSurvivalScore: 88,
    governanceConfidence: 0.8,
    governanceMode: 'full_observe',
    runtimeSafeTradingScore: 82,
    survivabilityTradingMode: 'full_trading',
    observerOverheadRatio: 0.22,
    schedulerDriftMs: 14,
    staleHydrationRisk: 0.06,
  };
}

describe('runtimeCausalIntelligence', () => {
  beforeEach(() => {
    resetCausalIntelligenceForTest();
  });

  it('observes causal profile and graph', () => {
    initCausalIntelligence();
    const p = observeCausalIntelligence(baseInput());
    expect(p.causalConfidence).toBeGreaterThan(0);
    const dash = getCausalIntelligenceDashboard();
    expect(dash?.graph.nodes.length).toBeGreaterThan(0);
    expect(dash?.recentChain.length).toBeGreaterThan(0);
  });

  it('throttles causal samples', () => {
    initCausalIntelligence();
    expect(shouldRunCausalIntelligenceSample(baseInput())).toBe(true);
    expect(shouldRunCausalIntelligenceSample(baseInput())).toBe(false);
  });

  it('attributes failure under MIUI reclaim cascade', () => {
    initCausalIntelligence();
    const p = observeCausalIntelligence({
      ...baseInput(),
      miuiAggressiveReclaim: true,
      screenOff: true,
      reconnectPerMin: 9,
      bridgeTrafficRate: 13,
      thermalState: 'moderate',
      sessionMinutes: 150,
    });
    expect(p.rootCauseScore).toBeGreaterThan(0.2);
    expect(p.websocketInstabilityScore).toBeGreaterThan(0.2);
    expect(p.propagationDepth).toBeGreaterThan(0);
  });

  it('exports causal bundle', () => {
    initCausalIntelligence();
    observeCausalIntelligence(baseInput());
    const exp = buildCausalIntelligenceExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.incidentGraph.nodes.length).toBeGreaterThan(0);
    expect(exp.degradationPropagationMap).toBeDefined();
  });
});
