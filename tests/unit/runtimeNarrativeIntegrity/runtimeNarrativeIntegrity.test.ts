import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeNarrativeIntegrityForTest,
  initRuntimeNarrativeIntegrity,
  observeRuntimeNarrativeIntegrity,
  shouldRunRuntimeNarrativeIntegritySample,
  getRuntimeNarrativeIntegrityDashboard,
  buildRuntimeNarrativeIntegrityExportBundle,
  runNarrativeIntegrityFlows,
} from '../../../src/runtimeNarrativeIntegrity';

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
    runtimeRealityIntegrityScore: 0.74,
    recursiveBeliefReinforcementRisk: 0.14,
    runtimeRealityDistortionRisk: 0.13,
    observerConfirmationLoopRisk: 0.15,
    runtimeEpistemologyInflationRisk: 0.14,
    runtimeEquilibriumHallucinationRisk: 0.13,
    runtimeWorldviewLockRisk: 0.14,
    crossLayerEpistemicConsistency: 0.73,
    runtimeEpistemicDriftRisk: 0.12,
    runtimeEpistemicConfidence: 0.75,
    runtimeAgencyIntegrityScore: 0.72,
    recursiveAutonomyInflationRisk: 0.14,
    runtimeConstraintErosionRisk: 0.13,
    observerAgencyFusionRisk: 0.15,
    runtimeGovernanceAutonomyRisk: 0.14,
    recursiveInterventionPersistenceRisk: 0.13,
    runtimeEquilibriumDependencyRisk: 0.14,
    crossLayerAgencyConsistency: 0.71,
    runtimeAutonomyDriftRisk: 0.12,
    runtimeAgencyConfidence: 0.73,
    runtimeMetaCognitionScore: 0.71,
    recursiveSelfObservationRisk: 0.14,
    observerSelfReferenceLockRisk: 0.15,
    metaCognitiveRigidityRisk: 0.14,
    runtimeIntrospectionDependencyRisk: 0.13,
    recursiveAuditFixationRisk: 0.13,
    runtimeSelfModelDriftRisk: 0.12,
    crossLayerSelfConsistency: 0.7,
    runtimeIntrospectionDriftRisk: 0.12,
    runtimeMetaCognitionConfidence: 0.72,
  };
}

describe('runtimeNarrativeIntegrity', () => {
  beforeEach(() => {
    resetRuntimeNarrativeIntegrityForTest();
  });

  it('observes narrative integrity profile and graphs', () => {
    initRuntimeNarrativeIntegrity();
    const p = observeRuntimeNarrativeIntegrity(baseInput());
    expect(p.runtimeNarrativeIntegrityScore).toBeGreaterThan(0);
    expect(p.crossLayerSemanticConsistency).toBeGreaterThan(0);
    const dash = getRuntimeNarrativeIntegrityDashboard();
    expect(dash?.recursiveNarrativeGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.crossLayerSemanticGraph.nodes.length).toBeGreaterThan(0);
  });

  it('throttles narrative integrity samples', () => {
    initRuntimeNarrativeIntegrity();
    expect(shouldRunRuntimeNarrativeIntegritySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeNarrativeIntegritySample(baseInput())).toBe(false);
  });

  it('detects narrative inflation and explanation fixation under long session', () => {
    initRuntimeNarrativeIntegrity();
    let last = observeRuntimeNarrativeIntegrity(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeRuntimeNarrativeIntegrity({
        ...baseInput(),
        runtimeAuditCoverage: 0.92,
        runtimeStrategicCoherence: 0.88,
        recursiveBeliefReinforcementRisk: 0.58,
        observerConfirmationLoopRisk: 0.55,
        runtimeWorldviewLockRisk: 0.52,
        equilibriumPersistence: 0.88,
        runtimeRealityDistortionRisk: 0.5,
        sessionMinutes: 192,
      });
    }
    expect(last.recursiveNarrativeInflationRisk).toBeGreaterThanOrEqual(0.25);
    expect(last.explanationLoopFixationRisk).toBeGreaterThanOrEqual(0.25);
    expect(last.runtimeNarrativeDriftRisk).toBeGreaterThan(0.2);
  });

  it('runs narrative integrity flows and exports bundle', () => {
    initRuntimeNarrativeIntegrity();
    observeRuntimeNarrativeIntegrity(baseInput());
    const flows = runNarrativeIntegrityFlows(baseInput());
    expect(flows.length).toBe(10);
    const bundle = buildRuntimeNarrativeIntegrityExportBundle();
    expect(bundle.version).toBeTruthy();
    expect(bundle.profile).not.toBeNull();
    expect(bundle.narrativeEvolutionReport).toBeTruthy();
  });
});
