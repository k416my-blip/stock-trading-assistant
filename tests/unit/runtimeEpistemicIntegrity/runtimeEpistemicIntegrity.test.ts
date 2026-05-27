import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeEpistemicIntegrityForTest,
  initRuntimeEpistemicIntegrity,
  observeRuntimeEpistemicIntegrity,
  shouldRunRuntimeEpistemicIntegritySample,
  getRuntimeEpistemicIntegrityDashboard,
  buildRuntimeEpistemicIntegrityExportBundle,
  runEpistemicIntegrityFlows,
} from '../../../src/runtimeEpistemicIntegrity';

function baseInput() {
  return {
    eventLoopLagMs: 92,
    renderFps: 18,
    jsHeapMb: 102,
    memoryTrendPct: 30,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 50,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.14,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1250,
    recoverySuccessRate: 0.87,
    continuityScore: 86,
    jsSurvivalScore: 88,
    observerOverheadRatio: 0.23,
    governanceConfidence: 0.84,
    runtimeSafeTradingScore: 84,
    runtimeTradingSuppression: 0.13,
    equilibriumScore: 0.8,
    metaCoordinationStability: 0.82,
    runtimeAmplificationRisk: 0.14,
    telemetryAmplificationScore: 0.18,
    runtimeEntropyScore: 0.12,
    loadSheddingSeverity: 0.1,
    runtimeEquilibriumStability: 0.78,
    staleHydrationRisk: 0.07,
    interventionDensity: 0.17,
    survivabilityEffectiveness: 0.75,
    runtimeComplexityScore: 0.24,
    simplificationIntegrity: 0.78,
    runtimeHomeostasisScore: 0.77,
    runtimeStrategicCoherence: 0.76,
    runtimeAuditCoverage: 0.56,
    runtimeSelfLimitationScore: 0.79,
    metaRecursionRisk: 0.15,
    runtimeCalmnessIndex: 0.71,
    equilibriumPersistence: 0.68,
    orchestrationEdgeCount: 13,
    observerDensityScore: 0.26,
    objectiveAlignmentScore: 0.78,
    runtimePurposeIntegrityScore: 0.77,
    runtimePurposeDriftRisk: 0.14,
    runtimeUtilityIntegrity: 0.76,
    longSessionPurposeIntegrity: 0.82,
    valueDilutionRisk: 0.13,
    runtimeCompressionEfficiency: 0.7,
    runtimeLeanStability: 0.72,
    layerConflictRisk: 0.11,
    runtimeUnifiedUtilityScore: 0.76,
    runtimeExistentialConstraintRisk: 0.15,
    crossLayerUtilityConsistency: 0.75,
    observerCivilizationRisk: 0.16,
    runtimeGovernanceInflationRisk: 0.15,
    runtimeExistentialDriftRisk: 0.13,
    runtimeUnifiedUtilityConfidence: 0.77,
    runtimeCivilizationScore: 0.75,
    recursiveGovernanceEcologyRisk: 0.14,
    runtimeUtilityMonocultureRisk: 0.13,
    observerEcosystemInflationRisk: 0.16,
    runtimeStabilityIdeologyRisk: 0.14,
    runtimeOrchestrationCivilizationRisk: 0.15,
    crossLayerEcologyIntegrity: 0.74,
    runtimeCivilizationDriftRisk: 0.12,
    runtimeEcologicalConfidence: 0.76,
  };
}

describe('runtimeEpistemicIntegrity', () => {
  beforeEach(() => {
    resetRuntimeEpistemicIntegrityForTest();
  });

  it('observes epistemic integrity profile and graphs', () => {
    initRuntimeEpistemicIntegrity();
    const p = observeRuntimeEpistemicIntegrity(baseInput());
    expect(p.runtimeRealityIntegrityScore).toBeGreaterThan(0);
    expect(p.crossLayerEpistemicConsistency).toBeGreaterThan(0);
    const dash = getRuntimeEpistemicIntegrityDashboard();
    expect(dash?.recursiveBeliefGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.crossLayerEpistemicGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles epistemic integrity samples', () => {
    initRuntimeEpistemicIntegrity();
    expect(shouldRunRuntimeEpistemicIntegritySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeEpistemicIntegritySample(baseInput())).toBe(false);
  });

  it('detects belief reinforcement and confirmation loops under long session', () => {
    initRuntimeEpistemicIntegrity();
    let last = observeRuntimeEpistemicIntegrity(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimeEpistemicIntegrity({
        ...baseInput(),
        runtimeAuditCoverage: 0.9,
        observerOverheadRatio: 0.64,
        observerDensityScore: 0.68,
        orchestrationEdgeCount: 29,
        metaRecursionRisk: 0.6,
        governanceConfidence: 0.82,
        recursiveGovernanceEcologyRisk: 0.52,
        equilibriumPersistence: 0.86,
        runtimeCalmnessIndex: 0.84,
        sessionMinutes: 178,
      });
    }
    expect(last.recursiveBeliefReinforcementRisk).toBeGreaterThanOrEqual(0.25);
    expect(last.observerConfirmationLoopRisk).toBeGreaterThanOrEqual(0.25);
    expect(last.runtimeEpistemicDriftRisk).toBeGreaterThan(0.2);
  });

  it('runs epistemic integrity flows and exports bundle', () => {
    initRuntimeEpistemicIntegrity();
    observeRuntimeEpistemicIntegrity(baseInput());
    const flows = runEpistemicIntegrityFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeEpistemicIntegrityExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
    expect(bundle.epistemicEvolutionReport).toBeTruthy();
  });
});
