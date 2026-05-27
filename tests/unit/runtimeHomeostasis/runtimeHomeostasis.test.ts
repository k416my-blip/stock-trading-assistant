import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeHomeostasisForTest,
  initRuntimeHomeostasis,
  observeRuntimeHomeostasis,
  shouldRunRuntimeHomeostasisSample,
  getRuntimeHomeostasisDashboard,
  buildRuntimeHomeostasisExportBundle,
  runHomeostasisFlows,
} from '../../../src/runtimeHomeostasis';

function baseInput() {
  return {
    eventLoopLagMs: 88,
    renderFps: 21,
    jsHeapMb: 95,
    memoryTrendPct: 24,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 40,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.1,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1100,
    recoverySuccessRate: 0.92,
    continuityScore: 89,
    jsSurvivalScore: 91,
    observerOverheadRatio: 0.18,
    governanceConfidence: 0.87,
    runtimeSafeTradingScore: 87,
    runtimeTradingSuppression: 0.08,
    equilibriumScore: 0.83,
    metaCoordinationStability: 0.85,
    runtimeAmplificationRisk: 0.11,
    telemetryAmplificationScore: 0.14,
    runtimeEntropyScore: 0.09,
    loadSheddingSeverity: 0.07,
    runtimeEquilibriumStability: 0.81,
    staleHydrationRisk: 0.04,
    interventionDensity: 0.14,
    survivabilityEffectiveness: 0.78,
    runtimeComplexityScore: 0.22,
    simplificationIntegrity: 0.8,
    runtimeCompressionEfficiency: 0.75,
    runtimeLeanStability: 0.82,
    recursiveStabilizationRisk: 0.08,
    runtimeAuditCoverage: 0.7,
    pacingDriftEstimate: 0.08,
    suppressionDriftEstimate: 0.06,
    compressionDriftEstimate: 0.05,
  };
}

describe('runtimeHomeostasis', () => {
  beforeEach(() => {
    resetRuntimeHomeostasisForTest();
  });

  it('observes homeostasis profile and dashboard graphs', () => {
    initRuntimeHomeostasis();
    const p = observeRuntimeHomeostasis(baseInput());
    expect(p.runtimeHomeostasisScore).toBeGreaterThan(0);
    expect(p.equilibriumIntegrity).toBeGreaterThan(0);
    const dash = getRuntimeHomeostasisDashboard();
    expect(dash?.stabilityDriftGraph.nodes).toBeDefined();
    expect(dash?.crossLayerEquilibriumGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles homeostasis samples', () => {
    initRuntimeHomeostasis();
    expect(shouldRunRuntimeHomeostasisSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeHomeostasisSample(baseInput())).toBe(false);
  });

  it('detects drift and fatigue under intervention storm', () => {
    initRuntimeHomeostasis();
    let last = observeRuntimeHomeostasis(baseInput());
    for (let i = 0; i < 6; i += 1) {
      last = observeRuntimeHomeostasis({
        ...baseInput(),
        interventionDensity: 0.62,
        pacingDriftEstimate: 0.55,
        suppressionDriftEstimate: 0.48,
        compressionDriftEstimate: 0.42,
        sessionMinutes: 150,
        runtimeEntropyScore: 0.48,
      });
    }
    expect(last.stabilityDriftRisk).toBeGreaterThan(0.3);
    expect(last.interventionFatigueLevel).toBeGreaterThan(0.25);
    expect(last.stabilizationOscillationRisk).toBeGreaterThan(0);
  });

  it('runs homeostasis flows and exports bundle', () => {
    initRuntimeHomeostasis();
    observeRuntimeHomeostasis(baseInput());
    const flows = runHomeostasisFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeHomeostasisExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
  });
});
