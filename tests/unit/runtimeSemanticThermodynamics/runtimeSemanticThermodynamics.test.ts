import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeSemanticThermodynamicsExportBundle,
  getRuntimeSemanticThermodynamicsDashboard,
  initRuntimeSemanticThermodynamics,
  observeRuntimeSemanticThermodynamics,
  resetRuntimeSemanticThermodynamicsForTest,
  shouldRunRuntimeSemanticThermodynamicsSample,
} from '../../../src/runtimeSemanticThermodynamics';

function baseInput() {
  return {
    semanticGravityMass: 0.72,
    semanticSingularityRisk: 0.68,
    semanticCollapsePotential: 0.7,
    semanticAnchorDivergence: 0.66,
    semanticOrbitInstability: 0.68,
    anchorCouplingStress: 0.64,
    ontologyDensityPressure: 0.7,
    ontologyOverCentralizationRisk: 0.66,
    ontologyPluralityIntegrity: 0.36,
    semanticEquilibriumScore: 0.34,
    semanticDiversityRetention: 0.38,
    observerPerspectiveBalance: 0.36,
    narrativeEntropyBalance: 0.34,
    semanticTensionStability: 0.36,
    canonicalTruthPressure: 0.7,
    semanticMonocultureRisk: 0.68,
    semanticOrthodoxyPressure: 0.66,
    recursiveTruthAmplification: 0.68,
    observerDoctrineFormation: 0.62,
    metricSacralizationRisk: 0.64,
    metricVocabularyEntropy: 0.72,
    duplicateMeaningDensity: 0.68,
    semanticEntropyBudget: 0.74,
    crossLayerMeaningCollapse: 0.7,
    recursiveMeaningDependency: 0.68,
    observerDependencyLoopRisk: 0.64,
    metricReferenceCycleDepth: 0.62,
    dashboardSemanticCrowding: 0.7,
    operatorSemanticFatigue: 0.68,
    replayCount: 120,
    replayAmplificationRisk: 0.72,
    observerChainDepth: 16,
    observerContextDecay: 0.68,
    topologyCollapseRisk: 0.7,
    ontologyFragmentationIndex: 0.72,
    recursiveOntologyDepth: 0.7,
    compressionRatio: 0.32,
    metricContainmentRatio: 0.34,
    boundednessConfidence: 0.36,
    runtimeFiniteBoundaryIndex: 0.34,
  };
}

describe('runtimeSemanticThermodynamics', () => {
  beforeEach(() => resetRuntimeSemanticThermodynamicsForTest());

  it('observes semantic thermodynamics profile and dashboard', () => {
    initRuntimeSemanticThermodynamics();
    const p = observeRuntimeSemanticThermodynamics(baseInput());
    expect(p.semanticEntropyLevel).toBeGreaterThan(0);
    expect(p.semanticHeatDensity).toBeGreaterThan(0);
    expect(p.ontologyThermalPressure).toBeGreaterThan(0);
    expect(p.recursiveMeaningTemperature).toBeGreaterThan(0);
    expect(p.semanticEnergyPropagation).toBeGreaterThan(0);
    expect(p.entropyAmplificationRisk).toBeGreaterThan(0);
    expect(p.semanticHeatAccumulation).toBeGreaterThan(0);
    expect(p.runtimeMeaningHeatIndex).toBeGreaterThan(0);
    expect(p.semanticDissipationEfficiency).toBeGreaterThan(0);
    expect(p.ontologyTurbulenceIntensity).toBeGreaterThan(0);
    expect(p.observerThermalFatigue).toBeGreaterThan(0);
    expect(p.semanticHeatDeathRisk).toBeGreaterThan(0);
    expect(p.semanticEnergyLoopRisk).toBeGreaterThan(0);

    const dash = getRuntimeSemanticThermodynamicsDashboard();
    expect(dash?.semanticTemperatureHeatmap.length).toBeGreaterThan(0);
    expect(dash?.ontologyTurbulenceField.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticEntropyRadar.length).toBeGreaterThan(0);
    expect(dash?.observerThermalSaturationGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.replayHeatPropagationTimeline.length).toBeGreaterThan(0);
    expect(dash?.semanticPressureTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.entropyDissipationFlowMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.runtimeHeatDeathMonitor.length).toBeGreaterThan(0);
  });

  it('records observe-only thermodynamic warnings', () => {
    initRuntimeSemanticThermodynamics();
    observeRuntimeSemanticThermodynamics(baseInput());
    const dash = getRuntimeSemanticThermodynamicsDashboard();
    expect(dash?.warnings.every((w) => w.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeSemanticThermodynamics();
    expect(shouldRunRuntimeSemanticThermodynamicsSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSemanticThermodynamicsSample(baseInput())).toBe(false);
  });

  it('exports thermodynamics sections', () => {
    initRuntimeSemanticThermodynamics();
    observeRuntimeSemanticThermodynamics(baseInput());
    const bundle = buildRuntimeSemanticThermodynamicsExportBundle();
    expect(bundle.semanticThermodynamicsReport).toBeTruthy();
    expect(bundle.ontologyTurbulenceAnalysis).toBeTruthy();
    expect(bundle.observerThermalSaturationReport).toBeTruthy();
    expect(bundle.entropyPropagationAnalysis).toBeTruthy();
    expect(bundle.semanticHeatAccumulationReport).toBeTruthy();
    expect(bundle.runtimeHeatDeathRiskAnalysis).toBeTruthy();
  });
});
