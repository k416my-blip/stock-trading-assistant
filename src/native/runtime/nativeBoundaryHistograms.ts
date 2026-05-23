import type { NativeBoundaryHistograms, HistogramBucket } from '../../types/nativeBoundaryValidation';
import {
  BRIDGE_FETCH_BUCKETS_MS,
  EVENT_LOOP_LAG_BUCKETS_MS,
  MEMORY_PRESSURE_BUCKETS_PCT,
  RECONNECT_LATENCY_BUCKETS_MS,
  THERMAL_BUCKET_LABELS,
} from '../../constants/nativeBoundaryValidation';

type BucketState = Map<string, number>;

const reconnectLatency = new Map<string, number>();
const eventLoopLag = new Map<string, number>();
const memoryPressure = new Map<string, number>();
const thermalLevel = new Map<string, number>();
const bridgeFetch = new Map<string, number>();

function bucketIndex(value: number, edges: readonly number[]): number {
  for (let i = edges.length - 1; i >= 0; i -= 1) {
    if (value >= edges[i]) return i;
  }
  return 0;
}

function bucketLabel(value: number, edges: readonly number[], unit: string): string {
  const idx = bucketIndex(value, edges);
  const lo = edges[idx];
  const hi = edges[idx + 1];
  if (hi == null) return `${lo}${unit}+`;
  return `${lo}-${hi}${unit}`;
}

function inc(map: BucketState, label: string): void {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function toBuckets(map: BucketState, orderedLabels: string[]): HistogramBucket[] {
  return orderedLabels.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

function orderedLabels(edges: readonly number[], unit: string): string[] {
  return edges.map((lo, i) => {
    const hi = edges[i + 1];
    if (hi == null) return `${lo}${unit}+`;
    return `${lo}-${hi}${unit}`;
  });
}

export function resetNativeBoundaryHistogramsForTest(): void {
  reconnectLatency.clear();
  eventLoopLag.clear();
  memoryPressure.clear();
  thermalLevel.clear();
  bridgeFetch.clear();
}

export function recordReconnectLatencyMs(ms: number): void {
  inc(reconnectLatency, bucketLabel(ms, RECONNECT_LATENCY_BUCKETS_MS, 'ms'));
}

export function recordEventLoopLagMs(ms: number): void {
  inc(eventLoopLag, bucketLabel(ms, EVENT_LOOP_LAG_BUCKETS_MS, 'ms'));
}

export function recordMemoryPressurePct(pct: number): void {
  inc(memoryPressure, bucketLabel(pct, MEMORY_PRESSURE_BUCKETS_PCT, '%'));
}

export function recordThermalLevel(level: string): void {
  const key =
    level === 'none' || level === 'light'
      ? 'none'
      : level === 'moderate'
        ? 'moderate'
        : level === 'severe'
          ? 'severe'
          : 'critical+';
  inc(thermalLevel, key);
}

export function recordBridgeFetchMs(ms: number): void {
  inc(bridgeFetch, bucketLabel(ms, BRIDGE_FETCH_BUCKETS_MS, 'ms'));
}

export function getNativeBoundaryHistograms(): NativeBoundaryHistograms {
  return {
    reconnectLatencyMs: toBuckets(reconnectLatency, orderedLabels(RECONNECT_LATENCY_BUCKETS_MS, 'ms')),
    eventLoopLagMs: toBuckets(eventLoopLag, orderedLabels(EVENT_LOOP_LAG_BUCKETS_MS, 'ms')),
    memoryPressurePct: toBuckets(memoryPressure, orderedLabels(MEMORY_PRESSURE_BUCKETS_PCT, '%')),
    thermalLevel: toBuckets(thermalLevel, [...THERMAL_BUCKET_LABELS]),
    bridgeFetchMs: toBuckets(bridgeFetch, orderedLabels(BRIDGE_FETCH_BUCKETS_MS, 'ms')),
  };
}
