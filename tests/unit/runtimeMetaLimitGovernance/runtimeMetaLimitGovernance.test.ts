import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeMetaLimitExportBundle,
  getRuntimeMetaLimitDashboard,
  initRuntimeMetaLimit,
  observeRuntimeMetaLimit,
  resetRuntimeMetaLimitForTest,
  shouldRunRuntimeMetaLimitSample,
} from '../../../src/runtimeMetaLimitGovernance';

function baseInput() {
  return {
    eventLoopLagMs: 260,
    renderFps: 12,
    sessionMinutes: 160,
    observerChainDepthEstimate: 11,
    observerContextDecay: 0.52,
    governanceLayerCount: 8,
    governanceDrift: 0.48,
    telemetryAmplificationScore: 0.5,
    replayCount: 72,
    narrativeNodeCount: 70,
    narrativeDuplicationRatio: 0.54,
    recursiveMeaningAmplification: 0.56,
    topologyFragmentationScore: 0.58,
    topologyCollapseRisk: 0.52,
    cognitionTopologyComplexity: 0.62,
    epistemicStabilityScore: 0.56,
    duplicateSignalRatio: 0.55,
    dashboardRowCount: 48,
    monitoringLayerCount: 10,
    semanticSelfReferenceScore: 0.58,
  };
}

describe('runtimeMetaLimitGovernance', () => {
  beforeEach(() => resetRuntimeMetaLimitForTest());

  it('observes recursive boundary profile and dashboard', () => {
    initRuntimeMetaLimit();
    const p = observeRuntimeMetaLimit(baseInput());
    expect(p.metaRecursionDepth).toBeGreaterThan(0);
    expect(p.observerOfObserverDepth).toBeGreaterThan(0);
    expect(p.monitoringChainExpansionRisk).toBeGreaterThan(0);
    expect(p.semanticInfiniteLoopRisk).toBeGreaterThan(0);
    expect(p.governanceMetaCascadeRisk).toBeGreaterThan(0);
    expect(p.topologySelfReferenceScore).toBeGreaterThan(0);
    expect(p.recursionBoundaryStability).toBeGreaterThan(0);
    expect(p.epistemicBoundaryIntegrity).toBeGreaterThan(0);
    expect(p.observerTerminationConfidence).toBeGreaterThan(0);
    expect(p.finiteObservationScore).toBeGreaterThan(0);

    const dash = getRuntimeMetaLimitDashboard();
    expect(dash?.recursionBoundaryGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerDepthLadder.length).toBeGreaterThan(0);
    expect(dash?.monitoringExpansionTimeline.length).toBeGreaterThan(0);
    expect(dash?.semanticInfinityRadar.length).toBeGreaterThan(0);
    expect(dash?.topologySelfReferenceMap.nodes.length).toBeGreaterThan(0);
    expect(dash?.boundednessStabilityGauge.length).toBeGreaterThan(0);
  });

  it('records observe-only boundedness suggestions', () => {
    initRuntimeMetaLimit();
    observeRuntimeMetaLimit(baseInput());
    const dash = getRuntimeMetaLimitDashboard();
    expect(dash?.monitoringExpansionWarnings.every((s) => s.observeOnly)).toBe(true);
    expect(dash?.semanticInfinityAlerts.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeMetaLimit();
    expect(shouldRunRuntimeMetaLimitSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeMetaLimitSample(baseInput())).toBe(false);
  });

  it('exports recursive boundary sections', () => {
    initRuntimeMetaLimit();
    observeRuntimeMetaLimit(baseInput());
    const bundle = buildRuntimeMetaLimitExportBundle();
    expect(bundle.recursiveBoundaryAnalysis).toBeTruthy();
    expect(bundle.boundednessReport).toBeTruthy();
    expect(bundle.topologySelfReferenceAnalysis).toBeTruthy();
    expect(bundle.observerDepthReport).toBeTruthy();
    expect(bundle.monitoringExpansionAnalysis).toBeTruthy();
  });
});
