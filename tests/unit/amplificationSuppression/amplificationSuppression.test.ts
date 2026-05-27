import { beforeEach, describe, expect, it } from 'vitest';
import {
  resetAmplificationSuppressionForTest,
  initAmplificationSuppression,
  observeAmplificationSuppression,
  shouldRunAmplificationSuppressionSample,
  getAmplificationSuppressionDashboard,
  buildAmplificationSuppressionExportBundle,
} from '../../../src/amplificationSuppression';

function baseInput() {
  return {
    eventLoopLagMs: 90,
    renderFps: 20,
    jsHeapMb: 98,
    memoryTrendPct: 26,
    thermalState: 'none',
    appForeground: true,
    screenOff: false,
    batterySaver: false,
    miuiAggressiveReclaim: false,
    sessionMinutes: 30,
    hydrationOverlapCount: 0,
    bridgeTrafficRate: 2,
    renderStormRisk: 0.12,
    reconnectPerMin: 1,
    wsDuplicateCount: 0,
    heartbeatAgeMs: 1200,
    recoverySuccessRate: 0.93,
    continuityScore: 90,
    observerOverheadRatio: 0.2,
    governanceMode: 'full_observe',
    telemetryAmplificationScore: 0.15,
    interventionDensity: 0.1,
    runtimeTradingSuppression: 0.08,
    equilibriumScore: 0.82,
    metaCoordinationStability: 0.84,
    runtimeAmplificationRisk: 0.12,
  };
}

describe('amplificationSuppression', () => {
  beforeEach(() => {
    resetAmplificationSuppressionForTest();
  });

  it('observes amplification suppression profile and graph', () => {
    initAmplificationSuppression();
    const p = observeAmplificationSuppression(baseInput());
    expect(p.runtimeAmplificationRisk).toBeGreaterThan(0);
    const dash = getAmplificationSuppressionDashboard();
    expect(dash?.propagationGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.equilibriumGraph.edges.length).toBeGreaterThan(0);
  });

  it('throttles amplification suppression samples', () => {
    initAmplificationSuppression();
    expect(shouldRunAmplificationSuppressionSample(baseInput())).toBe(true);
    expect(shouldRunAmplificationSuppressionSample(baseInput())).toBe(false);
  });

  it('detects amplification under observer storm and MIUI reclaim', () => {
    initAmplificationSuppression();
    let last = observeAmplificationSuppression(baseInput());
    for (let i = 0; i < 5; i += 1) {
      last = observeAmplificationSuppression({
        ...baseInput(),
        observerOverheadRatio: 0.72,
        telemetryAmplificationScore: 0.65,
        interventionDensity: 0.68,
        recoverySuccessRate: i % 2 === 0 ? 0.5 : 0.8,
        miuiAggressiveReclaim: true,
        screenOff: true,
        sessionMinutes: 170,
        reconnectPerMin: 10,
      });
    }
    expect(last.observerCascadeRisk).toBeGreaterThan(0.4);
    expect(last.loadSheddingSeverity).toBeGreaterThan(0.3);
    expect(last.runtimeEntropyScore).toBeGreaterThan(0);
  });

  it('exports amplification suppression bundle', () => {
    initAmplificationSuppression();
    observeAmplificationSuppression(baseInput());
    const exp = buildAmplificationSuppressionExportBundle();
    expect(exp.version).toBe('1.0.0');
    expect(exp.runtimeEntropyEvolution).toBeDefined();
    expect(exp.recursionSuppressionReport).toBeDefined();
  });
});
