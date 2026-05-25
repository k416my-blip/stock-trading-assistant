import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  getResumeTransitionCount: () => 0,
  initMobileRedmiRuntime: vi.fn(),
}));

vi.mock('../../src/services/nativeDeviceObservation', () => ({
  resetNativeDeviceObservationForTest: () => {},
  initNativeDeviceObservation: vi.fn(),
  noteNativeForegroundTransition: vi.fn(),
  noteNativeMemoryWarning: vi.fn(),
  observeNativeDevice: (input: {
    thermalPressurePct: number;
    memoryPressure: boolean;
    queueSize: number;
  }) => ({
    batterySaverActive: false,
    lowPowerMode: false,
    thermalStatus: input.thermalPressurePct > 70 ? 'severe' : 'none',
    memoryWarning: input.memoryPressure,
    appState: 'active' as const,
    backgroundRestriction: false,
    networkType: 'wifi' as const,
    miuiAggressiveReclaim: false,
    thermalThrottlingDetected: input.thermalPressurePct > 55,
    resumeSpikeDetected: false,
    observedAt: new Date().toISOString(),
  }),
}));
import {
  evaluateRuntimeTelemetry,
  initRuntimeTelemetryEngine,
  recordHydrationDurationMs,
  recordOrchestrationDurationMs,
  resetRuntimeTelemetryEngineForTest,
} from '../../src/services/runtimeTelemetryEngine';
import { resetMobileRuntimeMetricsForTest } from '../../src/services/mobileRuntimeMetrics';
import { resetAsyncRuntimeCoordinatorForTest } from '../../src/services/asyncRuntimeCoordinator';
import { resetRenderPerformanceObserverForTest } from '../../src/services/renderPerformanceObserver';
import { resetWebsocketTelemetryForTest } from '../../src/services/websocketTelemetry';
import { resetHydrationResumeTelemetryForTest } from '../../src/services/hydrationResumeTelemetry';
import { resetLongSessionProfilerForTest } from '../../src/services/longSessionProfiler';
import { resetNativeDeviceObservationForTest } from '../../src/services/nativeDeviceObservation';
import { resetAdaptiveRuntimeTuningForTest } from '../../src/services/adaptiveRuntimeTuning';
import { resetDashboardFrameStabilizerForTest } from '../../src/services/dashboardFrameStabilizer';
import { getAsyncConcurrentLimit } from '../../src/services/asyncRuntimeCoordinator';
import { getDashboardMaxFps as getFpsCap } from '../../src/services/dashboardFrameStabilizer';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
  },
}));

const basePerf = {
  appForeground: true,
  appStateLabel: 'active',
  networkPaused: false,
  offlineMode: false,
  batterySaverActive: false,
  animationsReduced: false,
  xApiPaused: false,
  pollingPaused: false,
  lastOnlineAt: new Date().toISOString(),
};

function baseInput(overrides: Partial<Parameters<typeof evaluateRuntimeTelemetry>[0]> = {}) {
  return {
    performance: basePerf,
    mobileMetrics: {
      runtimeFPS: 28,
      jsThreadPressurePct: 22,
      estimatedMemoryPressurePct: 18,
      renderBurstRate: 4,
      websocketReconnectRate: 0,
      backgroundResumeRecoveryMs: 320,
      schedulerMode: 'LIGHTWEIGHT' as const,
      measuredAt: new Date().toISOString(),
    },
    asyncMetrics: {
      eventLoopPressure: 30,
      microtaskBurstRisk: 10,
      renderBlockRisk: 8,
      asyncQueueDepth: 6,
      taskExecutionLatencyMs: 45,
      websocketFrameDelayMs: 40,
      hydrationCollisionRisk: 5,
      eventLoopState: 'EVENTLOOP_OK' as const,
      measuredAt: new Date().toISOString(),
    },
    queueSize: 12,
    memoryPressure: false,
    thermalPressurePct: 20,
    sessionMinutes: 35,
    cascadePressure: 22,
    ...overrides,
  };
}

describe('runtimeTelemetryEngine', () => {
  beforeEach(() => {
    resetRuntimeTelemetryEngineForTest();
    resetMobileRuntimeMetricsForTest();
    resetAsyncRuntimeCoordinatorForTest();
    resetRenderPerformanceObserverForTest();
    resetWebsocketTelemetryForTest();
    resetHydrationResumeTelemetryForTest();
    resetLongSessionProfilerForTest();
    resetNativeDeviceObservationForTest();
    resetAdaptiveRuntimeTuningForTest();
    resetDashboardFrameStabilizerForTest();
  });

  it('classifies OK under healthy metrics', () => {
    const ev = evaluateRuntimeTelemetry(baseInput());
    expect(ev.state).toBe('TELEMETRY_OK');
    expect(ev.metrics.renderFPS).toBeGreaterThan(0);
    expect(ev.tuning.strategyChangeForbidden).toBe(true);
  });

  it('degrades on thermal and queue pressure', () => {
    const ev = evaluateRuntimeTelemetry(
      baseInput({
        thermalPressurePct: 78,
        asyncMetrics: {
          ...baseInput().asyncMetrics,
          asyncQueueDepth: 52,
          taskExecutionLatencyMs: 200,
        },
      }),
    );
    expect(['TELEMETRY_DEGRADED', 'TELEMETRY_CRITICAL']).toContain(ev.state);
  });

  it('derives aggressive tuning when critical (kernel owns apply path)', () => {
    const ev = evaluateRuntimeTelemetry(
      baseInput({
        mobileMetrics: { ...baseInput().mobileMetrics, runtimeFPS: 8 },
        asyncMetrics: {
          ...baseInput().asyncMetrics,
          taskExecutionLatencyMs: 320,
          asyncQueueDepth: 55,
        },
      }),
    );
    expect(ev.tuning.maxDashboardFps).toBeLessThanOrEqual(12);
    expect(ev.tuning.asyncConcurrency).toBeLessThanOrEqual(2);
    expect(getFpsCap()).toBe(30);
  });

  it('records orchestration and hydration durations', () => {
    recordOrchestrationDurationMs(240);
    recordHydrationDurationMs(110);
    const ev = evaluateRuntimeTelemetry(baseInput());
    expect(ev.metrics.orchestrationDurationMs).toBe(240);
    expect(ev.metrics.hydrationDurationMs).toBe(110);
  });

  it('simulates long session 30/60/90 checkpoints', () => {
    for (let m = 0; m < 95; m += 1) {
      evaluateRuntimeTelemetry(
        baseInput({
          sessionMinutes: m,
          queueSize: 10 + Math.floor(m / 10),
        }),
      );
    }
    const ev = evaluateRuntimeTelemetry(baseInput({ sessionMinutes: 92 }));
    expect(ev.metrics.longSession.checkpoint).toBe('90m');
  });

  it('observes native device snapshot', () => {
    const ev = evaluateRuntimeTelemetry(baseInput({ thermalPressurePct: 80 }));
    expect(ev.metrics.native.thermalThrottlingDetected).toBe(true);
    expect(ev.metrics.native.appState).toBe('active');
  });

  it('loads startup anomaly from persistence', async () => {
    await initRuntimeTelemetryEngine();
    const ev = evaluateRuntimeTelemetry(baseInput());
    expect(ev.summaryJa.length).toBeGreaterThan(0);
  });
});
