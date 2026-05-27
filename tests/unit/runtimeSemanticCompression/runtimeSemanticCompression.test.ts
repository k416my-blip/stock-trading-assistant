import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeSemanticCompressionExportBundle,
  getRuntimeSemanticCompressionDashboard,
  initRuntimeSemanticCompression,
  observeRuntimeSemanticCompression,
  resetRuntimeSemanticCompressionForTest,
  shouldRunRuntimeSemanticCompressionSample,
} from '../../../src/runtimeSemanticCompression';

function baseInput() {
  return {
    metricCount: 168,
    canonicalMetricCount: 54,
    semanticClusterCount: 26,
    aliasPairCount: 92,
    crossLayerMetricCount: 112,
    duplicateMetricRatio: 0.62,
    semanticRedundancyRatio: 0.58,
    semanticDivergence: 0.54,
    namingDriftScore: 0.56,
    dashboardRowCount: 52,
    panelCount: 13,
    visualizationCount: 22,
    operatorInteractionLatencyMs: 1800,
    observerDependencyCount: 48,
    observerLoopCount: 7,
    metricReferenceCycleCount: 9,
    observerChainDepth: 14,
    recursiveMeaningScore: 0.62,
    ontologyFragmentationIndex: 0.58,
    ontologyCompressionStress: 0.6,
    symbolicClosedLoopRisk: 0.56,
    runtimeFiniteBoundaryIndex: 0.42,
    boundednessConfidence: 0.44,
    semanticEntropyBudget: 0.62,
    metricContainmentRatio: 0.42,
    compressionRatio: 0.34,
  };
}

describe('runtimeSemanticCompression', () => {
  beforeEach(() => resetRuntimeSemanticCompressionForTest());

  it('observes semantic compression profile and dashboard', () => {
    initRuntimeSemanticCompression();
    const p = observeRuntimeSemanticCompression(baseInput());
    expect(p.semanticAliasClusterCount).toBeGreaterThan(0);
    expect(p.metricCanonicalizationPressure).toBeGreaterThan(0);
    expect(p.crossLayerSemanticOverlap).toBeGreaterThan(0);
    expect(p.duplicateMeaningDensity).toBeGreaterThan(0);
    expect(p.canonicalMetricConfidence).toBeGreaterThan(0);
    expect(p.semanticCompressionPotential).toBeGreaterThan(0);
    expect(p.observerAliasRisk).toBeGreaterThan(0);
    expect(p.semanticNamingDrift).toBeGreaterThan(0);
    expect(p.ontologyCompressionRatio).toBeGreaterThan(0);
    expect(p.metricVocabularyEntropy).toBeGreaterThan(0);
    expect(p.semanticClusterIntegrity).toBeGreaterThan(0);
    expect(p.crossLayerMeaningCollapse).toBeGreaterThan(0);
    expect(p.metricIdentityInstability).toBeGreaterThan(0);
    expect(p.canonicalOntologyStress).toBeGreaterThan(0);
    expect(p.dashboardSemanticCrowding).toBeGreaterThan(0);
    expect(p.operatorSemanticFatigue).toBeGreaterThan(0);
    expect(p.semanticPanelRedundancy).toBeGreaterThan(0);
    expect(p.metricInterpretationCollision).toBeGreaterThan(0);
    expect(p.visualizationAliasRisk).toBeGreaterThan(0);
    expect(p.observerDependencyLoopRisk).toBeGreaterThan(0);
    expect(p.metricReferenceCycleDepth).toBeGreaterThan(0);
    expect(p.semanticMutualReferenceRisk).toBeGreaterThan(0);
    expect(p.recursiveMeaningDependency).toBeGreaterThan(0);
    expect(p.canonicalizationDeadlockRisk).toBeGreaterThan(0);

    const dash = getRuntimeSemanticCompressionDashboard();
    expect(dash?.semanticOverlapHeatmap.length).toBeGreaterThan(0);
    expect(dash?.canonicalMetricGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.metricFamilyTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticRedundancyRadar.length).toBeGreaterThan(0);
    expect(dash?.observerDependencyGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.compressionPressureTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only compression suggestions', () => {
    initRuntimeSemanticCompression();
    observeRuntimeSemanticCompression(baseInput());
    const dash = getRuntimeSemanticCompressionDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeSemanticCompression();
    expect(shouldRunRuntimeSemanticCompressionSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeSemanticCompressionSample(baseInput())).toBe(false);
  });

  it('exports semantic compression sections', () => {
    initRuntimeSemanticCompression();
    observeRuntimeSemanticCompression(baseInput());
    const bundle = buildRuntimeSemanticCompressionExportBundle();
    expect(bundle.semanticOverlapReport).toBeTruthy();
    expect(bundle.canonicalizationAnalysis).toBeTruthy();
    expect(bundle.metricRedundancyReport).toBeTruthy();
    expect(bundle.observerDependencyReport).toBeTruthy();
    expect(bundle.dashboardSemanticSaturationAnalysis).toBeTruthy();
  });
});
