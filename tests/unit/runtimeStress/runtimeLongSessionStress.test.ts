import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/mobileRedmiRuntime', () => ({
  cleanupDuplicateTimers: vi.fn(),
}));
vi.mock('../../../src/runtime/orchestrator/asyncPriorityScheduler', () => ({
  cancelAsyncTasksByLabel: vi.fn(() => 0),
  compactStalePriorityQueue: vi.fn(() => 0),
}));
vi.mock('../../../src/services/explanationStormGuard', () => ({
  getExplanationCacheSize: vi.fn(() => 4),
}));
vi.mock('../../../src/native/runtime/nativeBoundaryValidation', () => ({
  observeNativeBoundaryTick: vi.fn(),
  buildNativeBoundaryValidationReport: vi.fn(() => ({
    bypassDetected: false,
    bypassDetailJa: '',
    comparison: { jsScheduleCount: 0, jsExecuteCount: 0, duplicateSocketCount: 0 },
  })),
}));
vi.mock('../../../src/runtime/coordinator/resumeCoordinatorIntegration', () => ({
  observeResumeCoordinatorTick: vi.fn(),
}));

import {
  resetRuntimeLongSessionStressHarness,
  runFullLongSessionStressSuite,
  formatFinalSurvivalReportMarkdown,
} from '../../../src/runtime/stress/runtimeLongSessionStressHarness';
import { STRESS_SCENARIO_IDS } from '../../../src/types/runtimeLongSessionStress';

describe('runtimeLongSessionStress', () => {
  beforeEach(() => {
    resetRuntimeLongSessionStressHarness();
  });

  it('runs all 20 stress scenarios', () => {
    const { report, scenarioResults } = runFullLongSessionStressSuite();
    expect(scenarioResults.length).toBe(STRESS_SCENARIO_IDS.length);
    expect(report.scenariosRun).toBe(20);
  });

  it('produces final survival report metrics', () => {
    const { report } = runFullLongSessionStressSuite();
    expect(report.memoryGrowthMb).toBeDefined();
    expect(report.replayGrowth).toBeGreaterThanOrEqual(0);
    expect(report.survivalScore).toBeGreaterThanOrEqual(0);
    expect(report.survivalScore).toBeLessThanOrEqual(100);
    expect(report.expectedContinuousRuntimeHours).toBeGreaterThan(0);
    expect(report.memorySnapshots.length).toBeGreaterThan(0);
  });

  it('formats markdown report', () => {
    const { report } = runFullLongSessionStressSuite();
    const md = formatFinalSurvivalReportMarkdown(report);
    expect(md).toContain('Final Survival Report');
    expect(md).toContain('survival score');
  });

  it('long session scenarios pass', () => {
    const { scenarioResults } = runFullLongSessionStressSuite();
    const long = scenarioResults.filter((s) => s.id.startsWith('long_session_'));
    expect(long.length).toBe(4);
    expect(long.every((s) => s.passed)).toBe(true);
  });

  it('emergency brake and safe mode scenarios pass', () => {
    const { scenarioResults } = runFullLongSessionStressSuite();
    expect(scenarioResults.find((s) => s.id === 'emergency_brake')?.passed).toBe(true);
    expect(scenarioResults.find((s) => s.id === 'safe_mode_trigger')?.passed).toBe(true);
  });

  it('CI gate: survival score and all scenarios pass', () => {
    const { report } = runFullLongSessionStressSuite();
    expect(report.survivalScore).toBeGreaterThanOrEqual(70);
    const failed = report.scenarioResults.filter((s) => !s.passed);
    expect(failed.map((f) => `${f.id}:${f.failuresJa.join('|')}`)).toEqual([]);
    const md = formatFinalSurvivalReportMarkdown(report);
    expect(md).toContain(String(report.survivalScore));
  });
});
