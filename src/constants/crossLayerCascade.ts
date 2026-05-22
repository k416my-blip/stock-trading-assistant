import type { CascadeState, CrossLayerTriggerKind } from '../types/crossLayerCascade';

export const CASCADE_STATE_LABELS_JA: Record<CascadeState, string> = {
  CASCADE_STABLE: 'カスケード安定',
  CASCADE_BUILDING: 'カスケード蓄積',
  CASCADE_FRAGMENTING: 'カスケード断片化',
  CASCADE_CRITICAL: 'カスケード危機',
};

export const CASCADE_WINDOW_MS = 60_000;
export const LONG_SESSION_MINUTES = 30;
export const EXPLANATION_COOLDOWN_MS = 8_000;
export const HYDRATION_COOLDOWN_MS = 12_000;
export const FOREGROUND_RESUME_DEBOUNCE_MS = 1_200;
export const WEBSOCKET_RECONNECT_BASE_MS = 1_500;
export const WEBSOCKET_RECONNECT_MAX_MS = 45_000;
export const THERMAL_RUNAWAY_DELTA_THRESHOLD = 12;

export const TRIGGER_BUDGET_PER_MINUTE: Record<CrossLayerTriggerKind, number> = {
  orchestration_rebuild: 6,
  explanation_regeneration: 8,
  contradiction_repair: 5,
  freeze_recovery: 6,
  confidence_recalibration: 10,
  deep_analysis_activation: 3,
};

export const CASCADE_BUILDING_PRESSURE = 38;
export const CASCADE_FRAGMENTING_PRESSURE = 58;
export const CASCADE_CRITICAL_PRESSURE = 78;

export const CASCADE_UI_LABELS_JA = {
  panelSection: 'Cross-Layer Cascade Guard',
  cascadePressure: 'Cascade Pressure',
  orchestrationFanout: 'Orchestration Fanout',
  reasoningLoopRisk: 'Reasoning Loop Risk',
  renderCascadeRisk: 'Render Cascade Risk',
  explanationStormRisk: 'Explanation Storm Risk',
  crossLayerHealth: 'Cross-Layer Health',
  state: 'Cascade State',
  recursiveDepth: 'Recursive Orch Depth',
  explanationRebuild: 'Explanation Rebuild/min',
  freezeLoop: 'Freeze/Recovery Loop',
} as const;
