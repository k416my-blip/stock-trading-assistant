import type { DriftPhase } from './adaptiveRuntimeGovernance';
import type { LatentRuntimeStateKind } from './runtimeLatentStateInference';

export const RUNTIME_JOURNAL_EVENT_KINDS = [
  'orchestration_start',
  'orchestration_end',
  'cascade_trigger',
  'async_queue_saturation',
  'event_loop_pressure',
  'websocket_reconnect',
  'hydration_pause',
  'hydration_resume',
  'rollback_execution',
  'adaptive_drift_transition',
  'thermal_downgrade',
  'battery_saver_transition',
  'starvation_detected',
  'snapshot_captured',
  'replay_divergence',
] as const;

export type RuntimeJournalEventKind = (typeof RUNTIME_JOURNAL_EVENT_KINDS)[number];

export type RuntimeJournalEvent = {
  id: number;
  at: string;
  atMs: number;
  kind: RuntimeJournalEventKind;
  detailJa: string;
  /** Compact numeric payload — system metrics only */
  v1?: number;
  v2?: number;
  tag?: string;
};

export type StarvationPhase = 'STARVATION_NONE' | 'STARVATION_WARNING' | 'STARVATION_CRITICAL';

export type SnapshotTrigger =
  | 'CRITICAL'
  | 'rollback'
  | 'starvation'
  | 'event_loop_saturated'
  | 'replay_divergence';

export type RuntimeForensicSnapshot = {
  id: string;
  at: string;
  trigger: SnapshotTrigger;
  orchestrationState: string;
  queueDepth: number;
  activeLayers: string[];
  adaptiveConfidence: number;
  driftScore: number;
  driftPhase: DriftPhase | 'unknown';
  thermalLevel: string;
  batterySaver: boolean;
  websocketState: string;
  renderBurstCount: number;
  eventLoopLagMs: number;
};

export type RootCauseCandidate = {
  kind: string;
  confidence: number;
  detailJa: string;
  chain: string[];
};

export type FailureTimeline = {
  builtAt: string;
  events: RuntimeJournalEvent[];
  cascadeSequence: string[];
  rootCauseCandidates: RootCauseCandidate[];
  summaryJa: string;
};

export type HydrationForensicChain = {
  steps: { at: string; kind: string; detailJa: string }[];
  overlapCount: number;
  raceDetected: boolean;
  summaryJa: string;
};

export type WebSocketFailureAnalytics = {
  reconnectJitterMs: number;
  stormCount: number;
  silentDisconnectCount: number;
  offlineFalsePositiveCount: number;
  heartbeatInstabilityScore: number;
  resumeReconnectLatencyMs: number;
  events: RuntimeJournalEvent[];
};

export type AdaptiveForensicsView = {
  learnedEdgeEvolution: { edgeKey: string; weight: number; hits: number }[];
  replayInstabilityHistory: { at: string; divergence: number }[];
  rollbackHistory: { id: string; at: string; reason: string }[];
  staleLineage: string[];
  falseCausalChain: string[];
};

export type LongSessionWindow = 30 | 60 | 120;

export type LongSessionDegradationReport = {
  windowMinutes: LongSessionWindow;
  memoryCreepPct: number;
  queueGrowth: number;
  renderBurstGrowth: number;
  reconnectFrequency: number;
  adaptiveInstabilityTrend: number;
  eventLoopDegradationMs: number;
  summaryJa: string;
};

export type RuntimeObservabilityDashboard = {
  eventTimeline: RuntimeJournalEvent[];
  asyncQueueHeatmap: { at: string; depth: number; lagMs: number }[];
  orchestrationGraph: { state: string; at: string }[];
  reconnectMap: { at: string; detailJa: string }[];
  hydrationCollisionMap: { at: string; overlap: number }[];
  adaptiveDriftTimeline: { at: string; phase: string; score: number }[];
  rollbackHistory: { at: string; reason: string }[];
  starvationEpisodes: { at: string; phase: StarvationPhase }[];
  longSessionTrend: LongSessionDegradationReport[];
};

export type RuntimeObservabilityBundle = {
  version: string;
  builtAt: string;
  journalEventCount: number;
  memoryBytesEstimate: number;
  dashboard: RuntimeObservabilityDashboard;
  failureTimeline: FailureTimeline;
  starvationPhase: StarvationPhase;
  hydrationForensics: HydrationForensicChain;
  websocketAnalytics: WebSocketFailureAnalytics;
  adaptiveForensics: AdaptiveForensicsView;
  snapshots: RuntimeForensicSnapshot[];
};

export type RedmiObservabilityReport = {
  deviceModel: string;
  forensicReconstructionQuality: number;
  asyncStarvationDetectability: number;
  reconnectFailureObservability: number;
  longSessionTraceStability: number;
  memoryOverheadKb: number;
  snapshotFrequency: number;
  compressionEfficiency: number;
  replayDeterminismQuality: number;
  summaryJa: string;
};

export type FailureReplayScenario =
  | 'cascade_storm'
  | 'reconnect_storm'
  | 'hydration_race'
  | 'async_starvation'
  | 'adaptive_contradiction'
  | 'thermal_degradation';

export type FailureReplayResult = {
  scenario: FailureReplayScenario;
  eventsGenerated: number;
  timeline: FailureTimeline;
  deterministic: boolean;
};
