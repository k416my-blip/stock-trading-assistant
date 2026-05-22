import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  OFFLINE_RESILIENCE_OFFLINE_THRESHOLD,
  RUNTIME_FRAGMENTATION_FRAGMENTED_THRESHOLD,
  RUNTIME_HEALTH_CRITICAL_THRESHOLD,
  RUNTIME_PRESSURE_DEGRADED_THRESHOLD,
  RUNTIME_PRESSURE_STRESSED_THRESHOLD,
} from '../../src/constants/runtimeSurvivalMobileResilience';
import {
  classifyRuntimeState,
  computeMobileResilienceMetrics,
} from '../../src/services/mobileResilienceEngine';
import { buildRuntimeSurvivalMobileResilienceBundle } from '../../src/services/runtimeSurvivalEngine';
import type { BuildRuntimeSurvivalInput } from '../../src/types/runtimeSurvivalMobileResilience';
import type { RuntimeSurvivalPersisted } from '../../src/services/runtimeSurvivalStorage';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  isCacheFirstModeActive: () => false,
  initMobileRedmiRuntime: vi.fn(),
  markHydrationComplete: vi.fn(),
}));

vi.mock('../../src/services/runtimeSurvivalStorage', () => ({
  loadRuntimeSurvivalState: vi.fn(async (): Promise<RuntimeSurvivalPersisted> => ({
    version: 1,
    lastRuntimeState: 'RUNTIME_STABLE',
    lastRuntimeHealthPct: 82,
    lastOrchestrationBudgetMax: 92,
    runtimeTimeline: [],
    lastRuntimePressurePct: 25,
    lastResumeAt: null,
    refreshCount: 0,
  })),
  saveRuntimeSurvivalState: vi.fn(async () => {}),
  appendRuntimeSnapshot: vi.fn(async () => ({
    version: 1,
    lastRuntimeState: 'RUNTIME_STABLE',
    lastRuntimeHealthPct: 82,
    lastOrchestrationBudgetMax: 92,
    runtimeTimeline: [],
    lastRuntimePressurePct: 25,
    lastResumeAt: null,
    refreshCount: 1,
  })),
}));

const persisted: RuntimeSurvivalPersisted = {
  version: 1,
  lastRuntimeState: 'RUNTIME_STABLE',
  lastRuntimeHealthPct: 82,
  lastOrchestrationBudgetMax: 92,
  runtimeTimeline: [],
  lastRuntimePressurePct: 25,
  lastResumeAt: null,
  refreshCount: 0,
};

function basePerf(overrides: Partial<BuildRuntimeSurvivalInput['performance']> = {}) {
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
    ...overrides,
  };
}

function baseInput(overrides: Partial<BuildRuntimeSurvivalInput> = {}): BuildRuntimeSurvivalInput {
  return {
    governance: null,
    performance: basePerf(),
    memoryPressure: false,
    queueSize: 10,
    cognitiveResourceEconomy: null,
    constitutionalGovernance: null,
    explainableGovernance: null,
    orchestration: null,
    strategy: null,
    refreshCount: 3,
    ...overrides,
  };
}

