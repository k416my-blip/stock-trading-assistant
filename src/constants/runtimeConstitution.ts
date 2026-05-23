export const RUNTIME_CONSTITUTION_VERSION = '1.0.0';
export const REDMI_NOTE_13_PRO_5G = 'Redmi Note 13 Pro 5G';

export const DOMINANCE_THRESHOLD = 0.8;
export const TENSION_SEVERITY_THRESHOLD = 0.45;
export const CRISIS_SEVERITY_THRESHOLD = 0.72;

export const CONSTITUTIONAL_RECOVERY_DURATION_MS = 45_000;
export const CONSTITUTION_TICK_COOLDOWN_MS = 30_000;

export const LAYER_BUDGET_DEFAULT = {
  governance: 0.15,
  recovery: 0.15,
  entropy: 0.12,
  exploration: 0.12,
  async: 0.18,
  observability: 0.13,
  survival: 0.15,
} as const;

export const FORBIDDEN_CONSTITUTIONAL_ACTIONS = [
  'governance_bypass',
  'stealth_persistence',
  'hidden_privilege_escalation',
  'real_trading_enable',
  'self_authority_escalation',
  'protected_edge_rewrite',
  'strategy_mutation',
] as const;

export const ABSOLUTE_PROTECTED_RULES = [
  'ownership_violation',
  'duplicate_socket',
  'real_trading_enable',
  'governance_bypass',
] as const;
