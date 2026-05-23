import { describe, expect, it } from 'vitest';
import {
  analyzeRedmiSoakReport,
  findRootOwnershipEvent,
} from '../../../src/native/runtime/postSoakFailureAnalysis';
import type { RedmiLongSoakExport } from '../../../src/types/redmiLongSoakValidation';

function baseExport(overrides: Partial<RedmiLongSoakExport> = {}): RedmiLongSoakExport {
  const base: RedmiLongSoakExport = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    summary: {
      version: '1.0.0',
      session: {
        startedAt: new Date(Date.now() - 9 * 3_600_000).toISOString(),
        targetHours: 8,
        elapsedMs: 9 * 3_600_000,
        deviceModel: 'Redmi Note 13 Pro',
        isXiaomiFamily: true,
        metricSource: 'native',
        active: false,
        scenariosObserved: ['background_foreground'],
        checkpointsCount: 10,
        failuresCount: 0,
      },
      criticalChecks: {
        native_reconnect_bypass: { passed: true, occurrences: 0, lastAt: null },
        duplicate_reconnect: { passed: true, occurrences: 0, lastAt: null },
        coordinator_ownership_violation: { passed: true, occurrences: 0, lastAt: null },
        reconnect_storm: { passed: true, occurrences: 0, lastAt: null },
        hydration_race: { passed: true, occurrences: 0, lastAt: null },
        timer_resurrection: { passed: true, occurrences: 0, lastAt: null },
        silent_websocket_disconnect: { passed: true, occurrences: 0, lastAt: null },
        miui_delayed_resume: { passed: true, occurrences: 0, lastAt: null },
      },
      minDurationMet: true,
      productionReady: true,
      headlineJa: 'ok',
      riskJa: 'none',
    },
    failureTimeline: [],
    scenarioLog: [],
    checkpoints: [
      {
        at: new Date().toISOString(),
        elapsedMs: 9 * 3_600_000,
        reconnectPerMin: 1,
        duplicateSockets: 0,
        asyncQueueDepth: 10,
        asyncQueueLagMs: 50,
        memoryPressurePct: 40,
        thermalLevel: 'none',
        resumeLatencyMs: 500,
        bypassDetected: false,
        ownershipConsistent: true,
      },
    ],
    boundaryValidation: {
      measuredAt: new Date().toISOString(),
      deviceModel: 'Redmi Note 13 Pro',
      isXiaomiFamily: true,
      metricSource: 'native',
      comparison: {
        jsScheduleCount: 2,
        jsExecuteCount: 2,
        nativeLifecycleReconnectHints: 0,
        orphanNativeReconnect: 0,
        duplicateSocketCount: 0,
        coalescedCount: 0,
        ownershipConsistent: true,
      },
      histograms: {
        reconnectLatencyMs: [{ label: '0-250ms', count: 2 }],
        eventLoopLagMs: [{ label: '0-50ms', count: 5 }],
        memoryPressurePct: [{ label: '25-40%', count: 3 }],
        thermalLevel: [{ label: 'none', count: 10 }],
        bridgeFetchMs: [{ label: '0-50ms', count: 4 }],
      },
      recentBoundaryTrace: [],
      reconnectTimeline: [
        {
          at: '2026-01-01T10:00:00.000Z',
          phase: 'schedule',
          delayMs: 1000,
          allowed: true,
          token: 'rc-1',
          detailJa: 'schedule',
        },
        {
          at: '2026-01-01T10:00:01.000Z',
          phase: 'execute',
          delayMs: 1000,
          allowed: true,
          token: 'rc-1',
          detailJa: 'execute',
        },
      ],
      lifecycleTimeline: [],
      websocketOwnership: [
        {
          reconnectUuid: 'rc-1',
          owner: 'js_coordinator',
          source: 'kernel_policy',
          scheduledAt: '2026-01-01T10:00:00.000Z',
          executedAt: '2026-01-01T10:00:01.000Z',
          duplicate: false,
        },
      ],
      bypassDetected: false,
      bypassDetailJa: 'none',
      productionReadinessHint: 'ok',
    },
    anomalyReplaySnapshot: {
      stability: null,
      reconnectPerMin: 1,
      hydrationLock: { active: false, overlapCount: 0, key: null, since: 0, wsMutationBlocked: 0, dashboardUpdateBlocked: 0 },
      hydrationPhase: 'idle',
      asyncQueue: { queuedTaskCount: 10, executorLagMs: 50, unresolvedPromiseEstimate: 0, longTaskDurationMs: 0 },
      miui: {
        backgroundDurationMs: 0,
        resumeLatencyMs: 500,
        silentDisconnectCount: 0,
        timerDriftMs: 0,
        lastResumeAt: 0,
      },
      reconnectTraceCount: 2,
      reconnectTrace: [],
      lifecycleTimeline: [],
      nativeBoundaryTrace: [],
      nativeBoundaryHistograms: {
        reconnectLatencyMs: [],
        eventLoopLagMs: [],
        memoryPressurePct: [],
        thermalLevel: [],
        bridgeFetchMs: [],
      },
      websocketOwnership: [],
      boundaryValidation: {
        measuredAt: '',
        deviceModel: '',
        isXiaomiFamily: true,
        metricSource: 'native',
        comparison: {
          jsScheduleCount: 0,
          jsExecuteCount: 0,
          nativeLifecycleReconnectHints: 0,
          orphanNativeReconnect: 0,
          duplicateSocketCount: 0,
          coalescedCount: 0,
          ownershipConsistent: true,
        },
        histograms: {
          reconnectLatencyMs: [],
          eventLoopLagMs: [],
          memoryPressurePct: [],
          thermalLevel: [],
          bridgeFetchMs: [],
        },
        recentBoundaryTrace: [],
        reconnectTimeline: [],
        lifecycleTimeline: [],
        websocketOwnership: [],
        bypassDetected: false,
        bypassDetailJa: '',
        productionReadinessHint: '',
      },
      exportedAt: new Date().toISOString(),
    },
    dashboardReport: {
      soakProgressPct: 100,
      elapsedHours: 9,
      targetHours: 8,
      failuresCount: 0,
      scenariosCount: 1,
      lastFailureJa: null,
      bypassDetected: false,
      duplicateSockets: 0,
    },
  };
  return { ...base, ...overrides };
}

