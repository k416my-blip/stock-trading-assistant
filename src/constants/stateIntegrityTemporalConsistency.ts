import type { IntegrityFeatureId, TemporalLayerId } from '../types/stateIntegrityTemporalConsistency';

export const TEMPORAL_REGULATORY_JA =
  'State Integrity & Temporal Consistency — AI layer/event/replay/governance の状態整合を保証します。Paper Trading のみ・realTradingEnabled=false・実注文なし・state consistency 専用。';

export const TEMPORAL_AI_PROMPT_JA = `
【State Integrity & Temporal Consistency】
- stateVersion / consistencyScore / replay integrity / governance age を優先。
- rollback 後は buy 不可（watch/hold のみ）。修復で新しい売買理由を作らない。
- realTradingEnabled は常に false。
`.trim();

export const TEMPORAL_UI_LABELS_JA = {
  panelTitle: 'Integrity Dashboard',
  health: 'State Health',
  version: 'State Version',
  consistency: 'Consistency Score',
  trace: 'Trace Consistency',
  drift: 'Drift Score',
  governanceAge: 'Governance Age',
  replay: 'Replay Integrity',
  stale: 'Stale States',
  async: 'Async Conflicts',
  snapshots: 'Snapshots',
  rollback: 'Rollback Points',
  freeze: 'Emergency Freeze',
} as const;

/** Paper only — never enable real trading via this layer */
export const REAL_TRADING_ENABLED = false as const;

export const GOVERNANCE_MAX_AGE_MS = 15 * 60 * 1000;
export const REPLAY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const TRACE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const SNAPSHOT_MAX_COUNT = 30;
export const CHECKPOINT_MAX_COUNT = 20;
export const REPLAY_CHECKPOINT_MAX = 40;
export const SNAPSHOT_MAX_BYTES = 64_000;
export const LAYER_ALIGN_MAX_SKEW_MS = 120_000;
export const CONSENSUS_DRIFT_THRESHOLD = 18;

export const VERSIONING_FORMULA_JA =
  'globalVersion = persist.version + 1（単調増加）；layerVersion = hash(layerId + generatedAt)；fingerprint = hash(regime+holdings+queue)';

export const REPLAY_INTEGRITY_FORMULA_JA =
  'integrityHash = hash(version|at|finalDecision|explainableScore)；連鎖不一致または age>REPLAY_MAX → replayIntegrityOk=false';

export const DRIFT_DETECTION_FORMULA_JA =
  'driftScore = |governance.consensusScore − trace.explainableScore|；> CONSENSUS_DRIFT_THRESHOLD → watch';

export const ASYNC_RACE_FORMULA_JA =
  'refreshGenerationStale=true → 結果破棄；multiRefreshLocked=duplicateRefreshBlocked ∨ renderBudgetBlocked>5';

export const TEMPORAL_FLOW_STEPS_JA = [
  'Global version bump → Immutable snapshot + fingerprint',
  'Temporal ordering → Event causality + layer timestamp alignment',
  'Replay integrity guard → Stale replay isolation',
  'Governance freshness gate → Drift / zombie / circular audit',
  'Emergency freeze or rollback → watch/hold downgrade only',
];

export const ROLLBACK_FLOW_JA = [
  'integrityScore < 45 または replayIntegrityOk=false → rollbackApplied',
  '最新 checkpoint 以前の snapshot を参照（読取のみ）',
  'strategy の buy/reduce を watch/hold に降格（新規売買判断は作らない）',
  'governance finalDecision が buy なら watch に矯正',
];

export const STALE_ISOLATION_FLOW_JA = [
  'governanceAge > GOVERNANCE_MAX → stale、buy 推奨ブロック',
  'replay age > REPLAY_MAX → timeline から隔離',
  'trace age > TRACE_MAX → explainability sampling のみ',
  'zombie: layer enabled だが generatedAt null',
];

export const DETERMINISTIC_REBUILD_FLOW_JA = [
  '同一 fingerprint + 同一 globalVersion → layer 入力ハッシュ一致',
  'async race で stale generation は適用しない',
  'partial recompute は reactive pendingLayers と整合必須',
];

export const LAYER_DEPENDENCY_EDGES: Array<{ from: TemporalLayerId; to: TemporalLayerId; noteJa: string }> = [
  { from: 'stability', to: 'governance', noteJa: '健全性→裁定' },
  { from: 'reactive', to: 'governance', noteJa: 'イベント順→再計算' },
  { from: 'governance', to: 'strategy', noteJa: '裁定→推奨' },
  { from: 'resource', to: 'cognitive_trace', noteJa: '予算→trace' },
  { from: 'cognitive_trace', to: 'governance', noteJa: 'trace→合意検証' },
];

export const INTEGRITY_FEATURE_LABELS: Record<IntegrityFeatureId, string> = {
  global_state_versioning: 'Global State Versioning',
  immutable_snapshot_system: 'Immutable Snapshot System',
  temporal_ordering_engine: 'Temporal Ordering Engine',
  event_causality_validation: 'Event Causality Validation',
  replay_integrity_guard: 'Replay Integrity Guard',
  snapshot_fingerprint: 'Snapshot Fingerprint',
  zombie_state_detection: 'Zombie State Detection',
  async_race_resolver: 'Async Race Resolver',
  consensus_drift_detector: 'Consensus Drift Detector',
  governance_freshness_gate: 'Governance Freshness Gate',
  stale_replay_isolation: 'Stale Replay Isolation',
  timeline_integrity_audit: 'Timeline Integrity Audit',
  layer_dependency_validator: 'Layer Dependency Validator',
  circular_state_guard: 'Circular State Guard',
  multi_refresh_lock: 'Multi-refresh Lock',
  temporal_rollback: 'Temporal Rollback',
  snapshot_compression: 'Snapshot Compression',
  replay_checkpoint: 'Replay Checkpoint',
  state_recovery_engine: 'State Recovery Engine',
  partial_recompute_validator: 'Partial Recompute Validator',
  contradiction_persistence_audit: 'Contradiction Persistence Audit',
  governance_version_sync: 'Governance Version Sync',
  layer_timestamp_alignment: 'Layer Timestamp Alignment',
  deterministic_rebuild: 'Deterministic Rebuild',
  ai_context_isolation: 'AI Context Isolation',
  trace_consistency_score: 'Trace Consistency Score',
  event_replay_simulator: 'Event Replay Simulator',
  state_health_score: 'State Health Score',
  integrity_dashboard: 'Integrity Dashboard',
  emergency_state_freeze: 'Emergency State Freeze',
};
