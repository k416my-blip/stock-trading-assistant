import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeSemanticPhaseExportBundle,
  getRuntimeSemanticPhaseDashboard,
  initRuntimeSemanticPhase,
  observeRuntimeSemanticPhase,
  resetRuntimeSemanticPhaseForTest,
  shouldRunRuntimeSemanticPhaseSample,
} from '../../../src/runtimeSemanticPhaseTransition';

function baseInput() {
  return {
    semanticEntropyLevel: 0.72,
    semanticHeatDensity: 0.7,
    ontologyThermalPressure: 0.68,
    recursiveMeaningTemperature: 0.7,
    semanticEnergyPropagation: 0.68,
    entropyAmplificationRisk: 0.7,
    semanticHeatAccumulation: 0.72,
    runtimeMeaningHeatIndex: 0.7,
    semanticDissipationEfficiency: 0.34,
    ontologyCoolingPotential: 0.32,
    observerEntropyDrain: 0.34,
    semanticThermalLeakage: 0.68,
    replayEntropyPropagation: 0.7,
    dashboardHeatRetention: 0.72,
    semanticPressurePersistence: 0.68,
    entropyContainmentStress: 0.72,
    ontologyTurbulenceIntensity: 0.7,
    semanticVortexFormation: 0.66,
    recursiveMeaningTurbulence: 0.68,
    worldviewConvectionRisk: 0.66,
    observerInterpretationInstability: 0.68,
    semanticPressureWaveRisk: 0.7,
    ontologyFlowFragmentation: 0.68,
    observerThermalFatigue: 0.7,
    cognitiveHeatOverload: 0.7,
    dashboardThermalSaturation: 0.72,
    semanticAttentionBurnout: 0.68,
    interpretationHeatStress: 0.7,
    replayObservationExhaustion: 0.68,
    observerCoolingDeficit: 0.7,
    semanticHeatDeathRisk: 0.66,
    ontologySignalDecay: 0.66,
    meaningResolutionCollapse: 0.68,
    semanticNoiseDominance: 0.7,
    metricThermalEquilibriumFailure: 0.68,
    observerMeaningBlindness: 0.66,
    semanticExhaustionPotential: 0.68,
    recursiveEnergyFeedback: 0.7,
    semanticEnergyLoopRisk: 0.68,
    ontologyPropagationCascade: 0.7,
    replayHeatAmplification: 0.72,
    observerChainThermalPropagation: 0.68,
    semanticResonancePressure: 0.7,
    semanticEquilibriumScore: 0.34,
    ontologyPluralityIntegrity: 0.32,
    semanticDiversityRetention: 0.34,
    observerPerspectiveBalance: 0.36,
    narrativeEntropyBalance: 0.34,
    semanticTensionStability: 0.34,
    canonicalTruthPressure: 0.7,
    semanticMonocultureRisk: 0.68,
    semanticOrthodoxyPressure: 0.7,
    recursiveTruthAmplification: 0.7,
    observerDoctrineFormation: 0.66,
    metricSacralizationRisk: 0.68,
    observerDependencyLoopRisk: 0.68,
    topologyCollapseRisk: 0.66,
    boundednessConfidence: 0.34,
    runtimeFiniteBoundaryIndex: 0.32,
    compressionRatio: 0.3,
  };
}

describe('runtimeSemanticPhaseTransition', () => {
  beforeEach(() => resetRuntimeSemanticPhaseForTest());

  it('observes semantic phase profile and dashboard', () => {
    initRuntimeSemanticPhase();
    const p = observeRuntimeSemanticPhase(baseInput());
    expect(p.semanticPhaseVolatility).toBeGreaterThan(0);
    expect(p.ontologyStateShiftRisk).toBeGreaterThan(0);
    expect(p.recursiveMeaningCondensation).toBeGreaterThan(0);
    expect(p.semanticCrystallizationPressure).toBeGreaterThan(0);
    expect(p.semanticFluidityIndex).toBeGreaterThan(0);
    expect(p.ontologyRigidityGradient).toBeGreaterThan(0);
    expect(p.semanticStateTransitionVelocity).toBeGreaterThan(0);
    expect(p.meaningPhaseInstability).toBeGreaterThan(0);
    expect(p.semanticSolidificationRisk).toBeGreaterThan(0);
    expect(p.recursiveMeaningCrystalRisk).toBeGreaterThan(0);
    expect(p.semanticFlowTurbulence).toBeGreaterThan(0);
    expect(p.observerStateSynchronizationRisk).toBeGreaterThan(0);
    expect(p.semanticStateCollapseRisk).toBeGreaterThan(0);

    const dash = getRuntimeSemanticPhaseDashboard();
    expect(dash?.semanticPhaseMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.ontologyStateTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.recursiveCrystallizationGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticFluidDynamicsField.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerSynchronizationRadar.length).toBeGreaterThan(0);
    expect(dash?.semanticStateTransitionTimeline.length).toBeGreaterThan(0);
    expect(dash?.ontologyRigidityHeatmap.length).toBeGreaterThan(0);
    expect(dash?.semanticCollapseMonitor.length).toBeGreaterThan(0);
  });

  it('records observe-only phase warnings', () => {
    initRuntimeSemanticPhase();
    observeRuntimeSemanticPhase(baseInput());
    const dash = getRuntimeSemanticPhaseDashboard();
    expect(dash?.warnings.every((w) => w.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeSemanticPhase();
    expect(shouldRunRuntimeSemanticPhaseSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSemanticPhaseSample(baseInput())).toBe(false);
  });

  it('exports phase-state sections', () => {
    initRuntimeSemanticPhase();
    observeRuntimeSemanticPhase(baseInput());
    const bundle = buildRuntimeSemanticPhaseExportBundle();
    expect(bundle.semanticPhaseTransitionReport).toBeTruthy();
    expect(bundle.ontologyStateAnalysis).toBeTruthy();
    expect(bundle.recursiveCrystallizationReport).toBeTruthy();
    expect(bundle.semanticFluidDynamicsAnalysis).toBeTruthy();
    expect(bundle.observerSynchronizationReport).toBeTruthy();
    expect(bundle.semanticCollapseRiskAnalysis).toBeTruthy();
  });
});
