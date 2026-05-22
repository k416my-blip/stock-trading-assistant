export type CascadeState =
  | 'CASCADE_STABLE'
  | 'CASCADE_BUILDING'
  | 'CASCADE_FRAGMENTING'
  | 'CASCADE_CRITICAL';

export type CrossLayerTriggerKind =
  | 'orchestration_rebuild'
  | 'explanation_regeneration'
  | 'contradiction_repair'
  | 'freeze_recovery'
  | 'confidence_recalibration'
  | 'deep_analysis_activation';

export type CrossLayerCascadeMetrics = {
  cascadePressure: number;
  recursiveOrchestrationDepth: number;
  explanationRebuildRate: number;
  freezeRecoveryLoopRate: number;
  crossLayerTriggerFanout: number;
  orchestrationFanout: number;
  reasoningLoopRisk: number;
  renderCascadeRisk: number;
  explanationStormRisk: number;
  crossLayerHealth: number;
  cascadeState: CascadeState;
  sessionMinutes: number;
  measuredAt: string;
};

export type CascadeSuppressionActions = {
  explanationThrottling: boolean;
  dashboardRefreshIntervalIncrease: boolean;
  orchestrationDebounce: boolean;
  epistemicTemporaryFreeze: boolean;
  adaptiveExplorationPause: boolean;
  explanationReuseCache: boolean;
  rerenderSuppression: boolean;
  deepOrchestrationHardFreeze: boolean;
  strategicMemoryPause: boolean;
  websocketLightweightMode: boolean;
  fallbackExplanationMode: boolean;
  minimalDashboardRendering: boolean;
  longSessionLightweightFallback: boolean;
  memoryGraphPruning: boolean;
  explanationCacheCompaction: boolean;
  websocketIdleDowngrade: boolean;
  orchestrationSimplification: boolean;
};

export type CrossLayerCascadeEvaluation = {
  state: CascadeState;
  stateLabelJa: string;
  metrics: CrossLayerCascadeMetrics;
  actions: CascadeSuppressionActions;
  summaryJa: string;
  triggerBudgetBlocked: CrossLayerTriggerKind[];
};

export type EvaluateCrossLayerCascadeInput = {
  renderBurstRate: number;
  queueSize: number;
  memoryPressure: boolean;
  thermalPressurePct: number;
  websocketUnstable: boolean;
  contradictionActive: boolean;
  confidenceCollapse: boolean;
  orchestrationRebuildSkipped?: boolean;
  explanationRegenerationSkipped?: boolean;
};
