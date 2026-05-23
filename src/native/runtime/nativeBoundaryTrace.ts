import type {
  NativeBoundaryEventKind,
  NativeBoundaryTraceEvent,
} from '../../types/nativeBoundaryValidation';
import type { ReconnectSource } from '../../types/reconnectEntry';
import type { TelemetryMetricSource } from '../../types/nativeRuntimeBridge';
import { NATIVE_BOUNDARY_TRACE_MAX } from '../../constants/nativeBoundaryValidation';

const events: NativeBoundaryTraceEvent[] = [];

export function resetNativeBoundaryTraceForTest(): void {
  events.length = 0;
}

export function recordNativeBoundaryEvent(
  partial: Omit<NativeBoundaryTraceEvent, 'at'> & { at?: string },
): void {
  events.push({ at: partial.at ?? new Date().toISOString(), ...partial });
  if (events.length > NATIVE_BOUNDARY_TRACE_MAX) events.shift();
}

export function getNativeBoundaryTrace(limit = NATIVE_BOUNDARY_TRACE_MAX): NativeBoundaryTraceEvent[] {
  return events.slice(-limit);
}

export function recordBridgeFetchTrace(input: {
  durationMs: number;
  ok: boolean;
  metricSource: TelemetryMetricSource;
  detailJa: string;
}): void {
  recordNativeBoundaryEvent({
    kind: 'bridge_fetch',
    detailJa: input.detailJa,
    native: input.metricSource === 'native',
    durationMs: input.durationMs,
    metricSource: input.metricSource,
  });
}

export function recordAppPhaseTrace(phase: 'foreground' | 'background' | 'inactive', detailJa: string): void {
  recordNativeBoundaryEvent({
    kind: 'app_phase',
    detailJa: `${phase}: ${detailJa}`,
    native: false,
  });
}

export function recordNativeLifecycleTrace(detailJa: string, reconnectUuid?: string): void {
  recordNativeBoundaryEvent({
    kind: 'native_lifecycle',
    detailJa,
    native: true,
    reconnectUuid,
  });
}

export function recordCoordinatorReconnectTrace(
  source: ReconnectSource,
  reconnectUuid: string,
  detailJa: string,
): void {
  recordNativeBoundaryEvent({
    kind: 'coordinator_reconnect',
    detailJa,
    native: false,
    reconnectSource: source,
    reconnectUuid,
  });
}

export function recordJsReconnectExecuteTrace(reconnectUuid: string, delayMs: number): void {
  recordNativeBoundaryEvent({
    kind: 'js_reconnect_execute',
    detailJa: `execute delay ${delayMs}ms`,
    native: false,
    reconnectUuid,
    durationMs: delayMs,
  });
}

export function recordHydrationOverlapTrace(overlapCount: number): void {
  recordNativeBoundaryEvent({
    kind: 'hydration_overlap',
    detailJa: `overlap ${overlapCount}`,
    native: false,
  });
}

export function recordTelemetryBurstTrace(detailJa: string): void {
  recordNativeBoundaryEvent({
    kind: 'telemetry_burst',
    detailJa,
    native: false,
  });
}

export function recordAsyncSaturationTrace(queueDepth: number, lagMs: number): void {
  recordNativeBoundaryEvent({
    kind: 'async_saturation',
    detailJa: `queue ${queueDepth} lag ${lagMs}ms`,
    native: false,
  });
}

export function recordOwnershipMismatchTrace(detailJa: string, reconnectUuid?: string): void {
  recordNativeBoundaryEvent({
    kind: 'ownership_mismatch',
    detailJa,
    native: true,
    reconnectUuid,
  });
}
