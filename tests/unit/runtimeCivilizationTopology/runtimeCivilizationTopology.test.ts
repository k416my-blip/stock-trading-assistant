import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeCivilizationTopologyExportBundle,
  getRuntimeCivilizationTopologyDashboard,
  initRuntimeCivilizationTopology,
  observeRuntimeCivilizationTopology,
  resetRuntimeCivilizationTopologyForTest,
  shouldRunRuntimeCivilizationTopologySample,
} from '../../../src/runtimeCivilizationTopology';

function baseInput() {
  return {
    eventLoopLagMs: 240,
    renderFps: 12,
    sessionMinutes: 160,
    observerChainDepthEstimate: 10,
    governanceLayerCount: 8,
    governanceConfidence: 0.6,
    telemetryAmplificationScore: 0.5,
    replayCount: 70,
    narrativeNodeCount: 72,
    narrativeDuplicationRatio: 0.5,
    semanticSignalCount: 62,
    uniqueSignalKinds: 12,
    duplicateSignalRatio: 0.54,
    semanticDivergence: 0.48,
    narrativeContinuity: 0.58,
    governanceDrift: 0.46,
    observerContextDecay: 0.5,
    recursiveMeaningAmplification: 0.52,
    topologyFragmentationScore: 0.56,
    realityAnchorConfidence: 0.62,
  };
}

describe('runtimeCivilizationTopology', () => {
  beforeEach(() => resetRuntimeCivilizationTopologyForTest());

  it('observes topology and epistemic stability dashboard', () => {
    initRuntimeCivilizationTopology();
    const p = observeRuntimeCivilizationTopology(baseInput());
    expect(p.cognitionTopologyComplexity).toBeGreaterThan(0);
    expect(p.observerChainDepth).toBeGreaterThan(0);
    expect(p.epistemicStabilityScore).toBeGreaterThan(0);
    expect(p.narrativeRealityCoupling).toBeGreaterThan(0);
    expect(p.governanceBeliefDrift).toBeGreaterThan(0);
    expect(p.semanticWorldModelVariance).toBeGreaterThan(0);
    expect(p.recursiveMeaningTopology).toBeGreaterThan(0);
    expect(p.observerPerspectiveFragmentation).toBeGreaterThan(0);
    expect(p.civilizationContextInstability).toBeGreaterThan(0);
    expect(p.topologyCollapseRisk).toBeGreaterThan(0);

    const dash = getRuntimeCivilizationTopologyDashboard();
    expect(dash?.cognitionTopologyGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.epistemicStabilityRadar.length).toBeGreaterThan(0);
    expect(dash?.observerChainMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.recursiveMeaningTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticCivilizationHeatmap.length).toBeGreaterThan(0);
    expect(dash?.governanceWorldviewLadder.length).toBeGreaterThan(0);
    expect(dash?.realityCouplingGraph.nodes.length).toBeGreaterThan(0);
  });

  it('records observe-only epistemic suggestions', () => {
    initRuntimeCivilizationTopology();
    observeRuntimeCivilizationTopology(baseInput());
    const dash = getRuntimeCivilizationTopologyDashboard();
    expect(dash?.topologyDriftSuggestions.every((s) => s.observeOnly)).toBe(true);
    expect(dash?.observerPerspectiveAlerts.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeCivilizationTopology();
    expect(shouldRunRuntimeCivilizationTopologySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeCivilizationTopologySample(baseInput())).toBe(false);
  });

  it('exports topology bundle sections', () => {
    initRuntimeCivilizationTopology();
    observeRuntimeCivilizationTopology(baseInput());
    const bundle = buildRuntimeCivilizationTopologyExportBundle();
    expect(bundle.cognitionTopologyReport).toBeTruthy();
    expect(bundle.epistemicStabilityAnalysis).toBeTruthy();
    expect(bundle.civilizationChainTopology).toBeTruthy();
    expect(bundle.observerFragmentationAnalysis).toBeTruthy();
    expect(bundle.semanticWorldModelReport).toBeTruthy();
    expect(bundle.governanceWorldviewAnalysis).toBeTruthy();
  });
});
