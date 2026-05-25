import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ORCHESTRATOR_DEGRADED_MIN_MS,
  ORCHESTRATOR_UPGRADE_CONFIRM_MS,
} from '../../src/constants/runtimeOrchestrator';

vi.mock('../../src/services/productionStability/productionStabilityRuntime', () => ({
  setOrchestratorProactiveGates: vi.fn(),
  shouldPauseConciergeAi: () => false,
  shouldThrottleConciergeAi: () => false,
  shouldAllowOpenAiRequest: () => true,
}));

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  getResumeTransitionCount: () => 0,
  cleanupDuplicateTimers: vi.fn(),
}));

import {
  evaluateRuntimeOrchestrator,
  resetRuntimeOrchestratorForTest,
  shouldOrchestratorPauseConciergeAi,
} from '../../src/runtime/orchestrator/runtimeOrchestrator';
import { resetAsyncPrioritySchedulerForTest } from '../../src/runtime/orchestrator/asyncPriorityScheduler';
import { resetMemoryPressureGuardianForTest } from '../../src/runtime/orchestrator/memoryPressureGuardian';
import { resetDashboardFrameStabilizerForTest } from '../../src/services/dashboardFrameStabilizer';
import { resetAsyncRuntimeCoordinatorForTest } from '../../src/services/asyncRuntimeCoordinator';
import type { RuntimeTelemetryMetricsSnapshot } from '../../src/types/runtimeTelemetry';

function baseMetrics(overrides: Partial<RuntimeTelemetryMetricsSnapshot> = {}): RuntimeTelemetryMetricsSnapshot {
  const { websocket: wsOverride, ...restOverrides } = overrides;
  const ws = {
    wsLatencyMs: 80,
    reconnectAttempts: 0,
    frameDelayMs: 20,
    heartbeatDelayMs: 80,
    offlineRecoveryDurationMs: null,
    jitterScore: 10,
    reconnectStormDetected: false,
    packetBatchingEfficiencyPct: 90,
  };
  return {
    jsHeapEstimateMb: 40,
    renderFPS: 28,
    droppedFrames: 1,
    eventLoopLatencyMs: 40,
    asyncQueueLatencyMs: 40,
    websocketRttMs: 80,
    hydrationDurationMs: 120,
    foregroundResumeDurationMs: 300,
    orchestrationDurationMs: 200,
    explanationGenerationDurationMs: 50,
    asyncQueueDepth: 8,
    memoryTrendPct: 10,
    thermalState: 'light',
    runtimeModeLabelJa: 'LIGHTWEIGHT',
    native: {
      batterySaverActive: false,
      lowPowerMode: false,
      thermalStatus: 'light',
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
      frameDropRate: 5,
      renderBurstRate: 4,
      dashboardCommitDurationMs: 80,
      reactTransitionPressurePct: 20,
      renderSpikeDetected: false,
      subtreeHotReloadDetected: false,
      excessiveRerenderDetected: false,
    },
    hydrationResume: {
      hydrationDurationMs: 120,
      resumeRecoveryTimeMs: 300,
      duplicateHydrationRate: 5,
      postResumePressurePct: 15,
      resumeCascadeRiskPct: 10,
    },
    longSession: {
      sessionMinutes: 65,
      memoryGrowthTrendPct: 12,
      asyncQueueGrowthTrend: 2,
      renderDegradationPct: 5,
      websocketDegradationPct: 3,
      orchestrationSlowdownPct: 4,
      explanationCacheGrowth: 2,
      checkpoint: '60m',
    },
    measuredAt: new Date().toISOString(),
    ...restOverrides,
    websocket: { ...ws, ...(wsOverride ?? {}) },
  };
}

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

describe('runtimeOrchestrator', () => {
  beforeEach(() => {
    resetRuntimeOrchestratorForTest();
    resetAsyncPrioritySchedulerForTest();
    resetMemoryPressureGuardianForTest();
    resetDashboardFrameStabilizerForTest();
    resetAsyncRuntimeCoordinatorForTest();
    vi.useRealTimers();
  });

  it('starts STABLE for healthy metrics', () => {
    const ev = evaluateRuntimeOrchestrator({
      metrics: baseMetrics(),
      performance: basePerf,
      cascadePressure: 10,
      renderSpikeCount: 0,
      sessionMinutes: 20,
    });
    expect(ev.snapshot.state).toBe('STABLE');
  });

  it('escalates to CRITICAL under sustained pressure', () => {
    vi.useFakeTimers();
    const criticalMetrics = baseMetrics({
      renderFPS: 6,
      asyncQueueDepth: 55,
      eventLoopLatencyMs: 320,
      websocket: {
        wsLatencyMs: 80,
        reconnectAttempts: 0,
        frameDelayMs: 20,
        heartbeatDelayMs: 80,
        offlineRecoveryDurationMs: null,
        jitterScore: 10,
        reconnectStormDetected: true,
        packetBatchingEfficiencyPct: 90,
      },
    });
    evaluateRuntimeOrchestrator({
      metrics: criticalMetrics,
      performance: basePerf,
      cascadePressure: 80,
      renderSpikeCount: 4,
      sessionMinutes: 70,
    });
    vi.advanceTimersByTime(ORCHESTRATOR_UPGRADE_CONFIRM_MS + 50);
    const ev2 = evaluateRuntimeOrchestrator({
      metrics: criticalMetrics,
      performance: basePerf,
      cascadePressure: 80,
      renderSpikeCount: 4,
      sessionMinutes: 70,
    });
    expect(['CRITICAL', 'SURVIVAL']).toContain(ev2.snapshot.state);
    expect(ev2.snapshot.policy.suspendProactiveAi).toBe(true);
    vi.useRealTimers();
  });

  it('holds DEGRADED before recovery', () => {
    vi.useFakeTimers();
    evaluateRuntimeOrchestrator({
      metrics: baseMetrics({ renderFPS: 12, asyncQueueDepth: 35 }),
      performance: basePerf,
      cascadePressure: 60,
      renderSpikeCount: 2,
      sessionMinutes: 40,
    });
    vi.advanceTimersByTime(ORCHESTRATOR_DEGRADED_MIN_MS + 500);
    const recovered = evaluateRuntimeOrchestrator({
      metrics: baseMetrics(),
      performance: basePerf,
      cascadePressure: 5,
      renderSpikeCount: 0,
      sessionMinutes: 40,
    });
    expect(recovered.snapshot.state).not.toBe('SURVIVAL');
    vi.useRealTimers();
  });

  it('pauses proactive when policy requires', () => {
    evaluateRuntimeOrchestrator({
      metrics: baseMetrics({ asyncQueueDepth: 60, renderFPS: 7 }),
      performance: basePerf,
      cascadePressure: 90,
      renderSpikeCount: 5,
      sessionMinutes: 90,
    });
    vi.useFakeTimers();
    vi.advanceTimersByTime(ORCHESTRATOR_UPGRADE_CONFIRM_MS + 100);
    evaluateRuntimeOrchestrator({
      metrics: baseMetrics({ asyncQueueDepth: 60, renderFPS: 7 }),
      performance: basePerf,
      cascadePressure: 90,
      renderSpikeCount: 5,
      sessionMinutes: 90,
    });
    expect(shouldOrchestratorPauseConciergeAi()).toBe(true);
    vi.useRealTimers();
  });
});
