import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetMetaOrchestrationForTest,
  initMetaOrchestration,
  observeMetaOrchestration,
  shouldRunMetaOrchestrationSample,
  getMetaOrchestrationDashboard,
  buildMetaOrchestrationExportBundle,
} from '../../../src/metaOrchestration';

function baseInput() {
  return {
    eventLoopLagMs: 100,
    renderFps: 19,
    jsHeapMb: 102,
    memoryTrendPct: 28,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 40,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 3,
    renderStormRisk: 0.16,
    reconnectPerMin: 1,
    recoverySuccessRate: 0.91,
    continuityScore: 87,
    jsSurvivalScore: 89,
    governanceConfidence: 0.81,
    governanceMode: 'full_observe',
    observerOverheadRatio: 0.24,
    runtimeSafeTradingScore: 84,
    causalConfidence: 0.78,
    rootCauseScore: 0.15,
    schedulerDriftMs: 12,
    staleHydrationRisk: 0.05,
  };
}

describe('metaRuntimeOrchestration', () => {
  beforeEach(() => {
    resetMetaOrchestrationForTest();
  });

  it('observes meta orchestration profile and graph', () => {
    initMetaOrchestration();
    const p = observeMetaOrchestration(baseInput());
    expect(p.equilibriumScore).toBeGreaterThan(0);
    const dash = getMetaOrchestrationDashboard();
    expect(dash?.interactionGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.contentionMap.length).toBeGreaterThan(0);
  });

  it('throttles meta orchestration samples', () => {
    initMetaOrchestration();
    expect(shouldRunMetaOrchestrationSample(baseInput())).toBe(true);
    expect(shouldRunMetaOrchestrationSample(baseInput())).toBe(false);
  });

  it('detects conflict under governance thrash and amplification', () => {
    initMetaOrchestration();
    const stressed = {
      ...baseInput(),
      recoverySuccessRate: 0.58,
      governanceConfidence: 0.58,
      governanceMode: 'recovery_paced',
      observerOverheadRatio: 0.65,
      continuityScore: 68,
      miuiAggressiveReclaim: true,
      screenOff: true,
      sessionMinutes: 150,
    };
    let last = observeMetaOrchestration(stressed);
    for (let i = 0; i < 5; i += 1) {
      last = observeMetaOrchestration({
        ...stressed,
        governanceMode: i % 2 === 0 ? 'recovery_paced' : 'observer_balanced',
      });
    }
    expect(last.survivabilityConflictScore).toBeGreaterThan(0.1);
    expect(last.telemetryAmplificationScore).toBeGreaterThan(0.3);
  });

  it('exports meta orchestration bundle', () => {
    initMetaOrchestration();
    observeMetaOrchestration(baseInput());
    const exp = buildMetaOrchestrationExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.pacingGraph.nodes.length).toBeGreaterThan(0);
    expect(exp.equilibriumEvolution).toBeDefined();
  });
});
