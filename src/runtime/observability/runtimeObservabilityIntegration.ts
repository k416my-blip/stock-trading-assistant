/**
 * Runtime Observability & Failure Forensics — integration facade.
 */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import type {
  RedmiObservabilityReport,
  RuntimeObservabilityBundle,
} from '../../types/runtimeObservability';
import { RUNTIME_OBSERVABILITY_VERSION, REDMI_NOTE_13_PRO_5G, EVENT_LOOP_SATURATED_MS } from '../../constants/runtimeObservability';
import { appendRuntimeJournalEvent, getJournalStats } from './runtimeEventJournal';
import { reconstructFailureTimeline } from './timelineReconstructionEngine';
import { captureRuntimeSnapshot, getRuntimeSnapshots, getSnapshotFrequency } from './runtimeSnapshotSystem';
import { analyzeAsyncStarvation } from './asyncStarvationAnalyzer';
import { buildHydrationForensicChain } from './hydrationRaceForensics';
import { analyzeWebSocketFailures } from './websocketFailureAnalytics';
import { buildAdaptiveLearningForensics } from './adaptiveLearningForensics';
import { recordLongSessionSample } from './longSessionDegradationAnalyzer';
import { buildRuntimeObservabilityDashboard, formatObservabilityDashboardMarkdown } from './runtimeObservabilityDashboard';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import type { AdaptiveRuntimeContext } from '../../types/adaptiveRuntimeLearning';
import { resetRuntimeEventJournalForTest } from './runtimeEventJournal';
import { resetRuntimeSnapshotsForTest } from './runtimeSnapshotSystem';
import { resetLongSessionSamplesForTest } from './longSessionDegradationAnalyzer';

export function observeOrchestrationEvent(
  phase: 'start' | 'end',
  stateLabel: string,
  cascadePressure?: number,
): void {
  appendRuntimeJournalEvent(
    phase === 'start' ? 'orchestration_start' : 'orchestration_end',
    stateLabel,
    { v1: cascadePressure, tag: 'orchestrator' },
  );
  if ((cascadePressure ?? 0) >= 70) {
    appendRuntimeJournalEvent('cascade_trigger', `pressure ${cascadePressure}%`, { v1: cascadePressure });
  }
}

export function observeRuntimeObservabilityTick(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  opts?: {
    orchestrationState?: string;
    adaptive?: AdaptiveRuntimeContext;
  },
): void {
  const gov = getLastGovernanceState();
  const driftScore = gov?.drift.driftScore ?? 0;
  const driftPhase = gov?.drift.phase ?? 'DRIFT_STABLE';

  if (metrics.asyncQueueDepth >= 8) {
    appendRuntimeJournalEvent('async_queue_saturation', 'queue depth high', {
      v1: metrics.asyncQueueDepth,
      v2: metrics.asyncQueueLatencyMs,
    });
  }

  if (metrics.eventLoopLatencyMs >= EVENT_LOOP_SATURATED_MS) {
    appendRuntimeJournalEvent('event_loop_pressure', 'SATURATED', {
      v1: metrics.eventLoopLatencyMs,
    });
  }

  if (metrics.thermalState === 'severe' || metrics.thermalState === 'critical') {
    appendRuntimeJournalEvent('thermal_downgrade', metrics.thermalState, { v1: 1 });
  }
  if (metrics.native.batterySaverActive) {
    appendRuntimeJournalEvent('battery_saver_transition', 'active', { v1: 1 });
  }

  recordLongSessionSample({
    memoryPct: metrics.memoryTrendPct,
    queueDepth: metrics.asyncQueueDepth,
    renderBurst: metrics.droppedFrames,
    eventLoopLagMs: metrics.eventLoopLatencyMs,
    driftScore,
  });

  const starvation = analyzeAsyncStarvation({
    queueDepth: metrics.asyncQueueDepth,
    queueLagMs: metrics.asyncQueueLatencyMs,
    microtaskBurst: metrics.asyncQueueDepth > 15,
    timerRebuildStorm: metrics.asyncQueueLatencyMs > 300,
  });

  if (starvation.phase === 'STARVATION_CRITICAL') {
    captureRuntimeSnapshot({
      trigger: 'starvation',
      orchestrationState: opts?.orchestrationState ?? 'unknown',
      queueDepth: metrics.asyncQueueDepth,
      activeLayers: ['stability', 'async'],
      adaptiveConfidence: opts?.adaptive?.store ? 0.5 : 0,
      driftScore,
      driftPhase,
      thermalLevel: metrics.thermalState,
      batterySaver: metrics.native.batterySaverActive,
      websocketState:
        metrics.websocket.reconnectStormDetected || metrics.websocket.reconnectAttempts > 2
          ? 'unstable'
          : 'connected',
      renderBurstCount: metrics.droppedFrames,
      eventLoopLagMs: metrics.eventLoopLatencyMs,
    });
  }

  if (metrics.eventLoopLatencyMs >= EVENT_LOOP_SATURATED_MS) {
    captureRuntimeSnapshot({
      trigger: 'event_loop_saturated',
      orchestrationState: opts?.orchestrationState ?? 'unknown',
      queueDepth: metrics.asyncQueueDepth,
      activeLayers: ['event_loop'],
      driftScore,
      driftPhase,
      thermalLevel: metrics.thermalState,
      batterySaver: metrics.native.batterySaverActive,
      websocketState:
        metrics.websocket.reconnectStormDetected || metrics.websocket.reconnectAttempts > 2
          ? 'unstable'
          : 'connected',
      renderBurstCount: metrics.droppedFrames,
      eventLoopLagMs: metrics.eventLoopLatencyMs,
    });
  }

  if (gov?.drift.phase === 'DRIFT_CRITICAL' || gov?.drift.phase === 'DRIFT_FRAGMENTING') {
    appendRuntimeJournalEvent('adaptive_drift_transition', gov.drift.phase, {
      tag: gov.drift.phase,
      v1: Math.round(driftScore * 100),
    });
  }
}

