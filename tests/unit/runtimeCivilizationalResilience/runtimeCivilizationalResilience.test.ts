import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeCivilizationalResilienceForTest,
  initRuntimeCivilizationalResilience,
  observeRuntimeCivilizationalResilience,
  shouldRunRuntimeCivilizationalResilienceSample,
  getRuntimeCivilizationalResilienceDashboard,
  buildRuntimeCivilizationalResilienceExportBundle,
  runCivilizationalEcologyFlows,
} from '../../../src/runtimeCivilizationalResilience';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 19,
    jsHeapMb: 100,
    memoryTrendPct: 28,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 48,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.12,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1200,
    recoverySuccessRate: 0.88,
    continuityScore: 87,
    jsSurvivalScore: 89,
    observerOverheadRatio: 0.22,
    governanceConfidence: 0.85,
    runtimeSafeTradingScore: 85,
    runtimeTradingSuppression: 0.12,
    equilibriumScore: 0.81,
    metaCoordinationStability: 0.83,
    runtimeAmplificationRisk: 0.13,
    telemetryAmplificationScore: 0.17,
    runtimeEntropyScore: 0.11,
    loadSheddingSeverity: 0.09,
    runtimeEquilibriumStability: 0.79,
    staleHydrationRisk: 0.06,
    interventionDensity: 0.16,
    survivabilityEffectiveness: 0.76,
    runtimeComplexityScore: 0.23,
    simplificationIntegrity: 0.79,
    runtimeHomeostasisScore: 0.78,
    runtimeStrategicCoherence: 0.77,
    runtimeAuditCoverage: 0.58,
    runtimeSelfLimitationScore: 0.8,
    metaRecursionRisk: 0.14,
    runtimeCalmnessIndex: 0.72,
    equilibriumPersistence: 0.69,
    orchestrationEdgeCount: 12,
    observerDensityScore: 0.25,
    objectiveAlignmentScore: 0.79,
    runtimePurposeIntegrityScore: 0.78,
    runtimePurposeDriftRisk: 0.13,
    runtimeUtilityIntegrity: 0.77,
    longSessionPurposeIntegrity: 0.83,
    valueDilutionRisk: 0.12,
    runtimeCompressionEfficiency: 0.71,
    runtimeLeanStability: 0.73,
    layerConflictRisk: 0.1,
    runtimeUnifiedUtilityScore: 0.77,
    runtimeExistentialConstraintRisk: 0.14,
    crossLayerUtilityConsistency: 0.76,
    observerCivilizationRisk: 0.15,
    runtimeGovernanceInflationRisk: 0.14,
    runtimeExistentialDriftRisk: 0.12,
    runtimeUnifiedUtilityConfidence: 0.78,
  };
}

describe('runtimeCivilizationalResilience', () => {
  beforeEach(() => {
    resetRuntimeCivilizationalResilienceForTest();
  });

  it('observes civilizational resilience profile and graphs', () => {
    initRuntimeCivilizationalResilience();
    const p = observeRuntimeCivilizationalResilience(baseInput());
    expect(p.runtimeCivilizationScore).toBeGreaterThan(0);
    expect(p.crossLayerEcologyIntegrity).toBeGreaterThan(0);
    const dash = getRuntimeCivilizationalResilienceDashboard();
    expect(dash?.recursiveGovernanceGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.crossLayerEcologyGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles civilizational resilience samples', () => {
    initRuntimeCivilizationalResilience();
    expect(shouldRunRuntimeCivilizationalResilienceSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeCivilizationalResilienceSample(baseInput())).toBe(false);
  });

  it('detects governance recursion and observer ecosystem under long session', () => {
    initRuntimeCivilizationalResilience();
    let last = observeRuntimeCivilizationalResilience(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimeCivilizationalResilience({
        ...baseInput(),
        runtimeAuditCoverage: 0.88,
        observerOverheadRatio: 0.62,
        observerDensityScore: 0.66,
        orchestrationEdgeCount: 28,
        metaRecursionRisk: 0.58,
        governanceConfidence: 0.8,
        runtimeGovernanceInflationRisk: 0.5,
        sessionMinutes: 170,
        equilibriumPersistence: 0.85,
        runtimeCalmnessIndex: 0.83,
      });
    }
    expect(last.recursiveGovernanceEcologyRisk).toBeGreaterThan(0.25);
    expect(last.observerEcosystemInflationRisk).toBeGreaterThan(0.25);
    expect(last.runtimeCivilizationDriftRisk).toBeGreaterThan(0.2);
  });

  it('runs civilizational ecology flows and exports bundle', () => {
    initRuntimeCivilizationalResilience();
    observeRuntimeCivilizationalResilience(baseInput());
    const flows = runCivilizationalEcologyFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeCivilizationalResilienceExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
    expect(bundle.ecologicalEvolutionReport).toBeTruthy();
  });
});
