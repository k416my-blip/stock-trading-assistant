import type {
  RuntimeSemanticGravityExportBundle,
  RuntimeSemanticGravityObserveInput,
} from '../types/runtimeSemanticGravity';
import { RUNTIME_SEMANTIC_GRAVITY_VERSION } from '../constants/runtimeSemanticGravity';
import {
  getLastRuntimeSemanticGravityProfile,
  getRuntimeSemanticGravityWarnings,
} from './semanticGravityCoordinator';
import { getSemanticGravityTimeline } from './semanticGravityTimeline';
import { buildRuntimeSemanticGravityProfile } from './semanticGravityScorers';
import {
  buildAnchorDivergenceTopology,
  buildCanonicalAttractionHeatmap,
  buildObserverBeliefClusteringMap,
  buildOntologyCentralizationRadar,
  buildSemanticGravityFieldMap,
  buildSemanticPluralityGraph,
} from './semanticGravityVisualizations';

const defaultInput = (): RuntimeSemanticGravityObserveInput => ({
  metricCount: 42,
  canonicalMetricCount: 18,
  semanticAliasClusterCount: 8,
  metricCanonicalizationPressure: 0.14,
  crossLayerSemanticOverlap: 0.16,
  duplicateMeaningDensity: 0.14,
  canonicalMetricConfidence: 0.62,
  semanticCompressionPotential: 0.22,
  observerAliasRisk: 0.12,
  semanticNamingDrift: 0.1,
  ontologyCompressionRatio: 0.68,
  metricVocabularyEntropy: 0.18,
  semanticClusterIntegrity: 0.74,
  crossLayerMeaningCollapse: 0.12,
  metricIdentityInstability: 0.1,
  canonicalOntologyStress: 0.14,
  observerDependencyLoopRisk: 0.08,
  metricReferenceCycleDepth: 0.08,
  semanticMutualReferenceRisk: 0.08,
  recursiveMeaningDependency: 0.1,
  canonicalizationDeadlockRisk: 0.08,
  runtimeRealityAnchorScore: 0.8,
  semanticAnchorIntegrity: 0.78,
  ontologyFragmentationIndex: 0.12,
  recursiveOntologyDepth: 0.1,
  symbolicClosedLoopRisk: 0.08,
  narrativeRealityDistance: 0.14,
  observerContextDecay: 0.12,
  narrativeContinuity: 0.82,
  governanceDrift: 0.12,
  topologyComplexity: 0.16,
  topologyCollapseRisk: 0.1,
  observerChainDepth: 4,
  boundednessConfidence: 0.78,
  runtimeFiniteBoundaryIndex: 0.76,
  semanticEntropyBudget: 0.18,
  metricContainmentRatio: 0.72,
});

export function buildRuntimeSemanticGravityExportBundle(): RuntimeSemanticGravityExportBundle {
  const profile = getLastRuntimeSemanticGravityProfile();
  const fallback = buildRuntimeSemanticGravityProfile(defaultInput());
  const exportProfile = profile ?? fallback;
  return {
    version: RUNTIME_SEMANTIC_GRAVITY_VERSION,
    exportedAt: new Date().toISOString(),
    semanticGravityReport: {
      profile,
      fieldMap: buildSemanticGravityFieldMap(exportProfile),
      timeline: getSemanticGravityTimeline(),
    },
    ontologyCentralizationAnalysis: {
      radar: buildOntologyCentralizationRadar(exportProfile),
      canonicalTruthPressure: profile?.canonicalTruthPressure,
    },
    anchorDivergenceAnalysis: {
      topology: buildAnchorDivergenceTopology(exportProfile),
      semanticAnchorDivergence: profile?.semanticAnchorDivergence,
    },
    semanticPluralityReport: {
      graph: buildSemanticPluralityGraph(exportProfile),
      semanticEquilibriumScore: profile?.semanticEquilibriumScore,
    },
    canonicalizationPressureTopology: {
      heatmap: buildCanonicalAttractionHeatmap(exportProfile),
      semanticSingularityRisk: profile?.semanticSingularityRisk,
    },
    observerWorldviewClusteringReport: {
      graph: buildObserverBeliefClusteringMap(exportProfile),
      observerDoctrineFormation: profile?.observerDoctrineFormation,
    },
    warnings: getRuntimeSemanticGravityWarnings(),
    profile,
  };
}

export function formatRuntimeSemanticGravityExportJson(): string {
  return JSON.stringify(buildRuntimeSemanticGravityExportBundle(), null, 2);
}
