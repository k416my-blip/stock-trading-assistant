import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeSemanticGravityExportBundle,
  getRuntimeSemanticGravityDashboard,
  initRuntimeSemanticGravity,
  observeRuntimeSemanticGravity,
  resetRuntimeSemanticGravityForTest,
  shouldRunRuntimeSemanticGravitySample,
} from '../../../src/runtimeSemanticGravity';

function baseInput() {
  return {
    metricCount: 180,
    canonicalMetricCount: 72,
    semanticAliasClusterCount: 32,
    metricCanonicalizationPressure: 0.62,
    crossLayerSemanticOverlap: 0.58,
    duplicateMeaningDensity: 0.56,
    canonicalMetricConfidence: 0.7,
    semanticCompressionPotential: 0.64,
    observerAliasRisk: 0.56,
    semanticNamingDrift: 0.54,
    ontologyCompressionRatio: 0.68,
    metricVocabularyEntropy: 0.58,
    semanticClusterIntegrity: 0.48,
    crossLayerMeaningCollapse: 0.56,
    metricIdentityInstability: 0.54,
    canonicalOntologyStress: 0.6,
    observerDependencyLoopRisk: 0.52,
    metricReferenceCycleDepth: 0.48,
    semanticMutualReferenceRisk: 0.5,
    recursiveMeaningDependency: 0.58,
    canonicalizationDeadlockRisk: 0.54,
    runtimeRealityAnchorScore: 0.52,
    semanticAnchorIntegrity: 0.48,
    ontologyFragmentationIndex: 0.56,
    recursiveOntologyDepth: 0.58,
    symbolicClosedLoopRisk: 0.56,
    narrativeRealityDistance: 0.5,
    observerContextDecay: 0.52,
    narrativeContinuity: 0.5,
    governanceDrift: 0.5,
    topologyComplexity: 0.58,
    topologyCollapseRisk: 0.54,
    observerChainDepth: 14,
    boundednessConfidence: 0.48,
    runtimeFiniteBoundaryIndex: 0.46,
    semanticEntropyBudget: 0.62,
    metricContainmentRatio: 0.42,
  };
}

describe('runtimeSemanticGravity', () => {
  beforeEach(() => resetRuntimeSemanticGravityForTest());

  it('observes semantic gravity profile and dashboard', () => {
    initRuntimeSemanticGravity();
    const p = observeRuntimeSemanticGravity(baseInput());
    expect(p.semanticGravityMass).toBeGreaterThan(0);
    expect(p.canonicalGravityCenter).toBeGreaterThan(0);
    expect(p.ontologyDensityPressure).toBeGreaterThan(0);
    expect(p.semanticCollapsePotential).toBeGreaterThan(0);
    expect(p.metricMeaningMass).toBeGreaterThan(0);
    expect(p.semanticSingularityRisk).toBeGreaterThan(0);
    expect(p.canonicalCenterAttraction).toBeGreaterThan(0);
    expect(p.ontologyOverCentralizationRisk).toBeGreaterThan(0);
    expect(p.semanticAnchorDivergence).toBeGreaterThan(0);
    expect(p.observerAnchorVariance).toBeGreaterThan(0);
    expect(p.narrativeAnchorDrift).toBeGreaterThan(0);
    expect(p.worldviewAnchorFragmentation).toBeGreaterThan(0);
    expect(p.recursiveAnchorInstability).toBeGreaterThan(0);
    expect(p.semanticOrbitInstability).toBeGreaterThan(0);
    expect(p.anchorCouplingStress).toBeGreaterThan(0);
    expect(p.anchorIsolationRisk).toBeGreaterThan(0);
    expect(p.canonicalTruthPressure).toBeGreaterThan(0);
    expect(p.semanticHierarchyRigidity).toBeGreaterThan(0);
    expect(p.ontologyAuthorityConcentration).toBeGreaterThan(0);
    expect(p.semanticMonocultureRisk).toBeGreaterThan(0);
    expect(p.metricBeliefConvergence).toBeGreaterThan(0);
    expect(p.observerConsensusGravity).toBeGreaterThan(0);
    expect(p.topologyCentralizationStress).toBeGreaterThan(0);
    expect(p.canonicalDogmatizationRisk).toBeGreaterThan(0);
    expect(p.semanticFaithLoopRisk).toBeGreaterThan(0);
    expect(p.recursiveTruthAmplification).toBeGreaterThan(0);
    expect(p.observerDoctrineFormation).toBeGreaterThan(0);
    expect(p.metricSacralizationRisk).toBeGreaterThan(0);
    expect(p.semanticOrthodoxyPressure).toBeGreaterThan(0);
    expect(p.semanticEquilibriumScore).toBeGreaterThan(0);
    expect(p.ontologyPluralityIntegrity).toBeGreaterThan(0);
    expect(p.metricMeaningDistribution).toBeGreaterThan(0);
    expect(p.semanticDiversityRetention).toBeGreaterThan(0);
    expect(p.observerPerspectiveBalance).toBeGreaterThan(0);
    expect(p.narrativeEntropyBalance).toBeGreaterThan(0);
    expect(p.semanticTensionStability).toBeGreaterThan(0);

    const dash = getRuntimeSemanticGravityDashboard();
    expect(dash?.semanticGravityFieldMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.anchorDivergenceTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.ontologyCentralizationRadar.length).toBeGreaterThan(0);
    expect(dash?.canonicalAttractionHeatmap.length).toBeGreaterThan(0);
    expect(dash?.semanticPluralityGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerBeliefClusteringMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticEquilibriumTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only semantic gravity warnings', () => {
    initRuntimeSemanticGravity();
    observeRuntimeSemanticGravity(baseInput());
    const dash = getRuntimeSemanticGravityDashboard();
    expect(dash?.warnings.every((w) => w.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeSemanticGravity();
    expect(shouldRunRuntimeSemanticGravitySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSemanticGravitySample(baseInput())).toBe(false);
  });

  it('exports semantic gravity sections', () => {
    initRuntimeSemanticGravity();
    observeRuntimeSemanticGravity(baseInput());
    const bundle = buildRuntimeSemanticGravityExportBundle();
    expect(bundle.semanticGravityReport).toBeTruthy();
    expect(bundle.ontologyCentralizationAnalysis).toBeTruthy();
    expect(bundle.anchorDivergenceAnalysis).toBeTruthy();
    expect(bundle.semanticPluralityReport).toBeTruthy();
    expect(bundle.canonicalizationPressureTopology).toBeTruthy();
    expect(bundle.observerWorldviewClusteringReport).toBeTruthy();
  });
});
