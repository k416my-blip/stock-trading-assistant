import type {
  RuntimeFiniteBoundaryExportBundle,
  RuntimeFiniteBoundaryObserveInput,
} from '../types/runtimeFiniteBoundary';
import { RUNTIME_FINITE_BOUNDARY_VERSION } from '../constants/runtimeFiniteBoundary';
import {
  getLastRuntimeFiniteBoundaryProfile,
  getRuntimeFiniteBoundarySuggestions,
} from './finiteBoundaryCoordinator';
import { getFiniteBoundaryTimeline } from './finiteBoundaryTimeline';
import { buildRuntimeFiniteBoundaryProfile } from './finiteBoundaryScorers';
import {
  buildFiniteBoundaryGraph,
  buildObservationBudgetGauge,
  buildObserverMassHeatmap,
  buildRecursionBudgetLadder,
  buildSemanticEntropyRadar,
} from './finiteBoundaryVisualizations';

const defaultInput = (): RuntimeFiniteBoundaryObserveInput => ({
  observerChainDepth: 4,
  monitoringLayerCount: 8,
  dashboardRowCount: 12,
  telemetrySampleCount: 18,
  metricCount: 36,
  uniqueSignalKinds: 10,
  duplicateSignalRatio: 0.12,
  semanticSignalCount: 32,
  semanticDivergence: 0.12,
  semanticMetricRedundancy: 0.12,
  replayCount: 8,
  replayAmplificationRisk: 0.12,
  governanceLayerCount: 4,
  governanceDrift: 0.1,
  topologyComplexity: 0.16,
  topologyCollapseRisk: 0.1,
  ontologyFragmentationIndex: 0.12,
  recursiveOntologyDepth: 0.1,
  symbolicReferenceCount: 34,
  groundedReferenceCount: 28,
  symbolicClosedLoopRisk: 0.08,
  semanticAnchorIntegrity: 0.82,
  runtimeRealityAnchorScore: 0.8,
  finiteObservationScore: 0.84,
  compressionRatio: 0.72,
});

export function buildRuntimeFiniteBoundaryExportBundle(): RuntimeFiniteBoundaryExportBundle {
  const profile = getLastRuntimeFiniteBoundaryProfile();
  const fallback = buildRuntimeFiniteBoundaryProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_FINITE_BOUNDARY_VERSION,
    exportedAt: new Date().toISOString(),
    observationBudgetReport: {
      profile,
      gauge: buildObservationBudgetGauge(exportProfile),
      timeline: getFiniteBoundaryTimeline(),
    },
    recursionBudgetAnalysis: {
      recursionBudgetUsage: profile?.recursionBudgetUsage,
      recursionTerminationProbability: profile?.recursionTerminationProbability,
      ladder: buildRecursionBudgetLadder(exportProfile),
    },
    semanticEntropyReport: {
      semanticEntropyBudget: profile?.semanticEntropyBudget,
      semanticEntropyContainment: profile?.semanticEntropyContainment,
      radar: buildSemanticEntropyRadar(exportProfile),
    },
    finiteBoundaryAnalysis: {
      runtimeFiniteBoundaryIndex: profile?.runtimeFiniteBoundaryIndex,
      graph: buildFiniteBoundaryGraph(exportProfile),
    },
    dashboardSaturationReport: {
      dashboardAttentionBudget: profile?.dashboardAttentionBudget,
      dashboardCognitiveCeiling: profile?.dashboardCognitiveCeiling,
      observerMassHeatmap: buildObserverMassHeatmap(exportProfile),
    },
    suggestions: getRuntimeFiniteBoundarySuggestions(),
    profile,
  };
}

export function formatRuntimeFiniteBoundaryExportJson(): string {
  return JSON.stringify(buildRuntimeFiniteBoundaryExportBundle(), null, 2);
}
