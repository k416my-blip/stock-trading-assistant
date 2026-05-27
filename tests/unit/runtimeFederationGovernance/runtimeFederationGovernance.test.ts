import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildRuntimeFederationExportBundle,
  getRuntimeFederationDashboard,
  initRuntimeFederation,
  observeRuntimeFederation,
  resetRuntimeFederationForTest,
  shouldRunRuntimeFederationSample,
} from '../../../src/runtimeFederationGovernance';

function baseInput() {
  return {
    stackCount: 12,
    layerCount: 24,
    metricCount: 160,
    duplicateMetricRatio: 0.48,
    semanticRedundancyRatio: 0.52,
    dashboardRowCount: 52,
    telemetrySampleCount: 120,
    replayChainCount: 36,
    observerDependencyCount: 24,
    observerDriftScore: 0.44,
    governanceLayerCount: 9,
    governanceStabilityScore: 0.58,
    topologyComplexity: 0.54,
    cognitionLoad: 0.56,
    telemetryEntropy: 0.5,
    metaRecursionDepth: 0.48,
    finiteObservationScore: 0.58,
    compressionRatio: 0.42,
  };
}

describe('runtimeFederationGovernance', () => {
  beforeEach(() => resetRuntimeFederationForTest());

  it('observes federation profile and dashboard', () => {
    initRuntimeFederation();
    const p = observeRuntimeFederation(baseInput());
    expect(p.stackFederationComplexity).toBeGreaterThan(0);
    expect(p.crossLayerCouplingRisk).toBeGreaterThan(0);
    expect(p.metricExplosionRisk).toBeGreaterThan(0);
    expect(p.dashboardSaturationPressure).toBeGreaterThan(0);
    expect(p.federationCompressionRatio).toBeGreaterThan(0);
    expect(p.observerFederationDrift).toBeGreaterThan(0);
    expect(p.governanceCoordinationStability).toBeGreaterThan(0);
    expect(p.recursiveLayerOverlap).toBeGreaterThan(0);
    expect(p.semanticMetricRedundancy).toBeGreaterThan(0);
    expect(p.federationIntegrityScore).toBeGreaterThan(0);

    const dash = getRuntimeFederationDashboard();
    expect(dash?.crossLayerCausalGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.federationSaturationRadar.length).toBeGreaterThan(0);
    expect(dash?.metricRedundancyHeatmap.length).toBeGreaterThan(0);
    expect(dash?.observerDependencyMatrix.length).toBeGreaterThan(0);
    expect(dash?.stackCompressionGauge.length).toBeGreaterThan(0);
    expect(dash?.federationStabilityTimeline.length).toBeGreaterThan(0);
  });

  it('records observe-only federation suggestions', () => {
    initRuntimeFederation();
    observeRuntimeFederation(baseInput());
    const dash = getRuntimeFederationDashboard();
    expect(dash?.suggestions.every((s) => s.observeOnly)).toBe(true);
    expect(dash?.suggestions.length).toBeGreaterThan(0);
  });

  it('throttles samples', () => {
    initRuntimeFederation();
    expect(shouldRunRuntimeFederationSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeFederationSample(baseInput())).toBe(false);
  });

  it('exports federation sections', () => {
    initRuntimeFederation();
    observeRuntimeFederation(baseInput());
    const bundle = buildRuntimeFederationExportBundle();
    expect(bundle.federationTopologyReport).toBeTruthy();
    expect(bundle.metricRedundancyAnalysis).toBeTruthy();
    expect(bundle.crossLayerCausalTrace).toBeTruthy();
    expect(bundle.observerDependencyReport).toBeTruthy();
    expect(bundle.dashboardSaturationAnalysis).toBeTruthy();
  });
});
