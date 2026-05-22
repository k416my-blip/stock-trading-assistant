import { describe, expect, it, beforeEach } from 'vitest';
import {
  buildMobileRuntimeMetricsSnapshot,
  noteAppBackgrounded,
  noteAppForegroundResume,
  noteProactiveRefreshForMetrics,
  noteWebsocketReconnect,
  resetMobileRuntimeMetricsForTest,
} from '../../src/services/mobileRuntimeMetrics';

describe('mobileRuntimeMetrics', () => {
  beforeEach(() => {
    resetMobileRuntimeMetricsForTest();
  });

  it('tracks refresh burst and JS pressure', () => {
    noteProactiveRefreshForMetrics(120);
    noteProactiveRefreshForMetrics(90);
    const snap = buildMobileRuntimeMetricsSnapshot('LIGHTWEIGHT', {
      memoryPressure: false,
      queueSize: 12,
      thermalPressurePct: 10,
    });
    expect(snap.renderBurstRate).toBeGreaterThanOrEqual(2);
    expect(snap.jsThreadPressurePct).toBeGreaterThan(0);
    expect(snap.schedulerMode).toBe('LIGHTWEIGHT');
  });

  it('records background resume recovery ms', () => {
    noteAppBackgrounded();
    const ms = noteAppForegroundResume();
    expect(ms).not.toBeNull();
    const snap = buildMobileRuntimeMetricsSnapshot('SURVIVAL', {
      memoryPressure: true,
      queueSize: 80,
      thermalPressurePct: 72,
    });
    expect(snap.backgroundResumeRecoveryMs).not.toBeNull();
    expect(snap.websocketReconnectRate).toBe(0);
    noteWebsocketReconnect();
    const after = buildMobileRuntimeMetricsSnapshot('SURVIVAL', {
      memoryPressure: true,
      queueSize: 80,
      thermalPressurePct: 72,
    });
    expect(after.websocketReconnectRate).toBeGreaterThan(0);
  });
});
