import type { RuntimeNarrativeIntegrityObserveInput } from '../types/runtimeNarrativeIntegrity';

const narrativeEvolution: { at: string; variance: number }[] = [];

export function resetRuntimeNarrativeEvolutionCoordinatorForTest(): void {
  narrativeEvolution.length = 0;
}

export function scoreSemanticVariance(input: RuntimeNarrativeIntegrityObserveInput): number {
  const values = [
    input.runtimeStrategicCoherence,
    input.runtimeRealityIntegrityScore,
    input.runtimePurposeIntegrityScore,
    input.runtimeMetaCognitionScore,
    1 - input.recursiveBeliefReinforcementRisk,
  ];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(
    (values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length) * 1000,
  ) / 1000;
}

export function scoreStorylineRecursion(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.runtimeAuditCoverage * 0.35 +
      input.recursiveBeliefReinforcementRisk * 0.35 +
      input.observerConfirmationLoopRisk * 0.3) *
      1000,
  ) / 1000;
}

export function scoreInterpretationPersistence(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.observerConfirmationLoopRisk * 0.4 +
      input.recursiveBeliefReinforcementRisk * 0.35 +
      input.governanceConfidence * 0.25) *
      1000,
  ) / 1000;
}

export function scoreNarrativeRigidity(input: RuntimeNarrativeIntegrityObserveInput): number {
  let rigidity = input.equilibriumPersistence * 0.3;
  rigidity += input.runtimeWorldviewLockRisk * 0.25;
  rigidity += input.runtimeStrategicCoherence * 0.25;
  rigidity += input.metaCognitiveRigidityRisk * 0.2;
  const rounded = Math.round(Math.min(1, rigidity) * 1000) / 1000;
  narrativeEvolution.push({ at: new Date().toISOString(), variance: rounded });
  if (narrativeEvolution.length > 64) narrativeEvolution.shift();
  return rounded;
}

export function scoreSemanticInflation(input: RuntimeNarrativeIntegrityObserveInput): number {
  return Math.round(
    (input.runtimeEpistemologyInflationRisk * 0.4 +
      recursiveNarrativeInflationProxy(input) * 0.35 +
      input.runtimeGovernanceInflationRisk * 0.25) *
      1000,
  ) / 1000;
}

export function getNarrativeEvolution(): { at: string; variance: number }[] {
  return [...narrativeEvolution];
}

function recursiveNarrativeInflationProxy(input: RuntimeNarrativeIntegrityObserveInput): number {
  return input.runtimeAuditCoverage * 0.5 + input.recursiveBeliefReinforcementRisk * 0.5;
}
