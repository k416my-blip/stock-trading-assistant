import type { RedmiLongSoakExport } from './redmiLongSoakValidation';
import type { TrackerReplaySnapshot } from '../runtime/stability/trackerReplaySnapshot';

export type PostSoakVerdict = 'PASS' | 'FAIL';

export type PostSoakReleaseTier =
  | 'production_ready'
  | 'guarded_release'
  | 'high_operational_risk'
  | 'unstable_runtime';

export type PostSoakAutoFailReason =
  | 'duplicate_sockets'
  | 'ownership_violation'
  | 'native_reconnect_bypass'
  | 'reconnect_storm'
  | 'hydration_overlap'
  | 'timer_resurrection'
  | 'delayed_resume'
  | 'silent_websocket_disconnect'
  | 'min_duration_not_met';

export type PostSoakRootEventKind =
  | 'ownership_mismatch'
  | 'orphan_execute'
  | 'native_untagged'
  | 'duplicate_socket'
  | 'native_bypass'
  | 'execute_without_schedule';

export type PostSoakRootEvent = {
  at: string;
  kind: PostSoakRootEventKind;
  detailJa: string;
  reconnectUuid?: string;
  source?: string;
};

export type PostSoakAnomalyTimelineEntry = {
  at: string;
  category: 'failure' | 'root' | 'checkpoint' | 'boundary' | 'reconnect';
  summaryJa: string;
  severity: 'info' | 'warn' | 'critical';
};

export type PostSoakSubScores = {
  reconnectIntegrityScore: number;
  ownershipConsistencyScore: number;
  stormSuppressionScore: number;
  miuiResilienceScore: number;
};

export type PostSoakAnalysisReport = {
  version: string;
  analyzedAt: string;
  verdict: PostSoakVerdict;
  releaseTier: PostSoakReleaseTier;
  riskScore: number;
  finalScore: number;
  autoFailReasons: PostSoakAutoFailReason[];
  anomalySummaryJa: string;
  subScores: PostSoakSubScores;
  rootEvent: PostSoakRootEvent | null;
  anomalyTimeline: PostSoakAnomalyTimelineEntry[];
  replayPackage: TrackerReplaySnapshot;
  productionSignOffSummaryJa: string;
  minDurationMet: boolean;
  deviceModel: string;
  elapsedHours: number;
};

import type { RuntimeCausalGraphBundle } from './runtimeCausalGraph';

export type PostSoakAnalysisBundle = {
  report: PostSoakAnalysisReport;
  markdownReport: string;
  jsonReport: string;
  /** Causal DAG (relation priority root, not timestamp-only). */
  causalGraphBundle: RuntimeCausalGraphBundle;
};

export type PostSoakAnalysisInput = RedmiLongSoakExport;
