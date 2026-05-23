import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
  NativeModules: {},
  NativeEventEmitter: vi.fn(() => ({ addListener: () => ({ remove: () => {} }) })),
}));

vi.mock('../../src/services/productionStability/productionStabilityRuntime', () => ({
  setOrchestratorProactiveGates: vi.fn(),
  shouldPauseConciergeAi: () => false,
  shouldThrottleConciergeAi: () => false,
}));

vi.mock('../../src/services/dashboardFrameStabilizer', () => ({
  setDashboardCompactMode: vi.fn(),
  setDashboardFpsCap: vi.fn(),
  setMetricsSamplingRate: vi.fn(),
}));

import {
  resetRuntimeKernelForTest,
  evaluateRuntimeKernelPure,
} from '../../src/runtime/kernel/RuntimeKernel';
import { prepareRuntimeKernelContextSync } from '../../src/runtime/kernel/runtimeKernelPreparation';
import type { RuntimeTelemetryMetricsSnapshot } from '../../src/types/runtimeTelemetry';
import { computeReducerCandidate } from '../../src/runtime/kernel/RuntimeReducer';
import type { RuntimeUnifiedSignals } from '../../src/types/runtimeKernel';

function baseSignals(overrides: Partial<RuntimeUnifiedSignals> = {}): RuntimeUnifiedSignals {
  return {
    memoryPressurePct: 10,
    memoryPressureSource: 'heuristic',
    memoryPressureConfidence: 0.5,
    thermalPressure: 'none',
    thermalSource: 'heuristic',
    queueDepth: 5,
    renderFps: 28,
    wsLatencyMs: 80,
    wsReconnectStorm: false,
    wsJitterScore: 10,
    hydrationCascadeRiskPct: 5,
    hydrationInFlight: false,
    hydrationPaused: false,
    proactivePause: false,
    proactiveThrottle: false,
    miuiAggressiveReclaim: false,
    killRiskScore: 10,
    forceMiuiSurvival: false,
    lifecycleForeground: true,
    memoryWarning: false,
    renderSpikeCount: 0,
    cascadePressure: 10,
    sessionMinutes: 5,
    observedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('runtimeKernel', () => {
  beforeEach(() => {
    resetRuntimeKernelForTest();
  });

  it('computeReducerCandidate escalates to SURVIVAL on MIUI force', () => {
    expect(computeReducerCandidate(baseSignals({ forceMiuiSurvival: true }))).toBe('SURVIVAL');
  });

  it('computeReducerCandidate returns STABLE under light load', () => {
    expect(computeReducerCandidate(baseSignals())).toBe('STABLE');
  });

  it('pure kernel emits effects without executing dashboard mutations', async () => {
    const { setDashboardCompactMode } = await import('../../src/services/dashboardFrameStabilizer');
    vi.mocked(setDashboardCompactMode).mockClear();
    const metrics = minimalMetrics();
    const prepared = prepareRuntimeKernelContextSync({
      telemetry: minimalTelemetry(metrics),
      performance: minimalPerf(),
      cascadePressure: 10,
      sessionMinutes: 5,
    });
    const decision = evaluateRuntimeKernelPure(prepared);
    expect(decision.effects.length).toBeGreaterThan(0);
    expect(decision.nextState).toBe('STABLE');
    expect(setDashboardCompactMode).not.toHaveBeenCalled();
  });
});

function minimalPerf() {
  return {
    appForeground: true,
    appStateLabel: 'active' as const,
    networkPaused: false,
    offlineMode: false,
    batterySaverActive: false,
    animationsReduced: false,
    xApiPaused: false,
    pollingPaused: false,
    lastOnlineAt: new Date().toISOString(),
  };
}

function minimalTelemetry(metrics: RuntimeTelemetryMetricsSnapshot) {
  return {
    state: 'TELEMETRY_OK' as const,
    stateLabelJa: 'ok',
    metrics,
    tuning: {
      maxDashboardFps: 30,
      dashboardCompact: false,
      asyncConcurrency: 2,
      websocketHeartbeatMs: 15000,
      explanationSamplingRate: 1,
      strategyChangeForbidden: true as const,
      governanceOverrideForbidden: true as const,
      appliedAt: new Date().toISOString(),
    },
    summaryJa: 'ok',
    compactDashboard: false,
    lastAnomalySummaryJa: null,
  };
}

function minimalMetrics(): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 40,
    renderFPS: 28,
    droppedFrames: 0,
    eventLoopLatencyMs: 40,
    asyncQueueLatencyMs: 40,
    websocketRttMs: 80,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: 200,
    orchestrationDurationMs: null,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 5,
    memoryTrendPct: 10,
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
      renderFPS: 28,
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
      sessionMinutes: 5,
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
