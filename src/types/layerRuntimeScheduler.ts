import type { PerformanceCostRuntimeSnapshot } from './performanceCost';
import type { RuntimeState } from './runtimeSurvivalMobileResilience';

export type LayerRuntimeMode = 'LIGHTWEIGHT' | 'ANALYSIS' | 'SURVIVAL';

export type SchedulableDeepLayerId =
  | 'epistemicIntegrity'
  | 'strategicMemoryGraph'
  | 'adaptiveExploration';

export type LayerRuntimeFlags = {
  runtimeSurvival: boolean;
  constitutionalGovernance: boolean;
  explainableGovernance: boolean;
  unifiedCognitiveState: boolean;
  epistemicIntegrity: boolean;
  strategicMemoryGraph: boolean;
  adaptiveExploration: boolean;
};

export type LayerRuntimeActions = {
  deepOrchestrationFreeze: boolean;
  websocketPollingSlowdown: boolean;
  memoryGraphPause: boolean;
  adaptiveExplorationPause: boolean;
  uiUpdateThrottle: boolean;
  animationSuppression: boolean;
  dashboardMinimalRender: boolean;
  explanationSimplification: boolean;
  deepReasoningFreeze: boolean;
  cacheFirstMode: boolean;
  delayedOrchestrationRestart: boolean;
};

export type MobileRuntimeMetricsSnapshot = {
  runtimeFPS: number;
  jsThreadPressurePct: number;
  estimatedMemoryPressurePct: number;
  renderBurstRate: number;
  websocketReconnectRate: number;
  backgroundResumeRecoveryMs: number | null;
  schedulerMode: LayerRuntimeMode;
  measuredAt: string;
};

export type LayerRuntimeSchedulePlan = {
  mode: LayerRuntimeMode;
  modeLabelJa: string;
  layers: LayerRuntimeFlags;
  actions: LayerRuntimeActions;
  analysisExpiresAt: string | null;
  mobileMetrics: MobileRuntimeMetricsSnapshot;
  summaryJa: string;
};

export type ResolveLayerRuntimeScheduleInput = {
  performance: PerformanceCostRuntimeSnapshot;
  memoryPressure: boolean;
  queueSize: number;
  thermalPressurePct: number;
  batteryLevelPct: number | null;
  websocketUnstable: boolean;
  runtimeState: RuntimeState | null;
  analysisExplicit: boolean;
  confidenceCollapse: boolean;
  contradictionActive: boolean;
  renderBurstRate?: number;
  backgroundResumeMs?: number | null;
};
