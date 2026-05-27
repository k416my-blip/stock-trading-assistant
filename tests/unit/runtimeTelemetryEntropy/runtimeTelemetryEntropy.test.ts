import { beforeEach, describe, expect, it } from 'vitest';
import {
  initRuntimeTelemetryEntropy,
  observeRuntimeTelemetryEntropy,
  shouldRunRuntimeTelemetryEntropySample,
  getRuntimeTelemetryEntropyDashboard,
  resetRuntimeTelemetryEntropyForTest,
  buildRuntimeTelemetryEntropyExportBundle,
} from '../../../src/runtimeTelemetryEntropy';

function baseInput() {
  return {
    eventLoopLagMs: 200,
    renderFps: 12,
    jsHeapMb: 160,
    memoryTrendPct: 70,
    sessionMinutes: 150,
    asyncQueueDepth: 10,
    reconnectPerMin: 6,
    replayCount: 45,
    telemetrySampleCount: 90,
    dashboardRowCount: 36,
    exportBytesEstimate: 280_000,
    timelineEventCount: 320,
    uniqueSignalKinds: 10,
    duplicateSignalRatio: 0.55,
    compressionRatio: 0.38,
    snapshotWriteRate: 22,
    observerOverheadRatio: 0.52,
    telemetryAmplificationScore: 0.48,
    soakReplayHooksActive: 5,
  };
}

describe('runtimeTelemetryEntropy', () => {
  beforeEach(() => resetRuntimeTelemetryEntropyForTest());

  it('observes entropy profile and dashboard visualizations', () => {
    initRuntimeTelemetryEntropy();
    const p = observeRuntimeTelemetryEntropy(baseInput());
    expect(p.signalEntropyScore).toBeGreaterThan(0);
    expect(p.telemetryDuplicationRisk).toBeGreaterThan(0);
    expect(p.replayAmplificationRisk).toBeGreaterThan(0);
    expect(p.metricCascadeRisk).toBeGreaterThan(0);
    expect(p.dashboardSaturationRisk).toBeGreaterThan(0);
    expect(p.exportPayloadRisk).toBeGreaterThan(0);
    expect(p.timelineFragmentationRisk).toBeGreaterThan(0);
    expect(p.staleTelemetryRatio).toBeGreaterThan(0);

    const dash = getRuntimeTelemetryEntropyDashboard();
    expect(dash?.entropyHeatmap.length).toBeGreaterThan(0);
    expect(dash?.signalDuplicationGraph.nodes.length).toBeGreaterThan(0);
    expect(dash?.replayAmplificationTimeline.length).toBeGreaterThan(0);
    expect(dash?.dashboardSaturationRadar.length).toBe(4);
    expect(dash?.exportPayloadHistogram.length).toBeGreaterThan(0);
  });

  it('records observe-only governance suggestions', () => {
    initRuntimeTelemetryEntropy();
    observeRuntimeTelemetryEntropy(baseInput());
    const dash = getRuntimeTelemetryEntropyDashboard();
    expect(dash?.governanceSuggestions.every((s) => s.observeOnly === true)).toBe(true);
    expect(dash?.governanceSuggestions.length).toBeGreaterThan(0);
  });

  it('throttles samples', () => {
    initRuntimeTelemetryEntropy();
    expect(shouldRunRuntimeTelemetryEntropySample(baseInput())).toBe(true);
    expect(shouldRunRuntimeTelemetryEntropySample(baseInput())).toBe(false);
  });

  it('exports entropy bundle sections', () => {
    initRuntimeTelemetryEntropy();
    observeRuntimeTelemetryEntropy(baseInput());
    const bundle = buildRuntimeTelemetryEntropyExportBundle();
    expect(bundle.telemetryEntropyReport).toBeTruthy();
    expect(bundle.replayAmplificationReport).toBeTruthy();
    expect(bundle.signalDuplicationTopology).toBeTruthy();
    expect(bundle.exportPayloadAnalysis).toBeTruthy();
    expect(bundle.dashboardSaturationAnalysis).toBeTruthy();
  });
});
