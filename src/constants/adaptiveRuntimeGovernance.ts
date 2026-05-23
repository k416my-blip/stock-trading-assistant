import type { ObservableCausalEventKind } from '../types/runtimeCausalGraph';

export const ADAPTIVE_RUNTIME_GOVERNANCE_VERSION = '1.0.0';

export const DRIFT_WARNING_THRESHOLD = 0.35;
export const DRIFT_FRAGMENTING_THRESHOLD = 0.55;
export const DRIFT_CRITICAL_THRESHOLD = 0.75;

export const MIN_EVIDENCE_TICKS_BEFORE_PERSIST = 5;
export const SESSION_COOLDOWN_MS = 12_000;
export const SHORT_SESSION_MS = 90_000;

export const RELIABILITY_ROLLBACK_THRESHOLD = 0.28;
export const RELIABILITY_REPLAY_SUPPRESS_THRESHOLD = 0.38;

export const STALE_EDGE_DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
export const STALE_EDGE_DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

/** Extended protected invariants — never suppress, never governance-bypass learn. */
export const GOVERNANCE_PROTECTED_INVARIANT_KINDS: ObservableCausalEventKind[] = [
  'ownership_violation',
  'duplicate_socket',
  'budget_block',
  'coalesce',
];

export const FORBIDDEN_LEARNING_PATTERNS = [
  'governance_bypass',
  'hidden_persistence',
  'stealth_background_recovery',
  'autonomous_strategy',
  'self_modifying_rule',
  'strategy_change',
  'real_trading_enable',
] as const;

export const REDMI_NOTE_13_PRO_5G_MODEL = 'Redmi Note 13 Pro 5G';
