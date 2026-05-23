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

vi.mock('../../src/services/websocketStabilityGuard', () => ({
  setWebsocketHeartbeatIntervalMs: vi.fn(),
  setWebsocketLightweightMode: vi.fn(),
}));

vi.mock('../../src/services/hydrationCollisionGuard', () => ({
  beginHydrationPauseWindow: vi.fn(),
}));

vi.mock('../../src/services/asyncRuntimeCoordinator', () => ({
  setAsyncConcurrentLimit: vi.fn(),
}));

vi.mock('../../src/services/runtimeTelemetryStorage', () => ({
  persistTelemetryCycle: vi.fn(),
}));

vi.mock('../../src/runtime/orchestrator/memoryPressureGuardian', () => ({
  observeMemoryPressure: vi.fn(),
}));

vi.mock('../../src/runtime/orchestrator/longSessionSurvivability', () => ({
  runLongSessionSurvivabilityPass: vi.fn(),
}));

vi.mock('../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  applyAsyncSchedulerPolicy: vi.fn(),
}));

vi.mock('../../src/native/runtime/nativeRuntimeIntegration', () => ({
  buildNativeDashboardExtension: vi.fn(),
}));

vi.mock('../../src/native/runtime/lifecycleTimeline', () => ({
  recordLifecycleEvent: vi.fn(),
}));

vi.mock('../../src/runtime/kernel/runtimeKernelGuards', () => ({
  setKernelGuardState: vi.fn(),
}));

import {
  dispatchRuntimeEffects,
  resetRuntimeEffectDispatcherForTest,
  stageRuntimeEffects,
} from '../../src/runtime/effects/RuntimeEffectDispatcher';
import { createEffectId } from '../../src/runtime/effects/RuntimeEffectQueue';
import type { RuntimeEffect } from '../../src/runtime/effects/RuntimeEffectTypes';

function fx(
  kind: RuntimeEffect['kind'],
  priority: RuntimeEffect['priority'],
  dedupeKey: string,
): RuntimeEffect {
  return {
    id: createEffectId(),
    kind,
    priority,
    dedupeKey,
    emittedAt: new Date().toISOString(),
    payload: {},
  };
}

describe('runtimeEffectDispatcher', () => {
  beforeEach(() => {
    resetRuntimeEffectDispatcherForTest();
  });

  it('dedupes identical dedupeKey within window', () => {
    const a = fx('DASHBOARD_POLICY', 'NORMAL', 'dash-stable');
    expect(stageRuntimeEffects([a, a])).toBe(1);
  });

  it('drops LOW priority effects in SURVIVAL mode', () => {
    const effects = [
      fx('KERNEL_GUARD_SYNC', 'CRITICAL', 'guard-survival'),
      fx('NATIVE_EXTENSION_BUILD', 'LOW', 'native'),
    ];
    const result = dispatchRuntimeEffects(effects, { kernelState: 'SURVIVAL', debounceMs: 0 });
    expect(result.droppedLow).toBeGreaterThanOrEqual(1);
    expect(result.executed).toBeGreaterThanOrEqual(1);
  });
});
