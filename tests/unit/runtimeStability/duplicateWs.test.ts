import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimeReconnectTrackerForTest,
  noteRuntimeReconnect,
  getWsDuplicateCount,
} from '../../../src/runtime/stability/RuntimeReconnectTracker';

describe('duplicate websocket detector', () => {
  beforeEach(() => {
    resetRuntimeReconnectTrackerForTest();
  });

  it('counts duplicate socket keys', () => {
    noteRuntimeReconnect('socket-a');
    noteRuntimeReconnect('socket-a');
    expect(getWsDuplicateCount()).toBe(1);
  });
});
