/**
 * Runtime forensic snapshot system — triggered on critical transitions.
 */
import type { RuntimeForensicSnapshot, SnapshotTrigger } from '../../types/runtimeObservability';
import type { DriftPhase } from '../../types/adaptiveRuntimeGovernance';
import { SNAPSHOT_RING_CAPACITY } from '../../constants/runtimeObservability';
import { appendRuntimeJournalEvent } from './runtimeEventJournal';

const snapshots: RuntimeForensicSnapshot[] = [];
let snapSeq = 0;

export function resetRuntimeSnapshotsForTest(): void {
  snapshots.length = 0;
  snapSeq = 0;
}

export type SnapshotCaptureInput = {
  trigger: SnapshotTrigger;
  orchestrationState: string;
  queueDepth: number;
  activeLayers: string[];
  adaptiveConfidence?: number;
  driftScore?: number;
  driftPhase?: DriftPhase | 'unknown';
  thermalLevel?: string;
  batterySaver?: boolean;
  websocketState?: string;
  renderBurstCount?: number;
  eventLoopLagMs?: number;
};

export function captureRuntimeSnapshot(input: SnapshotCaptureInput): RuntimeForensicSnapshot {
  snapSeq += 1;
  const snap: RuntimeForensicSnapshot = {
    id: `snap-${snapSeq}`,
    at: new Date().toISOString(),
    trigger: input.trigger,
    orchestrationState: input.orchestrationState,
    queueDepth: input.queueDepth,
    activeLayers: input.activeLayers.slice(0, 8),
    adaptiveConfidence: input.adaptiveConfidence ?? 0,
    driftScore: input.driftScore ?? 0,
    driftPhase: input.driftPhase ?? 'unknown',
    thermalLevel: input.thermalLevel ?? 'unknown',
    batterySaver: input.batterySaver ?? false,
    websocketState: input.websocketState ?? 'unknown',
    renderBurstCount: input.renderBurstCount ?? 0,
    eventLoopLagMs: input.eventLoopLagMs ?? 0,
  };
  snapshots.push(snap);
  while (snapshots.length > SNAPSHOT_RING_CAPACITY) snapshots.shift();
  appendRuntimeJournalEvent('snapshot_captured', `trigger=${input.trigger} q=${input.queueDepth}`, {
    v1: input.queueDepth,
    v2: input.eventLoopLagMs,
    tag: input.trigger,
  });
  return snap;
}

export function getRuntimeSnapshots(): RuntimeForensicSnapshot[] {
  return [...snapshots];
}

export function getSnapshotFrequency(): number {
  return snapshots.length;
}

/** Keep only the newest N forensic snapshots. */
export function thinRuntimeSnapshots(keepCount: number): number {
  const before = snapshots.length;
  while (snapshots.length > keepCount) snapshots.shift();
  return before - snapshots.length;
}