describe('runtimeSurvivalEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RUNTIME_STRESSED when pressure above 60', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({ mockRuntimePressurePct: 65 }),
    );
    expect(bundle.runtimeState).toBe('RUNTIME_STRESSED');
    expect(bundle.lightweightModeActive).toBe(true);
    expect(bundle.runtimePressurePct).toBeGreaterThan(RUNTIME_PRESSURE_STRESSED_THRESHOLD);
  });

  it('RUNTIME_DEGRADED with deep orchestration suppression', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({ mockRuntimePressurePct: 80 }),
    );
    expect(bundle.runtimeState).toBe('RUNTIME_DEGRADED');
    expect(bundle.deepOrchestrationSuppressionActive).toBe(true);
    expect(bundle.speculativeProcessingStopped).toBe(true);
    expect(bundle.runtimePressurePct).toBeGreaterThan(RUNTIME_PRESSURE_DEGRADED_THRESHOLD);
  });

  it('RUNTIME_FRAGMENTED when fragmentation above 70', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({ mockRuntimeFragmentationPct: 75, mockRuntimePressurePct: 40 }),
    );
    expect(bundle.runtimeState).toBe('RUNTIME_FRAGMENTED');
    expect(bundle.runtimeRebuildSuggestionActive).toBe(true);
    expect(bundle.runtimeFragmentationPct).toBeGreaterThan(
      RUNTIME_FRAGMENTATION_FRAGMENTED_THRESHOLD,
    );
  });

  it('RUNTIME_OFFLINE when offline resilience below 40', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({
        performance: basePerf({ offlineMode: true }),
        mockOfflineResiliencePct: 35,
        mockRuntimePressurePct: 30,
      }),
    );
    expect(bundle.runtimeState).toBe('RUNTIME_OFFLINE');
    expect(bundle.offlineSafeFallbackActive).toBe(true);
    expect(bundle.cacheFirstModeActive).toBe(true);
    expect(bundle.offlineResiliencePct).toBeLessThan(OFFLINE_RESILIENCE_OFFLINE_THRESHOLD);
  });

  it('RUNTIME_CRITICAL when health below 30', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({
        mockRuntimeHealthPct: 25,
        mockRuntimePressurePct: 30,
        mockOfflineResiliencePct: 50,
      }),
    );
    expect(bundle.runtimeState).toBe('RUNTIME_CRITICAL');
    expect(bundle.survivalModeActive).toBe(true);
    expect(bundle.runtimeHealthPct).toBeLessThan(RUNTIME_HEALTH_CRITICAL_THRESHOLD);
  });

  it('battery saver increases battery pressure', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({
        performance: basePerf({ batterySaverActive: true }),
      }),
    );
    expect(bundle.batteryPressurePct).toBeGreaterThan(40);
  });

  it('memory pressure from queue and flag', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({ memoryPressure: true, queueSize: 80 }),
    );
    expect(bundle.memoryPressurePct).toBeGreaterThan(50);
  });

  it('thermal mock increases thermal pressure', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(
      baseInput({ mockThermalPressurePct: 70 }),
    );
    expect(bundle.thermalPressurePct).toBeGreaterThan(60);
  });

  it('paper trading and forbidden flags', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(baseInput());
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.hiddenBackgroundExecutionForbidden).toBe(true);
    expect(bundle.hiddenWakeLockForbidden).toBe(true);
    expect(bundle.strategyActionChangeForbidden).toBe(true);
  });

  it('includes layer scheduler mode and mobile runtime metrics', async () => {
    const bundle = await buildRuntimeSurvivalMobileResilienceBundle(baseInput());
    expect(bundle.layerSchedulerModeJa.length).toBeGreaterThan(0);
    expect(bundle.mobileRuntimeMetrics.runtimeFPS).toBeGreaterThan(0);
    expect(bundle.mobileRuntimeMetrics.measuredAt).toBeTruthy();
    expect(bundle.crossLayerCascadeMetrics.cascadeState).toBeTruthy();
    expect(bundle.cascadeGuardSummaryJa.length).toBeGreaterThan(0);
    expect(bundle.asyncRuntimeMetrics.eventLoopState).toBeTruthy();
    expect(bundle.asyncCoordinatorSummaryJa.length).toBeGreaterThan(0);
  });

  it('stressed threshold via classifyRuntimeState', () => {
    const metrics = computeMobileResilienceMetrics(
      baseInput({ mockRuntimePressurePct: RUNTIME_PRESSURE_STRESSED_THRESHOLD + 5 }),
      persisted,
    );
    expect(classifyRuntimeState(metrics)).toBe('RUNTIME_STRESSED');
  });

  it('critical health threshold', () => {
    const metrics = computeMobileResilienceMetrics(
      baseInput({ mockRuntimeHealthPct: RUNTIME_HEALTH_CRITICAL_THRESHOLD - 5 }),
      persisted,
    );
    expect(classifyRuntimeState(metrics)).toBe('RUNTIME_CRITICAL');
  });
});
