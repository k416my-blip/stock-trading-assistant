import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {},
  AppState: { addEventListener: vi.fn() },
  NativeEventEmitter: vi.fn(() => ({ addListener: vi.fn(() => ({ remove: vi.fn() })) })),
}));
vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  getResumeTransitionCount: vi.fn(() => 2),
  cleanupDuplicateTimers: vi.fn(),
}));
vi.mock('../../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  cancelAsyncTasksByLabel: vi.fn(() => 0),
  compactStalePriorityQueue: vi.fn(() => 0),
}));

import { resetAdaptiveLearningStoreForTest } from '../../../src/runtime/analysis/adaptiveRuntimeLearningStorage';
import { resetNativeRuntimeBridgeForTest, setLastNativeSnapshotForTest } from '../../../src/native/runtime/nativeRuntimeBridge';
import {
  resetNativeDeviceTelemetryForTest,
  observeNativeDeviceTelemetryCycle,
  getLastNativeDeviceTelemetrySnapshot,
  exportNativeDeviceTelemetryJson,
  formatNativeDeviceTelemetryExportJson,
} from '../../../src/native/telemetry';
import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';

function baseMetrics(): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 120,
    renderFPS: 18,
    droppedFrames: 2,
    eventLoopLatencyMs: 45,
    asyncQueueLatencyMs: 30,
    websocketRttMs: 80,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: 200,
    orchestrationDurationMs: null,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 5,
    memoryTrendPct: 30,
    thermalState: 'none',
    runtimeModeLabelJa: 'normal',
    native: {
      batterySaverActive: false,
      lowPowerMode: false,
      thermalStatus: 'none',
      memoryWarning: false,
      appState: 'active',
      backgroundRestriction: false,
      networkType: 'wifi',
      miuiAggressiveReclaim: false,
      thermalThrottlingDetected: false,
      resumeSpikeDetected: false,
      observedAt: new Date().toISOString(),
    },
    render: {
      renderFPS: 18,
      frameDropRate: 0.05,
      renderBurstRate: 3,
      dashboardCommitDurationMs: 12,
      reactTransitionPressurePct: 5,
      renderSpikeDetected: false,
      subtreeHotReloadDetected: false,
      excessiveRerenderDetected: false,
    },
    websocket: {
      wsLatencyMs: 80,
      reconnectAttempts: 1,
      frameDelayMs: 0,
      heartbeatDelayMs: 0,
      offlineRecoveryDurationMs: null,
      jitterScore: 10,
      reconnectStormDetected: false,
      packetBatchingEfficiencyPct: 90,
    },
    hydrationResume: {
      hydrationDurationMs: null,
      resumeRecoveryTimeMs: 200,
      duplicateHydrationRate: 0,
      postResumePressurePct: 5,
      resumeCascadeRiskPct: 10,
    },
    longSession: {
      sessionMinutes: 10,
      memoryGrowthTrendPct: 20,
      asyncQueueGrowthTrend: 0,
      renderDegradationPct: 0,
      websocketDegradationPct: 0,
      orchestrationSlowdownPct: 0,
      explanationCacheGrowth: 0,
      checkpoint: 'under_30m',
    },
    measuredAt: new Date().toISOString(),
  };
}

function basePerf(): PerformanceCostRuntimeSnapshot {
  return {
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
}

describe('nativeDeviceTelemetry', () => {
  beforeEach(() => {
    resetNativeDeviceTelemetryForTest();
    resetNativeRuntimeBridgeForTest();
    resetAdaptiveLearningStoreForTest();
    setLastNativeSnapshotForTest({
      available: true,
      bridgeVersion: 1,
      observedAt: new Date().toISOString(),
      nativeMemoryPressurePct: 40,
      trimLevel: 'none',
      trimMemoryBurstCount: 0,
      thermalStatus: 'none',
      batterySaverActive: false,
      lowPowerMode: false,
      foreground: true,
      backgroundReclaimDetected: false,
      droppedFramesEstimate: 3,
      anrRiskScore: 5,
      networkTransportQuality: 'good',
      memoryClass: { memoryClassMb: 192, largeMemoryClassMb: 512, lowRamDevice: false, isLowRamDevice: false },
      manufacturer: 'Xiaomi',
      brand: 'Redmi',
      model: 'Note 13 Pro',
      isXiaomiFamily: true,
      miuiAggressiveReclaim: false,
      source: 'native',
      confidence: 0.9,
      nativeHeapAllocatedMb: 95,
      javaHeapUsedMb: 70,
      availMemMb: 3500,
      totalMemMb: 8192,
      batteryLevelPct: 80,
      bridgePendingEstimate: 2,
    });
  });

  it('collects observation-only snapshot', () => {
    const snap = observeNativeDeviceTelemetryCycle({
      metrics: baseMetrics(),
      performance: basePerf(),
      sessionMinutes: 10,
      tickDurationMs: 42,
    });
    expect(snap).not.toBeNull();
    expect(snap?.readonlyObservationOnly).toBe(true);
    expect(snap?.jsHeapMb).toBe(120);
    expect(snap?.nativeHeapMb).toBeGreaterThan(0);
    expect(snap?.asyncQueueDepth).toBe(5);
    expect(getLastNativeDeviceTelemetrySnapshot()?.deviceModel).toContain('Redmi');
  });

  it('pauses profilers on severe thermal', () => {
    const m = baseMetrics();
    m.thermalState = 'severe';
    const snap = observeNativeDeviceTelemetryCycle({
      metrics: m,
      performance: basePerf(),
      sessionMinutes: 20,
    });
    expect(snap?.samplingMode).toBe('paused');
  });

  it('exports JSON bundle', () => {
    observeNativeDeviceTelemetryCycle({
      metrics: baseMetrics(),
      performance: basePerf(),
      sessionMinutes: 5,
    });
    const exp = exportNativeDeviceTelemetryJson();
    expect(exp?.snapshot.version).toBe('1.0.0');
    const json = formatNativeDeviceTelemetryExportJson();
    expect(json).toContain('memorySnapshots');
  });
});
