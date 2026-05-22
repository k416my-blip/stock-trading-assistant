import type { RuntimeTelemetryMetricsSnapshot } from './runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from './performanceCost';

export type RuntimeOrchestratorState =
  | 'STABLE'
  | 'LIGHT_PRESSURE'
  | 'DEGRADED'
  | 'CRITICAL'
  | 'SURVIVAL';

export type RuntimeOrchestratorTransition = {
  at: string;
  from: RuntimeOrchestratorState;
  to: RuntimeOrchestratorState;
  reasonJa: string;
};

export type RuntimeOrchestratorPolicy = {
  telemetrySamplingRate: number;
  animationReduction: boolean;
  websocketHeartbeatMultiplier: number;
  websocketBatching: boolean;
  proactiveCooldown: boolean;
  suspendProactiveAi: boolean;
  compactDashboard: boolean;
  maxDashboardFps: number;
  suspendLowPriorityAsync: boolean;
  pauseNonessentialRenderLoop: boolean;
  queueHardLimit: number | null;
  disableExpensiveTransitions: boolean;
  hydrationSerializeMode: boolean;
  minimalUiMode: boolean;
  websocketSafeMode: boolean;
  disableBackgroundRefresh: boolean;
  disableSpeculativeRender: boolean;
  aiChatOnly: boolean;
  lightweightAiResponses: boolean;
  suppressAiOnReconnectStorm: boolean;
};

export type RuntimeOrchestratorInput = {
  metrics: RuntimeTelemetryMetricsSnapshot;
  performance: PerformanceCostRuntimeSnapshot;
  cascadePressure: number;
  renderSpikeCount: number;
  sessionMinutes: number;
  forceMiuiSurvival?: boolean;
  killRiskScore?: number;
};

export type RuntimeOrchestratorSnapshot = {
  state: RuntimeOrchestratorState;
  stateLabelJa: string;
  previousState: RuntimeOrchestratorState;
  stateSince: string;
  dwellMs: number;
  policy: RuntimeOrchestratorPolicy;
  summaryJa: string;
  runtimeHealthSummaryJa: string;
  transitionHistory: RuntimeOrchestratorTransition[];
  survivalActivationCount: number;
  aiSuppressionActive: boolean;
  memoryPressureTrendPct: number;
  queuePressurePct: number;
  measuredAt: string;
};

export type RuntimeOrchestratorEvaluation = {
  snapshot: RuntimeOrchestratorSnapshot;
  candidateState: RuntimeOrchestratorState;
  flapSuppressed: boolean;
};
