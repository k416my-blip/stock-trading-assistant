import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetMiuiBatteryDiagnosticsForTest,
  noteAppBackground,
  noteAppForeground,
  noteSilentWebsocketDisconnect,
  getMiuiDiagnostics,
} from '../../../src/runtime/stability/miuiBatteryDiagnostics';
import { STABILITY_RESUME_RACE_MS } from '../../../src/constants/runtimeStability';

describe('miuiBatteryDiagnostics', () => {
  beforeEach(() => {
    resetMiuiBatteryDiagnosticsForTest();
  });

  it('tracks resume latency after background', () => {
    noteAppBackground(1000);
    noteAppForeground(1000 + STABILITY_RESUME_RACE_MS + 100);
    expect(getMiuiDiagnostics().resumeLatencyMs).toBeGreaterThan(STABILITY_RESUME_RACE_MS);
  });

  it('counts silent websocket disconnects', () => {
    noteSilentWebsocketDisconnect();
    noteSilentWebsocketDisconnect();
    expect(getMiuiDiagnostics().silentDisconnectCount).toBe(2);
  });
});
