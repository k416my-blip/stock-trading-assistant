import type {
  RuntimeSemanticCompressionExportBundle,
  RuntimeSemanticCompressionObserveInput,
} from '../types/runtimeSemanticCompression';
import { RUNTIME_SEMANTIC_COMPRESSION_VERSION } from '../constants/runtimeSemanticCompression';
import {
  getLastRuntimeSemanticCompressionProfile,
  getRuntimeSemanticCompressionSuggestions,
} from './semanticCompressionCoordinator';
import { getSemanticCompressionTimeline } from './semanticCompressionTimeline';
import { buildRuntimeSemanticCompressionProfile } from './semanticCompressionScorers';
import {
  buildCanonicalMetricGraph,
  buildMetricFamilyTopology,
  buildObserverDependencyGraph,
  buildSemanticOverlapHeatmap,
  buildSemanticRedundancyRadar,
} from './semanticCompressionVisualizations';

const defaultInput = (): RuntimeSemanticCompressionObserveInput => ({
  metricCount: 42,
  canonicalMetricCount: 24,
  semanticClusterCount: 8,
  aliasPairCount: 10,
  crossLayerMetricCount: 18,
  duplicateMetricRatio: 0.16,
  semanticRedundancyRatio: 0.14,
  semanticDivergence: 0.12,
  namingDriftScore: 0.1,
  dashboardRowCount: 12,
  panelCount: 5,
  visualizationCount: 8,
  operatorInteractionLatencyMs: 420,
  observerDependencyCount: 12,
  observerLoopCount: 1,
  metricReferenceCycleCount: 1,
  observerChainDepth: 5,
  recursiveMeaningScore: 0.12,
  ontologyFragmentationIndex: 0.1,
  ontologyCompressionStress: 0.14,
  symbolicClosedLoopRisk: 0.08,
  runtimeFiniteBoundaryIndex: 0.78,
  boundednessConfidence: 0.8,
  semanticEntropyBudget: 0.16,
  metricContainmentRatio: 0.76,
  compressionRatio: 0.72,
});

export function buildRuntimeSemanticCompressionExportBundle(): RuntimeSemanticCompressionExportBundle {
  const profile = getLastRuntimeSemanticCompressionProfile();
  const input = defaultInput();
  const fallback = buildRuntimeSemanticCompressionProfile(input);
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_SEMANTIC_COMPRESSION_VERSION,
    exportedAt: new Date().toISOString(),
    semanticOverlapReport: {
      profile,
      heatmap: buildSemanticOverlapHeatmap(input, exportProfile),
      timeline: getSemanticCompressionTimeline(),
    },
    canonicalizationAnalysis: {
      pressure: profile?.metricCanonicalizationPressure,
      confidence: profile?.canonicalMetricConfidence,
      graph: buildCanonicalMetricGraph(exportProfile),
    },
    metricRedundancyReport: {
      duplicateMeaningDensity: profile?.duplicateMeaningDensity,
      radar: buildSemanticRedundancyRadar(exportProfile),
      topology: buildMetricFamilyTopology(exportProfile),
    },
    observerDependencyReport: {
      loopRisk: profile?.observerDependencyLoopRisk,
      graph: buildObserverDependencyGraph(exportProfile),
    },
    dashboardSemanticSaturationAnalysis: {
      crowding: profile?.dashboardSemanticCrowding,
      fatigue: profile?.operatorSemanticFatigue,
      visualizationAliasRisk: profile?.visualizationAliasRisk,
    },
    suggestions: getRuntimeSemanticCompressionSuggestions(),
    profile,
  };
}

export function formatRuntimeSemanticCompressionExportJson(): string {
  return JSON.stringify(buildRuntimeSemanticCompressionExportBundle(), null, 2);
}
