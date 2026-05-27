import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeFiniteBoundaryExportBundle,
  getRuntimeFiniteBoundaryDashboard,
  initRuntimeFiniteBoundary,
  observeRuntimeFiniteBoundary,
  resetRuntimeFiniteBoundaryForTest,
  shouldRunRuntimeFiniteBoundarySample,
} from '../../../src/runtimeFiniteBoundary';

function baseInput() {
  return {
    observerChainDepth: 12,
    monitoringLayerCount: 18,
    dashboardRowCount: 44,
    telemetrySampleCount: 120,
    metricCount: 132,
    uniqueSignalKinds: 8,
    duplicateSignalRatio: 0.58,
    semanticSignalCount: 96,
    semanticDivergence: 0.56,
    semanticMetricRedundancy: 0.54,
    replayCount: 92,
    replayAmplificationRisk: 0.6,
    governanceLayerCount: 10,
    governanceDrift: 0.52,
    topologyComplexity: 0.58,
    topologyCollapseRisk: 0.54,
    ontologyFragmentationIndex: 0.56,
    recursiveOntologyDepth: 0.58,
    symbolicReferenceCount: 112,
    groundedReferenceCount: 42,
    symbolicClosedLoopRisk: 0.56,
    semanticAnchorIntegrity: 0.48,
    runtimeRealityAnchorScore: 0.52,
    finiteObservationScore: 0.5,
    compressionRatio: 0.36,
  };
}

describe('runtimeFiniteBoundary', () => {
  beforeEach(() => resetRuntimeFiniteBoundaryForTest());

  it('observes finite boundary profile and dashboard', () => {
    initRuntimeFiniteBoundary();
    const p = observeRuntimeFiniteBoundary(baseInput());
    expect(p.observerBudgetConsumption).toBeGreaterThan(0);
    expect(p.semanticEntropyBudget).toBeGreaterThan(0);
    expect(p.recursionBudgetUsage).toBeGreaterThan(0);
    expect(p.dashboardAttentionBudget).toBeGreaterThan(0);
    expect(p.ontologyComplexityBudget).toBeGreaterThan(0);
    expect(p.replayAmplificationBudget).toBeGreaterThan(0);
    expect(p.governanceExpansionBudget).toBeGreaterThan(0);
    expect(p.symbolicDensityBudget).toBeGreaterThan(0);
    expect(p.telemetryNoiseBudget).toBeGreaterThan(0);
    expect(p.civilizationStackMassIndex).toBeGreaterThan(0);
    expect(p.finiteObservationScore).toBeGreaterThan(0);
    expect(p.boundednessConfidence).toBeGreaterThan(0);
    expect(p.recursionTerminationProbability).toBeGreaterThan(0);
    expect(p.observerClosureIntegrity).toBeGreaterThan(0);
    expect(p.semanticCollapseThreshold).toBeGreaterThan(0);
    expect(p.dashboardCognitiveCeiling).toBeGreaterThan(0);
    expect(p.runtimeFiniteBoundaryIndex).toBeGreaterThan(0);
    expect(p.semanticEntropyContainment).toBeGreaterThan(0);
    expect(p.metricContainmentRatio).toBeGreaterThan(0);
    expect(p.observerCascadeContainment).toBeGreaterThan(0);
    expect(p.replayContainmentIntegrity).toBeGreaterThan(0);
    expect(p.topologyContainmentStress).toBeGreaterThan(0);

    const dash = getRuntimeFiniteBoundaryDashboard();
    expect(dash?.observationBudgetGauge.length).toBeGreaterThan(0);
    expect(dash?.recursionBudgetLadder.length).toBeGreaterThan(0);
    expect(dash?.semanticEntropyRadar.length).toBeGreaterThan(0);
    expect(dash?.finiteBoundaryGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.observerMassHeatmap.length).toBeGreaterThan(0);
    expect(dash?.civilizationStackPressureTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only stopping analysis suggestions', () => {
    initRuntimeFiniteBoundary();
    observeRuntimeFiniteBoundary(baseInput());
    const dash = getRuntimeFiniteBoundaryDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
  });

  it('throttles samples', () => {
    initRuntimeFiniteBoundary();
    expect(shouldRunRuntimeFiniteBoundarySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeFiniteBoundarySample(baseInput())).toBe(false);
  });

  it('exports finite boundary sections', () => {
    initRuntimeFiniteBoundary();
    observeRuntimeFiniteBoundary(baseInput());
    const bundle = buildRuntimeFiniteBoundaryExportBundle();
    expect(bundle.observationBudgetReport).toBeTruthy();
    expect(bundle.recursionBudgetAnalysis).toBeTruthy();
    expect(bundle.semanticEntropyReport).toBeTruthy();
    expect(bundle.finiteBoundaryAnalysis).toBeTruthy();
    expect(bundle.dashboardSaturationReport).toBeTruthy();
  });
});
