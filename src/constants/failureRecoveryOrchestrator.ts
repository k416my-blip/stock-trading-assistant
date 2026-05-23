export const FAILURE_RECOVERY_VERSION = '1.0.0';

export const FAILURE_RECOVERY_POLL_MS = 18_000;
export const FAILURE_RECOVERY_QUARANTINE_MS = 120_000;
export const FAILURE_RECOVERY_ESCALATION_MAX = 5;
export const FAILURE_FREEZE_LAG_MS = 420;
export const FAILURE_BRIDGE_TRAFFIC_WARN = 10;
export const FAILURE_HEAP_MB_WARN = 180;
export const FAILURE_MEMORY_TREND_WARN = 78;
export const FAILURE_NETWORK_CHAOS_WS_RECONNECT = 8;
export const FAILURE_HEARTBEAT_STALE_MS = 45_000;
export const FAILURE_THERMAL_COOLDOWN_MS = 90_000;
export const FAILURE_BACKGROUND_RESTORE_MS = 8_000;
export const FAILURE_IDLE_RECOVERY_MS = 12_000;
export const FAILURE_TIMELINE_MAX = 400;

export const FAILURE_RECOVERY_UI_JA = {
  sectionTitle: 'Self-Healing',
  safety:
    '監視・回復・隔離・段階復旧のみ — runtime policy / unified tick / telemetry 意味は変更しません',
  degradationState: 'degradationState',
  recoverySuccess: 'recoverySuccessRate',
  continuousScore: 'continuousRecoveryScore',
  quarantine: 'quarantine duration',
  bridgeRecovery: 'bridge recovery',
  freezeRecovery: 'freeze recovery',
  thermalRecovery: 'thermal recovery',
  websocketRecovery: 'websocket recovery',
  timeline: 'recovery timeline',
} as const;
