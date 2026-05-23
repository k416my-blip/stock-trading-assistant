import type { ObservableCausalEventKind } from './runtimeCausalGraph';
import type { LatentRuntimeStateKind } from './runtimeLatentStateInference';

export const DEVICE_PROFILE_KINDS = ['redmi', 'samsung', 'pixel', 'emulator'] as const;
export type DeviceProfileKind = (typeof DEVICE_PROFILE_KINDS)[number];

export const RECOVERY_ACTION_KINDS = [
  'reconnect_defer',
  'coalesce',
  'hydration_pause',
  'storm_suppression',
] as const;
export type RecoveryActionKind = (typeof RECOVERY_ACTION_KINDS)[number];

export type EdgeLearningRecord = {
  edgeKey: string;
  from: ObservableCausalEventKind | string;
  to: ObservableCausalEventKind | string;
  relation: string;
  hitCount: number;
  successfulPredictionCount: number;
  falsePositiveCount: number;
  decayReliability: number;
  runtimeLearnedWeight: number;
  /** EMA-smoothed confidence */
  confidenceEma: number;
  replaySupport: number;
  stability: number;
  protectedInvariant: boolean;
};

export type TransitionLearningRecord = {
  from: LatentRuntimeStateKind;
  to: LatentRuntimeStateKind;
  hitCount: number;
  observedCount: number;
  learnedProbability: number;
  baseProbability: number;
};

export type RecoveryEffectivenessRecord = {
  action: RecoveryActionKind;
  attempts: number;
  successes: number;
  successRate: number;
};

export type DeviceProfileAdjustments = {
  profile: DeviceProfileKind;
  timerDriftToleranceMs: number;
  resumeLatencyExpectationMs: number;
  batterySaverAggressiveness: number;
  decayOverrides: { edgeKey: string; strongMs: number; maxMs: number }[];
};

export type AdaptiveDecayWindow = {
  from: ObservableCausalEventKind;
  to: ObservableCausalEventKind;
  strongMs: number;
  maxMs: number;
  minWeight: number;
  source: 'fixed' | 'learned_histogram' | 'device_profile';
};

export type FalsePositiveRecord = {
  edgeKey: string;
  predictedRoot: string;
  actualOutcome: string;
  count: number;
  penalty: number;
};

export type AdaptiveRuntimeLearningState = {
  version: string;
  deviceProfile: DeviceProfileKind;
  edges: Record<string, EdgeLearningRecord>;
  transitions: Record<string, TransitionLearningRecord>;
  recovery: Record<RecoveryActionKind, RecoveryEffectivenessRecord>;
  gapHistograms: Record<string, number[]>;
  falsePositives: FalsePositiveRecord[];
  rootRankingHistory: Record<string, { count: number; successCount: number }>;
  replayCount: number;
  lastUpdatedAt: string;
};

export type AdaptiveRuntimeContext = {
  store: AdaptiveRuntimeLearningState;
  deviceProfile: DeviceProfileKind;
};

export type AdaptiveRuntimeReport = {
  version: string;
  builtAt: string;
  deviceProfile: DeviceProfileKind;
  learnedTransitions: TransitionLearningRecord[];
  unstableEdges: EdgeLearningRecord[];
  falsePositiveEdges: FalsePositiveRecord[];
  deviceSpecificAdjustments: DeviceProfileAdjustments;
  recoverySuccessRates: RecoveryEffectivenessRecord[];
  rootRankingStability: number;
  replayCount: number;
};

export type LearnFromInferenceInput = {
  graph: import('./runtimeCausalGraph').RuntimeCausalGraph;
  latentChain: LatentRuntimeStateKind[];
  predictedRootKind: string | null;
  recoveryActions?: RecoveryActionKind[];
  recoverySucceeded?: boolean;
};
