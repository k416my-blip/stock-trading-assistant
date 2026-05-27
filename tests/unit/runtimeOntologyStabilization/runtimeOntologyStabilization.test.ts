import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeOntologyExportBundle,
  getRuntimeOntologyDashboard,
  initRuntimeOntology,
  observeRuntimeOntology,
  resetRuntimeOntologyForTest,
  shouldRunRuntimeOntologySample,
} from '../../../src/runtimeOntologyStabilization';

function baseInput() {
  return {
    topologyComplexity: 0.58,
    cognitionLoad: 0.52,
    semanticDivergence: 0.48,
    narrativeContinuity: 0.56,
    realityAnchorConfidence: 0.58,
    epistemicStabilityScore: 0.54,
    governanceDrift: 0.46,
    observerContextDecay: 0.5,
    recursiveMeaningAmplification: 0.56,
    topologyCollapseRisk: 0.52,
    finiteObservationScore: 0.56,
    federationIntegrityScore: 0.54,
    semanticMetricRedundancy: 0.52,
    compressionRatio: 0.42,
    duplicateSignalRatio: 0.54,
    replayCount: 72,
    narrativeNodeCount: 68,
    symbolicReferenceCount: 64,
    groundedReferenceCount: 30,
    observerReferenceDepth: 9,
    semanticSelfReferenceScore: 0.56,
  };
}

describe('runtimeOntologyStabilization', () => {
  beforeEach(() => resetRuntimeOntologyForTest());

  it('observes ontology profile and dashboard', () => {
    initRuntimeOntology();
    const p = observeRuntimeOntology(baseInput());
    expect(p.runtimeRealityAnchorScore).toBeGreaterThan(0);
    expect(p.semanticOntologyDrift).toBeGreaterThan(0);
    expect(p.observerGeneratedRealityRisk).toBeGreaterThan(0);
    expect(p.recursiveMeaningCollapseRisk).toBeGreaterThan(0);
    expect(p.ontologyFragmentationIndex).toBeGreaterThan(0);
    expect(p.narrativeRealityDistance).toBeGreaterThan(0);
    expect(p.symbolicReferenceInstability).toBeGreaterThan(0);
    expect(p.semanticAnchorIntegrity).toBeGreaterThan(0);
    expect(p.ontologyCompressionStress).toBeGreaterThan(0);
    expect(p.recursiveOntologyDepth).toBeGreaterThan(0);
    expect(p.semanticGroundingStrength).toBeGreaterThan(0);
    expect(p.symbolicAnchorDensity).toBeGreaterThan(0);
    expect(p.referenceChainIntegrity).toBeGreaterThan(0);
    expect(p.replayMeaningPersistence).toBeGreaterThan(0);
    expect(p.semanticPersistenceHalfLife).toBeGreaterThan(0);
    expect(p.ontologySelfGenerationRisk).toBeGreaterThan(0);
    expect(p.observerRealityFeedbackLoop).toBeGreaterThan(0);
    expect(p.semanticUniverseIsolationRisk).toBeGreaterThan(0);
    expect(p.symbolicClosedLoopRisk).toBeGreaterThan(0);

    const dash = getRuntimeOntologyDashboard();
    expect(dash?.ontologyStabilityRadar.length).toBeGreaterThan(0);
    expect(dash?.semanticGroundingHeatmap.length).toBeGreaterThan(0);
    expect(dash?.realityAnchorGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerReferenceTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.recursiveMeaningLadder.length).toBeGreaterThan(0);
    expect(dash?.symbolicDriftTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only ontology warnings', () => {
    initRuntimeOntology();
    observeRuntimeOntology(baseInput());
    const dash = getRuntimeOntologyDashboard();
    expect(dash?.ontologyWarnings.every((w) => w.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeOntology();
    expect(shouldRunRuntimeOntologySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeOntologySample(baseInput())).toBe(false);
  });

  it('exports ontology sections', () => {
    initRuntimeOntology();
    observeRuntimeOntology(baseInput());
    const bundle = buildRuntimeOntologyExportBundle();
    expect(bundle.ontologyStabilityReport).toBeTruthy();
    expect(bundle.semanticGroundingAnalysis).toBeTruthy();
    expect(bundle.realityAnchorTopology).toBeTruthy();
    expect(bundle.observerReferenceReport).toBeTruthy();
    expect(bundle.symbolicDriftAnalysis).toBeTruthy();
  });
});
