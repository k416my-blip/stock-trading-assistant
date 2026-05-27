export const RUNTIME_SELF_RECURSION_ENDURANCE_VERSION = '1.0.0';
export const RUNTIME_SELF_RECURSION_ENDURANCE_POLL_MS = 30_000;
export const RUNTIME_SELF_RECURSION_ENDURANCE_TIMELINE_MAX = 400;
export const RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN = 120;

export const SELF_RECURSION_MONITOR_CHAIN = [
  'observer',
  'audit',
  'governance',
  'telemetry',
  'observer',
] as const;

export const RUNTIME_SELF_RECURSION_ENDURANCE_UI_JA = {
  sectionTitle: 'Self-Recursion Circuit & Endurance',
  safety:
    'observe-only circuit scoring — block/disable/rollback/pruning 禁止。suppressionSuggestion は記録のみ',
  recursionCircuitRisk: 'recursionCircuitRisk',
  observerEchoRisk: 'observerEchoRisk',
  telemetryEchoRisk: 'telemetryEchoRisk',
  auditLoopRisk: 'auditLoopRisk',
  operationalEnduranceScore: 'operationalEnduranceScore',
  dashboardPayloadGrowthRisk: 'dashboardPayloadGrowthRisk',
  longSessionDriftRisk: 'longSessionDriftRisk',
  runtimeEnduranceConfidence: 'runtimeEnduranceConfidence',
  timeline: 'self-recursion endurance timeline',
} as const;
