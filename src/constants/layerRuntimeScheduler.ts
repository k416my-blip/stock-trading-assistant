import type { LayerRuntimeMode } from '../types/layerRuntimeScheduler';

export const ANALYSIS_MODE_DURATION_MS = 120_000;
export const ANALYSIS_REQUEST_KEYWORDS_JA = [
  '深く分析',
  '詳しく分析',
  '理由',
  'なぜ',
  '長期',
  '戦略',
  '因果',
  '根拠',
  '検証',
  '深掘り',
  '分析して',
  'explain why',
  'long term',
  'strategy analysis',
] as const;

export const THERMAL_DEEP_FREEZE_THRESHOLD = 70;
export const BATTERY_SURVIVAL_THRESHOLD_PCT = 20;
export const MEMORY_PRESSURE_SCHEDULER_THRESHOLD = 55;
export const RENDER_BURST_HIGH_THRESHOLD = 8;

export const LAYER_MODE_LABELS_JA: Record<LayerRuntimeMode, string> = {
  LIGHTWEIGHT: '軽量モード（デフォルト）',
  ANALYSIS: '分析モード（一時的）',
  SURVIVAL: 'サバイバルモード',
};

export const WEBSOCKET_SLOW_POLL_MULTIPLIER = 2.5;
export const UI_THROTTLE_MS_SURVIVAL = 4000;
export const UI_THROTTLE_MS_LIGHTWEIGHT = 2000;
export const ORCHESTRATION_RESTART_DELAY_MS = 800;
