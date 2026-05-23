import type { TelemetryConfidenceMap } from './nativeRuntimeBridge';
import type { RuntimeEffect } from '../runtime/effects/RuntimeEffectTypes';
import type { PerformanceCostRuntimeSnapshot } from './performanceCost';
import type {
  RuntimeOrchestratorEvaluation,
  RuntimeOrchestratorPolicy,
  RuntimeOrchestratorSnapshot,
  RuntimeOrchestratorState,
  RuntimeOrchestratorTransition,
} from './runtimeOrchestrator';
import type {
  AdaptiveRuntimeTuningSnapshot,
  RuntimeTelemetryEvaluation,
  RuntimeTelemetryMetricsSnapshot,
  TelemetryHealthState,
} from './runtimeTelemetry';

export type RuntimeKernelState = RuntimeOrchestratorState;

export type RuntimeSignalSource = 'native' | 'heuristic' | 'hybrid';

export type RuntimeUnifiedSignals = {
  memoryPressurePct: number;
  memoryPressureSource: RuntimeSignalSource;
  memoryPressureConfidence: number;
  thermalPressure: RuntimeTelemetryMetricsSnapshot['thermalState'];
  thermalSource: RuntimeSignalSource;
  queueDepth: number;
  renderFps: number;
  wsLatencyMs: number;
  wsReconnectStorm: boolean;
  wsJitterScore: number;
  hydrationCascadeRiskPct: number;
  hydrationInFlight: boolean;
  hydrationPaused: boolean;
  proactivePause: boolean;
  proactiveThrottle: boolean;
  miuiAggressiveReclaim: boolean;
  killRiskScore: number;
  forceMiuiSurvival: boolean;
  lifecycleForeground: boolean;
  memoryWarning: boolean;
  renderSpikeCount: number;
  cascadePressure: number;
  sessionMinutes: number;
  observedAt: string;
};

export type RuntimeGuardKernelState = {
  hydrationSerializeMode: boolean;
  hydrationPausedUntil: number;
  websocketLightweight: boolean;
  websocketHeartbeatMs: number;
  websocketOfflineDebounceUntil: number;
  proactivePause: boolean;
  proactiveThrottle: boolean;
  resumeDebounceActive: boolean;
  memoryPressureTrendPct: number;
  asyncConcurrency: number;
  queueHardLimit: number | null;
};

export type RuntimeKernelSnapshot = {
  state: RuntimeKernelState;
  stateLabelJa: string;
  previousState: RuntimeKernelState;
  dwellMs: number;
  policy: RuntimeOrchestratorPolicy;
  signals: RuntimeUnifiedSignals;
  confidenceMap: TelemetryConfidenceMap;
  guards: RuntimeGuardKernelState;
  telemetryState: TelemetryHealthState;
  metrics: RuntimeTelemetryMetricsSnapshot;
  tuning: AdaptiveRuntimeTuningSnapshot;
  orchestrator: RuntimeOrchestratorSnapshot;
  transitionHistory: RuntimeOrchestratorTransition[];
  survivalActivationCount: number;
  aiSuppressionActive: boolean;
  queuePressurePct: number;
  runtimeHealthSummaryJa: string;
  summaryJa: string;
  flapSuppressed: boolean;
  candidateState: RuntimeKernelState;
  paperTradingOnly: true;
  realTradingEnabled: false;
  measuredAt: string;
};

export type RuntimeKernelInput = {
  telemetry: RuntimeTelemetryEvaluation;
  performance: PerformanceCostRuntimeSnapshot;
  cascadePressure: number;
  sessionMinutes: number;
};

export type RuntimeDecision = {
  nextState: RuntimeKernelState;
  candidateState: RuntimeKernelState;
  flapSuppressed: boolean;
  snapshot: RuntimeKernelSnapshot;
  orchestratorEvaluation: RuntimeOrchestratorEvaluation;
  effects: RuntimeEffect[];
  confidence: TelemetryConfidenceMap;
  transitions: RuntimeOrchestratorTransition[];
};

export type RuntimeKernelEvaluation = {
  decision: RuntimeDecision;
  snapshot: RuntimeKernelSnapshot;
  orchestratorEvaluation: RuntimeOrchestratorEvaluation;
};
