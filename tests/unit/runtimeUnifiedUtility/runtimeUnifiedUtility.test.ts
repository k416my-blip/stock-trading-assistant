import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeUnifiedUtilityForTest,
  initRuntimeUnifiedUtility,
  observeRuntimeUnifiedUtility,
  shouldRunRuntimeUnifiedUtilitySample,
  getRuntimeUnifiedUtilityDashboard,
  buildRuntimeUnifiedUtilityExportBundle,
  runUnifiedUtilityFlows,
} from '../../../src/runtimeUnifiedUtility';

function baseInput() {
  return {
    eventLoopLagMs: 88,
    renderFps: 20,
    jsHeapMb: 98,
    memoryTrendPct: 26,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 46,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.12,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1150,
    recoverySuccessRate: 0.89,
    continuityScore: 88,
    jsSurvivalScore: 90,
    observerOverheadRatio: 0.21,
    governanceConfidence: 0.86,
    runtimeSafeTradingScore: 86,
    runtimeTradingSuppression: 0.11,
    equilibriumScore: 0.82,
    metaCoordinationStability: 0.84,
    runtimeAmplificationRisk: 0.12,
    telemetryAmplificationScore: 0.16,
    runtimeEntropyScore: 0.1,
    loadSheddingSeverity: 0.08,
    runtimeEquilibriumStability: 0.8,
    staleHydrationRisk: 0.06,
    interventionDensity: 0.15,
    survivabilityEffectiveness: 0.77,
    runtimeComplexityScore: 0.22,
    simplificationIntegrity: 0.8,
    runtimeHomeostasisScore: 0.79,
    runtimeStrategicCoherence: 0.78,
    runtimeAuditCoverage: 0.6,
    runtimeSelfLimitationScore: 0.81,
    metaRecursionRisk: 0.13,
    runtimeCalmnessIndex: 0.73,
    equilibriumPersistence: 0.7,
    orchestrationEdgeCount: 11,
    observerDensityScore: 0.24,
    objectiveAlignmentScore: 0.8,
    runtimePurposeIntegrityScore: 0.79,
    runtimePurposeDriftRisk: 0.12,
    runtimeUtilityIntegrity: 0.78,
    longSessionPurposeIntegrity: 0.84,
    valueDilutionRisk: 0.11,
    runtimeCompressionEfficiency: 0.72,
    runtimeLeanStability: 0.74,
    layerConflictRisk: 0.09,
  };
}

describe('runtimeUnifiedUtility', () => {
  beforeEach(() => {
    resetRuntimeUnifiedUtilityForTest();
  });

  it('observes unified utility profile and graphs', () => {
    initRuntimeUnifiedUtility();
    const p = observeRuntimeUnifiedUtility(baseInput());
    expect(p.runtimeUnifiedUtilityScore).toBeGreaterThan(0);
    expect(p.crossLayerUtilityConsistency).toBeGreaterThan(0);
    const dash = getRuntimeUnifiedUtilityDashboard();
    expect(dash?.objectiveFragmentationGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.crossLayerUtilityGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles unified utility samples', () => {
    initRuntimeUnifiedUtility();
    expect(shouldRunRuntimeUnifiedUtilitySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeUnifiedUtilitySample(baseInput())).toBe(false);
  });

  it('detects existential constraint and observer civilization under inflation', () => {
    initRuntimeUnifiedUtility();
    let last = observeRuntimeUnifiedUtility(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimeUnifiedUtility({
        ...baseInput(),
        runtimeAuditCoverage: 0.86,
        observerOverheadRatio: 0.6,
        observerDensityScore: 0.64,
        orchestrationEdgeCount: 27,
        interventionDensity: 0.58,
        equilibriumPersistence: 0.84,
        runtimeCalmnessIndex: 0.82,
        sessionMinutes: 165,
        metaRecursionRisk: 0.52,
        valueDilutionRisk: 0.45,
        longSessionPurposeIntegrity: 0.38,
      });
    }
    expect(last.runtimeExistentialConstraintRisk).toBeGreaterThan(0.3);
    expect(last.observerCivilizationRisk).toBeGreaterThan(0.25);
    expect(last.runtimeGovernanceInflationRisk).toBeGreaterThan(0.2);
  });

  it('runs unified utility flows and exports bundle', () => {
    initRuntimeUnifiedUtility();
    observeRuntimeUnifiedUtility(baseInput());
    const flows = runUnifiedUtilityFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeUnifiedUtilityExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
    expect(bundle.equilibriumEvolutionReport).toBeTruthy();
  });
});
