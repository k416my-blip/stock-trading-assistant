/**
 * Reactive Event Orchestration — event bus, queue, selective recompute flags.
 */
import {
  ALL_LAYER_IDS,
  BATCH_FLUSH_MS,
  EVENT_DEBOUNCE_MS,
  EVENT_THROTTLE_MAX_PER_WINDOW,
  EVENT_THROTTLE_MS,
  layersForEventType,
  MARKET_BURST_MAX,
  MARKET_BURST_WINDOW_MS,
  OFFLINE_QUEUE_MAX,
  REACTIVE_COOLDOWN_MS,
  ZOMBIE_EVENT_AGE_MS,
} from '../constants/reactiveEventOrchestration';
import type {
  ConciergeEventRecord,
  ConciergeEventType,
  EventPriority,
  LayerRecomputeId,
} from '../types/reactiveEventOrchestration';
import { persistImportantEvent } from './reactiveEventOrchestrationStorage';

export type DispatchConciergeEventInput = {
  type: ConciergeEventType;
  priority?: EventPriority;
  dedupeKey?: string;
  payload?: Record<string, unknown>;
  layers?: LayerRecomputeId[];
};

type QueuedEvent = {
  id: string;
  type: ConciergeEventType;
  priority: EventPriority;
  at: number;
  dedupeKey: string;
  layersToRecompute: LayerRecomputeId[];
  payload?: Record<string, unknown>;
};

const PRIORITY_RANK: Record<EventPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

let refreshCallback: (() => void | Promise<void>) | null = null;
let appForeground = true;
let batterySaver = false;
let offlineMode = false;
let memoryPressure = false;

const queue: QueuedEvent[] = [];
const offlineQueue: QueuedEvent[] = [];
const timeline: ConciergeEventRecord[] = [];
const dropped: ConciergeEventRecord[] = [];
const active: ConciergeEventRecord[] = [];

let processingStack: ConciergeEventType[] = [];
let lastFullRefreshAt = 0;
let droppedTotal = 0;
let batchedTotal = 0;
let recomputeCountWindow = 0;
let rerenderCountWindow = 0;
let metricsWindowStart = Date.now();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let throttleWindowStart = Date.now();
let throttleCount = 0;
let marketBurstStart = 0;
let marketBurstCount = 0;

const TIMELINE_MAX = 24;

const recomputeFlags: Record<LayerRecomputeId, boolean> = Object.fromEntries(
  ALL_LAYER_IDS.map((id) => [id, true]),
) as Record<LayerRecomputeId, boolean>;

let lastSnapshotFingerprint = '';

function newId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pushTimeline(record: ConciergeEventRecord): void {
  timeline.push(record);
  if (timeline.length > 80) timeline.splice(0, timeline.length - 80);
  if (record.priority === 'critical' || record.priority === 'high') {
    void persistImportantEvent(record);
  }
}

function recordDrop(
  ev: QueuedEvent,
  reasonJa: string,
  status: ConciergeEventRecord['status'] = 'dropped',
): void {
  droppedTotal += 1;
  const rec: ConciergeEventRecord = {
    id: ev.id,
    type: ev.type,
    priority: ev.priority,
    at: new Date(ev.at).toISOString(),
    dedupeKey: ev.dedupeKey,
    status,
    dropReasonJa: reasonJa,
    layersToRecompute: ev.layersToRecompute,
    latencyMs: null,
  };
  dropped.push(rec);
  if (dropped.length > 30) dropped.splice(0, dropped.length - 30);
  pushTimeline(rec);
}

function mergeLayers(events: QueuedEvent[]): LayerRecomputeId[] {
  const set = new Set<LayerRecomputeId>();
  for (const e of events) {
    for (const l of e.layersToRecompute) set.add(l);
  }
  return [...set];
}

function applySelectiveLayers(layers: LayerRecomputeId[]): void {
  for (const id of ALL_LAYER_IDS) {
    recomputeFlags[id] = layers.length === 0 || layers.includes(id);
  }
}

function fingerprintQueue(): string {
  return queue.map((q) => `${q.dedupeKey}:${q.type}`).join('|');
}

function noteMetricsRecompute(): void {
  recomputeCountWindow += 1;
  const now = Date.now();
  if (now - metricsWindowStart > 1000) {
    metricsWindowStart = now;
    recomputeCountWindow = 1;
    rerenderCountWindow = 0;
  }
}

export function noteOrchestratorRerender(): void {
  rerenderCountWindow += 1;
}

export function registerOrchestratedRefresh(cb: () => void | Promise<void>): () => void {
  refreshCallback = cb;
  return () => {
    refreshCallback = null;
  };
}

