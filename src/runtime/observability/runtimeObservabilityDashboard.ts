/**
 * Runtime observability dashboard aggregation.
 */
import type { RuntimeObservabilityDashboard } from '../../types/runtimeObservability';
import { getRuntimeJournalEvents } from './runtimeEventJournal';
import { analyzeLongSessionDegradation } from './longSessionDegradationAnalyzer';
import { analyzeAsyncStarvation } from './asyncStarvationAnalyzer';
import type { AdaptiveGovernanceState } from '../../types/adaptiveRuntimeGovernance';

export function buildRuntimeObservabilityDashboard(
  signals: {
    queueDepth: number;
    queueLagMs: number;
    driftScore?: number;
    driftPhase?: string;
  },
  governance?: AdaptiveGovernanceState | null,
): RuntimeObservabilityDashboard {
  const events = getRuntimeJournalEvents().slice(-200);

  const asyncQueueHeatmap = getRuntimeJournalEvents({ kind: 'async_queue_saturation' })
    .slice(-40)
    .map((e) => ({ at: e.at, depth: e.v1 ?? 0, lagMs: e.v2 ?? 0 }));

  const orchestrationGraph = getRuntimeJournalEvents()
    .filter((e) => e.kind === 'orchestration_start' || e.kind === 'orchestration_end')
    .map((e) => ({ state: e.detailJa, at: e.at }));

  const reconnectMap = getRuntimeJournalEvents({ kind: 'websocket_reconnect' })
    .slice(-30)
    .map((e) => ({ at: e.at, detailJa: e.detailJa }));

  const hydrationCollisionMap = getRuntimeJournalEvents()
    .filter((e) => e.kind === 'hydration_pause' || e.kind === 'hydration_resume')
    .map((e) => ({ at: e.at, overlap: e.v1 ?? 0 }));

  const adaptiveDriftTimeline = getRuntimeJournalEvents({ kind: 'adaptive_drift_transition' })
    .map((e) => ({ at: e.at, phase: e.tag ?? 'unknown', score: e.v1 ?? signals.driftScore ?? 0 }));

  if (signals.driftPhase && adaptiveDriftTimeline.length === 0) {
    adaptiveDriftTimeline.push({
      at: new Date().toISOString(),
      phase: signals.driftPhase,
      score: signals.driftScore ?? 0,
    });
  }

  const rollbackHistory =
    governance?.rollbackSnapshots.map((s) => ({ at: s.createdAt, reason: s.reason })) ??
    getRuntimeJournalEvents({ kind: 'rollback_execution' }).map((e) => ({
      at: e.at,
      reason: e.detailJa,
    }));

  const starvation = analyzeAsyncStarvation({
    queueDepth: signals.queueDepth,
    queueLagMs: signals.queueLagMs,
  });
  const starvationEpisodes = getRuntimeJournalEvents({ kind: 'starvation_detected' }).map((e) => ({
    at: e.at,
    phase: (e.tag as 'STARVATION_WARNING' | 'STARVATION_CRITICAL') ?? 'STARVATION_WARNING',
  }));
  if (starvation.phase !== 'STARVATION_NONE' && starvationEpisodes.length === 0) {
    starvationEpisodes.push({ at: new Date().toISOString(), phase: starvation.phase });
  }

  return {
    eventTimeline: events,
    asyncQueueHeatmap,
    orchestrationGraph,
    reconnectMap,
    hydrationCollisionMap,
    adaptiveDriftTimeline,
    rollbackHistory,
    starvationEpisodes,
    longSessionTrend: [30, 60, 120].map((w) => analyzeLongSessionDegradation(w as 30 | 60 | 120)),
  };
}

export function formatObservabilityDashboardMarkdown(dashboard: RuntimeObservabilityDashboard): string {
  return [
    '# Runtime Observability Dashboard',
    '',
    `**Timeline events:** ${dashboard.eventTimeline.length}`,
    `**Reconnect events:** ${dashboard.reconnectMap.length}`,
    `**Starvation episodes:** ${dashboard.starvationEpisodes.length}`,
    `**Rollback entries:** ${dashboard.rollbackHistory.length}`,
    '',
    '## Long-session trend',
    ...dashboard.longSessionTrend.map((r) => `- ${r.summaryJa}`),
    '',
    '## Top timeline (last 10)',
    ...dashboard.eventTimeline.slice(-10).map((e) => `- [${e.at}] ${e.kind}: ${e.detailJa}`),
  ].join('\n');
}
