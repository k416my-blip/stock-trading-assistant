import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/websocketStabilityGuard', () => ({
  executeWebsocketReconnectJitter: vi.fn(),
}));

vi.mock('../../../src/services/asyncBudgetSystem', () => ({
  resolveAsyncBudgetDecision: vi.fn(() => 'allow'),
}));

vi.mock('../../../src/native/runtime/nativeRuntimeBridge', () => ({
  getLastNativeRuntimeSnapshot: vi.fn(() => null),
}));

vi.mock('../../../src/runtime/coordinator/resumeCoordinatorIntegration', () => ({
  getResumeCoordinatorSnapshot: vi.fn(() => null),
}));

import {
  requestReconnectSchedule,
  resetReconnectCoordinatorForTest,
} from '../../../src/runtime/stability/reconnectCoordinator';
import { buildNativeBoundaryValidationReport } from '../../../src/native/runtime/nativeBoundaryValidation';
import { resetNativeBoundaryTraceForTest } from '../../../src/native/runtime/nativeBoundaryTrace';
import { resetNativeBoundaryHistogramsForTest } from '../../../src/native/runtime/nativeBoundaryHistograms';
import { resetWebsocketOwnershipTraceForTest } from '../../../src/native/runtime/websocketOwnershipTrace';
import { resetReconnectSequenceTraceForTest } from '../../../src/runtime/stability/reconnectSequenceTrace';

describe('nativeBoundaryValidation', () => {
  beforeEach(() => {
    resetReconnectCoordinatorForTest();
    resetNativeBoundaryTraceForTest();
    resetNativeBoundaryHistogramsForTest();
    resetWebsocketOwnershipTraceForTest();
    resetReconnectSequenceTraceForTest();
  });

  it('reports ownership consistent after coordinated schedule', () => {
    requestReconnectSchedule(1000, 5000, 'test', 'kernel_policy');
    const report = buildNativeBoundaryValidationReport();
    expect(report.comparison.jsScheduleCount).toBe(1);
    expect(report.bypassDetected).toBe(false);
    expect(report.websocketOwnership.length).toBe(1);
    expect(report.websocketOwnership[0].owner).toBe('js_coordinator');
  });

  it('coalesced duplicate does not inflate execute count', () => {
    requestReconnectSchedule(1000, 5000, 'a', 'redmi_foreground');
    requestReconnectSchedule(1000, 5000, 'b', 'redmi_foreground');
    const report = buildNativeBoundaryValidationReport();
    expect(report.comparison.coalescedCount).toBe(1);
    expect(report.comparison.jsScheduleCount).toBe(1);
  });
});
