import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeCognitiveGovernanceExportBundle,
  getRuntimeCognitiveGovernanceDashboard,
  initRuntimeCognitiveGovernance,
  observeRuntimeCognitiveGovernance,
  resetRuntimeCognitiveGovernanceForTest,
  shouldRunRuntimeCognitiveGovernanceSample,
} from '../../../src/runtimeCognitiveGovernance';

function baseInput() {
  return {
    eventLoopLagMs: 220,
    renderFps: 12,
    sessionMinutes: 160,
    dashboardRowCount: 42,
    telemetrySampleCount: 110,
    replayCount: 56,
    timelineEventCount: 360,
    uniqueSignalKinds: 12,
    duplicateSignalRatio: 0.52,
    semanticSignalCount: 48,
    criticalSignalCount: 3,
    lowValueSignalCount: 22,
    narrativeNodeCount: 64,
    narrativeDuplicationRatio: 0.48,
    governanceLayerCount: 8,
    governanceConfidence: 0.62,
    observerOverheadRatio: 0.58,
    telemetryAmplificationScore: 0.5,
    compressionRatio: 0.36,
    contextWindowCount: 9,
    operatorInteractionLatencyMs: 1800,
  };
}

describe('runtimeCognitiveGovernance', () => {
  beforeEach(() => resetRuntimeCognitiveGovernanceForTest());

  it('observes cognitive profile and dashboard visualizations', () => {
    initRuntimeCognitiveGovernance();
    const p = observeRuntimeCognitiveGovernance(baseInput());
    expect(p.dashboardCognitiveLoad).toBeGreaterThan(0);
    expect(p.semanticNoiseRatio).toBeGreaterThan(0);
    expect(p.signalPriorityDrift).toBeGreaterThan(0);
    expect(p.observerAttentionFragmentation).toBeGreaterThan(0);
    expect(p.replayNarrativeComplexity).toBeGreaterThan(0);
    expect(p.governanceAbstractionDepth).toBeGreaterThan(0);
    expect(p.metricInterpretationDifficulty).toBeGreaterThan(0);
    expect(p.timelineContextLossRisk).toBeGreaterThan(0);
    expect(p.operatorDecisionLatencyRisk).toBeGreaterThan(0);
    expect(p.narrativeContinuity).toBeGreaterThan(0);
    expect(p.semanticDivergence).toBeGreaterThan(0);
    expect(p.governanceDrift).toBeGreaterThan(0);
    expect(p.observerContextDecay).toBeGreaterThan(0);
    expect(p.recursiveMeaningAmplification).toBeGreaterThan(0);

    const dash = getRuntimeCognitiveGovernanceDashboard();
    expect(dash?.cognitiveHeatmap.length).toBeGreaterThan(0);
    expect(dash?.semanticDensityGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.attentionFragmentationRadar.length).toBe(4);
    expect(dash?.replayComplexityTimeline.length).toBeGreaterThan(0);
    expect(dash?.governanceAbstractionLadder.length).toBeGreaterThan(0);
    expect(dash?.signalImportanceMap.length).toBeGreaterThan(0);
  });

  it('records observe-only semantic suggestions', () => {
    initRuntimeCognitiveGovernance();
    observeRuntimeCognitiveGovernance(baseInput());
    const dash = getRuntimeCognitiveGovernanceDashboard();
    expect(dash?.lowValueSignalSuggestions.every((s) => s.observeOnly)).toBe(true);
    expect(dash?.dashboardSimplificationSuggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeCognitiveGovernance();
    expect(shouldRunRuntimeCognitiveGovernanceSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeCognitiveGovernanceSample(baseInput())).toBe(false);
  });

  it('exports cognitive governance bundle', () => {
    initRuntimeCognitiveGovernance();
    observeRuntimeCognitiveGovernance(baseInput());
    const bundle = buildRuntimeCognitiveGovernanceExportBundle();
    expect(bundle.cognitiveLoadReport).toBeTruthy();
    expect(bundle.semanticSignalTopology).toBeTruthy();
    expect(bundle.replayNarrativeAnalysis).toBeTruthy();
    expect(bundle.governanceAbstractionAnalysis).toBeTruthy();
    expect(bundle.operatorAttentionRiskAnalysis).toBeTruthy();
  });
});
