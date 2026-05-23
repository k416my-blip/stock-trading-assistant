import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/websocketStabilityGuard', () => ({
  executeWebsocketReconnectJitter: vi.fn(),
}));

vi.mock('../../../src/services/asyncBudgetSystem', () => ({
  resolveAsyncBudgetDecision: vi.fn(() => 'allow'),
}));

vi.mock('../../../src/native/runtime/nativeRuntimeBridge', () => ({
  getLastNativeRuntimeSnapshot: vi.fn(() => ({
    model: 'Redmi Note 13 Pro',
    isXiaomiFamily: true,
    source: 'native',
    batterySaverActive: false,
    networkTransportQuality: 'good',
    trimLevel: 'none',
    trimMemoryBurstCount: 0,
    backgroundReclaimDetected: false,
  })),
}));

vi.mock('../../../src/runtime/coordinator/resumeCoordinatorIntegration', () => ({
  getResumeCoordinatorSnapshot: vi.fn(() => null),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(() => Promise.resolve()),
    getItem: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  getResumeTransitionCount: vi.fn(() => 0),
}));

vi.mock('../../../src/services/performanceCostRuntime', () => ({
  getPerformanceCostSnapshot: vi.fn(() => ({ appForeground: true })),
}));

import {
  buildRedmiLongSoakExport,
  exportRedmiLongSoakJson,
  noteRedmiSoakScenario,
  resetRedmiLongSoakValidationForTest,
  startRedmiLongSoakSession,
  tickRedmiLongSoakValidation,
} from '../../../src/native/runtime/redmiLongSoakValidation';
import { resetReconnectCoordinatorForTest } from '../../../src/runtime/stability/reconnectCoordinator';
import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';

function metrics(): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 100,
    renderFPS: 30,
    droppedFrames: 0,
    eventLoopLatencyMs: 40,
    asyncQueueLatencyMs: 50,
    websocketRttMs: 80,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: 200,
    orchestrationDurationMs: null,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 10,
    memoryTrendPct: 35,
    thermalState: 'none',
    runtimeModeLabelJa: 'normal',
    measuredAt: new Date().toISOString(),
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
      renderFPS: 30,
      frameDropRate: 0,
      renderBurstRate: 0,
      dashboardCommitDurationMs: 10,
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
      sessionMinutes: 0,
      memoryGrowthTrendPct: 0,
      asyncQueueGrowthTrend: 0,
      renderDegradationPct: 0,
      websocketDegradationPct: 0,
      orchestrationSlowdownPct: 0,
      explanationCacheGrowth: 0,
      checkpoint: 'under_30m',
    },
  };
}

describe('redmiLongSoakValidation', () => {
  beforeEach(() => {
    resetRedmiLongSoakValidationForTest();
    resetReconnectCoordinatorForTest();
  });

  it('exports JSON bundle with required sections', () => {
    startRedmiLongSoakSession(8);
    noteRedmiSoakScenario('background_foreground', false, 'manual');
    tickRedmiLongSoakValidation(metrics(), true);
    const parsed = JSON.parse(exportRedmiLongSoakJson()) as ReturnType<typeof buildRedmiLongSoakExport>;
    expect(parsed.summary).toBeDefined();
    expect(parsed.failureTimeline).toBeDefined();
    expect(parsed.scenarioLog.length).toBeGreaterThan(0);
    expect(parsed.anomalyReplaySnapshot.boundaryValidation).toBeDefined();
    expect(parsed.dashboardReport).toBeDefined();
  });

  it('tracks critical check keys A–H', () => {
    startRedmiLongSoakSession(8);
    const exp = buildRedmiLongSoakExport();
    expect(exp.summary.criticalChecks.native_reconnect_bypass).toBeDefined();
    expect(exp.summary.criticalChecks.miui_delayed_resume).toBeDefined();
  });
});
