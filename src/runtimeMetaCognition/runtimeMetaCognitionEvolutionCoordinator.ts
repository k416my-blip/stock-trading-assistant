import type { RuntimeMetaCognitionObserveInput } from '../types/runtimeMetaCognition';

const metaEvolution: { at: string; variance: number }[] = [];

export function resetRuntimeMetaCognitionEvolutionCoordinatorForTest(): void {
  metaEvolution.length = 0;
}

export function scoreMetaVariance(input: RuntimeMetaCognitionObserveInput): number {
  const values = [
    input.runtimeStrategicCoherence,
    1 - input.observerOverheadRatio,
    1 - input.runtimeAuditCoverage,
    input.runtimeRealityIntegrityScore,
    input.runtimeAgencyIntegrityScore,
  ];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(
    (values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length) * 1000,
  ) / 1000;
}

export function scoreObserverRecursionMeta(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerDensityScore * 0.35 +
      input.runtimeAuditCoverage * 0.3 +
      input.metaRecursionRisk * 0.35) *
      1000,
  ) / 1000;
}

export function scoreAuditRigidity(input: RuntimeMetaCognitionObserveInput): number {
  let rigidity = input.runtimeAuditCoverage * 0.35;
  rigidity += input.governanceConfidence * 0.25;
  rigidity += input.runtimeStrategicCoherence * 0.2;
  rigidity += input.equilibriumPersistence * 0.2;
  const rounded = Math.round(Math.min(1, rigidity) * 1000) / 1000;
  metaEvolution.push({ at: new Date().toISOString(), variance: rounded });
  if (metaEvolution.length > 64) metaEvolution.shift();
  return rounded;
}

export function scoreCoherenceInflation(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.runtimeStrategicCoherence * 0.45 + input.runtimeCalmnessIndex * 0.35 + input.equilibriumPersistence * 0.2) *
      1000,
  ) / 1000;
}

export function scoreSelfReferencePersistence(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerOverheadRatio * 0.4 +
      input.observerConfirmationLoopRisk * 0.35 +
      input.observerAgencyFusionRisk * 0.25) *
      1000,
  ) / 1000;
}

export function scoreIntrospectionDependencyIndex(input: RuntimeMetaCognitionObserveInput): number {
  return Math.round(
    (input.observerOverheadRatio * 0.35 +
      input.runtimeAuditCoverage * 0.3 +
      input.telemetryAmplificationScore * 0.35) *
      1000,
  ) / 1000;
}

export function getMetaEvolution(): { at: string; variance: number }[] {
  return [...metaEvolution];
}