export function noteObservabilityReconnect(detailJa: string, storm = false): void {
  appendRuntimeJournalEvent('websocket_reconnect', detailJa, { v1: storm ? 5 : 1 });
}

export function noteObservabilityHydration(phase: 'pause' | 'resume', detailJa: string): void {
  appendRuntimeJournalEvent(
    phase === 'pause' ? 'hydration_pause' : 'hydration_resume',
    detailJa,
  );
}

export function noteObservabilityRollback(reason: string): void {
  appendRuntimeJournalEvent('rollback_execution', reason, { tag: 'governance' });
}

export function noteObservabilityReplayDivergence(score: number): void {
  appendRuntimeJournalEvent('replay_divergence', 'root divergence', { v1: score });
}

export function buildRuntimeObservabilityBundle(
  metrics: RuntimeTelemetryMetricsSnapshot,
  adaptive?: AdaptiveRuntimeContext,
): RuntimeObservabilityBundle {
  const gov = getLastGovernanceState();
  const journal = getJournalStats();
  const dashboard = buildRuntimeObservabilityDashboard(
    {
      queueDepth: metrics.asyncQueueDepth,
      queueLagMs: metrics.asyncQueueLatencyMs,
      driftScore: gov?.drift.driftScore,
      driftPhase: gov?.drift.phase,
    },
    gov,
  );

  const starvation = analyzeAsyncStarvation({
    queueDepth: metrics.asyncQueueDepth,
    queueLagMs: metrics.asyncQueueLatencyMs,
  });

  return {
    version: RUNTIME_OBSERVABILITY_VERSION,
    builtAt: new Date().toISOString(),
    journalEventCount: journal.count,
    memoryBytesEstimate: journal.bytesEstimate,
    dashboard,
    failureTimeline: reconstructFailureTimeline(),
    starvationPhase: starvation.phase,
    hydrationForensics: buildHydrationForensicChain(),
    websocketAnalytics: analyzeWebSocketFailures({
      reconnectAttempts: metrics.websocket.reconnectAttempts,
      heartbeatDelayMs: metrics.websocket.heartbeatDelayMs,
      resumeLatencyMs: metrics.hydrationResume.resumeRecoveryTimeMs ?? 0,
    }),
    adaptiveForensics: buildAdaptiveLearningForensics(adaptive?.store, gov),
    snapshots: getRuntimeSnapshots(),
  };
}

export function buildRedmiNote13ProObservabilityReport(
  bundle: RuntimeObservabilityBundle,
): RedmiObservabilityReport {
  const top = bundle.failureTimeline.rootCauseCandidates[0];
  const forensicReconstructionQuality = top ? top.confidence : 0.4;
  const asyncStarvationDetectability =
    bundle.starvationPhase !== 'STARVATION_NONE' ? 0.85 : 0.55;
  const reconnectFailureObservability = Math.min(
    1,
    bundle.websocketAnalytics.events.length / 5,
  );
  const longSessionTraceStability =
    bundle.dashboard.longSessionTrend.length > 0
      ? 1 -
        Math.min(
          1,
          Math.abs(bundle.dashboard.longSessionTrend[0].adaptiveInstabilityTrend),
        )
      : 0.7;

  const memoryOverheadKb = Math.round(bundle.memoryBytesEstimate / 1024);
  const snapshotFrequency = getSnapshotFrequency();
  const compressionEfficiency =
    bundle.journalEventCount > 0
      ? Math.min(1, 80 / Math.max(1, bundle.memoryBytesEstimate / bundle.journalEventCount))
      : 1;

  const replayDeterminismQuality = bundle.failureTimeline.rootCauseCandidates.length >= 1 ? 0.88 : 0.5;

  return {
    deviceModel: REDMI_NOTE_13_PRO_5G,
    forensicReconstructionQuality: Math.round(forensicReconstructionQuality * 1000) / 1000,
    asyncStarvationDetectability: Math.round(asyncStarvationDetectability * 1000) / 1000,
    reconnectFailureObservability: Math.round(reconnectFailureObservability * 1000) / 1000,
    longSessionTraceStability: Math.round(longSessionTraceStability * 1000) / 1000,
    memoryOverheadKb,
    snapshotFrequency,
    compressionEfficiency: Math.round(compressionEfficiency * 1000) / 1000,
    replayDeterminismQuality: Math.round(replayDeterminismQuality * 1000) / 1000,
    summaryJa: `Redmi forensic: root=${top?.kind ?? 'unknown'} journal=${bundle.journalEventCount} mem=${memoryOverheadKb}KB snaps=${snapshotFrequency}`,
  };
}

export function resetRuntimeObservabilityForTest(): void {
  resetRuntimeEventJournalForTest();
  resetRuntimeSnapshotsForTest();
  resetLongSessionSamplesForTest();
}

export { formatObservabilityDashboardMarkdown, reconstructFailureTimeline };
