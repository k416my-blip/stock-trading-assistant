import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetSurvivabilityAuditForTest,
  initSurvivabilityAudit,
  observeSurvivabilityAudit,
  shouldRunSurvivabilityAuditSample,
  getSurvivabilityAuditDashboard,
  buildSurvivabilityAuditExportBundle,
  runSurvivabilityAuditFlows,
} from '../../../src/survivabilityAudit';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 20,
    jsHeapMb: 98,
    memoryTrendPct: 26,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 30,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.12,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1200,
    recoverySuccessRate: 0.93,
    continuityScore: 90,
    jsSurvivalScore: 92,
    observerOverheadRatio: 0.2,
    governanceConfidence: 0.88,
    runtimeSafeTradingScore: 88,
    runtimeTradingSuppression: 0.08,
    equilibriumScore: 0.82,
    metaCoordinationStability: 0.84,
    runtimeAmplificationRisk: 0.12,
    telemetryAmplificationScore: 0.15,
    runtimeEntropyScore: 0.1,
    loadSheddingSeverity: 0.08,
    runtimeEquilibriumStability: 0.8,
    staleHydrationRisk: 0.05,
  };
}

describe('survivabilityAuditValidation', () => {
  beforeEach(() => {
    resetSurvivabilityAuditForTest();
  });

  it('observes survivability audit profile and dashboard graphs', () => {
    initSurvivabilityAudit();
    const p = observeSurvivabilityAudit(baseInput());
    expect(p.survivabilityEffectiveness).toBeGreaterThan(0);
    expect(p.runtimeValidationConfidence).toBeGreaterThan(0);
    const dash = getSurvivabilityAuditDashboard();
    expect(dash?.blindSpotMap.nodes).toBeDefined();
    expect(dash?.stabilizationCostGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles survivability audit samples', () => {
    initSurvivabilityAudit();
    expect(shouldRunSurvivabilityAuditSample(baseInput())).toBe(true);
    expect(shouldRunSurvivabilityAuditSample(baseInput())).toBe(false);
  });

  it('detects blind spots and overfitting under MIUI reclaim and long session', () => {
    initSurvivabilityAudit();
    let last = observeSurvivabilityAudit(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeSurvivabilityAudit({
        ...baseInput(),
        miuiAggressiveReclaim: true,
        screenOff: true,
        sessionMinutes: 145,
        reconnectPerMin: 8,
        heartbeatAgeMs: 9000,
        loadSheddingSeverity: 0.55,
        runtimeTradingSuppression: 0.62,
        observerOverheadRatio: 0.12,
      });
    }
    expect(last.runtimeBlindSpotRisk).toBeGreaterThan(0.3);
    expect(last.survivabilityOverfittingRisk).toBeGreaterThan(0);
    expect(last.longSessionStabilityIntegrity).toBeLessThan(0.85);
  });

  it('runs audit flows and exports bundle', () => {
    initSurvivabilityAudit();
    const p = observeSurvivabilityAudit(baseInput());
    const flows = runSurvivabilityAuditFlows(baseInput(), p.survivabilityEffectiveness);
    expect(flows.length).toBe(9);
    const bundle = buildSurvivabilityAuditExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
  });
});
