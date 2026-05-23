import type { DriftPhase } from './adaptiveRuntimeGovernance';

export const EVOLUTION_HEALTH_STATES = [
  'EVOLVING',
  'STABLE',
  'STAGNATING',
  'OVERFITTED',
  'COLLAPSING',
] as const;

export type EvolutionHealthState = (typeof EVOLUTION_HEALTH_STATES)[number];

export const FALSE_STABILITY_STATES = [
  'FALSE_STABLE',
  'LATENT_COLLAPSE',
  'HIDDEN_DRIFT',
] as const;

export type FalseStabilityState = (typeof FALSE_STABILITY_STATES)[number];

export const LONG_TERM_EVOLUTION_PHASES = [
  'LEARNING',
  'HARDENING',
  'RIGID',
  'DEGRADING',
  'RENEWAL',
] as const;

export type LongTermEvolutionPhase = (typeof LONG_TERM_EVOLUTION_PHASES)[number];

export type EvolutionMonitorSignals = {
  adaptationDiversity: number;
  replayDependence: number;
  rollbackFrequency: number;
  edgeEntropy: number;
  graphMutationRate: number;
  recoveryReliance: number;
  learningStagnation: number;
  confidenceFlattening: number;
};

export type EntropyMetrics = {
  edgeDiversity: number;
  latentPathVariance: number;
  replayExplorationRatio: number;
  contradictionTolerance: number;
  alternativeHypothesisPersistence: number;
  entropyScore: number;
};

export type ReplayBiasMetrics = {
  replayBiasScore: number;
  rootDominanceIndex: number;
  sameRootDominance: boolean;
  replayFixation: boolean;
  repetitiveRecoveryLineage: boolean;
  convergenceTrap: boolean;
};

export type RollbackDependencyMetrics = {
  rollbackOveruse: boolean;
  rollbackMasking: boolean;
  stabilityIllusion: boolean;
  recoveryAddiction: boolean;
  rollbackPenalty: number;
  cooldownActive: boolean;
};

export type FalseStabilityMetrics = {
  state: FalseStabilityState | 'NONE';
  lowMutationUnstableReplay: boolean;
  compactHidingDivergence: boolean;
  suppressedContradictions: boolean;
  fakeConfidencePlateau: boolean;
};

export type ExplorationRecoveryResult = {
  dormantEdgesRevived: number;
  alternativePathsOpened: number;
  sandboxContradictions: number;
  lowRiskReplays: number;
};

export type DiversityPreservationResult = {
  minorityPathsKept: number;
  rareLineageKept: number;
  lowFrequencyRootsKept: number;
  crossDeviceVariationScore: number;
  prunedNoveltyBlocked: number;
};

export type EvolutionDashboard = {
  evolutionHealth: EvolutionHealthState;
  entropyScore: number;
  replayBias: number;
  rollbackDependency: number;
  adaptiveDiversity: number;
  graphRigidity: number;
  explorationRecoveryRate: number;
  hiddenDriftRisk: number;
  longTermPhase: LongTermEvolutionPhase;
  falseStability: FalseStabilityState | 'NONE';
};

export type RuntimeEvolutionBundle = {
  version: string;
  builtAt: string;
  healthState: EvolutionHealthState;
  signals: EvolutionMonitorSignals;
  entropy: EntropyMetrics;
  replayBias: ReplayBiasMetrics;
  rollbackDependency: RollbackDependencyMetrics;
  falseStability: FalseStabilityMetrics;
  exploration: ExplorationRecoveryResult;
  diversity: DiversityPreservationResult;
  longTermPhase: LongTermEvolutionPhase;
  dashboard: EvolutionDashboard;
  driftPhase: DriftPhase | 'unknown';
  actionsJa: string[];
};

export type EvolutionSimulationHorizon = 1 | 3 | 7 | 30;

export type EvolutionSimulationReport = {
  horizonDays: EvolutionSimulationHorizon;
  stagnationRisk: number;
  replayFixation: number;
  adaptiveCollapseRisk: number;
  hiddenDrift: number;
  rollbackAddiction: number;
  entropyPreservation: number;
  diversityRetention: number;
  summaryJa: string;
};

export type RedmiEvolutionReport = {
  deviceModel: string;
  entropyRetention: number;
  replayBiasSuppression: number;
  adaptiveDiversity: number;
  rollbackDependencyReduction: number;
  longTermStability: number;
  hiddenDriftDetection: number;
  falseStabilityPrevention: number;
  runtimeEvolutionSustainability: number;
  explorationRecoveryEffectiveness: number;
  thirtyDayAdaptiveSurvivability: number;
  summaryJa: string;
};
