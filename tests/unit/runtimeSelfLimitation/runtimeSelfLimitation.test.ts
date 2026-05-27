import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeSelfLimitationForTest,
  initRuntimeSelfLimitation,
  observeRuntimeSelfLimitation,
  shouldRunRuntimeSelfLimitationSample,
  getRuntimeSelfLimitationDashboard,
  buildRuntimeSelfLimitationExportBundle,
  runSelfLimitationFlows,
} from '../../../src/runtimeSelfLimitation';

function baseInput() {
  return {
    eventLoopLagMs: 82,
    renderFps: 22,
    jsHeapMb: 94,
    memoryTrendPct: 22,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 42,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.1,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1050,
    recoverySuccessRate: 0.91,
    continuityScore: 90,
    jsSurvivalScore: 92,
    observerOverheadRatio: 0.19,
    governanceConfidence: 0.88,
    runtimeSafeTradingScore: 88,
    runtimeTradingSuppression: 0.09,
    equilibriumScore: 0.84,
    metaCoordinationStability: 0.86,
    runtimeAmplificationRisk: 0.1,
    telemetryAmplificationScore: 0.14,
    runtimeEntropyScore: 0.08,
    loadSheddingSeverity: 0.06,
    runtimeEquilibriumStability: 0.82,
    staleHydrationRisk: 0.04,
    interventionDensity: 0.13,
    survivabilityEffectiveness: 0.79,
    runtimeComplexityScore: 0.2,
    simplificationIntegrity: 0.82,
    runtimeHomeostasisScore: 0.81,
    equilibriumIntegrity: 0.84,
    runtimeStrategicCoherence: 0.8,
    objectiveAlignmentScore: 0.82,
    layerConflictRisk: 0.08,
    runtimeAuditCoverage: 0.65,
    observerDensityScore: 0.22,
    orchestrationEdgeCount: 9,
    recursiveStabilizationRisk: 0.07,
    equilibriumPersistence: 0.72,
    runtimeCalmnessIndex: 0.76,
  };
}

describe('runtimeSelfLimitation', () => {
  beforeEach(() => {
    resetRuntimeSelfLimitationForTest();
  });

  it('observes self limitation profile and graphs', () => {
    initRuntimeSelfLimitation();
    const p = observeRuntimeSelfLimitation(baseInput());
    expect(p.runtimeSelfLimitationScore).toBeGreaterThan(0);
    expect(p.runtimeBoundaryIntegrity).toBeGreaterThan(0);
    const dash = getRuntimeSelfLimitationDashboard();
    expect(dash?.metaRecursionGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.equilibriumInflationReport.nodes.length).toBeGreaterThan(0);
  });

  it('throttles self limitation samples', () => {
    initRuntimeSelfLimitation();
    expect(shouldRunRuntimeSelfLimitationSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSelfLimitationSample(baseInput())).toBe(false);
  });

  it('detects ego and recursion under audit inflation', () => {
    initRuntimeSelfLimitation();
    let last = observeRuntimeSelfLimitation(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimeSelfLimitation({
        ...baseInput(),
        runtimeAuditCoverage: 0.82,
        interventionDensity: 0.58,
        observerOverheadRatio: 0.58,
        orchestrationEdgeCount: 26,
        recursiveStabilizationRisk: 0.5,
        equilibriumPersistence: 0.82,
        sessionMinutes: 155,
      });
    }
    expect(last.metaRecursionRisk).toBeGreaterThan(0.3);
    expect(last.runtimeEgoScore).toBeGreaterThan(0.2);
    expect(last.stabilizationBudgetPressure).toBeGreaterThan(0.4);
  });

  it('runs self limitation flows and exports bundle', () => {
    initRuntimeSelfLimitation();
    observeRuntimeSelfLimitation(baseInput());
    const flows = runSelfLimitationFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeSelfLimitationExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
  });
});
