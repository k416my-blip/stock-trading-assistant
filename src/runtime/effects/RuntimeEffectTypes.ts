import type { RuntimeOrchestratorPolicy } from '../../types/runtimeOrchestrator';
import type { RuntimeKernelState } from '../../types/runtimeKernel';
import type {
  RuntimeTelemetryMetricsSnapshot,
  TelemetryHealthState,
} from '../../types/runtimeTelemetry';
import type { RuntimeOrchestratorEvaluation } from '../../types/runtimeOrchestrator';

export type RuntimeEffectPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type RuntimeEffectKind =
  | 'QUEUE_COMPACTION'
  | 'WS_LIGHTWEIGHT_MODE'
  | 'WS_HEARTBEAT_MS'
  | 'WS_HEARTBEAT_BACKOFF'
  | 'WS_RECONNECT_JITTER'
  | 'WS_RECONNECT_DEFER'
  | 'WS_OFFLINE_DEBOUNCE'
  | 'WS_BATCH_MODE'
  | 'PROACTIVE_COOLDOWN'
  | 'PROACTIVE_PAUSE'
  | 'HYDRATION_DEFER'
  | 'HYDRATION_SERIALIZE'
  | 'DASHBOARD_POLICY'
  | 'SURVIVAL_MINIMAL_UI'
  | 'TELEMETRY_PERSIST'
  | 'MEMORY_PRESSURE_OBSERVE'
  | 'LONG_SESSION_PASS'
  | 'NATIVE_EXTENSION_BUILD'
  | 'IMMINENT_KILL_MITIGATION'
  | 'KERNEL_GUARD_SYNC'
  | 'MEMORY_PRESSURE_CLEANUP'
  | 'STABILITY_OBSERVE'
  | 'STABILITY_RECONNECT_GUARD'
  | 'STABILITY_HYDRATION_ENFORCE'
  | 'STABILITY_ASYNC_STARVATION_WARN'
  | 'STABILITY_MIUI_DIAGNOSTIC'
  | 'RESUME_COORDINATOR_OBSERVE'
  | 'RESUME_GLOBAL_GATE'
  | 'RESUME_SERIALIZE_HYDRATION'
  | 'RESUME_DEFER_TELEMETRY'
  | 'RESUME_ASYNC_BURST_CLAMP'
  | 'RESUME_WS_RESTORE_SEQUENCE';

export type RuntimeEffect = {
  id: string;
  kind: RuntimeEffectKind;
  priority: RuntimeEffectPriority;
  dedupeKey: string;
  emittedAt: string;
  payload: unknown;
};

export type DashboardPolicyPayload = {
  compact: boolean;
  maxFps: number;
  metricsSamplingRate: number;
};

export type WsPolicyPayload = {
  lightweight: boolean;
  heartbeatMs: number;
  batchMode: boolean;
};

export type WsReconnectJitterPayload = {
  baseMs: number;
  maxMs: number;
  storm: boolean;
};

export type WsOfflineDebouncePayload = {
  durationMs: number;
};

export type WsHeartbeatBackoffPayload = {
  intervalMs: number;
};

export type ProactiveGatesPayload = {
  pauseProactive: boolean;
  throttleProactive: boolean;
};

export type HydrationDeferPayload = {
  reasonJa: string;
  serializeMode: boolean;
};

export type TelemetryPersistPayload = {
  metrics: RuntimeTelemetryMetricsSnapshot;
  state: TelemetryHealthState;
  summaryJa: string;
};

export type NativeExtensionBuildPayload = {
  metrics: RuntimeTelemetryMetricsSnapshot;
  sessionMinutes: number;
  orchEval: RuntimeOrchestratorEvaluation;
};

export type ImminentKillPayload = {
  metrics: RuntimeTelemetryMetricsSnapshot;
};

export type LongSessionPassPayload = {
  sessionMinutes: number;
  metrics: RuntimeTelemetryMetricsSnapshot;
};

export type KernelGuardSyncPayload = {
  guards: import('../../types/runtimeKernel').RuntimeGuardKernelState;
};

export type StabilityObservePayload = {
  snapshot: import('../../types/runtimeStability').RuntimeStabilitySnapshot;
};

export type StabilityReconnectGuardPayload = {
  snapshot: import('../../types/runtimeStability').RuntimeStabilitySnapshot;
  delayMs: number;
};

export type StabilityAsyncWarnPayload = {
  snapshot: import('../../types/runtimeStability').RuntimeStabilitySnapshot;
  anomaly: import('../../types/runtimeStability').RuntimeStabilityAnomaly;
};

export type StabilityMiuiPayload = {
  snapshot: import('../../types/runtimeStability').RuntimeStabilitySnapshot;
  anomaly: import('../../types/runtimeStability').RuntimeStabilityAnomaly;
};

export type ResumeCoordinatorEffectPayload = {
  snapshot: import('../../types/runtimeResumeCoordinator').ResumeCoordinatorSnapshot;
};

export type ResumeGlobalGatePayload = ResumeCoordinatorEffectPayload & {
  gateMs: number;
};

export type RuntimeEffectPayload =
  | { kind: 'DASHBOARD_POLICY'; data: DashboardPolicyPayload }
  | { kind: 'WS_LIGHTWEIGHT_MODE'; data: WsPolicyPayload }
  | { kind: 'WS_HEARTBEAT_MS'; data: { heartbeatMs: number } }
  | { kind: 'WS_BATCH_MODE'; data: { enabled: boolean } }
  | { kind: 'PROACTIVE_COOLDOWN'; data: ProactiveGatesPayload }
  | { kind: 'PROACTIVE_PAUSE'; data: ProactiveGatesPayload }
  | { kind: 'HYDRATION_DEFER'; data: HydrationDeferPayload }
  | { kind: 'HYDRATION_SERIALIZE'; data: { enabled: boolean } }
  | { kind: 'QUEUE_COMPACTION'; data: { policy: RuntimeOrchestratorPolicy } }
  | { kind: 'SURVIVAL_MINIMAL_UI'; data: { enabled: boolean } }
  | { kind: 'TELEMETRY_PERSIST'; data: TelemetryPersistPayload }
  | { kind: 'MEMORY_PRESSURE_OBSERVE'; data: { metrics: RuntimeTelemetryMetricsSnapshot } }
  | { kind: 'LONG_SESSION_PASS'; data: LongSessionPassPayload }
  | { kind: 'NATIVE_EXTENSION_BUILD'; data: NativeExtensionBuildPayload }
  | { kind: 'IMMINENT_KILL_MITIGATION'; data: ImminentKillPayload }
  | { kind: 'KERNEL_GUARD_SYNC'; data: KernelGuardSyncPayload };

export type RuntimeEffectDispatchResult = {
  executed: number;
  skipped: number;
  failed: number;
  droppedLow: number;
  traces: RuntimeEffectTrace[];
};

export type RuntimeEffectTrace = {
  effectId: string;
  kind: RuntimeEffectKind;
  status: 'ok' | 'skipped' | 'failed' | 'dropped';
  durationMs: number;
  errorJa?: string;
};

export type RuntimeEffectDispatchOptions = {
  kernelState: RuntimeKernelState;
  debounceMs?: number;
};
