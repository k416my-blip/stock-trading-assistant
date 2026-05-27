export type SemanticThermodynamicsFlow =
  | 'semantic_temperature'
  | 'entropy_dissipation'
  | 'ontology_turbulence'
  | 'observer_thermal_saturation'
  | 'semantic_heat_death'
  | 'energy_propagation'
  | 'thermal_pressure';

export type SemanticThermodynamicsWarningKind =
  | 'semantic_heat_accumulation'
  | 'ontology_turbulence'
  | 'observer_thermal_saturation'
  | 'entropy_propagation'
  | 'semantic_heat_death';

export type SemanticThermodynamicsWarning = {
  at: string;
  kind: SemanticThermodynamicsWarningKind;
  target: string;
  warningJa: string;
  observeOnly: true;
};

export type SemanticThermodynamicsGraphNode = { id: string; label: string; heat: number };
export type SemanticThermodynamicsGraphEdge = { from: string; to: string; flow: number };

export type SemanticThermodynamicsGraph = {
  nodes: SemanticThermodynamicsGraphNode[];
  edges: SemanticThermodynamicsGraphEdge[];
  measuredAt: string;
};

export type RuntimeSemanticThermodynamicsTimelineEntry = {
  at: string;
  flow: SemanticThermodynamicsFlow;
  detailJa: string;
};

export type RuntimeSemanticThermodynamicsProfile = {
  semanticEntropyLevel: number;
  semanticHeatDensity: number;
  ontologyThermalPressure: number;
  recursiveMeaningTemperature: number;
  semanticEnergyPropagation: number;
  entropyAmplificationRisk: number;
  semanticHeatAccumulation: number;
  runtimeMeaningHeatIndex: number;
  semanticDissipationEfficiency: number;
  ontologyCoolingPotential: number;
  observerEntropyDrain: number;
  semanticThermalLeakage: number;
  replayEntropyPropagation: number;
  dashboardHeatRetention: number;
  semanticPressurePersistence: number;
  entropyContainmentStress: number;
  ontologyTurbulenceIntensity: number;
  semanticVortexFormation: number;
  recursiveMeaningTurbulence: number;
  worldviewConvectionRisk: number;
  observerInterpretationInstability: number;
  semanticPressureWaveRisk: number;
  ontologyFlowFragmentation: number;
  observerThermalFatigue: number;
  cognitiveHeatOverload: number;
  dashboardThermalSaturation: number;
  semanticAttentionBurnout: number;
  interpretationHeatStress: number;
  replayObservationExhaustion: number;
  observerCoolingDeficit: number;
  semanticHeatDeathRisk: number;
  ontologySignalDecay: number;
  meaningResolutionCollapse: number;
  semanticNoiseDominance: number;
  metricThermalEquilibriumFailure: number;
  observerMeaningBlindness: number;
  semanticExhaustionPotential: number;
  recursiveEnergyFeedback: number;
  semanticEnergyLoopRisk: number;
  ontologyPropagationCascade: number;
  replayHeatAmplification: number;
  observerChainThermalPropagation: number;
  semanticResonancePressure: number;
  measuredAt: string;
};

export type RuntimeSemanticThermodynamicsDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSemanticThermodynamicsProfile;
  semanticTemperatureHeatmap: { layer: string; temperature: number }[];
  ontologyTurbulenceField: SemanticThermodynamicsGraph;
  semanticEntropyRadar: { axis: string; value: number }[];
  observerThermalSaturationGraph: SemanticThermodynamicsGraph;
  replayHeatPropagationTimeline: { at: string; heat: number }[];
  semanticPressureTopology: SemanticThermodynamicsGraph;
  entropyDissipationFlowMap: SemanticThermodynamicsGraph;
  runtimeHeatDeathMonitor: { label: string; value: number }[];
  warnings: SemanticThermodynamicsWarning[];
  timelineRecent: RuntimeSemanticThermodynamicsTimelineEntry[];
};

export type RuntimeSemanticThermodynamicsObserveInput = {
  semanticGravityMass: number;
  semanticSingularityRisk: number;
  semanticCollapsePotential: number;
  semanticAnchorDivergence: number;
  semanticOrbitInstability: number;
  anchorCouplingStress: number;
  ontologyDensityPressure: number;
  ontologyOverCentralizationRisk: number;
  ontologyPluralityIntegrity: number;
  semanticEquilibriumScore: number;
  semanticDiversityRetention: number;
  observerPerspectiveBalance: number;
  narrativeEntropyBalance: number;
  semanticTensionStability: number;
  canonicalTruthPressure: number;
  semanticMonocultureRisk: number;
  semanticOrthodoxyPressure: number;
  recursiveTruthAmplification: number;
  observerDoctrineFormation: number;
  metricSacralizationRisk: number;
  metricVocabularyEntropy: number;
  duplicateMeaningDensity: number;
  semanticEntropyBudget: number;
  crossLayerMeaningCollapse: number;
  recursiveMeaningDependency: number;
  observerDependencyLoopRisk: number;
  metricReferenceCycleDepth: number;
  dashboardSemanticCrowding: number;
  operatorSemanticFatigue: number;
  replayCount: number;
  replayAmplificationRisk: number;
  observerChainDepth: number;
  observerContextDecay: number;
  topologyCollapseRisk: number;
  ontologyFragmentationIndex: number;
  recursiveOntologyDepth: number;
  compressionRatio: number;
  metricContainmentRatio: number;
  boundednessConfidence: number;
  runtimeFiniteBoundaryIndex: number;
};

export type RuntimeSemanticThermodynamicsExportBundle = {
  version: string;
  exportedAt: string;
  semanticThermodynamicsReport: Record<string, unknown>;
  ontologyTurbulenceAnalysis: Record<string, unknown>;
  observerThermalSaturationReport: Record<string, unknown>;
  entropyPropagationAnalysis: Record<string, unknown>;
  semanticHeatAccumulationReport: Record<string, unknown>;
  runtimeHeatDeathRiskAnalysis: Record<string, unknown>;
  warnings: SemanticThermodynamicsWarning[];
  profile: RuntimeSemanticThermodynamicsProfile | null;
};
