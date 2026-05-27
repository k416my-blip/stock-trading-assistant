import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetAutonomousGovernanceForTest,
  initAutonomousGovernance,
  observeAutonomousGovernance,
  shouldRunAutonomousGovernanceSample,
  getAutonomousGovernanceDashboard,
  buildAutonomousGovernanceExportBundle,
} from '../../../src/governance/autonomousStability';

function baseInput() {
  return {
    eventLoopLagMs: 100,
    renderFps: 18,
    renderBurstRate: 4,
    jsHeapMb: 110,
    memoryTrendPct: 35,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 30,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 3,
    renderStormRisk: 0.2,
    recoverySuccessRate: 0.9,
    continuityScore: 85,
    jsSurvivalScore: 88,
    schedulerDriftMs: 12,
    staleHydrationRisk: 0.1,
  };
}

describe('autonomousStabilityGovernance', () => {
  beforeEach(() => {
    resetAutonomousGovernanceForTest();
  });

  it('observes governance profile', () => {
    initAutonomousGovernance();
    const p = observeAutonomousGovernance(baseInput());
    expect(p.governanceConfidence).toBeGreaterThan(0);
    expect(getAutonomousGovernanceDashboard()?.profile.governanceConfidence).toBeGreaterThan(0);
  });

  it('throttles governance samples', () => {
    initAutonomousGovernance();
    expect(shouldRunAutonomousGovernanceSample(baseInput())).toBe(true);
    expect(shouldRunAutonomousGovernanceSample(baseInput())).toBe(false);
  });

  it('adapts under thermal and reclaim stress', () => {
    initAutonomousGovernance();
    const p = observeAutonomousGovernance({
      ...baseInput(),
      thermalState: 'severe',
      miuiAggressiveReclaim: true,
      screenOff: true,
      sessionMinutes: 150,
    });
    expect(p.thermalGovernanceScore).toBeLessThan(0.8);
    expect(['thermal_paced', 'reclaim_adapted', 'screen_off_minimal', 'long_session_metabolism']).toContain(
      p.mode,
    );
  });

  it('exports governance bundle', () => {
    initAutonomousGovernance();
    observeAutonomousGovernance(baseInput());
    const exp = buildAutonomousGovernanceExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.survivabilityEvolutionTimeline).toBeDefined();
  });
});
