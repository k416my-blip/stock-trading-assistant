import type { LatentEscalationLevel } from './hierarchicalLatentRuntimeGraph';
import type { CausalEventKind, CausalEventNode, RuntimeCausalGraph, RuntimeCausalGraphInput } from './runtimeCausalGraph';

export const LATENT_RUNTIME_STATE_KINDS = [
  'scheduler_frozen',
  'timer_suspended',
  'bridge_congested',
  'hydration_deadlock_risk',
  'reconnect_feedback_loop',
  'ownership_desync',
  'async_queue_starvation',
] as const;

export type LatentRuntimeStateKind = (typeof LATENT_RUNTIME_STATE_KINDS)[number];

export type LatentStatePersistence = 'transient' | 'sustained';

export type LatentEvidenceSignal =
  | 'event_loop_lag'
  | 'reconnect_storm'
  | 'hydration_overlap'
  | 'memory_trim'
  | 'thermal_drift'
  | 'async_saturation'
  | 'timer_drift'
  | 'delayed_resume'
  | 'duplicate_socket'
  | 'ownership_violation'
  | 'silent_disconnect'
  | 'causal_chain_weak'
  | 'causal_chain_strong';

export type LatentSupportingEvidence = {
  signal: LatentEvidenceSignal;
  weight: number;
  detailJa: string;
  sourceNodeId?: string;
};

export type InferredLatentState = {
  state: LatentRuntimeStateKind;
  /** Approximate P(state | evidence) after normalization. */
  confidence: number;
  posterior: number;
  prior: number;
  persistence: LatentStatePersistence;
  critical: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  observationTicks: number;
  supportingEvidence: LatentSupportingEvidence[];
  escalation?: LatentEscalationLevel;
  recovered?: boolean;
};

export type LatentStateInferenceResult = {
  version: string;
  builtAt: string;
  states: InferredLatentState[];
  /** Sum-normalized posteriors per state kind. */
  posteriorByState: Partial<Record<LatentRuntimeStateKind, number>>;
  dominantState: LatentRuntimeStateKind | null;
  overallConfidence: number;
  markovPriorApplied?: boolean;
};

export type LatentStateInferenceInput = {
  graph: RuntimeCausalGraph;
  /** Optional raw signals when graph alone is thin. */
  raw?: RuntimeCausalGraphInput;
  /** Prior inference for persistence (session carry-over). */
  previous?: InferredLatentState[];
  nowMs?: number;
};

export type RuntimeCausalGraphWithLatent = RuntimeCausalGraph & {
  latentStates: InferredLatentState[];
};