export function setOrchestrationRuntimeContext(ctx: {
  appForeground?: boolean;
  batterySaver?: boolean;
  offline?: boolean;
  memoryPressure?: boolean;
}): void {
  if (ctx.appForeground !== undefined) appForeground = ctx.appForeground;
  if (ctx.batterySaver !== undefined) batterySaver = ctx.batterySaver;
  if (ctx.offline !== undefined) offlineMode = ctx.offline;
  if (ctx.memoryPressure !== undefined) memoryPressure = ctx.memoryPressure;
}

export function shouldRecomputeLayer(layer: LayerRecomputeId): boolean {
  return recomputeFlags[layer] ?? true;
}

export function getPendingRecomputeLayers(): LayerRecomputeId[] {
  return ALL_LAYER_IDS.filter((id) => recomputeFlags[id]);
}

export function isSelectiveRecomputeActive(): boolean {
  const pending = getPendingRecomputeLayers();
  return pending.length > 0 && pending.length < ALL_LAYER_IDS.length;
}

export function dispatchConciergeEvent(input: DispatchConciergeEventInput): string {
  const debounceMs = batterySaver ? EVENT_DEBOUNCE_MS * 2 : EVENT_DEBOUNCE_MS;
  const ev: QueuedEvent = {
    id: newId(),
    type: input.type,
    priority: input.priority ?? defaultPriority(input.type),
    at: Date.now(),
    dedupeKey: input.dedupeKey ?? input.type,
    layersToRecompute: input.layers ?? layersForEventType(input.type),
    payload: input.payload,
  };

  if (processingStack.includes(ev.type)) {
    recordDrop(ev, CIRCULAR_DROP(ev.type));
    return ev.id;
  }

  if (input.type === 'market_update') {
    if (Date.now() - marketBurstStart > MARKET_BURST_WINDOW_MS) {
      marketBurstStart = Date.now();
      marketBurstCount = 0;
    }
    marketBurstCount += 1;
    if (marketBurstCount > MARKET_BURST_MAX) {
      recordDrop(ev, 'market burst protection');
      return ev.id;
    }
  }

  if (Date.now() - throttleWindowStart > EVENT_THROTTLE_MS) {
    throttleWindowStart = Date.now();
    throttleCount = 0;
  }
  throttleCount += 1;
  if (throttleCount > EVENT_THROTTLE_MAX_PER_WINDOW) {
    recordDrop(ev, 'throttle 超過');
    return ev.id;
  }

  const existingIdx = queue.findIndex((q) => q.dedupeKey === ev.dedupeKey);
  if (existingIdx >= 0) {
    queue[existingIdx] = { ...ev, id: queue[existingIdx].id, at: queue[existingIdx].at };
    batchedTotal += 1;
  } else if (offlineMode && !appForeground) {
    if (offlineQueue.length >= OFFLINE_QUEUE_MAX) {
      offlineQueue.shift();
      droppedTotal += 1;
    }
    offlineQueue.push(ev);
  } else {
    queue.push(ev);
  }

  queue.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushEventQueue();
  }, debounceMs);

  return ev.id;
}

function CIRCULAR_DROP(type: ConciergeEventType): string {
  return `circular guard: ${processingStack.join('→')}→${type}`;
}

function defaultPriority(type: ConciergeEventType): EventPriority {
  if (type === 'health_alert') return 'critical';
  if (type === 'governance_veto' || type === 'risk_change') return 'high';
  if (type === 'ui_visibility_change') return 'low';
  return 'normal';
}

async function flushEventQueue(): Promise<void> {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(() => void flushEventQueueInner(), BATCH_FLUSH_MS);
}

