import type {
  RuntimeOntologyExportBundle,
  RuntimeOntologyObserveInput,
} from '../types/runtimeOntologyStabilization';
import { RUNTIME_ONTOLOGY_VERSION } from '../constants/runtimeOntologyStabilization';
import { getLastRuntimeOntologyProfile, getRuntimeOntologyWarnings } from './ontologyCoordinator';
import { getOntologyTimeline } from './ontologyTimeline';
import { buildRuntimeOntologyProfile } from './ontologyScorers';
import {
  buildOntologyStabilityRadar,
  buildObserverReferenceTopology,
  buildRealityAnchorGraph,
  buildSemanticGroundingGraph,
  buildSemanticGroundingHeatmap,
  buildSymbolicDriftTimeline,
} from './ontologyVisualizations';

const defaultInput = (): RuntimeOntologyObserveInput => ({
  topologyComplexity: 0.2,
  cognitionLoad: 0.18,
  semanticDivergence: 0.12,
  narrativeContinuity: 0.84,
  realityAnchorConfidence: 0.86,
  epistemicStabilityScore: 0.82,
  governanceDrift: 0.1,
  observerContextDecay: 0.12,
  recursiveMeaningAmplification: 0.12,
  topologyCollapseRisk: 0.12,
  finiteObservationScore: 0.84,
  federationIntegrityScore: 0.82,
  semanticMetricRedundancy: 0.14,
  compressionRatio: 0.72,
  duplicateSignalRatio: 0.12,
  replayCount: 5,
  narrativeNodeCount: 12,
  symbolicReferenceCount: 24,
  groundedReferenceCount: 20,
  observerReferenceDepth: 4,
  semanticSelfReferenceScore: 0.1,
});

export function buildRuntimeOntologyExportBundle(): RuntimeOntologyExportBundle {
  const profile = getLastRuntimeOntologyProfile();
  const input = defaultInput();
  const fallback = buildRuntimeOntologyProfile(input);
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_ONTOLOGY_VERSION,
    exportedAt: new Date().toISOString(),
    ontologyStabilityReport: {
      profile,
      radar: buildOntologyStabilityRadar(exportProfile),
      timeline: getOntologyTimeline(),
    },
    semanticGroundingAnalysis: {
      semanticGroundingStrength: profile?.semanticGroundingStrength,
      heatmap: buildSemanticGroundingHeatmap(input, exportProfile),
      graph: buildSemanticGroundingGraph(exportProfile),
    },
    realityAnchorTopology: {
      runtimeRealityAnchorScore: profile?.runtimeRealityAnchorScore,
      graph: buildRealityAnchorGraph(exportProfile),
    },
    observerReferenceReport: {
      observerGeneratedRealityRisk: profile?.observerGeneratedRealityRisk,
      topology: buildObserverReferenceTopology(exportProfile),
    },
    symbolicDriftAnalysis: {
      symbolicReferenceInstability: profile?.symbolicReferenceInstability,
      timeline: buildSymbolicDriftTimeline(exportProfile, []),
    },
    warnings: getRuntimeOntologyWarnings(),
    profile,
  };
}

export function formatRuntimeOntologyExportJson(): string {
  return JSON.stringify(buildRuntimeOntologyExportBundle(), null, 2);
}
