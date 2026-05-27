import type { RuntimeCrossStackCompressionObserveInput } from '../types/runtimeCrossStackCompression';

export function resetAmplificationHeatmapBuilderForTest(): void {
  /* stateless */
}

export function buildAmplificationHeatmap(
  input: RuntimeCrossStackCompressionObserveInput,
): { stack: string; intensity: number }[] {
  return [
    { stack: 'telemetry', intensity: input.telemetryAmplificationScore },
    { stack: 'observer', intensity: input.observerOverheadRatio },
    { stack: 'narrative', intensity: 1 - input.runtimeNarrativeIntegrityScore },
    { stack: 'meta', intensity: 1 - input.runtimeMetaCognitionScore },
    { stack: 'agency', intensity: 1 - input.runtimeAgencyIntegrityScore },
  ];
}
