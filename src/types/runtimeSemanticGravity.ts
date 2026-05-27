export type SemanticGravityFlow =
  | 'semantic_gravity'
  | 'anchor_divergence'
  | 'ontology_centralization'
  | 'semantic_religionization'
  | 'semantic_equilibrium'
  | 'observer_belief_clustering'
  | 'plurality_retention';

export type SemanticGravityWarningKind =
  | 'semantic_singularity'
  | 'canonical_truth_pressure'
  | 'anchor_divergence'
  | 'semantic_monoculture'
  | 'observer_doctrine';

export type SemanticGravityWarning = {
  at: string;
  kind: SemanticGravityWarningKind;
  target: string;
  warningJa: string;
  observeOnly: true;
};

export type SemanticGravityGraphNode = { id: string; label: string; gravity: number };
export type SemanticGravityGraphEdge = { from: string; to: string; divergence: number };

export type SemanticGravityGraph = {
  nodes: SemanticGravityGraphNode[];
  edges: SemanticGravityGraphEdge[];
  measuredAt: string;
};

export type RuntimeSemanticGravityTimelineEntry = {
  at: string;
  flow: SemanticGravityFlow;
  detailJa: string;
};

export type RuntimeSemanticGravityProfile = {
  semanticGravityMass: number;
  canonicalGravityCenter: number;
  ontologyDensityPressure: number;
  semanticCollapsePotential: number;
  metricMeaningMass: number;
  semanticSingularityRisk: number;
  canonicalCenterAttraction: number;
  ontologyOverCentralizationRisk: number;
  semanticAnchorDivergence: number;
  observerAnchorVariance: number;
  narrativeAnchorDrift: number;
  worldviewAnchorFragmentation: number;
  recursiveAnchorInstability: number;
  semanticOrbitInstability: number;
  anchorCouplingStress: number;
  anchorIsolationRisk: number;
  canonicalTruthPressure: number;
  semanticHierarchyRigidity: number;
  ontologyAuthorityConcentration: number;
  semanticMonocultureRisk: number;
  metricBeliefConvergence: number;
  observerConsensusGravity: number;
  topologyCentralizationStress: number;
  canonicalDogmatizationRisk: number;
  semanticFaithLoopRisk: number;
  recursiveTruthAmplification: number;
  observerDoctrineFormation: number;
  metricSacralizationRisk: number;
  semanticOrthodoxyPressure: number;
  semanticEquilibriumScore: number;
  ontologyPluralityIntegrity: number;
  metricMeaningDistribution: number;
  semanticDiversityRetention: number;
  observerPerspectiveBalance: number;
  narrativeEntropyBalance: number;
  semanticTensionStability: number;
  measuredAt: string;
};

export type RuntimeSemanticGravityDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSemanticGravityProfile;
  semanticGravityFieldMap: SemanticGravityGraph;
  anchorDivergenceTopology: SemanticGravityGraph;
  ontologyCentralizationRadar: { axis: string; value: number }[];
  canonicalAttractionHeatmap: { layer: string; attraction: number }[];
  semanticPluralityGraph: SemanticGravityGraph;
  observerBeliefClusteringMap: SemanticGravityGraph;
  semanticEquilibriumTimeline: { at: string; equilibrium: number }[];
  warnings: SemanticGravityWarning[];
  timelineRecent: RuntimeSemanticGravityTimelineEntry[];
};

export type RuntimeSemanticGravityObserveInput = {
  metricCount: number;
  canonicalMetricCount: number;
  semanticAliasClusterCount: number;
  metricCanonicalizationPressure: number;
  crossLayerSemanticOverlap: number;
  duplicateMeaningDensity: number;
  canonicalMetricConfidence: number;
  semanticCompressionPotential: number;
  observerAliasRisk: number;
  semanticNamingDrift: number;
  ontologyCompressionRatio: number;
  metricVocabularyEntropy: number;
  semanticClusterIntegrity: number;
  crossLayerMeaningCollapse: number;
  metricIdentityInstability: number;
  canonicalOntologyStress: number;
  observerDependencyLoopRisk: number;
  metricReferenceCycleDepth: number;
  semanticMutualReferenceRisk: number;
  recursiveMeaningDependency: number;
  canonicalizationDeadlockRisk: number;
  runtimeRealityAnchorScore: number;
  semanticAnchorIntegrity: number;
  ontologyFragmentationIndex: number;
  recursiveOntologyDepth: number;
  symbolicClosedLoopRisk: number;
  narrativeRealityDistance: number;
  observerContextDecay: number;
  narrativeContinuity: number;
  governanceDrift: number;
  topologyComplexity: number;
  topologyCollapseRisk: number;
  observerChainDepth: number;
  boundednessConfidence: number;
  runtimeFiniteBoundaryIndex: number;
  semanticEntropyBudget: number;
  metricContainmentRatio: number;
};

export type RuntimeSemanticGravityExportBundle = {
  version: string;
  exportedAt: string;
  semanticGravityReport: Record<string, unknown>;
  ontologyCentralizationAnalysis: Record<string, unknown>;
  anchorDivergenceAnalysis: Record<string, unknown>;
  semanticPluralityReport: Record<string, unknown>;
  canonicalizationPressureTopology: Record<string, unknown>;
  observerWorldviewClusteringReport: Record<string, unknown>;
  warnings: SemanticGravityWarning[];
  profile: RuntimeSemanticGravityProfile | null;
};
