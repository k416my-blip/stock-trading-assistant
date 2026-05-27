import type {
  RuntimeCivilizationTopologyExportBundle,
  RuntimeCivilizationTopologyObserveInput,
} from '../types/runtimeCivilizationTopology';
import { RUNTIME_CIVILIZATION_TOPOLOGY_VERSION } from '../constants/runtimeCivilizationTopology';
import {
  getLastRuntimeCivilizationTopologyProfile,
  getRuntimeCivilizationTopologySuggestions,
} from './civilizationTopologyCoordinator';
import { getCivilizationTopologyTimeline } from './civilizationTopologyTimeline';
import { buildCivilizationTopologyProfile } from './civilizationTopologyScorers';
import {
  buildCognitionTopologyGraph,
  buildEpistemicStabilityRadar,
  buildGovernanceWorldviewLadder,
  buildObserverChainMap,
  buildRealityCouplingGraph,
  buildSemanticCivilizationHeatmap,
} from './civilizationTopologyVisualizations';

const defaultInput = (): RuntimeCivilizationTopologyObserveInput => ({
  eventLoopLagMs: 80,
  renderFps: 24,
  sessionMinutes: 30,
  observerChainDepthEstimate: 5,
  governanceLayerCount: 4,
  governanceConfidence: 0.8,
  telemetryAmplificationScore: 0.12,
  replayCount: 5,
  narrativeNodeCount: 12,
  narrativeDuplicationRatio: 0.12,
  semanticSignalCount: 24,
  uniqueSignalKinds: 10,
  duplicateSignalRatio: 0.14,
  semanticDivergence: 0.12,
  narrativeContinuity: 0.82,
  governanceDrift: 0.1,
  observerContextDecay: 0.1,
  recursiveMeaningAmplification: 0.12,
  topologyFragmentationScore: 0.12,
  realityAnchorConfidence: 0.86,
});

export function buildRuntimeCivilizationTopologyExportBundle(): RuntimeCivilizationTopologyExportBundle {
  const profile = getLastRuntimeCivilizationTopologyProfile();
  const input = defaultInput();
  const fallback = buildCivilizationTopologyProfile(input);
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_CIVILIZATION_TOPOLOGY_VERSION,
    exportedAt: new Date().toISOString(),
    cognitionTopologyReport: {
      profile,
      graph: buildCognitionTopologyGraph(exportProfile),
      timeline: getCivilizationTopologyTimeline(),
    },
    epistemicStabilityAnalysis: {
      epistemicStabilityScore: profile?.epistemicStabilityScore,
      radar: buildEpistemicStabilityRadar(exportProfile),
    },
    civilizationChainTopology: {
      observerChain: buildObserverChainMap(exportProfile),
      heatmap: buildSemanticCivilizationHeatmap(input, exportProfile),
    },
    observerFragmentationAnalysis: {
      observerPerspectiveFragmentation: profile?.observerPerspectiveFragmentation,
      civilizationContextInstability: profile?.civilizationContextInstability,
    },
    semanticWorldModelReport: {
      semanticWorldModelVariance: profile?.semanticWorldModelVariance,
      realityCouplingGraph: buildRealityCouplingGraph(exportProfile),
    },
    governanceWorldviewAnalysis: {
      governanceBeliefDrift: profile?.governanceBeliefDrift,
      ladder: buildGovernanceWorldviewLadder(exportProfile),
    },
    suggestions: getRuntimeCivilizationTopologySuggestions(),
    profile,
  };
}

export function formatRuntimeCivilizationTopologyExportJson(): string {
  return JSON.stringify(buildRuntimeCivilizationTopologyExportBundle(), null, 2);
}
