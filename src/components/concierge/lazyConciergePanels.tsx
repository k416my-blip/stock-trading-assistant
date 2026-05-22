import { lazy } from 'react';

export const LazyAutonomousMonitoringPanel = lazy(() =>
  import('./AutonomousMonitoringPanel').then((m) => ({ default: m.AutonomousMonitoringPanel })),
);

export const LazyAiPerformanceCenterPanel = lazy(() =>
  import('./AiPerformanceCenterPanel').then((m) => ({ default: m.AiPerformanceCenterPanel })),
);

export const LazyAiActionCenterPanel = lazy(() =>
  import('./AiActionCenterPanel').then((m) => ({ default: m.AiActionCenterPanel })),
);

export const LazyMetaTopPrioritiesPanel = lazy(() =>
  import('./MetaTopPrioritiesPanel').then((m) => ({ default: m.MetaTopPrioritiesPanel })),
);

export const LazyExecutionDashboardPanel = lazy(() =>
  import('./ExecutionDashboardPanel').then((m) => ({ default: m.ExecutionDashboardPanel })),
);

export const LazySelfEvaluationPanel = lazy(() =>
  import('./SelfEvaluationPanel').then((m) => ({ default: m.SelfEvaluationPanel })),
);

export const LazyWorldStatePanel = lazy(() =>
  import('./WorldStatePanel').then((m) => ({ default: m.WorldStatePanel })),
);

export const LazyDataReliabilityPanel = lazy(() =>
  import('./DataReliabilityPanel').then((m) => ({ default: m.DataReliabilityPanel })),
);

export const LazyPortfolioRiskExposurePanel = lazy(() =>
  import('./PortfolioRiskExposurePanel').then((m) => ({
    default: m.PortfolioRiskExposurePanel,
  })),
);

export const LazyCapitalAllocationPanel = lazy(() =>
  import('./CapitalAllocationPanel').then((m) => ({
    default: m.CapitalAllocationPanel,
  })),
);

export const LazySystemStabilityIntegrityPanel = lazy(() =>
  import('./SystemStabilityIntegrityPanel').then((m) => ({
    default: m.SystemStabilityIntegrityPanel,
  })),
);

export const LazyAiGovernancePanel = lazy(() =>
  import('./AiGovernancePanel').then((m) => ({
    default: m.AiGovernancePanel,
  })),
);

export const LazyReactiveEventDashboardPanel = lazy(() =>
  import('./ReactiveEventDashboardPanel').then((m) => ({
    default: m.ReactiveEventDashboardPanel,
  })),
);

export const LazyExplainabilityDashboardPanel = lazy(() =>
  import('./ExplainabilityDashboardPanel').then((m) => ({
    default: m.ExplainabilityDashboardPanel,
  })),
);

export const LazyResourceDashboardPanel = lazy(() =>
  import('./ResourceDashboardPanel').then((m) => ({
    default: m.ResourceDashboardPanel,
  })),
);

export const LazyIntegrityDashboardPanel = lazy(() =>
  import('./IntegrityDashboardPanel').then((m) => ({
    default: m.IntegrityDashboardPanel,
  })),
);

export const LazySemanticDashboardPanel = lazy(() =>
  import('./SemanticDashboardPanel').then((m) => ({
    default: m.SemanticDashboardPanel,
  })),
);

export const LazyReliabilityDashboardPanel = lazy(() =>
  import('./ReliabilityDashboardPanel').then((m) => ({
    default: m.ReliabilityDashboardPanel,
  })),
);

export const LazyArbitrationDashboardPanel = lazy(() =>
  import('./ArbitrationDashboardPanel').then((m) => ({
    default: m.ArbitrationDashboardPanel,
  })),
);

export const LazyMetaAuditDashboardPanel = lazy(() =>
  import('./MetaAuditDashboardPanel').then((m) => ({
    default: m.MetaAuditDashboardPanel,
  })),
);

