import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  NativeModules: {},
  NativeEventEmitter: vi.fn(() => ({ addListener: vi.fn(() => ({ remove: vi.fn() })) })),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { setItem: vi.fn(), getItem: vi.fn() },
}));
vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  getResumeTransitionCount: vi.fn(() => 0),
  cleanupDuplicateTimers: vi.fn(),
}));

import {
  resetAutomatedSoakRunnerForTest,
  startAutomatedSoakRunner,
  stopAutomatedSoakRunner,
  isAutomatedSoakRunnerActive,
  tickAutomatedSoakRunner,
  getAutomatedSoakDashboard,
  buildAutomatedSoakExportJson,
  buildCompressedSoakBundle,
  formatAutomatedSoakMarkdownReport,
} from '../../../src/native/soak';
import type { RuntimeTelemetryMetricsSnapshot } from '../../../src/types/runtimeTelemetry';
import type { PerformanceCostRuntimeSnapshot } from '../../../src/types/performanceCost';

function metrics(): RuntimeTelemetryMetricsSnapshot {
  return {
    jsHeapEstimateMb: 110,
    renderFPS: 18,
    droppedFrames: 0,
    eventLoopLatencyMs: 40,
    asyncQueueLatencyMs: 20,
    websocketRttMs: 70,
    hydrationDurationMs: null,
    foregroundResumeDurationMs: null,
    orchestrationDurationMs: 50,
    explanationGenerationDurationMs: null,
    asyncQueueDepth: 4,
    memoryTrendPct: 25,
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
      renderBurstRate: 2,
      dashboardCommitDurationMs: 10,
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
  };
}

function perf(): PerformanceCostRuntimeSnapshot {
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

describe('automatedSoakRunner', () => {
  beforeEach(() => {
    resetAutomatedSoakRunnerForTest();
  });

  it('starts and stops session', () => {
    startAutomatedSoakRunner(4);
    expect(isAutomatedSoakRunnerActive()).toBe(true);
    stopAutomatedSoakRunner();
    expect(isAutomatedSoakRunnerActive()).toBe(false);
  });

  it('ticks without throwing and updates dashboard', async () => {
    startAutomatedSoakRunner(2);
    await tickAutomatedSoakRunner(metrics(), perf());
    const dash = getAutomatedSoakDashboard();
    expect(dash?.active).toBe(true);
    expect(dash?.survivalScore).toBeGreaterThan(0);
  });

  it('exports json markdown and compressed bundle', async () => {
    startAutomatedSoakRunner(1);
    await tickAutomatedSoakRunner(metrics(), perf());
    const json = buildAutomatedSoakExportJson();
    expect(json?.version).toBe('1.0.0');
    const bundle = buildCompressedSoakBundle();
    expect(bundle?.format).toBe('sta-soak-bundle-v1');
    expect(bundle?.payloadBase64.length).toBeGreaterThan(10);
    const md = formatAutomatedSoakMarkdownReport();
    expect(md).toContain('Survival score');
  });
});
