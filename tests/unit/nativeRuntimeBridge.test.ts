import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
  NativeModules: {},
  NativeEventEmitter: vi.fn(() => ({ addListener: () => ({ remove: () => {} }) })),
}));

vi.mock('../../src/services/performanceCostRuntime', () => ({
  getPerformanceCostSnapshot: () => ({
    appForeground: true,
    appStateLabel: 'active',
    offlineMode: false,
    batterySaverActive: false,
  }),
}));
import {
  resetNativeRuntimeBridgeForTest,
  fetchNativeRuntimeSnapshot,
  noteNativeTrimMemory,
  setLastNativeSnapshotForTest,
} from '../../src/native/runtime/nativeRuntimeBridge';
import {
  resetMiuiReclaimDetectorForTest,
  detectMiuiAggressiveReclaim,
  noteMiuiForcedReconnect,
  noteMiuiHydrationResetSpike,
  noteMiuiBackgroundStart,
  noteMiuiForegroundResume,
} from '../../src/native/runtime/miuiReclaimDetector';
import {
  resetRuntimeKillPredictorForTest,
  predictRuntimeKill,
} from '../../src/native/runtime/runtimeKillPredictor';
import type { RuntimeTelemetryMetricsSnapshot } from '../../src/types/runtimeTelemetry';

function baseMetrics(): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 40,
    renderFPS: 20,
    droppedFrames: 0,
    eventLoopLatencyMs: 50,
    asyncQueueLatencyMs: 50,
    websocketRttMs: 80,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: 200,
    orchestrationDurationMs: null,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 10,
    memoryTrendPct: 20,
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
      renderFPS: 20,
      frameDropRate: 0,
      renderBurstRate: 0,
      dashboardCommitDurationMs: 12,
      reactTransitionPressurePct: 5,
      renderSpikeDetected: false,
      excessiveRerenderDetected: false,
      subtreeHotReloadDetected: false,
    },
    websocket: {
      wsLatencyMs: 80,
      reconnectAttempts: 0,
      frameDelayMs: 0,
      heartbeatDelayMs: 0,
      offlineRecoveryDurationMs: null,
      jitterScore: 0,
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
      checkpoint: 'under_30m',
      memoryGrowthTrendPct: 5,
      asyncQueueGrowthTrend: 0,
      renderDegradationPct: 0,
      websocketDegradationPct: 0,
      orchestrationSlowdownPct: 0,
      explanationCacheGrowth: 0,
    },
    measuredAt: new Date().toISOString(),
  };
}

describe('nativeRuntimeBridge', () => {
  beforeEach(() => {
    resetNativeRuntimeBridgeForTest();
    resetMiuiReclaimDetectorForTest();
    resetRuntimeKillPredictorForTest();
  });

  it('falls back to heuristic snapshot when native module absent', async () => {
    const snap = await fetchNativeRuntimeSnapshot();
    expect(snap.source).toBe('heuristic');
    expect(snap.confidence).toBeLessThan(0.6);
    expect(snap.available).toBe(false);
  });

  it('detects MIUI reclaim after burst signals', () => {
    setLastNativeSnapshotForTest({
      available: true,
      bridgeVersion: 1,
      observedAt: new Date().toISOString(),
      nativeMemoryPressurePct: 50,
      trimLevel: 'background',
      trimMemoryBurstCount: 3,
      thermalStatus: 'moderate',
      batterySaverActive: false,
      lowPowerMode: false,
      foreground: true,
      backgroundReclaimDetected: true,
      droppedFramesEstimate: 0,
      anrRiskScore: 10,
      networkTransportQuality: 'good',
      memoryClass: {
        memoryClassMb: 192,
        largeMemoryClassMb: 512,
        lowRamDevice: false,
        isLowRamDevice: false,
      },
      manufacturer: 'Xiaomi',
      brand: 'Redmi',
      model: 'Note 13 Pro',
      isXiaomiFamily: true,
      miuiAggressiveReclaim: false,
      source: 'native',
      confidence: 0.92,
    });
    noteMiuiBackgroundStart();
    noteMiuiForegroundResume();
    noteMiuiForcedReconnect();
    noteMiuiForcedReconnect();
    noteMiuiForcedReconnect();
    noteMiuiHydrationResetSpike();
    noteMiuiHydrationResetSpike();
    noteNativeTrimMemory(20);
    noteNativeTrimMemory(20);
    noteNativeTrimMemory(20);
    const miui = detectMiuiAggressiveReclaim();
    expect(miui.value).toBe(true);
  });

  it('predicts IMMINENT kill risk under stress', () => {
    const m = baseMetrics();
    m.asyncQueueDepth = 55;
    m.render.renderFPS = 6;
    m.memoryTrendPct = 80;
    m.websocket.reconnectStormDetected = true;
    m.native.miuiAggressiveReclaim = true;
    const pred = predictRuntimeKill({ metrics: m, sessionMinutes: 400 });
    expect(['HIGH', 'IMMINENT']).toContain(pred.level);
    expect(pred.score).toBeGreaterThan(65);
  });
});
