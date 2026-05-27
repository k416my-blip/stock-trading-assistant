import type {
  RuntimeCognitiveGovernanceExportBundle,
  RuntimeCognitiveGovernanceObserveInput,
} from '../types/runtimeCognitiveGovernance';
import { RUNTIME_COGNITIVE_GOVERNANCE_VERSION } from '../constants/runtimeCognitiveGovernance';
import {
  getLastRuntimeCognitiveGovernanceProfile,
  getRuntimeCognitiveGovernanceSuggestions,
} from './cognitiveGovernanceCoordinator';
import { getCognitiveGovernanceTimeline } from './cognitiveGovernanceTimeline';
import {
  buildAttentionFragmentationRadar,
  buildGovernanceAbstractionLadder,
  buildSemanticDensityGraph,
  buildSignalImportanceMap,
} from './cognitiveVisualizationBuilders';
import { buildCognitiveGovernanceProfile } from './cognitiveMetricScorers';

const defaultInput = (): RuntimeCognitiveGovernanceObserveInput => ({
  eventLoopLagMs: 80,
  renderFps: 24,
  sessionMinutes: 30,
  dashboardRowCount: 12,
  telemetrySampleCount: 20,
  replayCount: 4,
  timelineEventCount: 40,
  uniqueSignalKinds: 10,
  duplicateSignalRatio: 0.12,
  semanticSignalCount: 18,
  criticalSignalCount: 3,
  lowValueSignalCount: 4,
  narrativeNodeCount: 12,
  narrativeDuplicationRatio: 0.1,
  governanceLayerCount: 4,
  governanceConfidence: 0.82,
  observerOverheadRatio: 0.18,
  telemetryAmplificationScore: 0.14,
  compressionRatio: 0.72,
  contextWindowCount: 3,
  operatorInteractionLatencyMs: 300,
});

export function buildRuntimeCognitiveGovernanceExportBundle(): RuntimeCognitiveGovernanceExportBundle {
  const profile = getLastRuntimeCognitiveGovernanceProfile();
  const input = defaultInput();
  const defaultProfile = buildCognitiveGovernanceProfile(input);
  return {
    version: RUNTIME_COGNITIVE_GOVERNANCE_VERSION,
    exportedAt: new Date().toISOString(),
    cognitiveLoadReport: { profile, timeline: getCognitiveGovernanceTimeline() },
    semanticSignalTopology: {
      graph: buildSemanticDensityGraph(input, profile ?? defaultProfile),
      importance: buildSignalImportanceMap(input, profile ?? defaultProfile),
    },
    replayNarrativeAnalysis: {
      replayNarrativeComplexity: profile?.replayNarrativeComplexity,
      narrativeContinuity: profile?.narrativeContinuity,
      recursiveMeaningAmplification: profile?.recursiveMeaningAmplification,
    },
    governanceAbstractionAnalysis: {
      governanceAbstractionDepth: profile?.governanceAbstractionDepth,
      governanceDrift: profile?.governanceDrift,
      ladder: buildGovernanceAbstractionLadder(profile ?? defaultProfile),
    },
    operatorAttentionRiskAnalysis: {
      operatorDecisionLatencyRisk: profile?.operatorDecisionLatencyRisk,
      observerAttentionFragmentation: profile?.observerAttentionFragmentation,
      radar: buildAttentionFragmentationRadar(profile ?? defaultProfile),
    },
    suggestions: getRuntimeCognitiveGovernanceSuggestions(),
    profile,
  };
}

export function formatRuntimeCognitiveGovernanceExportJson(): string {
  return JSON.stringify(buildRuntimeCognitiveGovernanceExportBundle(), null, 2);
}
