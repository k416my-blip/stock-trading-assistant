import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
import {
  resetTelemetryOverheadForTest,
  gateTelemetryCycle,
  buildOptimizedExportPayload,
  buildDecimatedGraph,
  getTelemetryOverheadDashboard,
  guardedAsyncStoragePersist,
} from '../../../src/native/telemetry/overhead';
import type { ObserveNativeDeviceTelemetryInput } from '../../../src/types/nativeDeviceTelemetry';

function input(overrides?: Partial<ObserveNativeDeviceTelemetryInput['metrics']>): ObserveNativeDeviceTelemetryInput {
  return {
    metrics: {
      jsHeapEstimateMb: 100,
      renderFPS: 18,
      droppedFrames: 0,
      eventLoopLatencyMs: 30,
      asyncQueueLatencyMs: 20,
      websocketRttMs: 70,
      hydrationDurationMs: null,
      foregroundResumeDurationMs: null,
      orchestrationDurationMs: null,
      explanationGenerationDurationMs: null,
      asyncQueueDepth: 3,
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
        renderFPS: 18,
        frameDropRate: 0,
        renderBurstRate: 1,
        dashboardCommitDurationMs: 8,
        reactTransitionPressurePct: 0,
        renderSpikeDetected: false,
        subtreeHotReloadDetected: false,
        excessiveRerenderDetected: false,
      },
      websocket: {
        wsLatencyMs: 70,
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
        resumeRecoveryTimeMs: null,
        duplicateHydrationRate: 0,
        postResumePressurePct: 0,
        resumeCascadeRiskPct: 0,
      },
      longSession: {
        sessionMinutes: 5,
        memoryGrowthTrendPct: 10,
        asyncQueueGrowthTrend: 0,
        renderDegradationPct: 0,
        websocketDegradationPct: 0,
        orchestrationSlowdownPct: 0,
        explanationCacheGrowth: 0,
        checkpoint: 'under_30m',
      },
      measuredAt: new Date().toISOString(),
      ...overrides,
    },
    performance: {
      appForeground: true,
      appStateLabel: 'active',
      networkPaused: false,
      offlineMode: false,
      batterySaverActive: false,
      animationsReduced: false,
      xApiPaused: false,
      pollingPaused: false,
      lastOnlineAt: new Date().toISOString(),
    },
    sessionMinutes: 5,
  };
}

describe('telemetryOverhead', () => {
  beforeEach(() => {
    resetTelemetryOverheadForTest();
  });

  it('throttles telemetry cycles', () => {
    const a = gateTelemetryCycle(input());
    expect(a.allowed).toBe(true);
    const b = gateTelemetryCycle(input());
    expect(b.allowed).toBe(false);
  });

  it('compacts snapshots and exports chunks', () => {
    const base = {
      at: new Date().toISOString(),
      jsHeapMb: 100,
      nativeHeapMb: 50,
      replayCount: 5,
      asyncQueueDepth: 2,
    };
    const snaps = Array.from({ length: 20 }, () => ({ ...base, at: new Date().toISOString() }));
    const out = buildOptimizedExportPayload({
      timeline: [{ at: new Date().toISOString(), kind: 'checkpoint', detailJa: 'x' }],
      snapshots: snaps,
    });
    expect(out.compacted.compressionRatio).toBeLessThanOrEqual(1);
    expect(out.timeline[0].count).toBeGreaterThanOrEqual(1);
    expect(out.chunks.length).toBeGreaterThan(0);
  });

  it('profiles overhead metrics', () => {
    gateTelemetryCycle(input());
    const dash = getTelemetryOverheadDashboard();
    expect(dash.profile.telemetryCpuCost).toBeGreaterThanOrEqual(0);
    expect(dash.profile.compressionRatio).toBeDefined();
  });

  it('decimates graphs quickly', () => {
    const g = buildDecimatedGraph(Array.from({ length: 200 }, (_, i) => i));
    expect(g.sparkline.length).toBeGreaterThan(0);
    expect(g.ms).toBeLessThan(50);
  });

  it('limits async storage writes in background', async () => {
    let writes = 0;
    for (let i = 0; i < 10; i += 1) {
      await guardedAsyncStoragePersist(false, async () => {
        writes += 1;
      });
    }
    expect(writes).toBe(0);
  });
});
