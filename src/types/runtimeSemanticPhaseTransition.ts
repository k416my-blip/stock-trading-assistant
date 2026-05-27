export type SemanticPhaseTransitionFlow =
  | 'semantic_phase_transition'
  | 'ontology_state_shift'
  | 'recursive_crystallization'
  | 'semantic_fluid_dynamics'
  | 'observer_synchronization'
  | 'semantic_collapse';

export type SemanticPhaseWarningKind =
  | 'phase_transition'
  | 'ontology_state_shift'
  | 'meaning_crystallization'
  | 'observer_phase_lock'
  | 'semantic_state_collapse';

export type SemanticPhaseWarning = {
  at: string;
  kind: SemanticPhaseWarningKind;
  target: string;
  warningJa: string;
  observeOnly: true;
};

export type SemanticPhaseGraphNode = { id: string; label: string; phase: number };
export type SemanticPhaseGraphEdge = { from: string; to: string; transition: number };

export type SemanticPhaseGraph = {
  nodes: SemanticPhaseGraphNode[];
  edges: SemanticPhaseGraphEdge[];
  measuredAt: string;
};

export type RuntimeSemanticPhaseTimelineEntry = {
  at: string;
  flow: SemanticPhaseTransitionFlow;
  detailJa: string;
};

export type RuntimeSemanticPhaseProfile = {
  semanticPhaseVolatility: number;
  ontologyStateShiftRisk: number;
  recursiveMeaningCondensation: number;
  semanticCrystallizationPressure: number;
  semanticFluidityIndex: number;
  ontologyRigidityGradient: number;
  semanticStateTransitionVelocity: number;
  meaningPhaseInstability: number;
  semanticSolidificationRisk: number;
  semanticLiquidDrift: number;
  semanticGasDispersion: number;
  ontologyStateEntropy: number;
  worldviewStateFragmentation: number;
  observerStateCoupling: number;
  semanticStatePersistence: number;
  recursiveOntologyElasticity: number;
  recursiveMeaningCrystalRisk: number;
  canonicalMeaningSolidification: number;
  semanticLatticeFormation: number;
  observerBeliefCrystalPressure: number;
  topologyCrystallizationStress: number;
  semanticSymmetryCollapse: number;
  ontologyRigidificationRisk: number;
  semanticFlowTurbulence: number;
  ontologyViscosityIndex: number;
  recursiveMeaningCurrent: number;
  semanticPressureFlow: number;
  observerInterpretationConvection: number;
  worldviewDiffusionInstability: number;
  semanticCirculationStress: number;
  observerStateSynchronizationRisk: number;
  recursiveConsensusFormation: number;
  semanticSynchronizationPressure: number;
  observerPhaseLockRisk: number;
  narrativeStateConvergence: number;
  semanticResonanceSynchronization: number;
  ontologyCollectiveDrift: number;
  semanticStateCollapseRisk: number;
  ontologyCompressionCollapse: number;
  recursiveMeaningFreeze: number;
  semanticFlexibilityLoss: number;
  observerInterpretationLock: number;
  worldviewRigidCollapse: number;
  semanticRecoveryDifficulty: number;
  measuredAt: string;
};

export type RuntimeSemanticPhaseDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  profile: RuntimeSemanticPhaseProfile;
  semanticPhaseMap: SemanticPhaseGraph;
  ontologyStateTopology: SemanticPhaseGraph;
  recursiveCrystallizationGraph: SemanticPhaseGraph;
  semanticFluidDynamicsField: SemanticPhaseGraph;
  observerSynchronizationRadar: { axis: string; value: number }[];
  semanticStateTransitionTimeline: { at: string; velocity: number }[];
  ontologyRigidityHeatmap: { layer: string; rigidity: number }[];
  semanticCollapseMonitor: { label: string; value: number }[];
  warnings: SemanticPhaseWarning[];
  timelineRecent: RuntimeSemanticPhaseTimelineEntry[];
};

export type RuntimeSemanticPhaseObserveInput = {
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
  semanticEquilibriumScore: number;
  ontologyPluralityIntegrity: number;
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
  observerDependencyLoopRisk: number;
  topologyCollapseRisk: number;
  boundednessConfidence: number;
  runtimeFiniteBoundaryIndex: number;
  compressionRatio: number;
};

export type RuntimeSemanticPhaseExportBundle = {
  version: string;
  exportedAt: string;
  semanticPhaseTransitionReport: Record<string, unknown>;
  ontologyStateAnalysis: Record<string, unknown>;
  recursiveCrystallizationReport: Record<string, unknown>;
  semanticFluidDynamicsAnalysis: Record<string, unknown>;
  observerSynchronizationReport: Record<string, unknown>;
  semanticCollapseRiskAnalysis: Record<string, unknown>;
  warnings: SemanticPhaseWarning[];
  profile: RuntimeSemanticPhaseProfile | null;
};
