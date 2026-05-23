import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetReconnectStormGuardForTest,
  registerReconnectAttempt,
  canScheduleReconnect,
} from '../../../src/runtime/stability/reconnectStormGuard';
import {
  resetRuntimeReconnectTrackerForTest,
  noteRuntimeReconnect,
} from '../../../src/runtime/stability/RuntimeReconnectTracker';

describe('reconnectStormGuard', () => {
  beforeEach(() => {
    resetReconnectStormGuardForTest();
    resetRuntimeReconnectTrackerForTest();
  });

  it('blocks reconnect when budget exhausted', () => {
    for (let i = 0; i < 6; i++) {
      noteRuntimeReconnect('ws');
      registerReconnectAttempt();
    }
    expect(canScheduleReconnect()).toBe(false);
  });

  it('applies exponential backoff on storm', () => {
    for (let i = 0; i < 5; i++) noteRuntimeReconnect('storm');
    const r = registerReconnectAttempt();
    expect(r.delayMs).toBeGreaterThanOrEqual(2500);
  });
});
