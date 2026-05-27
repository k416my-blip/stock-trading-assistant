import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetTradingSafetyGovernanceForTest,
  initTradingSafetyGovernance,
  observeTradingSafetyGovernance,
  shouldRunTradingSafetyGovernanceSample,
  getTradingSafetyGovernanceDashboard,
  buildTradingSafetyExportBundle,
} from '../../../src/tradingSafetyGovernance';

function baseInput() {
  return {
    eventLoopLagMs: 95,
    renderFps: 20,
    jsHeapMb: 100,
    memoryTrendPct: 28,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 35,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.14,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1400,
    recoverySuccessRate: 0.92,
    continuityScore: 88,
    jsSurvivalScore: 90,
    governanceConfidence: 0.82,
    runtimeSafeTradingScore: 85,
    survivabilityTradingMode: 'full_trading',
    observerOverheadRatio: 0.22,
    equilibriumScore: 0.8,
    metaCoordinationStability: 0.82,
    staleHydrationRisk: 0.05,
    causalConfidence: 0.78,
  };
}

describe('tradingSafetyGovernance', () => {
  beforeEach(() => {
    resetTradingSafetyGovernanceForTest();
  });

  it('observes trading safety profile', () => {
    initTradingSafetyGovernance();
    const p = observeTradingSafetyGovernance(baseInput());
    expect(p.runtimeTradingRisk).toBeGreaterThan(0);
    expect(p.runtimeRecommendationConfidence).toBeGreaterThan(0);
    expect(getTradingSafetyGovernanceDashboard()?.profile.tradingSafetyEquilibrium).toBeGreaterThan(0);
  });

  it('throttles trading safety samples', () => {
    initTradingSafetyGovernance();
    expect(shouldRunTradingSafetyGovernanceSample(baseInput())).toBe(true);
    expect(shouldRunTradingSafetyGovernanceSample(baseInput())).toBe(false);
  });

  it('degrades confidence and enters emergency under critical runtime', () => {
    initTradingSafetyGovernance();
    const p = observeTradingSafetyGovernance({
      ...baseInput(),
      eventLoopLagMs: 520,
      recoverySuccessRate: 0.45,
      continuityScore: 55,
      observerOverheadRatio: 0.72,
      miuiAggressiveReclaim: true,
      screenOff: true,
      sessionMinutes: 160,
      memoryTrendPct: 82,
      reconnectPerMin: 10,
    });
    expect(p.runtimeRecommendationConfidence).toBeLessThan(0.6);
    expect(p.emergencyTradingRisk).toBeGreaterThan(0.35);
    expect(['emergency_lightweight_trading', 'reclaim_safe', 'screen_off_lightweight', 'long_session_fatigue']).toContain(
      p.mode,
    );
  });

  it('exports trading safety bundle', () => {
    initTradingSafetyGovernance();
    observeTradingSafetyGovernance(baseInput());
    const exp = buildTradingSafetyExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.runtimeConfidenceEvolution.length).toBeGreaterThan(0);
    expect(exp.tradingEquilibriumEvolution).toBeDefined();
  });
});
