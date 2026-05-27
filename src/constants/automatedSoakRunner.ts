export const AUTOMATED_SOAK_RUNNER_VERSION = '1.0.0';
export const AUTOMATED_SOAK_DEVICE = 'Redmi Note 13 Pro 5G';
export const AUTOMATED_SOAK_STORAGE_KEY = '@sta/automated_soak_runner_v1';
export const AUTOMATED_SOAK_DEFAULT_TARGET_HOURS = 8;

export const SOAK_SCENARIO_ROTATE_MS = 4 * 60 * 1000;
export const SOAK_SNAPSHOT_INTERVAL_MS = 30 * 1000;
export const SOAK_PERSIST_INTERVAL_MS = 5 * 60 * 1000;
export const SOAK_TICK_INTERVAL_MS = 15_000;

export const SOAK_FREEZE_STALL_MS = 480;
export const SOAK_TICK_STALL_MS = 800;
export const SOAK_DEADLOCK_RISK_THRESHOLD = 0.55;

export const SOAK_UI_LABELS_JA = {
  sectionTitle: 'Soak Runner',
  safety: '実行専用 — runtime 意思決定・layer ポリシーは変更しません',
  survival: 'Survival score',
  uptime: 'Continuous uptime',
  scenario: 'Active scenario',
  scheduling: 'Scheduling mode',
  recovery: 'Avg recovery',
  freeze: 'Freeze total',
  memoryDrift: 'Memory drift/h',
  replayDrift: 'Replay drift/h',
} as const;

export const AUTOMATED_SOAK_SCENARIO_LABELS_JA: Record<string, string> = {
  foreground_background: 'Foreground ↔ Background',
  websocket_disconnect: 'WebSocket disconnect',
  thermal_stress: 'Thermal stress',
  battery_saver: 'Battery saver',
  memory_pressure: 'Memory pressure',
  async_flood: 'Async flood',
  replay_flood: 'Replay flood',
  dashboard_render_storm: 'Dashboard render storm',
  native_kill_recovery: 'Native kill recovery',
  android_lifecycle_stress: 'Android lifecycle stress',
  runtime_self_recursion_endurance: 'Runtime self-recursion endurance',
  runtime_telemetry_entropy: 'Runtime telemetry entropy',
  runtime_cognitive_governance: 'Runtime cognitive governance',
  runtime_civilization_topology: 'Runtime civilization topology',
  runtime_meta_limit_governance: 'Runtime meta-limit governance',
  runtime_federation_governance: 'Runtime federation governance',
  runtime_ontology_stabilization: 'Runtime ontology stabilization',
  runtime_finite_boundary: 'Runtime finite boundary',
  runtime_semantic_compression: 'Runtime semantic compression',
  runtime_semantic_gravity: 'Runtime semantic gravity',
  runtime_semantic_thermodynamics: 'Runtime semantic thermodynamics',
  runtime_semantic_phase_transition: 'Runtime semantic phase transition',
  runtime_adaptive_observation: 'Runtime adaptive observation',
  runtime_observer_reality_selection: 'Runtime observer reality selection',
  runtime_inter_civilization_resonance: 'Runtime inter-civilization resonance',
  runtime_governance_freeze: 'Runtime governance freeze',
};
