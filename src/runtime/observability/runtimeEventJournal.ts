/**
 * Runtime Event Journal — ring buffer, compact mode, strict memory cap.
 */
import type { RuntimeJournalEvent, RuntimeJournalEventKind } from '../../types/runtimeObservability';
import {
  JOURNAL_MEMORY_CAP_BYTES,
  JOURNAL_RING_CAPACITY,
} from '../../constants/runtimeObservability';
import { sanitizeObservabilityDetail } from './safeObservabilityConstraints';

let seq = 0;
const ring: RuntimeJournalEvent[] = [];
let compactMode = true;
let bytesEstimate = 0;

function estimateBytes(e: RuntimeJournalEvent): number {
  return 48 + (e.detailJa?.length ?? 0) + (e.tag?.length ?? 0) * 2;
}

function trimToCap(): void {
  while (bytesEstimate > JOURNAL_MEMORY_CAP_BYTES && ring.length > 0) {
    const removed = ring.shift();
    if (removed) bytesEstimate -= estimateBytes(removed);
  }
  while (ring.length > JOURNAL_RING_CAPACITY) {
    const removed = ring.shift();
    if (removed) bytesEstimate -= estimateBytes(removed);
  }
}

export function resetRuntimeEventJournalForTest(): void {
  ring.length = 0;
  seq = 0;
  bytesEstimate = 0;
  compactMode = true;
}

export function setJournalCompactMode(enabled: boolean): void {
  compactMode = enabled;
}

export function appendRuntimeJournalEvent(
  kind: RuntimeJournalEventKind,
  detailJa: string,
  opts?: { v1?: number; v2?: number; tag?: string; atMs?: number },
): RuntimeJournalEvent {
  if (!sanitizeObservabilityDetail(detailJa, opts?.tag)) {
    detailJa = '[redacted-system-event]';
  }
  seq += 1;
  const atMs = opts?.atMs ?? Date.now();
  const event: RuntimeJournalEvent = {
    id: seq,
    at: new Date(atMs).toISOString(),
    atMs,
    kind,
    detailJa: compactMode ? detailJa.slice(0, 80) : detailJa,
    v1: opts?.v1,
    v2: opts?.v2,
    tag: opts?.tag,
  };
  ring.push(event);
  bytesEstimate += estimateBytes(event);
  trimToCap();
  return event;
}

export function getRuntimeJournalEvents(filter?: {
  kind?: RuntimeJournalEventKind;
  sinceMs?: number;
}): RuntimeJournalEvent[] {
  return ring.filter((e) => {
    if (filter?.kind && e.kind !== filter.kind) return false;
    if (filter?.sinceMs != null && e.atMs < filter.sinceMs) return false;
    return true;
  });
}

export function getJournalStats(): { count: number; bytesEstimate: number; compactMode: boolean } {
  return { count: ring.length, bytesEstimate, compactMode };
}

export function exportJournalCompact(): RuntimeJournalEvent[] {
  return [...ring];
}

/** Trim oldest events until count <= target (self-healing compaction). */
export function compactRuntimeJournal(targetCount: number): number {
  const before = ring.length;
  while (ring.length > targetCount) {
    const removed = ring.shift();
    if (removed) bytesEstimate -= estimateBytes(removed);
  }
  return before - ring.length;
}
