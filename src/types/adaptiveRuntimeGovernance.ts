import type { DeviceProfileKind, EdgeLearningRecord } from './adaptiveRuntimeLearning';
import type { RuntimeCausalGraph } from './runtimeCausalGraph';
import type { LatentRuntimeStateKind } from './runtimeLatentStateInference';

export const DRIFT_PHASES = [
  'DRIFT_STABLE',
  'DRIFT_WARNING',
  'DRIFT_FRAGMENTING',
  'DRIFT_CRITICAL',
] as const;

export type DriftPhase = (typeof DRIFT_PHASES)[number];

export type EdgeReliabilityScore = {
  edgeKey: string;
  confidence: number;
  stability: number;
  reproducibility: number;
  crossSessionConsistency: number;
  crossDeviceConsistency: number;
  composite: number;
  rollbackCandidate: boolean;
  replaySuppressed: boolean;
};

export type DriftMetrics = {
  driftVelocity: number;
  optimizationInstability: number;
  causalInconsistency: number;
  replayDivergence: number;
  adaptiveVolatility: number;
  staleOptimizationPersistence: number;
  driftScore: number;
  phase: DriftPhase;
};

export type SessionOverfitSignals = {
  shortSessionOverlearning: boolean;
  temporaryThermalBias: boolean;
  reconnectAnomalyBias: boolean;
  foregroundSpikeOverfit: boolean;
  blockedPersistence: boolean;
  cooldownUntilMs: number;
};

export type CausalContradiction = {
  kind: 'mutual_inconsistency' | 'circular_reinforcement' | 'impossible_loop' | 'conflicting_latent_path';
  detailJa: string;
  edgeKeys: string[];
  quarantined: boolean;
};

export type RollbackSnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  edgeCount: number;
  isBaseline: boolean;
};

export type AdaptiveGovernanceState = {
  version: string;
  drift: DriftMetrics;
  edgeReliability: Record<string, EdgeReliabilityScore>;
  sessionOverfit: SessionOverfitSignals;
  contradictions: CausalContradiction[];
  rollbackSnapshots: RollbackSnapshot[];
  crossDeviceContaminationRisk: number;
  staleOptimizationCount: number;
  lastGovernanceAt: string;
  sessionEvidenceTicks: number;
  distinctDeviceProfilesSeen: DeviceProfileKind[];
};

export type AdaptiveGovernanceDashboard = {
  driftScore: number;
  driftPhase: DriftPhase;
  unstableLearnedEdges: EdgeLearningRecord[];
  rollbackCandidates: string[];
  replayDivergence: number;
  adaptiveReliability: number;
  crossDeviceContaminationRisk: number;
  staleOptimizationCount: number;
  contradictions: CausalContradiction[];
  rollbackSnapshotCount: number;
};

export type AdaptiveGovernanceReport = {
  version: string;
  builtAt: string;
  dashboard: AdaptiveGovernanceDashboard;
  drift: DriftMetrics;
  actionsApplied: string[];
  rollbacksPerformed: number;
  redmiLongTerm?: RedmiLongTermGovernanceReport;
  quarantinedGraph?: RuntimeCausalGraph;
};

export type GovernanceRunInput = {
  graph: RuntimeCausalGraph;
  latentChain: LatentRuntimeStateKind[];
  deviceProfile: DeviceProfileKind;
  sessionElapsedMs: number;
  previousRootKind?: string | null;
  rootKind?: string | null;
};

export type RedmiLongTermGovernanceReport = {
  deviceModel: string;
  driftStability: number;
  replayReliability: number;
  rollbackFrequency: number;
  staleOptimizationSuppression: number;
  adaptiveConfidenceTrend: number;
  crossDeviceIsolationQuality: number;
  longSessionAdaptiveStability: number;
  phase: DriftPhase;
  summaryJa: string;
};
