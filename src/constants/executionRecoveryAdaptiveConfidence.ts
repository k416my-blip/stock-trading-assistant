import type { ExecutionRecoveryFeatureId } from '../types/executionRecoveryAdaptiveConfidence';

export const RECOVERY_REGULATORY_JA =
  'Execution Recovery & Adaptive Confidence — 安全な復帰・confidence 再構築・段階的 thaw のみ。Paper Trading・realTradingEnabled=false・攻撃的最適化禁止。';

export const RECOVERY_AI_PROMPT_JA = `
【Execution Recovery & Adaptive Confidence】
- freeze / safe mode を bypass しない。governance authority を override しない。
- conservative recovery のみ: freeze→hold→reduce-hold→watch→buy-watch の段階 thaw。
- recovery 中 confidence 上限 65。rollback 直後は cooldown（上限 45）。
- cascade isolation / systemic emergency 時は recovery blocked。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const RECOVERY_CONFIDENCE_MAX = 65;
export const RECOVERY_COOLDOWN_CONFIDENCE_MAX = 45;
export const RECOVERY_OSCILLATION_SUSPEND_THRESHOLD = 60;
export const RECURSIVE_THAW_BLOCK_THRESHOLD = 70;
export const RECOVERY_TIMELINE_MAX = 48;
export const ROLLBACK_COOLDOWN_MS = 15 * 60 * 1000;

export const RECOVERY_HEALTH_FORMULA_JA =
  'recoveryHealth = 100 − contradiction×0.2 − unsupported×0.2 − recursiveRisk×0.15 − rollbackDep×0.15 − freezeFreq×0.1 − oscillation×0.1 − drift';

export const ADAPTIVE_CONFIDENCE_FORMULA_JA =
  'adaptiveConfidence = (govTrust+replayTrust+semantic+arbitration+reflection+systemic)/6 − recoveryPenalty';

export const THAW_LEVEL_FORMULA_JA =
  'thawLevel = clamp(recoveryHealth×0.5 + adaptiveConfidence×0.5 − oscillationRisk)';

export const RECOVERY_CONSENSUS_FORMULA_JA =
  'recoveryConsensus = (governance+reliability+arbitration+reflection+compression+systemic)/6';

export const RECOVERY_FLOW_JA = [
  'Upstream freeze/downgrade/rollback → Recovery health scan',
  'Confidence rehabilitation → Adaptive thaw → Conservative rebuild',
  'Stability validation → Recovery consensus → Safe recovery?',
];

export const ADAPTIVE_THAW_FLOW_JA = [
  'thaw<35: freeze維持',
  '35-45: hold only',
  '45-55: reduce-hold',
  '55-65: watch',
  '65+: buy-watch only（aggressive buy/sell 禁止）',
];

export const CONFIDENCE_REBUILD_FLOW_JA = [
  'replay integrity → contradiction/unsupported 減衰',
  'governance stability → reflection/systemic equilibrium',
  '段階的 confidence 回復（直接復元しない）',
];

export const RECOVERY_COOLDOWN_FLOW_JA = [
  'rollback / recursiveFreeze / emergency / replayIsolation → cooldown',
  'confidence≤45、thaw最大watch',
];

export const RECOVERY_UI_LABELS_JA = {
  panelTitle: 'Recovery Dashboard',
  recoveryHealth: 'Recovery Health',
  adaptiveConfidence: 'Adaptive Confidence',
  thawLevel: 'Thaw Level',
  recoveryConsensus: 'Recovery Consensus',
  oscillation: 'Oscillation Risk',
  freezeFreq: 'Freeze Frequency',
  rollbackDep: 'Rollback Dependency',
  cooldown: 'Cooldown',
  stage: 'Recovery Stage',
  thawState: 'Thaw State',
  replay: 'Replay Integrity',
  contradiction: 'Contradiction Trend',
  unsupported: 'Unsupported Trend',
  recursiveRisk: 'Recursive Risk',
} as const;

export const RECOVERY_FEATURE_LABELS: Record<ExecutionRecoveryFeatureId, string> = {
  recovery_health_scanner: 'Recovery Health Scanner',
  confidence_rehabilitation_engine: 'Confidence Rehabilitation Engine',
  adaptive_thaw_engine: 'Adaptive Thaw Engine',
  conservative_recommendation_rebuilder: 'Conservative Recommendation Rebuilder',
  stability_validation_gate: 'Stability Validation Gate',
  recovery_consensus_engine: 'Recovery Consensus Engine',
  rollback_immunity_guard: 'Rollback Immunity Guard',
  anti_oscillation_recovery: 'Anti-Oscillation Recovery',
  thaw_level_computer: 'Thaw Level Computer',
  adaptive_confidence_engine: 'Adaptive Confidence Engine',
  freeze_gradual_release: 'Freeze Gradual Release',
  hold_watch_exit_bridge: 'Hold/Watch Exit Bridge',
  replay_integrity_restorer: 'Replay Integrity Restorer',
  contradiction_trend_dampener: 'Contradiction Trend Dampener',
  unsupported_trend_dampener: 'Unsupported Trend Dampener',
  governance_stability_probe: 'Governance Stability Probe',
  reflection_health_probe: 'Reflection Health Probe',
  systemic_equilibrium_probe: 'Systemic Equilibrium Probe',
  recovery_cooldown_engine: 'Recovery Cooldown Engine',
  thaw_rate_limiter: 'Thaw Rate Limiter',
  recovery_suspend_guard: 'Recovery Suspend Guard',
  recursive_thaw_blocker: 'Recursive Thaw Blocker',
  governance_cooldown_thaw_limit: 'Governance Cooldown Thaw Limit',
  confidence_ceiling_enforcer: 'Confidence Ceiling Enforcer',
  safe_mode_respect_guard: 'Safe Mode Respect Guard',
  recovery_timeline_compressor: 'Recovery Timeline Compressor',
  meta_recovery_snapshot: 'Meta Recovery Snapshot',
  partial_restore_engine: 'Partial Restore Engine',
  recovery_dashboard: 'Recovery Dashboard',
  conservative_recovery_safe_mode: 'Conservative Recovery Safe Mode',
};

export const RECOVERY_STAGE_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'freeze',
  1: 'hold',
  2: 'reduce-hold',
  3: 'watch',
  4: 'buy-watch',
};
