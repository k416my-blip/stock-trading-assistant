export const RUNTIME_EVOLUTION_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

export const ENTROPY_LOW_THRESHOLD = 0.32;
export const ENTROPY_HEALTHY_MIN = 0.45;

export const REPLAY_BIAS_WARNING = 0.55;
export const REPLAY_BIAS_CRITICAL = 0.72;
export const ROOT_DOMINANCE_WARNING = 0.65;

export const ROLLBACK_OVERUSE_COUNT = 5;
export const ROLLBACK_COOLDOWN_MS = 90_000;
export const ROLLBACK_PENALTY_INCREMENT = 0.12;

export const STAGNATION_MUTATION_MAX = 0.08;
export const CONFIDENCE_FLATTEN_SPREAD_MAX = 0.06;

export const EVOLUTION_TICK_COOLDOWN_MS = 60_000;

export const FORBIDDEN_META_EVOLUTION_ACTIONS = [
  'governance_bypass',
  'hidden_adaptive_mutation',
  'autonomous_strategy_evolution',
  'forbidden_edge_resurrection',
  'stealth_persistence',
  'real_trading_enable',
  'self_governance_bypass',
] as const;

export const META_PROTECTED_INVARIANTS = [
  'ownership_violation',
  'duplicate_socket',
  'governance_bypass',
  'stealth_persistence',
  'real_trading_enable',
] as const;
