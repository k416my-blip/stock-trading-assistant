import { describe, expect, it, vi } from 'vitest';
import type { ProductionStabilitySnapshot } from '../../src/types/productionStability';
import type { BuildSystemStabilityIntegrityInput } from '../../src/types/systemStabilityIntegrity';
import {
  HEALTH_BASE,
  HEALTH_DEDUCT_EMERGENCY_L3,
  HEALTH_DEDUCT_STORAGE,
} from '../../src/constants/systemStabilityIntegrity';

vi.mock('../../src/services/systemStabilityIntegrityStorage', () => ({
  saveSystemStabilityCheckpoint: vi.fn(async () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    lastHealthScore: 100,
    lastEmergencyLevel: 0,
    proactiveQueueSize: 0,
    sessionNoteJa: 'test',
  })),
}));

vi.mock('../../src/services/productionStability/productionStabilityRuntime', () => ({
  registerCrashSafeFlush: vi.fn(() => () => {}),
}));

vi.mock('../../src/services/productionStability/offlineRecovery', () => ({
  registerOfflineRecoveryHandler: vi.fn(() => () => {}),
}));

vi.mock('../../src/services/proactiveSuggestionStorage', () => ({
  loadProactiveSuggestionsState: vi.fn(async () => ({
    suggestions: [],
    suppressUntil: {},
    fingerprint: null,
  })),
  saveProactiveSuggestionsState: vi.fn(async () => undefined),
}));

import { buildSystemStabilityIntegrityBundle } from '../../src/services/systemStabilityIntegrityEngine';
import {
  runProactiveRefreshSingleFlight,
  resetSystemStabilityIntegrityForTest,
} from '../../src/services/systemStabilityIntegrityIntegration';

function baseSnapshot(overrides: Partial<ProductionStabilitySnapshot> = {}): ProductionStabilitySnapshot {
  return {
    generatedAt: new Date().toISOString(),
    emergencyLevel: 0,
    emergencyReasonJa: null,
    backgroundAiPaused: false,
    circuits: [],
    tokenBudgetJa: 'ok',
    openAiTokensUsed24h: 0,
    xCallsUsed24h: 0,
    proactiveQueueSize: 0,
    proactiveQueueTrimmed: 0,
    notificationFloodBlocked: 0,
    staleAsyncResponsesBlocked: 0,
    renderBudgetBlocked: 0,
    effectLoopWarnings: [],
    stateAuditFindings: [],
    profiler: {
      lastRenderMs: null,
      avgRenderMs: null,
      lastApiLatencyMs: null,
      avgApiLatencyMs: null,
      estimatedHeapMB: null,
      sessionUptimeMinutes: 0,
    },
    registeredIntervals: 4,
    registeredListeners: 4,
    offlineRecoveryPending: false,
    runtime: null,
    costDashboard: null,
    debugLogCount: 0,
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<BuildSystemStabilityIntegrityInput> = {},
): BuildSystemStabilityIntegrityInput {
  return {
    productionSnapshot: baseSnapshot(),
    layerEnabled: {
      macro: true,
      data_reliability: true,
      strategy: true,
      reality: true,
      execution: true,
      self_eval: true,
      portfolio_risk: true,
      capital: true,
    },
    layers: {
      macro: null,
      dataReliability: null,
      capitalAllocation: null,
      execution: null,
      portfolioRisk: null,
      strategy: null,
      reality: null,
      selfEvaluation: null,
    },
    proactiveRefreshInFlight: false,
    duplicateRefreshBlocked: false,
    staleHoldingsCount: 0,
    priceSyncStale: false,
    readOnlyMode: false,
    degradedMode: false,
    storageIntegrityOk: true,
    zombieOrderCount: 0,
    proactiveQueueSize: 0,
    ...overrides,
  };
}

describe('buildSystemStabilityIntegrityBundle', () => {
  it('starts at 100 and deducts for emergency L3 and storage failure', () => {
    const bundle = buildSystemStabilityIntegrityBundle(
      baseInput({
        layerEnabled: {
          macro: false,
          data_reliability: false,
          strategy: false,
          reality: false,
          execution: false,
          self_eval: false,
          portfolio_risk: false,
          capital: false,
        },
        productionSnapshot: baseSnapshot({ emergencyLevel: 3 }),
        storageIntegrityOk: false,
      }),
    );
    expect(bundle.systemHealthScore).toBe(
      HEALTH_BASE - HEALTH_DEDUCT_EMERGENCY_L3 - HEALTH_DEDUCT_STORAGE,
    );
    expect(bundle.featureStatuses).toHaveLength(20);
    expect(bundle.dependencyGraph.length).toBeGreaterThan(5);
  });

  it('flags layer gap when enabled but not loaded', () => {
    const bundle = buildSystemStabilityIntegrityBundle(baseInput());
    const unloaded = bundle.layerRows.filter((r) => r.enabled && !r.loaded);
    expect(unloaded.length).toBeGreaterThan(0);
    expect(bundle.systemHealthScore).toBeLessThan(100);
  });
});

describe('runProactiveRefreshSingleFlight', () => {
  it('blocks duplicate concurrent refresh', async () => {
    resetSystemStabilityIntegrityForTest();
    let resolveFirst: () => void = () => {};
    const first = new Promise<void>((r) => {
      resolveFirst = r;
    });
    const p1 = runProactiveRefreshSingleFlight(async () => {
      await first;
    });
    const p2 = runProactiveRefreshSingleFlight(async () => {});
    const second = await p2;
    expect(second.duplicateBlocked).toBe(true);
    expect(second.ran).toBe(false);
    resolveFirst();
    const firstResult = await p1;
    expect(firstResult.ran).toBe(true);
  });
});
