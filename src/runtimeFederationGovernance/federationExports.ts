import type {
  RuntimeFederationExportBundle,
  RuntimeFederationObserveInput,
} from '../types/runtimeFederationGovernance';
import { RUNTIME_FEDERATION_VERSION } from '../constants/runtimeFederationGovernance';
import { getLastRuntimeFederationProfile, getRuntimeFederationSuggestions } from './federationCoordinator';
import { getFederationTimeline } from './federationTimeline';
import { buildRuntimeFederationProfile } from './federationScorers';
import {
  buildCrossLayerCausalGraph,
  buildFederationSaturationRadar,
  buildMetricRedundancyHeatmap,
  buildObserverDependencyMatrix,
  buildStackFederationMap,
} from './federationVisualizations';

const defaultInput = (): RuntimeFederationObserveInput => ({
  stackCount: 6,
  layerCount: 12,
  metricCount: 48,
  duplicateMetricRatio: 0.12,
  semanticRedundancyRatio: 0.14,
  dashboardRowCount: 12,
  telemetrySampleCount: 20,
  replayChainCount: 4,
  observerDependencyCount: 8,
  observerDriftScore: 0.1,
  governanceLayerCount: 4,
  governanceStabilityScore: 0.82,
  topologyComplexity: 0.18,
  cognitionLoad: 0.2,
  telemetryEntropy: 0.16,
  metaRecursionDepth: 0.12,
  finiteObservationScore: 0.84,
  compressionRatio: 0.72,
});

export function buildRuntimeFederationExportBundle(): RuntimeFederationExportBundle {
  const profile = getLastRuntimeFederationProfile();
  const input = defaultInput();
  const fallback = buildRuntimeFederationProfile(input);
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_FEDERATION_VERSION,
    exportedAt: new Date().toISOString(),
    federationTopologyReport: {
      profile,
      map: buildStackFederationMap(exportProfile),
      timeline: getFederationTimeline(),
    },
    metricRedundancyAnalysis: {
      semanticMetricRedundancy: profile?.semanticMetricRedundancy,
      heatmap: buildMetricRedundancyHeatmap(input, exportProfile),
    },
    crossLayerCausalTrace: {
      graph: buildCrossLayerCausalGraph(exportProfile),
      flows: getFederationTimeline(),
    },
    observerDependencyReport: {
      observerFederationDrift: profile?.observerFederationDrift,
      matrix: buildObserverDependencyMatrix(input, exportProfile),
    },
    dashboardSaturationAnalysis: {
      dashboardSaturationPressure: profile?.dashboardSaturationPressure,
      radar: buildFederationSaturationRadar(exportProfile),
    },
    suggestions: getRuntimeFederationSuggestions(),
    profile,
  };
}

export function formatRuntimeFederationExportJson(): string {
  return JSON.stringify(buildRuntimeFederationExportBundle(), null, 2);
}
