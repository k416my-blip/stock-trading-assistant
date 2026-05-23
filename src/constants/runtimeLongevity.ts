export const RUNTIME_LONGEVITY_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

export const ENTROPY_HEALTHY_MIN = 0.38;
export const ENTROPY_HEALTHY_MAX = 0.72;
export const ENTROPY_COLLAPSE_THRESHOLD = 0.25;
export const ENTROPY_STAGNATION_CRITICAL = 0.15;
export const ENTROPY_CHAOS_THRESHOLD = 0.82;

export const REPLAY_ROOT_SHARE_CIVILIZATION = 0.72;
export const REPLAY_REUSE_CIVILIZATION = 0.8;
export const MUTATION_NOVELTY_MIN = 0.2;
export const MINORITY_EDGE_RATIO_MIN = 0.12;

export const FOSSIL_SAME_ROOT_TICKS = 180;
export const FOSSIL_NO_NOVEL_MUTATION_TICKS = 120;
export const FOSSIL_REPLAY_DOMINANCE = 0.75;

export const MUTATION_LINEAGE_MAX_SHARE = 0.65;
export const MAX_REPLAY_ECOLOGY = 64;
export const MAX_MUTATION_CEMETERY = 100;
export const DASHBOARD_RING_CAP = 48;

export const SESSION_HEAP_ECOLOGY_LITE_MIN = 120;
export const SESSION_DASHBOARD_COMPRESS_MIN = 180;

export const FORBIDDEN_LONGEVITY_ACTIONS = [
  'self_rewriting',
  'autonomous_strategy_mutation',
  'production_graph_rewrite',
  'hidden_replay_injection',
  'governance_override',
  'infinite_entropy_pulse',
  'recursive_recovery',
  'replay_resurrection_bypass',
] as const;
