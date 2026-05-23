import type { LatentRuntimeStateKind } from '../types/runtimeLatentStateInference';

export const HIERARCHICAL_LATENT_GRAPH_VERSION = '1.0.0';

/** Minimum P(s₂|s₁) × posteriors to activate a latent→latent edge. */
export const LATENT_TRANSITION_ACTIVE_THRESHOLD = 0.12;

export type LatentTransitionDef = {
  from: LatentRuntimeStateKind;
  to: LatentRuntimeStateKind;
  probability: number;
};

/** Markov transition model P(s₂ | s₁). */
export const LATENT_STATE_TRANSITIONS: LatentTransitionDef[] = [
  { from: 'scheduler_frozen', to: 'timer_suspended', probability: 0.72 },
  { from: 'scheduler_frozen', to: 'bridge_congested', probability: 0.38 },
  { from: 'scheduler_frozen', to: 'async_queue_starvation', probability: 0.28 },
  { from: 'timer_suspended', to: 'reconnect_feedback_loop', probability: 0.58 },
  { from: 'timer_suspended', to: 'bridge_congested', probability: 0.35 },
  { from: 'bridge_congested', to: 'async_queue_starvation', probability: 0.65 },
  { from: 'async_queue_starvation', to: 'bridge_congested', probability: 0.22 },
  { from: 'hydration_deadlock_risk', to: 'ownership_desync', probability: 0.55 },
  { from: 'ownership_desync', to: 'reconnect_feedback_loop', probability: 0.48 },
  { from: 'ownership_desync', to: 'hydration_deadlock_risk', probability: 0.18 },
  { from: 'reconnect_feedback_loop', to: 'ownership_desync', probability: 0.25 },
];

export function transitionProbability(
  from: LatentRuntimeStateKind,
  to: LatentRuntimeStateKind,
): number {
  return LATENT_STATE_TRANSITIONS.find((t) => t.from === from && t.to === to)?.probability ?? 0;
}

/** Upstream preference for chain root (earlier index = preferred root). */
export const LATENT_CHAIN_ROOT_ORDER: LatentRuntimeStateKind[] = [
  'scheduler_frozen',
  'bridge_congested',
  'hydration_deadlock_risk',
  'async_queue_starvation',
  'timer_suspended',
  'ownership_desync',
  'reconnect_feedback_loop',
];

export const MARKOV_PRIOR_BLEND = 0.45;

export const ESCALATION_DEGRADED_POSTERIOR = 0.32;
export const ESCALATION_CRITICAL_POSTERIOR = 0.72;
export const ESCALATION_CRITICAL_TICKS = 3;
