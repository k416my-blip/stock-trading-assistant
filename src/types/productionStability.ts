import type { ApiCostDashboard } from './performanceCost';
import type { PerformanceCostRuntimeSnapshot } from './performanceCost';

export type EmergencySafeModeLevel = 0 | 1 | 2 | 3;

export type CircuitState = 'closed' | 'open' | 'half_open';

export type ApiCircuitStatus = {
  provider: string;
  state: CircuitState;
  consecutiveFailures: number;
  openUntil: string | null;
  lastFailureAt: string | null;
};

export type ProductionProfilerMetrics = {
  lastRenderMs: number | null;
  avgRenderMs: number | null;
  lastApiLatencyMs: number | null;
  avgApiLatencyMs: number | null;
  estimatedHeapMB: number | null;
  sessionUptimeMinutes: number;
};

export type StateAuditFinding = {
  id: string;
  severity: 'info' | 'warning';
  labelJa: string;
  detailJa: string;
};

export type ReadinessCheckItem = {
  id: string;
  labelJa: string;
  passed: boolean;
  detailJa: string;
};

export type ProductionStabilitySnapshot = {
  generatedAt: string;
  emergencyLevel: EmergencySafeModeLevel;
  emergencyReasonJa: string | null;
  backgroundAiPaused: boolean;
  circuits: ApiCircuitStatus[];
  tokenBudgetJa: string;
  openAiTokensUsed24h: number;
  xCallsUsed24h: number;
  proactiveQueueSize: number;
  proactiveQueueTrimmed: number;
  notificationFloodBlocked: number;
  staleAsyncResponsesBlocked: number;
  renderBudgetBlocked: number;
  effectLoopWarnings: string[];
  stateAuditFindings: StateAuditFinding[];
  profiler: ProductionProfilerMetrics;
  registeredIntervals: number;
  registeredListeners: number;
  offlineRecoveryPending: boolean;
  runtime: PerformanceCostRuntimeSnapshot | null;
  costDashboard: ApiCostDashboard | null;
  debugLogCount: number;
};

export type ProductionStabilityBundle = {
  snapshot: ProductionStabilitySnapshot;
  readiness: ReadinessCheckItem[];
  longSessionNoteJa: string;
  dependencyHintsJa: string[];
};
