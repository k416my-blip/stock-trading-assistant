import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../../src/services/mobileRedmiRuntime', () => ({
  isCacheFirstModeActive: () => false,
  initMobileRedmiRuntime: vi.fn(),
}));
import type { PerformanceCostRuntimeSnapshot } from '../../src/types/performanceCost';
import {
  activateAnalysisMode,
  deactivateAnalysisMode,
  detectAnalysisRequestJa,
  resetLayerRuntimeSchedulerForTest,
  resolveDeepLayerActivation,
  resolveLayerRuntimeSchedule,
} from '../../src/services/layerRuntimeScheduler';

function perfSnap(overrides: Partial<PerformanceCostRuntimeSnapshot> = {}): PerformanceCostRuntimeSnapshot {
  return {
    appForeground: true,
    batterySaverActive: false,
    offlineMode: false,
    networkPaused: false,
    pollingPaused: false,
    lastForegroundAt: new Date().toISOString(),
    lastBackgroundAt: null,
    ...overrides,
  } as PerformanceCostRuntimeSnapshot;
}

const baseInput = {
  performance: perfSnap(),
  memoryPressure: false,
  queueSize: 10,
  thermalPressurePct: 20,
  batteryLevelPct: null as number | null,
  websocketUnstable: false,
  runtimeState: 'RUNTIME_STABLE' as const,
  analysisExplicit: false,
  confidenceCollapse: false,
  contradictionActive: false,
};

describe('layerRuntimeScheduler', () => {
  beforeEach(() => {
    resetLayerRuntimeSchedulerForTest();
  });

  it('defaults to LIGHTWEIGHT with deep layers paused', () => {
    const plan = resolveLayerRuntimeSchedule(baseInput);
    expect(plan.mode).toBe('LIGHTWEIGHT');
    expect(plan.layers.epistemicIntegrity).toBe(false);
    expect(plan.layers.strategicMemoryGraph).toBe(false);
    expect(plan.layers.adaptiveExploration).toBe(false);
    expect(plan.layers.runtimeSurvival).toBe(true);
    expect(plan.actions.memoryGraphPause).toBe(true);
  });

  it('detects Japanese analysis keywords', () => {
    expect(detectAnalysisRequestJa('長期の戦略を深く分析して')).toBe(true);
    expect(detectAnalysisRequestJa('今日の株価は？')).toBe(false);
  });

  it('activates ANALYSIS mode temporarily', () => {
    activateAnalysisMode(5_000);
    const plan = resolveLayerRuntimeSchedule(baseInput);
    expect(plan.mode).toBe('ANALYSIS');
    expect(plan.layers.strategicMemoryGraph).toBe(true);
    deactivateAnalysisMode();
    const after = resolveLayerRuntimeSchedule(baseInput);
    expect(after.mode).toBe('LIGHTWEIGHT');
  });

  it('enters SURVIVAL on battery saver and background', () => {
    const survival = resolveLayerRuntimeSchedule({
      ...baseInput,
      performance: perfSnap({ batterySaverActive: true, appForeground: false }),
      memoryPressure: true,
      thermalPressurePct: 75,
    });
    expect(survival.mode).toBe('SURVIVAL');
    expect(survival.actions.deepOrchestrationFreeze).toBe(true);
    expect(survival.actions.dashboardMinimalRender).toBe(true);
    expect(
      resolveDeepLayerActivation('epistemicIntegrity', survival, {
        ...baseInput,
        performance: perfSnap({ batterySaverActive: true }),
      }),
    ).toBe(false);
  });

  it('forces deep layers on confidence collapse in LIGHTWEIGHT', () => {
    const plan = resolveLayerRuntimeSchedule({
      ...baseInput,
      confidenceCollapse: true,
    });
    expect(plan.mode).toBe('LIGHTWEIGHT');
    expect(plan.layers.epistemicIntegrity).toBe(true);
    expect(
      resolveDeepLayerActivation('strategicMemoryGraph', plan, {
        ...baseInput,
        confidenceCollapse: true,
      }),
    ).toBe(true);
  });
});
