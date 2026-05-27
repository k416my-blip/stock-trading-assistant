import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetTradingSurvivabilityForTest,
  initTradingSurvivability,
  observeTradingSurvivability,
  shouldRunTradingSurvivabilitySample,
  getTradingSurvivabilityDashboard,
  buildTradingSurvivabilityExportBundle,
} from '../../../src/tradingSurvivability';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 20,
    renderBurstRate: 3,
    jsHeapMb: 100,
    memoryTrendPct: 30,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 25,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.15,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1200,
    recoverySuccessRate: 0.92,
    continuityScore: 88,
    jsSurvivalScore: 90,
    governanceConfidence: 0.82,
    runtimeFatigue: 0.2,
    staleHydrationRisk: 0.05,
  };
}

describe('tradingSurvivabilityOrchestration', () => {
  beforeEach(() => {
    resetTradingSurvivabilityForTest();
  });

  it('observes trading survivability profile', () => {
    initTradingSurvivability();
    const p = observeTradingSurvivability(baseInput());
    expect(p.runtimeSafeTradingScore).toBeGreaterThan(0);
    expect(getTradingSurvivabilityDashboard()?.profile.runtimeSafeTradingScore).toBeGreaterThan(0);
  });

  it('throttles trading survivability samples', () => {
    initTradingSurvivability();
    expect(shouldRunTradingSurvivabilitySample(baseInput())).toBe(true);
    expect(shouldRunTradingSurvivabilitySample(baseInput())).toBe(false);
  });

  it('enters emergency lightweight under critical degradation', () => {
    initTradingSurvivability();
    const p = observeTradingSurvivability({
      ...baseInput(),
      eventLoopLagMs: 900,
      renderFps: 6,
      memoryTrendPct: 88,
      recoverySuccessRate: 0.2,
      continuityScore: 40,
      sessionMinutes: 160,
      miuiAggressiveReclaim: true,
      screenOff: true,
    });
    expect(p.emergencyLightweightScore).toBeGreaterThan(0.2);
    expect(['emergency_lightweight', 'reclaim_adapted_trading', 'screen_off_minimal', 'long_session_survivability', 'low_memory_core']).toContain(
      p.survivabilityTradingMode,
    );
  });

  it('exports trading survivability bundle', () => {
    initTradingSurvivability();
    observeTradingSurvivability(baseInput());
    const exp = buildTradingSurvivabilityExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.survivabilityTimeline).toBeDefined();
    expect(exp.pollingHistory).toBeDefined();
  });
});
