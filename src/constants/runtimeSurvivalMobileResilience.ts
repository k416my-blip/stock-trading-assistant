import type {
  RuntimeAuditTargetId,
  RuntimeFeatureId,
  RuntimeState,
} from '../types/runtimeSurvivalMobileResilience';

export const RUNTIME_SURVIVAL_REGULATORY_JA =
  'Runtime Survival & Mobile Resilience — モバイル実運用 survivability（Redmi Note 15 Pro 5G想定）。hidden background・stealth persistence禁止。Paper Trading・realTradingEnabled=false。';

export const RUNTIME_SURVIVAL_AI_PROMPT_JA = `
【Runtime Survival & Mobile Resilience】
- 知能強化ではなく実機生存性。process kill・offline・battery saver・thermal・memory reclaim に耐える graceful degradation。
- aggressive polling・recursive reconnect・hidden wakelock・stealth background 禁止。cache-first・lightweight hydration のみ。
`.trim();

export const REAL_TRADING_ENABLED = false as const;
export const RUNTIME_PRESSURE_STRESSED_THRESHOLD = 60;
export const RUNTIME_PRESSURE_DEGRADED_THRESHOLD = 75;
export const RUNTIME_FRAGMENTATION_FRAGMENTED_THRESHOLD = 70;
export const OFFLINE_RESILIENCE_OFFLINE_THRESHOLD = 40;
export const RUNTIME_HEALTH_CRITICAL_THRESHOLD = 30;
export const BUDGET_RUNTIME_STABLE = 96;
export const BUDGET_RUNTIME_STRESSED = 88;
export const BUDGET_RUNTIME_DEGRADED = 72;
export const BUDGET_RUNTIME_FRAGMENTED = 65;
export const BUDGET_RUNTIME_OFFLINE = 58;
export const BUDGET_RUNTIME_CRITICAL = 48;
export const RUNTIME_TIMELINE_MAX = 48;

export const RUNTIME_STABILITY_FORMULA_JA =
  'runtimeStability = (runtimeHealth + backgroundContinuity + websocketContinuity + hydrationIntegrity + mobileSurvivability) / 5';

export const RUNTIME_PRESSURE_FORMULA_JA =
  'runtimePressure = (memoryPressure + thermalPressure + batteryPressure + apiTimeoutPressure + runtimeFragmentation + processKillRisk) / 6';

export const RUNTIME_RECOVERY_FORMULA_JA =
  'runtimeRecoveryScore = (offlineResilience + resumeRecoveryIntegrity) / 2';

export const RUNTIME_FLOW_JA = [
  'Read AppState / NetInfo / perf snapshot → Score runtime pressure & stability',
  'Apply survival / lightweight / offline modes → Handoff to orchestration',
  'Persist runtime snapshot (cache-first, no raw background loops)',
];

export const RUNTIME_STATE_LABELS_JA: Record<RuntimeState, string> = {
  RUNTIME_STABLE: 'ランタイム安定',
  RUNTIME_STRESSED: 'ランタイム負荷',
  RUNTIME_DEGRADED: 'ランタイム劣化',
  RUNTIME_FRAGMENTED: 'ランタイム断片化',
  RUNTIME_OFFLINE: 'オフライン',
  RUNTIME_CRITICAL: 'サバイバル',
};

export const RUNTIME_AUDIT_LABELS_JA: Record<RuntimeAuditTargetId, string> = {
  runtimeHealth: 'Runtime Health',
  backgroundContinuity: 'Background Continuity',
  memoryPressure: 'Memory Pressure',
  thermalPressure: 'Thermal Pressure',
  batteryPressure: 'Battery Pressure',
  offlineResilience: 'Offline Resilience',
  websocketContinuity: 'Websocket Continuity',
  hydrationIntegrity: 'Hydration Integrity',
  resumeRecoveryIntegrity: 'Resume Recovery Integrity',
  apiTimeoutPressure: 'API Timeout Pressure',
  runtimeFragmentation: 'Runtime Fragmentation',
  processKillRisk: 'Process Kill Risk',
  mobileSurvivability: 'Mobile Survivability',
};

export const RUNTIME_UI_LABELS_JA = {
  panelTitle: 'Runtime Survival Dashboard',
  health: 'Runtime Health',
  memory: 'Memory Pressure',
  battery: 'Battery Pressure',
  thermal: 'Thermal Pressure',
  websocket: 'Websocket Continuity',
  hydration: 'Hydration Integrity',
  processKill: 'Process Kill Risk',
  offline: 'Offline Resilience',
  state: 'Runtime State',
  stability: 'Runtime Stability',
  pressure: 'Runtime Pressure',
  schedulerMode: 'Layer Scheduler',
  runtimeFps: 'Runtime FPS',
  jsThreadPressure: 'JS Thread Pressure',
  estimatedMemory: 'Est. Memory Pressure',
  renderBurst: 'Render Burst / min',
  wsReconnect: 'WS Reconnect Rate',
  backgroundResume: 'Background Resume (ms)',
} as const;


export const RUNTIME_FEATURE_LABELS: Record<RuntimeFeatureId, string> = {
  appstate_lifecycle: 'AppState Lifecycle',
  netinfo_offline: 'NetInfo Offline',
  hydration_persistence: 'Hydration Persistence',
  websocket_reconnect_policy: 'Websocket Reconnect Policy',
  cache_first_orchestration: 'Cache-First Orchestration',
  suspend_resume_recovery: 'Suspend/Resume Recovery',
  offline_fallback: 'Offline Fallback',
  stale_dashboard_recovery: 'Stale Dashboard Recovery',
  lightweight_timers: 'Lightweight Timers',
  no_infinite_polling: 'No Infinite Polling',
  reconnect_backoff: 'Reconnect Backoff',
  survival_mode: 'Survival Mode',
  lightweight_mode: 'Lightweight Mode',
  deep_orch_suppression: 'Deep Orchestration Suppression',
  runtime_rebuild_hint: 'Runtime Rebuild Hint',
  no_stealth_wakelock: 'No Stealth Wakelock',
  no_hidden_background: 'No Hidden Background',
  runtime_timeline: 'Runtime Timeline',
  mobile_lite_survival: 'Mobile Lite Survival',
  runtime_dashboard: 'Runtime Dashboard',
  paper_trading_safety: 'Paper Trading Safety',
};