async function flushEventQueueInner(): Promise<void> {
  batchTimer = null;
  cleanupZombieEvents();

  if (queue.length === 0) return;

  if (!appForeground && queue.every((e) => e.type !== 'health_alert')) {
    for (const e of queue.splice(0)) {
      recordDrop(e, 'visibility-aware: background');
    }
    return;
  }

  const fp = fingerprintQueue();
  if (fp === lastSnapshotFingerprint) {
    for (const e of queue.splice(0)) {
      recordDrop(e, 'snapshot diff: 変更なし', 'batched');
    }
    return;
  }
  lastSnapshotFingerprint = fp;

  const cooldownMs = batterySaver ? REACTIVE_COOLDOWN_MS * 2 : REACTIVE_COOLDOWN_MS;
  if (Date.now() - lastFullRefreshAt < cooldownMs) {
    const critical = queue.filter((e) => e.priority === 'critical');
    if (critical.length === 0) {
      for (const e of queue.splice(0)) {
        recordDrop(e, 'reactive cooldown');
      }
      return;
    }
    queue.splice(0, queue.length, ...critical);
  }

  const batch = queue.splice(0, Math.min(queue.length, memoryPressure ? 3 : 12));
  const layers = mergeLayers(batch);
  applySelectiveLayers(
    batch.some((e) => e.type === 'ui_visibility_change') && !appForeground ? [] : layers,
  );

  active.splice(0, active.length);
  for (const e of batch) {
    active.push({
      id: e.id,
      type: e.type,
      priority: e.priority,
      at: new Date(e.at).toISOString(),
      dedupeKey: e.dedupeKey,
      status: 'processed',
      dropReasonJa: null,
      layersToRecompute: e.layersToRecompute,
      latencyMs: null,
    });
  }

  processingStack = batch.map((b) => b.type);
  const started = Date.now();
  try {
    if (refreshCallback) {
      noteMetricsRecompute();
      await refreshCallback();
      lastFullRefreshAt = Date.now();
    }
  } finally {
    const latency = Date.now() - started;
    for (const a of active) {
      a.latencyMs = latency;
      pushTimeline(a);
    }
    processingStack = [];
    active.splice(0, active.length);
  }
}

export async function replayOfflineEventQueue(): Promise<number> {
  if (offlineQueue.length === 0) return 0;
  const replay = offlineQueue.splice(0);
  for (const e of replay) {
    queue.push(e);
  }
  await flushEventQueueInner();
  return replay.length;
}

export function cleanupZombieEvents(): number {
  const cutoff = Date.now() - ZOMBIE_EVENT_AGE_MS;
  let removed = 0;
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].at < cutoff) {
      recordDrop(queue[i], 'zombie cleanup');
      queue.splice(i, 1);
      removed += 1;
    }
  }
  return removed;
}

export function getOrchestrationMetrics(): {
  active: ConciergeEventRecord[];
  queued: ConciergeEventRecord[];
  dropped: ConciergeEventRecord[];
  timeline: ConciergeEventRecord[];
  rerenderPerSec: number;
  recomputePerSec: number;
  staleQueueCount: number;
  droppedTotal: number;
  batchedTotal: number;
  offlineQueueSize: number;
  burstProtectionActive: boolean;
  visibilityPaused: boolean;
  avgEventLatencyMs: number;
  pendingLayers: LayerRecomputeId[];
  selectiveActive: boolean;
} {
  const elapsed = Math.max(1, Date.now() - metricsWindowStart);
  const scale = 1000 / elapsed;
  const latencies = timeline.filter((t) => t.latencyMs != null).map((t) => t.latencyMs as number);
  const avgLatency =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  return {
    active: [...active],
    queued: queue.map((q) => ({
      id: q.id,
      type: q.type,
      priority: q.priority,
      at: new Date(q.at).toISOString(),
      dedupeKey: q.dedupeKey,
      status: 'queued',
      dropReasonJa: null,
      layersToRecompute: q.layersToRecompute,
      latencyMs: null,
    })),
    dropped: [...dropped],
    timeline: timeline.slice(-TIMELINE_MAX),
    rerenderPerSec: Math.round(rerenderCountWindow * scale * 10) / 10,
    recomputePerSec: Math.round(recomputeCountWindow * scale * 10) / 10,
    staleQueueCount: queue.filter((q) => Date.now() - q.at > ZOMBIE_EVENT_AGE_MS / 2).length,
    droppedTotal,
    batchedTotal,
    offlineQueueSize: offlineQueue.length,
    burstProtectionActive: marketBurstCount > MARKET_BURST_MAX - 1,
    visibilityPaused: !appForeground,
    avgEventLatencyMs: Math.round(avgLatency),
    pendingLayers: getPendingRecomputeLayers(),
    selectiveActive: isSelectiveRecomputeActive(),
  };
}

export function auditStateMutation(label: string, destructive: boolean): boolean {
  if (destructive) {
    dispatchConciergeEvent({
      type: 'health_alert',
      priority: 'critical',
      dedupeKey: `mutation:${label}`,
    });
    return false;
  }
  return true;
}

export function resetReactiveOrchestrationForTest(): void {
  queue.length = 0;
  offlineQueue.length = 0;
  timeline.length = 0;
  dropped.length = 0;
  active.length = 0;
  processingStack = [];
  droppedTotal = 0;
  batchedTotal = 0;
  lastFullRefreshAt = 0;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (batchTimer) clearTimeout(batchTimer);
  debounceTimer = null;
  batchTimer = null;
  for (const id of ALL_LAYER_IDS) recomputeFlags[id] = true;
}
