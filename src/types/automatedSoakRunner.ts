import type { NativeThermalStatus } from './runtimeTelemetry';

export const AUTOMATED_SOAK_SCENARIO_IDS = [
  'foreground_background',
  'websocket_disconnect',
  'thermal_stress',
  'battery_saver',
  'memory_pressure',
  'async_flood',
  'replay_flood',
  'dashboard_render_storm',
  'native_kill_recovery',
  'android_lifecycle_stress',
  'runtime_self_recursion_endurance',
  'runtime_telemetry_entropy',
  'runtime_cognitive_governance',
  'runtime_civilization_topology',
  'runtime_meta_limit_governance',
  'runtime_federation_governance',
  'runtime_ontology_stabilization',
  'runtime_finite_boundary',
  'runtime_semantic_compression',
  'runtime_semantic_gravity',
  'runtime_semantic_thermodynamics',
  'runtime_semantic_phase_transition',
  'runtime_adaptive_observation',
  'runtime_observer_reality_selection',
  'runtime_inter_civilization_resonance',
  'runtime_governance_freeze',
] as const;

export type AutomatedSoakScenarioId = (typeof AUTOMATED_SOAK_SCENARIO_IDS)[number];

export type SoakSchedulingMode =
  | 'full'
  | 'background_survival'
  | 'thermal_throttled'
  | 'battery_saver'
  | 'low_refresh';

export type SoakTimelineEventKind =
  | 'session_start'
  | 'session_stop'
  | 'scenario_start'
  | 'scenario_end'
  | 'lifecycle'
  | 'recovery'
  | 'freeze'
  | 'deadlock'
  | 'tick_stall'
  | 'checkpoint';

export type SoakTimelineEvent = {
  at: string;
  kind: SoakTimelineEventKind;
  scenario?: AutomatedSoakScenarioId;
  detailJa: string;
};

export type SoakLifecycleEvent = {
  at: string;
  phase: 'foreground' | 'background' | 'inactive' | 'screen_off';
  detailJa: string;
};

export type SoakRecoveryEvent = {
  at: string;
  kind: 'background' | 'websocket' | 'native_kill' | 'lifecycle';
  success: boolean;
  durationMs: number;
  detailJa: string;
};

export type SoakFreezeEvent = {
  at: string;
  durationMs: number;
  jsStallMs: number;
  detailJa: string;
};

export type SoakRuntimeSnapshotSample = {
  at: string;
  elapsedMs: number;
  jsHeapMb: number;
  nativeHeapMb: number;
  replayCount: number;
  asyncQueueDepth: number;
  thermalStatus: NativeThermalStatus;
  dashboardPressure: number;
  tickMs: number;
  wsReconnects: number;
};

export type SoakMetricGraphs = {
  memoryDriftSparkline: string;
  replayGrowthSparkline: string;
  thermalSparkline: string;
  wsReconnectSparkline: string;
};

export type AutomatedSoakMeasurements = {
  continuousUptimeMs: number;
  averageRecoveryMs: number;
  freezeDurationMsTotal: number;
  backgroundRecoverySuccessRate: number;
  websocketRecoverySuccessRate: number;
  memoryDriftPerHourMb: number;
  replayDriftPerHour: number;
  thermalDegradation: number;
  dashboardPressurePeak: number;
  tickStallFrequency: number;
  jsStallDurationMsPeak: number;
  nativeRecoveryLatencyMs: number;
};

export type AutomatedSoakDashboard = {
  titleJa: string;
  safetyBannerJa: string;
  active: boolean;
  schedulingMode: SoakSchedulingMode;
  currentScenario: AutomatedSoakScenarioId | null;
  survivalScore: number;
  elapsedHours: number;
  targetHours: number;
  measurements: AutomatedSoakMeasurements;
  graphs: SoakMetricGraphs;
  timelineRecent: SoakTimelineEvent[];
  lifecycleRecent: SoakLifecycleEvent[];
  recoveryRecent: SoakRecoveryEvent[];
  freezeRecent: SoakFreezeEvent[];
};

export type AutomatedSoakExportJson = {
  version: string;
  exportedAt: string;
  deviceModel: string;
  measurements: AutomatedSoakMeasurements;
  survivalScore: number;
  timeline: SoakTimelineEvent[];
  lifecycle: SoakLifecycleEvent[];
  recoveryEvents: SoakRecoveryEvent[];
  freezeEvents: SoakFreezeEvent[];
  snapshots: SoakRuntimeSnapshotSample[];
  graphs: SoakMetricGraphs;
  crashContext?: Record<string, unknown>;
};

export type AutomatedSoakCompressedBundle = {
  format: 'sta-soak-bundle-v1';
  compressed: true;
  payloadBase64: string;
  originalBytes: number;
};
