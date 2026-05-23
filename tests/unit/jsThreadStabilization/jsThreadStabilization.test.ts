import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetJsThreadStabilizationForTest,
  observeJsThreadStabilization,
  shouldRunStabilizationSample,
  getJsThreadStabilizationDashboard,
  exportWithCooperativeYield,
} from '../../../src/scheduler/jsThreadStabilization';

function input(overrides?: Partial<Parameters<typeof observeJsThreadStabilization>[0]>) {
  return {
    eventLoopLagMs: 50,
    renderFps: 18,
    jsHeapMb: 100,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    memoryTrendPct: 20,
    ...overrides,
  };
}

describe('jsThreadStabilization', () => {
  beforeEach(() => {
    resetJsThreadStabilizationForTest();
  });

  it('profiles stabilization metrics', () => {
    const p = observeJsThreadStabilization(input());
    expect(p.eventLoopLagMs).toBeGreaterThanOrEqual(50);
    expect(p.survivalScore).toBeGreaterThan(0);
    expect(getJsThreadStabilizationDashboard()?.profile.mode).toBe('full');
  });

  it('throttles samples by mode interval', () => {
    expect(shouldRunStabilizationSample(input())).toBe(true);
    expect(shouldRunStabilizationSample(input())).toBe(false);
  });

  it('enters thermal suppressed mode', () => {
    const p = observeJsThreadStabilization(input({ thermalState: 'severe' }));
    expect(p.mode).toBe('thermal_suppressed');
  });

  it('export cooperative yielding runs chunks', async () => {
    const out = await exportWithCooperativeYield([
      () => 'a',
      () => 'b',
      () => 'c',
      () => 'd',
    ]);
    expect(out).toEqual(['a', 'b', 'c', 'd']);
  });
});
