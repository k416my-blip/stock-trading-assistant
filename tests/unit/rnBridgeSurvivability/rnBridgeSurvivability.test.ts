import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRnBridgeSurvivabilityForTest,
  observeRnBridgeSurvivability,
  shouldRunRnSurvivabilitySample,
  getRnBridgeSurvivabilityDashboard,
  bridgeSafeExportChunks,
  getImmutableMetrics,
} from '../../../src/rn/bridgeSurvivability';

function input() {
  return {
    renderFps: 18,
    renderBurstRate: 4,
    jsHeapMb: 110,
    memoryTrendPct: 25,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    asyncQueueDepth: 3,
  };
}

describe('rnBridgeSurvivability', () => {
  beforeEach(() => {
    resetRnBridgeSurvivabilityForTest();
  });

  it('observes RN survivability profile', () => {
    const p = observeRnBridgeSurvivability(input());
    expect(p.survivalScore).toBeGreaterThan(0);
    expect(getRnBridgeSurvivabilityDashboard()?.profile.bridgeTrafficRate).toBeGreaterThanOrEqual(0);
  });

  it('throttles samples', () => {
    expect(shouldRunRnSurvivabilitySample(input())).toBe(true);
    expect(shouldRunRnSurvivabilitySample(input())).toBe(false);
  });

  it('immutable metrics cache reuses', () => {
    getImmutableMetrics('dash', () => ({ a: 1 }));
    getImmutableMetrics('dash', () => ({ a: 2 }));
    const p = observeRnBridgeSurvivability(input());
    expect(p.immutableReuseRatio).toBeGreaterThan(0);
  });

  it('bridge safe export chunks', async () => {
    const out = await bridgeSafeExportChunks([() => 1, () => 2, () => 3]);
    expect(out).toEqual([1, 2, 3]);
  });
});
