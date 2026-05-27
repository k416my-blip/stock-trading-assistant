import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimePurposeIntegrityForTest,
  initRuntimePurposeIntegrity,
  observeRuntimePurposeIntegrity,
  shouldRunRuntimePurposeIntegritySample,
  getRuntimePurposeIntegrityDashboard,
  buildRuntimePurposeIntegrityExportBundle,
  runPurposeIntegrityFlows,
} from '../../../src/runtimePurposeIntegrity';

function baseInput() {
  return {
    eventLoopLagMs: 85,
    renderFps: 21,
    jsHeapMb: 96,
    memoryTrendPct: 24,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 44,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.1,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1100,
    recoverySuccessRate: 0.9,
    continuityScore: 89,
    jsSurvivalScore: 91,
    observerOverheadRatio: 0.2,
    governanceConfidence: 0.87,
    runtimeSafeTradingScore: 87,
    runtimeTradingSuppression: 0.1,
    equilibriumScore: 0.83,
    metaCoordinationStability: 0.85,
    runtimeAmplificationRisk: 0.11,
    telemetryAmplificationScore: 0.15,
    runtimeEntropyScore: 0.09,
    loadSheddingSeverity: 0.07,
    runtimeEquilibriumStability: 0.81,
    staleHydrationRisk: 0.05,
    interventionDensity: 0.14,
    survivabilityEffectiveness: 0.78,
    runtimeComplexityScore: 0.21,
    simplificationIntegrity: 0.81,
    runtimeHomeostasisScore: 0.8,
    runtimeStrategicCoherence: 0.79,
    runtimeAuditCoverage: 0.62,
    runtimeSelfLimitationScore: 0.82,
    metaRecursionRisk: 0.12,
    runtimeCalmnessIndex: 0.74,
    equilibriumPersistence: 0.71,
    orchestrationEdgeCount: 10,
    observerDensityScore: 0.23,
    objectiveAlignmentScore: 0.81,
  };
}

describe('runtimePurposeIntegrity', () => {
  beforeEach(() => {
    resetRuntimePurposeIntegrityForTest();
  });

  it('observes purpose integrity profile and graphs', () => {
    initRuntimePurposeIntegrity();
    const p = observeRuntimePurposeIntegrity(baseInput());
    expect(p.runtimePurposeIntegrityScore).toBeGreaterThan(0);
    expect(p.runtimeUtilityIntegrity).toBeGreaterThan(0);
    const dash = getRuntimePurposeIntegrityDashboard();
    expect(dash?.utilityEquilibriumGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.purposeEvolutionTimeline.length).toBeGreaterThan(0);
  });

  it('throttles purpose integrity samples', () => {
    initRuntimePurposeIntegrity();
    expect(shouldRunRuntimePurposeIntegritySample(baseInput())).toBe(true);
    expect(shouldRunRuntimePurposeIntegritySample(baseInput())).toBe(false);
  });

  it('detects drift and stability addiction under governance inflation', () => {
    initRuntimePurposeIntegrity();
    let last = observeRuntimePurposeIntegrity(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimePurposeIntegrity({
        ...baseInput(),
        runtimeAuditCoverage: 0.84,
        interventionDensity: 0.56,
        observerOverheadRatio: 0.56,
        orchestrationEdgeCount: 25,
        equilibriumPersistence: 0.82,
        runtimeCalmnessIndex: 0.8,
        sessionMinutes: 158,
        survivabilityEffectiveness: 0.74,
        continuityScore: 71,
        governanceConfidence: 0.82,
      });
    }
    expect(last.runtimePurposeDriftRisk).toBeGreaterThan(0.3);
    expect(last.runtimeStabilityAddictionScore).toBeGreaterThan(0.2);
    expect(last.runtimeGovernanceOverreachRisk).toBeGreaterThan(0.2);
  });

  it('runs purpose integrity flows and exports bundle', () => {
    initRuntimePurposeIntegrity();
    observeRuntimePurposeIntegrity(baseInput());
    const flows = runPurposeIntegrityFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimePurposeIntegrityExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
    expect(bundle.purposeDriftAnalysis).toBeTruthy();
    expect(bundle.longSessionValueErosionReport).toBeTruthy();
  });
});
