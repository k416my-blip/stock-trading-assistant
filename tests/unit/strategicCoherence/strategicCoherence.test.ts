import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetStrategicCoherenceForTest,
  initStrategicCoherence,
  observeStrategicCoherence,
  shouldRunStrategicCoherenceSample,
  getStrategicCoherenceDashboard,
  buildStrategicCoherenceExportBundle,
  runStrategicCoherenceFlows,
} from '../../../src/strategicCoherence';

function baseInput() {
  return {
    eventLoopLagMs: 85,
    renderFps: 22,
    jsHeapMb: 92,
    memoryTrendPct: 22,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 38,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.1,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1000,
    recoverySuccessRate: 0.92,
    continuityScore: 90,
    jsSurvivalScore: 91,
    observerOverheadRatio: 0.17,
    governanceConfidence: 0.88,
    runtimeSafeTradingScore: 88,
    runtimeTradingSuppression: 0.08,
    equilibriumScore: 0.84,
    metaCoordinationStability: 0.86,
    runtimeAmplificationRisk: 0.1,
    telemetryAmplificationScore: 0.13,
    runtimeEntropyScore: 0.08,
    loadSheddingSeverity: 0.06,
    runtimeEquilibriumStability: 0.82,
    staleHydrationRisk: 0.04,
    interventionDensity: 0.13,
    survivabilityEffectiveness: 0.8,
    runtimeComplexityScore: 0.2,
    simplificationIntegrity: 0.82,
    runtimeCompressionEfficiency: 0.78,
    runtimeHomeostasisScore: 0.8,
    equilibriumIntegrity: 0.83,
    runtimeCalmnessIndex: 0.78,
    runtimeAuditCoverage: 0.68,
    observerSuppressionLoss: 0.06,
    stabilityDriftRisk: 0.07,
  };
}

describe('strategicCoherence', () => {
  beforeEach(() => {
    resetStrategicCoherenceForTest();
  });

  it('observes strategic coherence profile and graphs', () => {
    initStrategicCoherence();
    const p = observeStrategicCoherence(baseInput());
    expect(p.runtimeStrategicCoherence).toBeGreaterThan(0);
    expect(p.objectiveAlignmentScore).toBeGreaterThan(0);
    const dash = getStrategicCoherenceDashboard();
    expect(dash?.objectiveAlignmentGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.utilityEquilibriumGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles strategic coherence samples', () => {
    initStrategicCoherence();
    expect(shouldRunStrategicCoherenceSample(baseInput())).toBe(true);
    expect(shouldRunStrategicCoherenceSample(baseInput())).toBe(false);
  });

  it('detects layer conflicts under compression vs audit tension', () => {
    initStrategicCoherence();
    let last = observeStrategicCoherence(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeStrategicCoherence({
        ...baseInput(),
        simplificationIntegrity: 0.72,
        runtimeAuditCoverage: 0.78,
        runtimeTradingSuppression: 0.45,
        continuityScore: 72,
        interventionDensity: 0.52,
        runtimeCalmnessIndex: 0.72,
        sessionMinutes: 150,
      });
    }
    expect(last.layerConflictRisk).toBeGreaterThan(0.25);
    expect(last.strategicDriftRisk).toBeGreaterThan(0);
  });

  it('runs strategic flows and exports bundle', () => {
    initStrategicCoherence();
    observeStrategicCoherence(baseInput());
    const flows = runStrategicCoherenceFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildStrategicCoherenceExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
  });
});
