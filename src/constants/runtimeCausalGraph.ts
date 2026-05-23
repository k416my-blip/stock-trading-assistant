import type { CausalEventKind, ObservableCausalEventKind } from '../types/runtimeCausalGraph';

export const RUNTIME_CAUSAL_GRAPH_VERSION = '1.4.0';

/** Lower = more likely primary root (not timestamp order). */
export const CAUSAL_ROOT_PRIORITY: Record<ObservableCausalEventKind, number> = {
  trim_memory: 1,
  silent_disconnect: 2,
  hydration_lock_overlap: 3,
  ownership_violation: 4,
  resume: 5,
  native_lifecycle: 6,
  async_saturation: 7,
  thermal_throttle: 8,
  event_loop_lag: 9,
  timer_drift: 20,
  delayed_resume: 25,
  reconnect_schedule: 30,
  reconnect_execute: 35,
  duplicate_schedule: 40,
  duplicate_socket: 45,
  reconnect_storm: 50,
  budget_block: 55,
  coalesce: 56,
};

/** Kinds that must not be root if a valid parent exists. */
export const CAUSAL_CASCADE_ONLY_KINDS: ObservableCausalEventKind[] = [
  'duplicate_socket',
  'duplicate_schedule',
  'reconnect_storm',
  'reconnect_execute',
  'coalesce',
  'budget_block',
];

export type CausalRelationRule = {
  from: ObservableCausalEventKind;
  to: ObservableCausalEventKind;
  label: string;
  maxGapMs: number;
  confidence: number;
};

export const CAUSAL_RELATION_RULES: CausalRelationRule[] = [
  { from: 'resume', to: 'reconnect_schedule', label: 'resume→reconnect_schedule', maxGapMs: 30_000, confidence: 0.92 },
  { from: 'trim_memory', to: 'timer_drift', label: 'trim→timer_drift', maxGapMs: 15_000, confidence: 0.9 },
  { from: 'timer_drift', to: 'delayed_resume', label: 'timer_drift→delayed_resume', maxGapMs: 20_000, confidence: 0.88 },
  { from: 'delayed_resume', to: 'reconnect_schedule', label: 'delayed_resume→reconnect', maxGapMs: 25_000, confidence: 0.85 },
  { from: 'hydration_lock_overlap', to: 'duplicate_schedule', label: 'hydration→duplicate_schedule', maxGapMs: 12_000, confidence: 0.91 },
  { from: 'ownership_violation', to: 'duplicate_socket', label: 'ownership→duplicate_socket', maxGapMs: 10_000, confidence: 0.93 },
  { from: 'silent_disconnect', to: 'reconnect_storm', label: 'silent→reconnect_storm', maxGapMs: 60_000, confidence: 0.87 },
  { from: 'resume', to: 'delayed_resume', label: 'resume→delayed_resume', maxGapMs: 45_000, confidence: 0.75 },
  { from: 'async_saturation', to: 'event_loop_lag', label: 'async→event_loop_lag', maxGapMs: 8_000, confidence: 0.8 },
  { from: 'event_loop_lag', to: 'timer_drift', label: 'lag→timer_drift', maxGapMs: 12_000, confidence: 0.78 },
  { from: 'thermal_throttle', to: 'async_saturation', label: 'thermal→async', maxGapMs: 30_000, confidence: 0.72 },
  { from: 'reconnect_schedule', to: 'reconnect_execute', label: 'schedule→execute', maxGapMs: 15_000, confidence: 0.95 },
  { from: 'duplicate_schedule', to: 'duplicate_socket', label: 'dup_schedule→dup_socket', maxGapMs: 8_000, confidence: 0.94 },
  { from: 'reconnect_schedule', to: 'reconnect_storm', label: 'schedule→storm', maxGapMs: 90_000, confidence: 0.7 },
];

export const CAUSAL_WINDOW_MS = 120_000;