export const LazyMemoryCompressionDashboardPanel = lazy(() =>
  import('./MemoryCompressionDashboardPanel').then((m) => ({
    default: m.MemoryCompressionDashboardPanel,
  })),
);

export const LazySystemicStabilityDashboardPanel = lazy(() =>
  import('./SystemicStabilityDashboardPanel').then((m) => ({
    default: m.SystemicStabilityDashboardPanel,
  })),
);

export const LazyExecutionRecoveryDashboardPanel = lazy(() =>
  import('./ExecutionRecoveryDashboardPanel').then((m) => ({
    default: m.ExecutionRecoveryDashboardPanel,
  })),
);

export const LazyDynamicOrchestrationDashboardPanel = lazy(() =>
  import('./DynamicOrchestrationDashboardPanel').then((m) => ({
    default: m.DynamicOrchestrationDashboardPanel,
  })),
);

export const LazyMarketRegimeDashboardPanel = lazy(() =>
  import('./MarketRegimeDashboardPanel').then((m) => ({
    default: m.MarketRegimeDashboardPanel,
  })),
);

export const LazyCognitiveConsensusDashboardPanel = lazy(() =>
  import('./CognitiveConsensusDashboardPanel').then((m) => ({
    default: m.CognitiveConsensusDashboardPanel,
  })),
);

export const LazyMetaReliabilityDashboardPanel = lazy(() =>
  import('./MetaReliabilityDashboardPanel').then((m) => ({
    default: m.MetaReliabilityDashboardPanel,
  })),
);

export const LazySelfArchitectureDashboardPanel = lazy(() =>
  import('./SelfArchitectureDashboardPanel').then((m) => ({
    default: m.SelfArchitectureDashboardPanel,
  })),
);

export const LazyEpistemicIntegrityDashboardPanel = lazy(() =>
  import('./EpistemicIntegrityDashboardPanel').then((m) => ({
    default: m.EpistemicIntegrityDashboardPanel,
  })),
);

export const LazyStrategicMemoryGraphDashboardPanel = lazy(() =>
  import('./StrategicMemoryGraphDashboardPanel').then((m) => ({
    default: m.StrategicMemoryGraphDashboardPanel,
  })),
);

export const LazyCognitiveResourceEconomyDashboardPanel = lazy(() =>
  import('./CognitiveResourceEconomyDashboardPanel').then((m) => ({
    default: m.CognitiveResourceEconomyDashboardPanel,
  })),
);

export const LazyUnifiedCognitiveStateDashboardPanel = lazy(() =>
  import('./UnifiedCognitiveStateDashboardPanel').then((m) => ({
    default: m.UnifiedCognitiveStateDashboardPanel,
  })),
);

export const LazyHumanIntentContinuityDashboardPanel = lazy(() =>
  import('./HumanIntentContinuityDashboardPanel').then((m) => ({
    default: m.HumanIntentContinuityDashboardPanel,
  })),
);

export const LazyAdaptiveExplorationDashboardPanel = lazy(() =>
  import('./AdaptiveExplorationDashboardPanel').then((m) => ({
    default: m.AdaptiveExplorationDashboardPanel,
  })),
);

export const LazyConstitutionalGovernanceDashboardPanel = lazy(() =>
  import('./ConstitutionalGovernanceDashboardPanel').then((m) => ({
    default: m.ConstitutionalGovernanceDashboardPanel,
  })),
);

export const LazyExplainableGovernanceDashboardPanel = lazy(() =>
  import('./ExplainableGovernanceDashboardPanel').then((m) => ({
    default: m.ExplainableGovernanceDashboardPanel,
  })),
);

export const LazyRuntimeSurvivalDashboardPanel = lazy(() =>
  import('./RuntimeSurvivalDashboardPanel').then((m) => ({
    default: m.RuntimeSurvivalDashboardPanel,
  })),
);

export const LazyRuntimeTelemetryDashboardPanel = lazy(() =>
  import('./RuntimeTelemetryDashboardPanel').then((m) => ({
    default: m.RuntimeTelemetryDashboardPanel,
  })),
);
