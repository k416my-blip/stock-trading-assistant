import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetComplexityCompressionForTest,
  initComplexityCompression,
  observeComplexityCompression,
  shouldRunComplexityCompressionSample,
  getComplexityCompressionDashboard,
  buildComplexityCompressionExportBundle,
  runComplexityCompressionFlows,
} from '../../../src/complexityCompression';

function baseInput() {
  return {
    eventLoopLagMs: 95,
    renderFps: 19,
    jsHeapMb: 102,
    memoryTrendPct: 28,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 35,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 3,
    renderStormRisk: 0.14,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1400,
    recoverySuccessRate: 0.91,
    continuityScore: 88,
    jsSurvivalScore: 90,
    observerOverheadRatio: 0.22,
    governanceConfidence: 0.86,
    runtimeSafeTradingScore: 86,
    runtimeTradingSuppression: 0.1,
    equilibriumScore: 0.8,
    metaCoordinationStability: 0.82,
    runtimeAmplificationRisk: 0.14,
    telemetryAmplificationScore: 0.18,
    runtimeEntropyScore: 0.12,
    loadSheddingSeverity: 0.1,
    runtimeEquilibriumStability: 0.78,
    staleHydrationRisk: 0.06,
    interventionDensity: 0.12,
    observerDensityScore: 0.25,
    runtimeAuditCoverage: 0.72,
    survivabilityEffectiveness: 0.75,
    observerCountEstimate: 18,
    pacingLayerCount: 5,
    recoveryChainLength: 2,
    orchestrationEdgeCount: 10,
  };
}

describe('complexityCompression', () => {
  beforeEach(() => {
    resetComplexityCompressionForTest();
  });

  it('observes complexity compression profile and graphs', () => {
    initComplexityCompression();
    const p = observeComplexityCompression(baseInput());
    expect(p.runtimeComplexityScore).toBeGreaterThan(0);
    expect(p.simplificationIntegrity).toBeGreaterThan(0);
    const dash = getComplexityCompressionDashboard();
    expect(dash?.observerRedundancyGraph.nodes).toBeDefined();
    expect(dash?.leanModeTransitionGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles complexity compression samples', () => {
    initComplexityCompression();
    expect(shouldRunComplexityCompressionSample(baseInput())).toBe(true);
    expect(shouldRunComplexityCompressionSample(baseInput())).toBe(false);
  });

  it('detects bloat and recursion under observer explosion', () => {
    initComplexityCompression();
    let last = observeComplexityCompression(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeComplexityCompression({
        ...baseInput(),
        observerCountEstimate: 42,
        observerOverheadRatio: 0.68,
        telemetryAmplificationScore: 0.62,
        interventionDensity: 0.65,
        recoveryChainLength: 7,
        orchestrationEdgeCount: 26,
        sessionMinutes: 160,
        screenOff: true,
      });
    }
    expect(last.runtimeBloatScore).toBeGreaterThan(0.35);
    expect(last.recursiveStabilizationRisk).toBeGreaterThan(0.3);
    expect(last.observerRedundancyRisk).toBeGreaterThan(0.2);
  });

  it('runs compression flows and exports bundle', () => {
    initComplexityCompression();
    observeComplexityCompression(baseInput());
    const flows = runComplexityCompressionFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildComplexityCompressionExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
  });
});
