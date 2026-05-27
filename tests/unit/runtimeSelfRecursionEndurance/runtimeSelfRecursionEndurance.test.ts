import { beforeEach, describe, expect, it } from 'vitest';
import {
  initRuntimeSelfRecursionEndurance,
  observeRuntimeSelfRecursionEndurance,
  shouldRunRuntimeSelfRecursionEnduranceSample,
  getRuntimeSelfRecursionEnduranceDashboard,
  resetRuntimeSelfRecursionEnduranceForTest,
  buildRuntimeSelfRecursionEnduranceExportBundle,
} from '../../../src/runtimeSelfRecursionEndurance';

function baseInput() {
  return {
    eventLoopLagMs: 120,
    renderFps: 18,
    jsHeapMb: 105,
    memoryTrendPct: 35,
    sessionMinutes: 150,
    observerOverheadRatio: 0.52,
    governanceConfidence: 0.75,
    governanceMode: 'observe_only',
    telemetryAmplificationScore: 0.48,
    runtimeAmplificationRisk: 0.42,
    observerDensityScore: 0.5,
    runtimeAuditCoverage: 0.72,
    orchestrationEdgeCount: 22,
    interventionDensity: 0.48,
    metaRecursionRisk: 0.44,
    bridgeTrafficRate: 10,
    reconnectPerMin: 4,
    runtimeTradingSuppression: 0.2,
    dashboardRowCount: 28,
    telemetrySampleCount: 55,
    narrativeRecursionScore: 0.38,
    batterySaver: true,
    appForeground: false,
    screenOff: true,
    miuiAggressiveReclaim: true,
    thermalState: 'moderate',
  };
}

describe('runtimeSelfRecursionEndurance', () => {
  beforeEach(() => resetRuntimeSelfRecursionEnduranceForTest());

  it('observes circuit/endurance profile and dashboard metrics', () => {
    initRuntimeSelfRecursionEndurance();
    const p = observeRuntimeSelfRecursionEndurance(baseInput());
    expect(p.recursionCircuitRisk).toBeGreaterThan(0);
    expect(p.observerEchoRisk).toBeGreaterThan(0);
    expect(p.telemetryEchoRisk).toBeGreaterThan(0);
    expect(p.auditLoopRisk).toBeGreaterThan(0);
    expect(p.runtimeOperationalEnduranceScore).toBeGreaterThan(0);
    expect(p.dashboardPayloadGrowthRisk).toBeGreaterThan(0);
    expect(p.longSessionDriftRisk).toBeGreaterThan(0);
    expect(p.runtimeEnduranceConfidence).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(p.enduranceRiskBand);

    const dash = getRuntimeSelfRecursionEnduranceDashboard();
    expect(dash?.profile.recursionDepth).toBeGreaterThan(0);
    expect(dash?.circuitTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only suppression suggestions when circuit risk is elevated', () => {
    initRuntimeSelfRecursionEndurance();
    observeRuntimeSelfRecursionEndurance(baseInput());
    const dash = getRuntimeSelfRecursionEnduranceDashboard();
    expect(dash?.suppressionSuggestions.every((s) => s.observeOnly === true)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeSelfRecursionEndurance();
    expect(shouldRunRuntimeSelfRecursionEnduranceSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSelfRecursionEnduranceSample(baseInput())).toBe(false);
  });

  it('exports bundle', () => {
    initRuntimeSelfRecursionEndurance();
    observeRuntimeSelfRecursionEndurance(baseInput());
    const bundle = buildRuntimeSelfRecursionEnduranceExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.circuitBreakerReport.observeOnly).toBe(true);
  });
});
