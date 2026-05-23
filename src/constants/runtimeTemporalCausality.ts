import type { CausalEventKind } from '../types/runtimeCausalGraph';

export const RUNTIME_TEMPORAL_CAUSALITY_VERSION = '1.0.0';

export type TemporalDecayWindow = {
  from: CausalEventKind;
  to: CausalEventKind;
  /** Full temporal confidence when gap <= strongMs. */
  strongMs: number;
  /** Zero temporal confidence when gap > maxMs. */
  maxMs: number;
  /** Floor weight in the decay band (strong < gap <= max). */
  minWeight: number;
};

/** Per-pair decay windows (strong band + max gap). */
export const TEMPORAL_DECAY_WINDOWS: TemporalDecayWindow[] = [
  { from: 'trim_memory', to: 'timer_drift', strongMs: 3_000, maxMs: 15_000, minWeight: 0.25 },
  { from: 'resume', to: 'reconnect_schedule', strongMs: 1_000, maxMs: 30_000, minWeight: 0.2 },
  { from: 'hydration_lock_overlap', to: 'duplicate_schedule', strongMs: 500, maxMs: 12_000, minWeight: 0.2 },
  { from: 'hydration_lock_overlap', to: 'duplicate_socket', strongMs: 500, maxMs: 12_000, minWeight: 0.2 },
  { from: 'thermal_throttle', to: 'async_saturation', strongMs: 10_000, maxMs: 30_000, minWeight: 0.3 },
  { from: 'thermal_throttle', to: 'event_loop_lag', strongMs: 10_000, maxMs: 30_000, minWeight: 0.3 },
  { from: 'timer_drift', to: 'delayed_resume', strongMs: 2_000, maxMs: 20_000, minWeight: 0.25 },
  { from: 'ownership_violation', to: 'duplicate_socket', strongMs: 800, maxMs: 10_000, minWeight: 0.2 },
  { from: 'silent_disconnect', to: 'reconnect_storm', strongMs: 5_000, maxMs: 60_000, minWeight: 0.15 },
  { from: 'reconnect_schedule', to: 'reconnect_execute', strongMs: 500, maxMs: 15_000, minWeight: 0.3 },
];

export const TEMPORAL_DECAY_DEFAULT: Omit<TemporalDecayWindow, 'from' | 'to'> = {
  strongMs: 2_000,
  maxMs: 45_000,
  minWeight: 0.2,
};

/** Same-kind burst coalescing window (ms). */
export const BURST_COLLAPSE_WINDOW_MS: Partial<Record<CausalEventKind, number>> = {
  reconnect_schedule: 500,
  reconnect_execute: 500,
  reconnect_storm: 2_000,
  duplicate_socket: 1_000,
  duplicate_schedule: 1_000,
  coalesce: 800,
  event_loop_lag: 1_500,
  async_saturation: 2_000,
};

export const BURST_COLLAPSE_DEFAULT_MS = 2_000;

/** Composite edge confidence weights (sum = 1). */
export const EDGE_CONFIDENCE_WEIGHTS = {
  causalRule: 0.35,
  temporal: 0.35,
  replay: 0.15,
  ownership: 0.15,
} as const;

/** Root candidate penalty when best outgoing hop is temporally stale. */
export const ROOT_STALE_EDGE_PENALTY = 12;
export const ROOT_STALE_TEMPORAL_THRESHOLD = 0.45;
export const ROOT_MIN_OUTGOING_TEMPORAL = 0.35;
