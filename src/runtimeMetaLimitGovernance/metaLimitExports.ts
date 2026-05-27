import type {
  RuntimeMetaLimitExportBundle,
  RuntimeMetaLimitObserveInput,
} from '../types/runtimeMetaLimitGovernance';
import { RUNTIME_META_LIMIT_VERSION } from '../constants/runtimeMetaLimitGovernance';
import { getLastRuntimeMetaLimitProfile, getRuntimeMetaLimitSuggestions } from './metaLimitCoordinator';
import { getMetaLimitTimeline } from './metaLimitTimeline';
import { buildRuntimeMetaLimitProfile } from './metaLimitScorers';
import {
  buildBoundednessStabilityGauge,
  buildObserverDepthLadder,
  buildRecursionBoundaryGraph,
  buildSemanticInfinityRadar,
  buildTopologySelfReferenceMap,
} from './metaLimitVisualizations';

const defaultInput = (): RuntimeMetaLimitObserveInput => ({
  eventLoopLagMs: 80,
  renderFps: 24,
  sessionMinutes: 30,
  observerChainDepthEstimate: 5,
  observerContextDecay: 0.12,
  governanceLayerCount: 4,
  governanceDrift: 0.1,
  telemetryAmplificationScore: 0.12,
  replayCount: 5,
  narrativeNodeCount: 12,
  narrativeDuplicationRatio: 0.12,
  recursiveMeaningAmplification: 0.12,
  topologyFragmentationScore: 0.12,
  topologyCollapseRisk: 0.12,
  cognitionTopologyComplexity: 0.2,
  epistemicStabilityScore: 0.82,
  duplicateSignalRatio: 0.12,
  dashboardRowCount: 12,
  monitoringLayerCount: 4,
  semanticSelfReferenceScore: 0.1,
});

export function buildRuntimeMetaLimitExportBundle(): RuntimeMetaLimitExportBundle {
  const profile = getLastRuntimeMetaLimitProfile();
  const fallback = buildRuntimeMetaLimitProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_META_LIMIT_VERSION,
    exportedAt: new Date().toISOString(),
    recursiveBoundaryAnalysis: {
      profile,
      graph: buildRecursionBoundaryGraph(exportProfile),
      timeline: getMetaLimitTimeline(),
    },
    boundednessReport: {
      finiteObservationScore: profile?.finiteObservationScore,
      gauge: buildBoundednessStabilityGauge(exportProfile),
    },
    topologySelfReferenceAnalysis: {
      topologySelfReferenceScore: profile?.topologySelfReferenceScore,
      map: buildTopologySelfReferenceMap(exportProfile),
    },
    observerDepthReport: {
      observerOfObserverDepth: profile?.observerOfObserverDepth,
      ladder: buildObserverDepthLadder(exportProfile),
    },
    monitoringExpansionAnalysis: {
      monitoringChainExpansionRisk: profile?.monitoringChainExpansionRisk,
      semanticInfinityRadar: buildSemanticInfinityRadar(exportProfile),
    },
    suggestions: getRuntimeMetaLimitSuggestions(),
    profile,
  };
}

export function formatRuntimeMetaLimitExportJson(): string {
  return JSON.stringify(buildRuntimeMetaLimitExportBundle(), null, 2);
}
