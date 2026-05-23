import type { NativeBoundaryValidationReport } from './nativeBoundaryValidation';
import type { TrackerReplaySnapshot } from '../runtime/stability/trackerReplaySnapshot';
import type { REDMI_SOAK_CRITICAL_CHECKS } from '../constants/redmiLongSoakValidation';

export type RedmiSoakScenarioId =
  | 'background_foreground'
  | 'screen_off_unlock'
  | 'battery_saver_toggle'
  | 'wifi_mobile_switch'
  | 'network_loss'
  | 'long_suspend'
  | 'resume_spam'
  | 'ws_forced_disconnect'
  | 'hydration_overlap'
  | 'thermal_throttle'
  | 'low_memory_trim'
  | 'activity_recreation'
  | 'swipe_away_recovery'
  | 'overnight_idle';

export type RedmiSoakCriticalCheck = (typeof REDMI_SOAK_CRITICAL_CHECKS)[number];

export type RedmiSoakScenarioEvent = {
  at: string;
  scenario: RedmiSoakScenarioId;
  autoDetected: boolean;
  detailJa: string;
};

export type RedmiSoakFailureEvent = {
  at: string;
  check: RedmiSoakCriticalCheck;
  severity: 'warn' | 'critical';
  detailJa: string;
  snapshotRef?: string;
};

export type RedmiSoakCheckpoint = {
  at: string;
  elapsedMs: number;
  reconnectPerMin: number;
  duplicateSockets: number;
  asyncQueueDepth: number;
  asyncQueueLagMs: number;
  memoryPressurePct: number;
  thermalLevel: string;
  resumeLatencyMs: number;
  bypassDetected: boolean;
  ownershipConsistent: boolean;
};

export type RedmiSoakSessionMeta = {
  startedAt: string;
  targetHours: number;
  elapsedMs: number;
  deviceModel: string;
  isXiaomiFamily: boolean;
  metricSource: string;
  active: boolean;
  scenariosObserved: RedmiSoakScenarioId[];
  checkpointsCount: number;
  failuresCount: number;
};

export type RedmiSoakSummary = {
  version: string;
  session: RedmiSoakSessionMeta;
  criticalChecks: Record<
    RedmiSoakCriticalCheck,
    { passed: boolean; occurrences: number; lastAt: string | null }
  >;
  minDurationMet: boolean;
  productionReady: boolean;
  headlineJa: string;
  riskJa: string;
};

export type RedmiLongSoakDashboardReport = {
  soakProgressPct: number;
  elapsedHours: number;
  targetHours: number;
  failuresCount: number;
  scenariosCount: number;
  lastFailureJa: string | null;
  bypassDetected: boolean;
  duplicateSockets: number;
};

export type RedmiLongSoakExport = {
  version: string;
  exportedAt: string;
  summary: RedmiSoakSummary;
  failureTimeline: RedmiSoakFailureEvent[];
  scenarioLog: RedmiSoakScenarioEvent[];
  checkpoints: RedmiSoakCheckpoint[];
  boundaryValidation: NativeBoundaryValidationReport;
  anomalyReplaySnapshot: TrackerReplaySnapshot;
  dashboardReport: RedmiLongSoakDashboardReport;
};
