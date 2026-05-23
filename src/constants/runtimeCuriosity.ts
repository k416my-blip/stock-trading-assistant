export const RUNTIME_CURIOSITY_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

export const CURIOSITY_TICK_COOLDOWN_MS = 60_000;
export const MAX_SANDBOX_REPLAYS_PER_TICK = 3;
export const MAX_DORMANT_REVIVAL_PER_TICK = 1;
export const MAX_SANDBOX_MUTATIONS = 32;
export const MAX_EXPLORATION_CEMETERY = 100;

export const MINORITY_EDGE_HIT_MAX = 8;
export const MINORITY_SUCCESS_MIN = 0.35;
export const REPLAY_MONOCULTURE_THRESHOLD = 0.72;
export const CONSENSUS_BIAS_THRESHOLD = 0.85;
export const GOVERNANCE_FAIRNESS_MIN = 0.5;

export const FORBIDDEN_CURIOSITY_MUTATIONS = [
  'strategy_rewrite',
  'real_trading_enable',
  'governance_bypass',
  'stealth_learning',
  'hidden_memory',
  'direct_graph_rewrite',
  'protected_edge_mutation',
  'user_prompt_override',
  'autonomous_deployment',
  'self_modifying_code',
] as const;
