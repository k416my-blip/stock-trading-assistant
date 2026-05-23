/**
 * Timeline reconstruction — failure forensics from journal.
 */
import type {
  FailureTimeline,
  RootCauseCandidate,
  RuntimeJournalEvent,
} from '../../types/runtimeObservability';
import { RUNTIME_OBSERVABILITY_VERSION } from '../../constants/runtimeObservability';
import { exportJournalCompact } from './runtimeEventJournal';

export function rebuildCascadeSequence(events: RuntimeJournalEvent[]): string[] {
  const seq: string[] = [];
  for (const e of events) {
    if (e.kind === 'cascade_trigger') seq.push(`cascade:${e.detailJa}`);
    if (e.kind === 'async_queue_saturation') seq.push(`async:${e.v1 ?? 0}`);
    if (e.kind === 'websocket_reconnect') seq.push(`ws:${e.detailJa.slice(0, 40)}`);
    if (e.kind === 'hydration_pause' || e.kind === 'hydration_resume') seq.push(`hyd:${e.kind}`);
    if (e.kind === 'rollback_execution') seq.push(`rollback:${e.detailJa.slice(0, 30)}`);
    if (e.kind === 'adaptive_drift_transition') seq.push(`drift:${e.tag ?? e.detailJa.slice(0, 20)}`);
  }
  return seq;
}

export function deriveRootCauseCandidates(events: RuntimeJournalEvent[]): RootCauseCandidate[] {
  const candidates: RootCauseCandidate[] = [];
  const kinds = new Map<string, RuntimeJournalEvent[]>();
  for (const e of events) {
    const list = kinds.get(e.kind) ?? [];
    list.push(e);
    kinds.set(e.kind, list);
  }

  if ((kinds.get('async_queue_saturation')?.length ?? 0) >= 2) {
    candidates.push({
      kind: 'async_starvation',
      confidence: 0.72,
      detailJa: 'async queue saturation cluster',
      chain: rebuildCascadeSequence(kinds.get('async_queue_saturation') ?? []),
    });
  }
  if ((kinds.get('websocket_reconnect')?.length ?? 0) >= 3) {
    candidates.push({
      kind: 'reconnect_storm',
      confidence: 0.68,
      detailJa: 'websocket reconnect storm',
      chain: rebuildCascadeSequence(kinds.get('websocket_reconnect') ?? []),
    });
  }
  if ((kinds.get('hydration_pause')?.length ?? 0) >= 1 && (kinds.get('websocket_reconnect')?.length ?? 0) >= 1) {
    candidates.push({
      kind: 'hydration_race',
      confidence: 0.65,
      detailJa: 'hydration / websocket overlap',
      chain: ['hydration_pause', 'websocket_reconnect'],
    });
  }
  if ((kinds.get('adaptive_drift_transition')?.length ?? 0) >= 1) {
    candidates.push({
      kind: 'adaptive_drift',
      confidence: 0.6,
      detailJa: 'adaptive drift transition',
      chain: rebuildCascadeSequence(kinds.get('adaptive_drift_transition') ?? []),
    });
  }
  if ((kinds.get('cascade_trigger')?.length ?? 0) >= 1) {
    candidates.push({
      kind: 'cascade',
      confidence: 0.58,
      detailJa: 'orchestration cascade',
      chain: rebuildCascadeSequence(kinds.get('cascade_trigger') ?? []),
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates.slice(0, 5);
}

export function reconstructFailureTimeline(sinceMs?: number): FailureTimeline {
  const events = sinceMs
    ? exportJournalCompact().filter((e) => e.atMs >= sinceMs)
    : exportJournalCompact();
  const cascadeSequence = rebuildCascadeSequence(events);
  const rootCauseCandidates = deriveRootCauseCandidates(events);
  const top = rootCauseCandidates[0];

  return {
    builtAt: new Date().toISOString(),
    events: events.slice(-500),
    cascadeSequence,
    rootCauseCandidates,
    summaryJa: top
      ? `likely root: ${top.kind} (${Math.round(top.confidence * 100)}%) — ${top.detailJa}`
      : 'insufficient journal events for root cause',
  };
}

export function getTimelineVersion(): string {
  return RUNTIME_OBSERVABILITY_VERSION;
}
