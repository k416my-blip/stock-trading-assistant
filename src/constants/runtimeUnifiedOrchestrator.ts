export const RUNTIME_UNIFIED_ORCHESTRATOR_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

export const UNIFIED_TICK_MIN_INTERVAL_MS = 1000;
export const UNIFIED_MAX_REPLAY_PER_TICK = 3;
export const UNIFIED_MAX_CURIOSITY_SANDBOX_PER_TICK = 1;
export const UNIFIED_MAX_ASYNC_BURST = 2;
export const UNIFIED_ASYNC_QUEUE_BURST_THRESHOLD = 64;
export const UNIFIED_HEAP_PRIORITY_THRESHOLD = 80;
export const UNIFIED_CPU_DEGRADED_THRESHOLD = 75;
export const UNIFIED_RECOVERY_EMERGENCY_COUNT = 3;
export const UNIFIED_REPLAY_RACE_WINDOW_MS = 500;
export const UNIFIED_GOVERNANCE_LOCK_MS = 800;
export const UNIFIED_TICK_DRIFT_TOLERANCE_MS = 120;

export const FORBIDDEN_UNIFIED_ACTIONS = [
  'self_rewriting_orchestrator',
  'autonomous_layer_reorder',
  'direct_production_mutation',
  'hidden_replay',
  'governance_override',
  'adaptive_rule_rewrite',
  'infinite_recovery_recursion',
] as const;
