import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  evaluateCrossLayerCascade,
  mergeCascadeIntoLayerPlan,
  noteCascadeExplanationRegeneration,
  noteCascadeOrchestrationRebuild,
  resetCrossLayerCascadeEngineForTest,
  shouldSkipDeepLayerForCascade,
} from '../../src/services/crossLayerCascadeEngine';
import { resolveLayerRuntimeSchedule, resetLayerRuntimeSchedulerForTest } from '../../src/services/layerRuntimeScheduler';
import type { PerformanceCostRuntimeSnapshot } from '../../src/types/performanceCost';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  isCacheFirstModeActive: () => false,
  initMobileRedmiRuntime: vi.fn(),
}));

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
    lastOnlineAt: null,
  };
}

describe('crossLayerCascadeEngine', () => {
  beforeEach(() => {
    resetCrossLayerCascadeEngineForTest();
    resetLayerRuntimeSchedulerForTest();
  });

  it('stays CASCADE_STABLE with few events', () => {
    const ev = evaluateCrossLayerCascade({
      renderBurstRate: 2,
      queueSize: 10,
      memoryPressure: false,
      thermalPressurePct: 20,
      websocketUnstable: false,
      contradictionActive: false,
      confidenceCollapse: false,
    });
    expect(ev.state).toBe('CASCADE_STABLE');
    expect(ev.metrics.cascadePressure).toBeLessThan(38);
  });

  it('escalates to CASCADE_CRITICAL under storm', () => {
    for (let i = 0; i < 8; i++) noteCascadeOrchestrationRebuild();
    for (let i = 0; i < 10; i++) noteCascadeExplanationRegeneration();
    const ev = evaluateCrossLayerCascade({
      renderBurstRate: 12,
      queueSize: 70,
      memoryPressure: true,
      thermalPressurePct: 80,
      websocketUnstable: true,
      contradictionActive: true,
      confidenceCollapse: true,
    });
    expect(ev.state).toBe('CASCADE_CRITICAL');
    expect(ev.actions.deepOrchestrationHardFreeze).toBe(true);
    expect(ev.actions.fallbackExplanationMode).toBe(true);
  });

  it('merges suppression into layer plan', () => {
    const plan = resolveLayerRuntimeSchedule({
      performance: perf(),
      memoryPressure: false,
      queueSize: 5,
      thermalPressurePct: 10,
      batteryLevelPct: null,
      websocketUnstable: false,
      runtimeState: 'RUNTIME_STABLE',
      analysisExplicit: false,
      confidenceCollapse: false,
      contradictionActive: false,
    });
    for (let i = 0; i < 7; i++) noteCascadeOrchestrationRebuild();
    const cascade = evaluateCrossLayerCascade({
      renderBurstRate: 10,
      queueSize: 50,
      memoryPressure: true,
      thermalPressurePct: 60,
      websocketUnstable: false,
      contradictionActive: true,
      confidenceCollapse: false,
    });
    const merged = mergeCascadeIntoLayerPlan(plan, cascade);
    expect(merged.actions.deepOrchestrationFreeze || merged.actions.deepReasoningFreeze).toBe(
      true,
    );
    expect(shouldSkipDeepLayerForCascade('strategicMemoryGraph', cascade)).toBe(
      cascade.actions.strategicMemoryPause,
    );
  });
});
