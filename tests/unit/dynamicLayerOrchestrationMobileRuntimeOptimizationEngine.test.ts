import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MOBILE_REFRESH_BUDGET_MAX } from '../../src/constants/dynamicLayerOrchestrationMobileRuntimeOptimization';

vi.mock('../../src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationStorage', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationStorage')
  >();
  return {
    ...actual,
    loadDynamicOrchestrationState: vi.fn(async () => ({
      version: 1 as const,
      layerCache: {},
      orchestrationTimeline: [],
      lastFingerprint: null,
    })),
    saveDynamicOrchestrationState: vi.fn(async () => {}),
    appendOrchestrationTimeline: vi.fn(async () => {}),
    noteLayerCacheHit: vi.fn(async () => false),
    persistLayerCache: vi.fn(async () => {}),
  };
});

import {
  beginDynamicOrchestrationCycle,
  resetOrchestrationRuntimeForTest,
  shouldRunOrchestratedLayer,
} from '../../src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import { buildDynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../../src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationEngine';
import { assertOrchestrationPaperOnly } from '../../src/services/dynamicLayerOrchestrationMobileRuntimeOptimizationIntegration';

describe('dynamicLayerOrchestrationRuntime', () => {
  beforeEach(() => {
    resetOrchestrationRuntimeForTest();
  });

  it('mobile budget skips low-priority layers', async () => {
    await beginDynamicOrchestrationCycle({
      stateFingerprintJa: 'fp-1',
      batterySaver: false,
      appForeground: true,
      memoryPressure: false,
      offlineMode: false,
      emergencyOverride: false,
      dataReliabilityLow: false,
      governanceVeto: false,
      mobileOptimizationMode: true,
      resourceCtx: {
        batterySaver: false,
        appForeground: true,
        memoryPressure: false,
        offlineMode: false,
        emergencyComputeCut: false,
        aiSleepMode: false,
        proactiveQueueSize: 0,
      },
    });
    expect(shouldRunOrchestratedLayer('governance')).toBe(true);
    expect(shouldRunOrchestratedLayer('stability')).toBe(true);
    expect(shouldRunOrchestratedLayer('meta')).toBe(false);
    expect(MOBILE_REFRESH_BUDGET_MAX).toBe(85);
  });

  it('background pauses low-priority layers', async () => {
    await beginDynamicOrchestrationCycle({
      stateFingerprintJa: 'fp-bg',
      batterySaver: false,
      appForeground: false,
      memoryPressure: false,
      offlineMode: false,
      emergencyOverride: false,
      dataReliabilityLow: false,
      governanceVeto: false,
      mobileOptimizationMode: true,
      resourceCtx: {
        batterySaver: false,
        appForeground: false,
        memoryPressure: false,
        offlineMode: false,
        emergencyComputeCut: false,
        aiSleepMode: true,
        proactiveQueueSize: 0,
      },
    });
    expect(shouldRunOrchestratedLayer('macro')).toBe(false);
    expect(shouldRunOrchestratedLayer('governance')).toBe(true);
  });

  it('emergency override keeps safety layers', async () => {
    await beginDynamicOrchestrationCycle({
      stateFingerprintJa: 'fp-em',
      batterySaver: true,
      appForeground: true,
      memoryPressure: true,
      offlineMode: true,
      emergencyOverride: true,
      dataReliabilityLow: true,
      governanceVeto: true,
      mobileOptimizationMode: true,
      resourceCtx: {
        batterySaver: true,
        appForeground: true,
        memoryPressure: true,
        offlineMode: true,
        emergencyComputeCut: true,
        aiSleepMode: true,
        proactiveQueueSize: 90,
      },
    });
    expect(shouldRunOrchestratedLayer('stability')).toBe(true);
    expect(shouldRunOrchestratedLayer('governance')).toBe(true);
    expect(shouldRunOrchestratedLayer('data_reliability')).toBe(true);
  });
});

describe('dynamicLayerOrchestrationEngine', () => {
  beforeEach(() => {
    resetOrchestrationRuntimeForTest();
  });

  it('builds bundle with realTradingEnabled false and feature statuses', async () => {
    await beginDynamicOrchestrationCycle({
      stateFingerprintJa: 'fp',
      batterySaver: false,
      appForeground: true,
      memoryPressure: false,
      offlineMode: false,
      emergencyOverride: false,
      dataReliabilityLow: false,
      governanceVeto: false,
      mobileOptimizationMode: true,
      resourceCtx: {
        batterySaver: false,
        appForeground: true,
        memoryPressure: false,
        offlineMode: false,
        emergencyComputeCut: false,
        aiSleepMode: false,
        proactiveQueueSize: 0,
      },
    });
    const bundle = await buildDynamicLayerOrchestrationMobileRuntimeOptimizationBundle({
      reactive: null,
      resource: null,
      stability: null,
      systemic: null,
      stateFingerprintJa: 'fp',
      batterySaver: false,
      appForeground: true,
      memoryPressure: false,
      offlineMode: false,
      emergencyOverride: false,
      dataReliabilityLow: false,
      governanceVeto: false,
      mobileOptimizationMode: true,
      refreshStartedAt: Date.now() - 100,
    });
    expect(bundle.realTradingEnabled).toBe(false);
    expect(bundle.featureStatuses.length).toBeGreaterThanOrEqual(25);
    expect(bundle.computeBudgetMax).toBeGreaterThan(0);
  });

  it('paper only guard', () => {
    expect(assertOrchestrationPaperOnly().realTradingEnabled).toBe(false);
  });
});
