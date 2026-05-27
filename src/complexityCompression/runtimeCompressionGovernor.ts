import type { ComplexityCompressionObserveInput } from '../types/complexityCompression';

const efficiencyTimeline: { at: string; efficiency: number }[] = [];

export function resetRuntimeCompressionGovernorForTest(): void {
  efficiencyTimeline.length = 0;
}

export function scoreRuntimeCompressionEfficiency(input: ComplexityCompressionObserveInput): number {
  const complexity = input.observerOverheadRatio + input.telemetryAmplificationScore + input.interventionDensity;
  const benefit = input.survivabilityEffectiveness + input.continuityScore / 100 + input.runtimeEquilibriumStability;
  const efficiency = benefit / (complexity + 0.5);
  const rounded = Math.round(Math.max(0, Math.min(1, efficiency)) * 1000) / 1000;
  efficiencyTimeline.push({ at: new Date().toISOString(), efficiency: rounded });
  if (efficiencyTimeline.length > 64) efficiencyTimeline.shift();
  return rounded;
}

export function getCompressionEfficiencyTimeline(): { at: string; efficiency: number }[] {
  return [...efficiencyTimeline];
}
