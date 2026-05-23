import type { LatentEvidenceSignal, LatentRuntimeStateKind } from '../types/runtimeLatentStateInference';

export const RUNTIME_LATENT_STATE_INFERENCE_VERSION = '1.0.0';

/** Minimum posterior to emit an inferred state. */
export const LATENT_STATE_POSTERIOR_THRESHOLD = 0.28;

/** Mark critical when posterior >= this and sustained or high-impact. */
export const LATENT_STATE_CRITICAL_POSTERIOR = 0.78;

/** Transient vs sustained persistence thresholds. */
export const LATENT_TRANSIENT_MAX_MS = 8_000;
export const LATENT_SUSTAINED_MIN_MS = 20_000;
export const LATENT_SUSTAINED_MIN_OBSERVATIONS = 2;

export type LatentStateModel = {
  state: LatentRuntimeStateKind;
  prior: number;
  /** log-likelihood weights when signal active (Bayesian-style additive in log space). */
  likelihoods: Partial<Record<LatentEvidenceSignal, number>>;
};

export const LATENT_STATE_MODELS: LatentStateModel[] = [
  {
    state: 'scheduler_frozen',
    prior: 0.08,
    likelihoods: {
      event_loop_lag: 1.4,
      delayed_resume: 1.2,
      memory_trim: 0.9,
      causal_chain_weak: 0.8,
    },
  },
  {
    state: 'timer_suspended',
    prior: 0.1,
    likelihoods: {
      timer_drift: 1.6,
      memory_trim: 1.1,
      delayed_resume: 1.0,
      event_loop_lag: 0.7,
    },
  },
  {
    state: 'bridge_congested',
    prior: 0.09,
    likelihoods: {
      event_loop_lag: 1.2,
      async_saturation: 1.3,
      thermal_drift: 0.8,
      causal_chain_weak: 0.6,
    },
  },
  {
    state: 'hydration_deadlock_risk',
    prior: 0.07,
    likelihoods: {
      hydration_overlap: 1.7,
      duplicate_socket: 0.9,
      causal_chain_strong: 0.5,
    },
  },
  {
    state: 'reconnect_feedback_loop',
    prior: 0.11,
    likelihoods: {
      reconnect_storm: 1.6,
      silent_disconnect: 1.2,
      duplicate_socket: 1.0,
      causal_chain_strong: 0.7,
    },
  },
  {
    state: 'ownership_desync',
    prior: 0.1,
    likelihoods: {
      ownership_violation: 1.7,
      duplicate_socket: 1.2,
      reconnect_storm: 0.6,
    },
  },
  {
    state: 'async_queue_starvation',
    prior: 0.09,
    likelihoods: {
      async_saturation: 1.6,
      event_loop_lag: 1.1,
      thermal_drift: 1.0,
      timer_drift: 0.5,
    },
  },
];

/** Map observable causal kinds to evidence signals. */
export const CAUSAL_KIND_TO_EVIDENCE: Partial<Record<string, LatentEvidenceSignal>> = {
  event_loop_lag: 'event_loop_lag',
  reconnect_storm: 'reconnect_storm',
  hydration_lock_overlap: 'hydration_overlap',
  trim_memory: 'memory_trim',
  thermal_throttle: 'thermal_drift',
  async_saturation: 'async_saturation',
  timer_drift: 'timer_drift',
  delayed_resume: 'delayed_resume',
  duplicate_socket: 'duplicate_socket',
  ownership_violation: 'ownership_violation',
  silent_disconnect: 'silent_disconnect',
};
