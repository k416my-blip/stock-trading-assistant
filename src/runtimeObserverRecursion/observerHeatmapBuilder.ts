import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetObserverHeatmapBuilderForTest(): void {
  /* stateless */
}

export function buildRecursionHeatmap(
  input: RuntimeObserverRecursionObserveInput,
): { layer: string; intensity: number }[] {
  return [
    { layer: 'observer', intensity: input.observerDensityScore },
    { layer: 'audit', intensity: input.runtimeAuditCoverage },
    { layer: 'governance', intensity: input.governanceConfidence },
    { layer: 'telemetry', intensity: input.telemetryAmplificationScore },
    { layer: 'meta', intensity: input.metaRecursionRisk },
  ];
}
