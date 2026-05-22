import type { RuntimeOrchestratorState } from '../types/runtimeOrchestrator';

export const REAL_TRADING_ENABLED = false as const;

export const ORCHESTRATOR_STATE_LABELS_JA: Record<RuntimeOrchestratorState, string> = {
  STABLE: 'ランタイム安定',
  LIGHT_PRESSURE: '軽負荷',
  DEGRADED: '劣化モード',
  CRITICAL: '危機モード',
  SURVIVAL: 'サバイバル',
};

export const ORCHESTRATOR_DEGRADED_MIN_MS = 20_000;
export const ORCHESTRATOR_CRITICAL_MIN_MS = 45_000;
export const ORCHESTRATOR_SURVIVAL_MIN_MS = 45_000;
export const ORCHESTRATOR_UPGRADE_CONFIRM_MS = 2_500;
export const ORCHESTRATOR_TRANSITION_HISTORY_MAX = 16;

export const ORCHESTRATOR_UI_LABELS_JA = {
  runtimeState: 'Runtime State',
  transitionHistory: 'State Transitions',
  survivalActivations: 'Survival Activations',
  queuePressure: 'Queue Pressure',
  aiSuppression: 'AI Suppression',
  memoryTrend: 'Memory Pressure Trend',
} as const;

/** Severity order for hysteresis (higher = worse). */
export const ORCHESTRATOR_STATE_SEVERITY: Record<RuntimeOrchestratorState, number> = {
  STABLE: 0,
  LIGHT_PRESSURE: 1,
  DEGRADED: 2,
  CRITICAL: 3,
  SURVIVAL: 4,
};
