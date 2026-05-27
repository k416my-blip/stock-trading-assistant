import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetProcessContinuityForTest,
  initProcessContinuity,
  observeProcessContinuity,
  shouldRunProcessContinuitySample,
  getProcessContinuityDashboard,
  buildProcessContinuityExportBundle,
  setProcessContinuitySoakHookEnabled,
} from '../../../src/recovery/processContinuity';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    jsHeapMb: 120,
    memoryTrendPct: 40,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    hydrationOverlapCount: 0,
    hydrationLockActive: false,
    recoveryAttemptCount: 0,
    asyncQueueDepth: 2,
    sessionMinutes: 5,
  };
}

describe('processContinuity', () => {
  beforeEach(() => {
    resetProcessContinuityForTest();
    setProcessContinuitySoakHookEnabled(false);
  });

  it('observes continuity profile after init', () => {
    initProcessContinuity();
    const p = observeProcessContinuity(baseInput());
    expect(p.continuityScore).toBeGreaterThan(0);
    expect(getProcessContinuityDashboard()?.profile.snapshotIntegrityScore).toBeGreaterThan(0);
  });

  it('throttles continuity samples', () => {
    initProcessContinuity();
    expect(shouldRunProcessContinuitySample(baseInput())).toBe(true);
    expect(shouldRunProcessContinuitySample(baseInput())).toBe(false);
  });

  it('handles process death signals', () => {
    initProcessContinuity();
    const p = observeProcessContinuity({
      ...baseInput(),
      sessionMinutes: 0.5,
      miuiAggressiveReclaim: true,
      appForeground: false,
      hydrationLockActive: true,
      hydrationOverlapCount: 3,
    });
    expect(p.processDeathRecoveryRate).toBeGreaterThanOrEqual(0);
    expect(p.staleHydrationRisk).toBeGreaterThan(0);
  });

  it('exports continuity bundle', () => {
    initProcessContinuity();
    observeProcessContinuity(baseInput());
    const exp = buildProcessContinuityExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.crashRecoveryBundle).toBeDefined();
  });
});