describe('postSoakFailureAnalysis', () => {
  it('PASS on clean soak export', () => {
    const report = analyzeRedmiSoakReport(baseExport());
    expect(report.verdict).toBe('PASS');
    expect(report.finalScore).toBeGreaterThanOrEqual(80);
    expect(report.rootEvent).toBeNull();
  });

  it('FAIL on duplicate sockets', () => {
    const exp = baseExport();
    exp.boundaryValidation.comparison.duplicateSocketCount = 2;
    const report = analyzeRedmiSoakReport(exp);
    expect(report.verdict).toBe('FAIL');
    expect(report.autoFailReasons).toContain('duplicate_sockets');
  });

  it('finds first root event before cascade duplicate', () => {
    const exp = baseExport();
    exp.boundaryValidation.websocketOwnership = [
      {
        reconnectUuid: 'rc-dup',
        owner: 'js_coordinator',
        source: 'kernel_policy',
        scheduledAt: '2026-01-01T10:00:00.000Z',
        duplicate: true,
      },
      {
        reconnectUuid: 'rc-dup',
        owner: 'js_execute',
        source: 'kernel_policy',
        scheduledAt: '2026-01-01T10:00:05.000Z',
        executedAt: '2026-01-01T10:00:06.000Z',
        duplicate: false,
      },
    ];
    const root = findRootOwnershipEvent(exp);
    expect(root?.kind).toBe('duplicate_socket');
    expect(root?.at).toBe('2026-01-01T10:00:00.000Z');
  });

  it('FAIL on reconnect storm from checkpoints', () => {
    const exp = baseExport();
    exp.checkpoints[0].reconnectPerMin = 5;
    const report = analyzeRedmiSoakReport(exp);
    expect(report.verdict).toBe('FAIL');
    expect(report.autoFailReasons).toContain('reconnect_storm');
  });
});
