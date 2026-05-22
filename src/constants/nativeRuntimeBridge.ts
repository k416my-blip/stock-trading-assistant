import type { RuntimeKillRiskLevel } from '../types/nativeRuntimeBridge';

export const NATIVE_BRIDGE_VERSION = 1;
export const REAL_TRADING_ENABLED = false as const;

export const KILL_RISK_LABELS_JA: Record<RuntimeKillRiskLevel, string> = {
  LOW: '低',
  MODERATE: '中',
  HIGH: '高',
  IMMINENT: '切迫',
};

export const NATIVE_UI_LABELS_JA = {
  nativeVsHeuristic: 'Native / Heuristic',
  killRisk: 'Kill Risk',
  anrRisk: 'ANR Risk',
  miuiEvents: 'MIUI Reclaim Events',
  lifecycleTimeline: 'Lifecycle Timeline',
  confidenceMap: 'Telemetry Confidence',
  memoryClass: 'Memory Class',
  soakExport: 'Soak CSV',
  bridgeUnavailable: 'Native bridge unavailable — heuristic fallback',
} as const;

export const SOAK_MODE_MIN_SESSION_MINUTES = 360;
export const LIFECYCLE_TIMELINE_MAX = 48;
export const LONG_SOAK_RECORD_MAX = 2000;
export const MIUI_RECLAIM_BURST_THRESHOLD = 3;
export const NATIVE_CONFIDENCE_WEIGHT_MIN = 0.35;
