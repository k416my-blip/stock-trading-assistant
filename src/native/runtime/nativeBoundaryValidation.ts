/**
 * Native/JS boundary validation — diagnostic report builder (no policy mutations).
 */
import type { NativeBoundaryValidationReport } from '../../types/nativeBoundaryValidation';
import { getLastNativeRuntimeSnapshot } from './nativeRuntimeBridge';
import {
  getNativeBoundaryTrace,
  recordAsyncSaturationTrace,
  recordHydrationOverlapTrace,
  recordTelemetryBurstTrace,
} from './nativeBoundaryTrace';
import {
  getNativeBoundaryHistograms,
  recordEventLoopLagMs,
  recordMemoryPressurePct,
  recordThermalLevel,
} from './nativeBoundaryHistograms';
import {
  getOrphanNativeReconnectCount,
  getWebsocketOwnershipTrace,
} from './websocketOwnershipTrace';
import {
  getReconnectSequenceTrace,
  getReconnectTraceTimeline,
} from '../../runtime/stability/reconnectSequenceTrace';
import { getLifecycleTimeline } from './lifecycleTimeline';
import { getWsDuplicateCount } from '../../runtime/stability/RuntimeReconnectTracker';
import { getResumeCoordinatorSnapshot } from '../../runtime/coordinator/resumeCoordinatorIntegration';
import { NATIVE_BOUNDARY_SOAK_REPORT_VERSION } from '../../constants/nativeBoundaryValidation';

function buildComparison(): NativeBoundaryValidationReport['comparison'] {
  const timeline = getReconnectTraceTimeline();
  const jsScheduleCount = timeline.filter((e) => e.phase === 'schedule').length;
  const jsExecuteCount = timeline.filter((e) => e.phase === 'execute').length;
  const coalescedCount = timeline.filter((e) => e.phase === 'coalesce').length;
  const nativeHints = getNativeBoundaryTrace().filter((e) => e.kind === 'native_lifecycle').length;
  const orphanNativeReconnect = getOrphanNativeReconnectCount();
  const ownership = getWebsocketOwnershipTrace();
  const untaggedExecute = ownership.filter(
    (r) =>
      r.owner === 'js_execute' &&
      !ownership.some((s) => s.reconnectUuid === r.reconnectUuid && s.owner === 'js_coordinator'),
  ).length;

  return {
    jsScheduleCount,
    jsExecuteCount,
    nativeLifecycleReconnectHints: nativeHints,
    orphanNativeReconnect: orphanNativeReconnect + untaggedExecute,
    duplicateSocketCount: getWsDuplicateCount(),
    coalescedCount,
    ownershipConsistent: orphanNativeReconnect === 0 && untaggedExecute === 0,
  };
}

function detectBypass(comparison: NativeBoundaryValidationReport['comparison']): {
  bypassDetected: boolean;
  bypassDetailJa: string;
} {
  const boundary = getNativeBoundaryTrace();
  const mismatch = boundary.filter((e) => e.kind === 'ownership_mismatch');
  if (comparison.orphanNativeReconnect > 0) {
    return {
      bypassDetected: true,
      bypassDetailJa: `native untagged reconnect hints ${comparison.orphanNativeReconnect}`,
    };
  }
  if (comparison.jsExecuteCount > comparison.jsScheduleCount + comparison.coalescedCount) {
    return {
      bypassDetected: true,
      bypassDetailJa: `execute without schedule: exec ${comparison.jsExecuteCount} vs schedule ${comparison.jsScheduleCount}`,
    };
  }
  if (mismatch.length > 0) {
    return {
      bypassDetected: true,
      bypassDetailJa: mismatch.at(-1)?.detailJa ?? 'ownership mismatch',
    };
  }
  return { bypassDetected: false, bypassDetailJa: 'none' };
}

export function buildNativeBoundaryValidationReport(): NativeBoundaryValidationReport {
  const native = getLastNativeRuntimeSnapshot();
  const comparison = buildComparison();
  const bypass = detectBypass(comparison);
  const resume = getResumeCoordinatorSnapshot();

  let productionReadinessHint = 'boundary instrumentation active';
  if (bypass.bypassDetected) productionReadinessHint = 'native bypass risk — audit required';
  else if (comparison.duplicateSocketCount > 0) productionReadinessHint = 'duplicate socket detected';
  else if (resume && resume.phase !== 'idle') productionReadinessHint = 'resume pipeline in flight';
  else productionReadinessHint = 'ownership consistent — device soak recommended';

  return {
    measuredAt: new Date().toISOString(),
    deviceModel: native?.model ?? 'unknown',
    isXiaomiFamily: native?.isXiaomiFamily ?? false,
    metricSource: native?.source ?? 'heuristic',
    comparison,
    histograms: getNativeBoundaryHistograms(),
    recentBoundaryTrace: getNativeBoundaryTrace(16),
    reconnectTimeline: getReconnectSequenceTrace().map((e) => ({
      at: e.at,
      phase: e.phase,
      delayMs: e.delayMs,
      allowed: e.allowed,
      source: e.source,
      token: e.token,
      detailJa: e.detailJa,
    })),
    lifecycleTimeline: getLifecycleTimeline(),
    websocketOwnership: getWebsocketOwnershipTrace(),
    bypassDetected: bypass.bypassDetected,
    bypassDetailJa: bypass.bypassDetailJa,
    productionReadinessHint,
  };
}

export function formatNativeBoundaryValidationReport(report: NativeBoundaryValidationReport): string {
  const lines = [
    `# Native Boundary Validation v${NATIVE_BOUNDARY_SOAK_REPORT_VERSION}`,
    `measured: ${report.measuredAt}`,
    `device: ${report.deviceModel} xiaomi=${report.isXiaomiFamily} source=${report.metricSource}`,
    `bypass: ${report.bypassDetected ? 'YES' : 'no'} — ${report.bypassDetailJa}`,
    `js schedule/execute: ${report.comparison.jsScheduleCount}/${report.comparison.jsExecuteCount}`,
    `coalesced: ${report.comparison.coalescedCount} dup sockets: ${report.comparison.duplicateSocketCount}`,
    `ownership consistent: ${report.comparison.ownershipConsistent}`,
    `readiness: ${report.productionReadinessHint}`,
  ];
  return lines.join('\n');
}

export function exportNativeBoundaryValidationJson(): string {
  return JSON.stringify(buildNativeBoundaryValidationReport(), null, 2);
}

/** Sample histograms + traces on each stability tick (signal only). */
export function observeNativeBoundaryTick(input: {
  eventLoopLagMs: number;
  memoryPressurePct: number;
  thermalLevel: string;
  asyncQueueDepth: number;
  asyncQueueLagMs: number;
  hydrationOverlap: number;
  telemetryBurst: boolean;
}): void {
  recordEventLoopLagMs(input.eventLoopLagMs);
  recordMemoryPressurePct(input.memoryPressurePct);
  recordThermalLevel(input.thermalLevel);

  if (input.asyncQueueDepth >= 35 || input.asyncQueueLagMs >= 200) {
    recordAsyncSaturationTrace(input.asyncQueueDepth, input.asyncQueueLagMs);
  }
  if (input.hydrationOverlap >= 1) {
    recordHydrationOverlapTrace(input.hydrationOverlap);
  }
  if (input.telemetryBurst) {
    recordTelemetryBurstTrace('stability tick burst');
  }
}
