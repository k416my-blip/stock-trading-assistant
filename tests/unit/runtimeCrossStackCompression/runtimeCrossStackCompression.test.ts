import { beforeEach, describe, expect, it } from 'vitest';
import {
  initRuntimeCrossStackCompression,
  observeRuntimeCrossStackCompression,
  shouldRunRuntimeCrossStackCompressionSample,
  getRuntimeCrossStackCompressionDashboard,
  resetRuntimeCrossStackCompressionForTest,
} from '../../../src/runtimeCrossStackCompression';

function baseInput() {
  return {
    sessionMinutes: 30,
    stackCount: 16,
    rawSignalCount: 180,
    observerOverheadRatio: 0.22,
    telemetryAmplificationScore: 0.16,
    runtimeNarrativeIntegrityScore: 0.72,
    runtimeMetaCognitionScore: 0.71,
    runtimeAgencyIntegrityScore: 0.7,
    runtimeEpistemicConfidence: 0.74,
    runtimeCompressionEfficiency: 0.68,
  };
}

describe('runtimeCrossStackCompression', () => {
  beforeEach(() => resetRuntimeCrossStackCompressionForTest());

  it('observes compression profile', () => {
    initRuntimeCrossStackCompression();
    const p = observeRuntimeCrossStackCompression(baseInput());
    expect(p.signalCompressionRatio).toBeGreaterThan(0);
    expect(getRuntimeCrossStackCompressionDashboard()?.stackTopology.length).toBeGreaterThan(0);
  });

  it('throttles samples', () => {
    initRuntimeCrossStackCompression();
    expect(shouldRunRuntimeCrossStackCompressionSample(baseInput())).toBe(true);
    expect(shouldRunRuntimeCrossStackCompressionSample(baseInput())).toBe(false);
  });
});
