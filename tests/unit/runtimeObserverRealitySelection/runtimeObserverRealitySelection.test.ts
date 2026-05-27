import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeObserverRealityExportBundle,
  getRuntimeObserverRealityDashboard,
  initRuntimeObserverReality,
  observeRuntimeObserverReality,
  resetRuntimeObserverRealityForTest,
  shouldRunRuntimeObserverRealitySample,
} from '../../../src/runtimeObserverRealitySelection';

function baseInput() {
  return {
    observerAttentionLoad: 0.72,
    runtimeObservationPressure: 0.7,
    recursiveTelemetryDensity: 0.72,
    dashboardAttentionStress: 0.7,
    semanticHotPathIntensity: 0.68,
    observerCognitiveQueueDepth: 0.7,
    metricObservationBurstRisk: 0.68,
    semanticMonitoringFatigue: 0.7,
    observationRoutingComplexity: 0.68,
    semanticPriorityRoutingPressure: 0.7,
    observerSignalCompetition: 0.7,
    recursiveAttentionCollision: 0.68,
    metricRoutingInstability: 0.66,
    crossLayerObservationCongestion: 0.68,
    semanticQueueFragmentation: 0.7,
    observerFocusDrift: 0.68,
    telemetryFloodRisk: 0.7,
    recursiveReplayPressure: 0.68,
    dashboardSignalOverflow: 0.7,
    semanticBandwidthExhaustion: 0.68,
    observerInterpretationBacklog: 0.7,
    ontologyMonitoringCongestion: 0.68,
    runtimeSignalJitter: 0.66,
    recursiveNoiseAmplification: 0.7,
    semanticLoadSheddingPressure: 0.68,
    metricRetentionStress: 0.66,
    observerDiscardConflict: 0.68,
    semanticPriorityCollapse: 0.7,
    recursiveSignalSuppressionRisk: 0.68,
    dashboardCompressionPressure: 0.66,
    semanticSignalDecayRisk: 0.68,
    runtimeAttentionExhaustion: 0.7,
    semanticPhaseVolatility: 0.7,
    meaningPhaseInstability: 0.68,
    ontologyStateShiftRisk: 0.66,
    observerPhaseLockRisk: 0.68,
    semanticStateCollapseRisk: 0.66,
    observerStateSynchronizationRisk: 0.68,
    semanticFluidityIndex: 0.34,
    ontologyCollectiveDrift: 0.66,
  };
}

describe('runtimeObserverRealitySelection', () => {
  beforeEach(() => resetRuntimeObserverRealityForTest());

  it('observes observer reality profile and dashboard', () => {
    initRuntimeObserverReality();
    const p = observeRuntimeObserverReality(baseInput());
    expect(p.observerRealitySelectionPressure).toBeGreaterThan(0);
    expect(p.semanticRealityPreference).toBeGreaterThan(0);
    expect(p.semanticCausalityDrift).toBeGreaterThan(0);
    expect(p.recursiveInterpretationBranching).toBeGreaterThan(0);
    expect(p.narrativeRealityCouplingStress).toBeGreaterThan(0);
    expect(p.observerRealityFixationRisk).toBeGreaterThan(0);

    const dash = getRuntimeObserverRealityDashboard();
    expect(dash?.realitySelectionTopology.nodes.length).toBeGreaterThan(0);
    expect(dash?.semanticCausalityGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.recursiveInterpretationTree.nodes.length).toBeGreaterThan(0);
    expect(dash?.worldviewDivergenceRadar.length).toBeGreaterThan(0);
    expect(dash?.narrativeRealityCouplingHeatmap.length).toBeGreaterThan(0);
    expect(dash?.observerFixationMonitor.length).toBeGreaterThan(0);
    expect(dash?.semanticBranchingTimeline.length).toBeGreaterThan(0);
    expect(dash?.causalityDriftTopology.nodes.length).toBeGreaterThan(0);
  });

  it('records observe-only suggestions', () => {
    initRuntimeObserverReality();
    observeRuntimeObserverReality(baseInput());
    const dash = getRuntimeObserverRealityDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeObserverReality();
    expect(shouldRunRuntimeObserverRealitySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeObserverRealitySample(baseInput())).toBe(false);
  });

  it('exports observer reality sections', () => {
    initRuntimeObserverReality();
    observeRuntimeObserverReality(baseInput());
    const bundle = buildRuntimeObserverRealityExportBundle();
    expect(bundle.observerRealityAnalysis).toBeTruthy();
    expect(bundle.semanticCausalityDriftReport).toBeTruthy();
    expect(bundle.recursiveInterpretationReport).toBeTruthy();
    expect(bundle.worldviewDivergenceAnalysis).toBeTruthy();
    expect(bundle.narrativeRealityCouplingReport).toBeTruthy();
    expect(bundle.observerFixationAnalysis).toBeTruthy();
  });
});
