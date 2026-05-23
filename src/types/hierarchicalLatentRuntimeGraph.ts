import type { InferredLatentState, LatentRuntimeStateKind } from './runtimeLatentStateInference';

export type LatentEscalationLevel = 'transient' | 'degraded' | 'critical';

export type LatentTransitionEdge = {
  from: LatentRuntimeStateKind;
  to: LatentRuntimeStateKind;
  /** P(to | from) */
  transitionProbability: number;
  active: boolean;
};

export type LatentRecoveryEvent = {
  state: LatentRuntimeStateKind;
  recoveredAt: string;
  previousPosterior: number;
  previousEscalation: LatentEscalationLevel;
  detailJa: string;
};

export type HierarchicalLatentRuntimeGraph = {
  version: string;
  builtAt: string;
  transitions: LatentTransitionEdge[];
  /** Latent-only root cause path (not observable symptoms). */
  criticalLatentChain: LatentRuntimeStateKind[];
  criticalLatentNodeIds: string[];
  chainConfidence: number;
  recoveries: LatentRecoveryEvent[];
  markovPriorApplied: boolean;
};

import type { AdaptiveRuntimeLearningState } from './adaptiveRuntimeLearning';

export type HierarchicalLatentGraphInput = {
  inference: { states: InferredLatentState[]; builtAt: string };
  previous?: InferredLatentState[];
  /** Map state kind → graph node id after latent merge. */
  latentNodeIdByState?: Partial<Record<LatentRuntimeStateKind, string>>;
  learningStore?: AdaptiveRuntimeLearningState;
  nowMs?: number;
};
