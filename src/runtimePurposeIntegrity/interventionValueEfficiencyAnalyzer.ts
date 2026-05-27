import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';

const efficiencyTimeline: { at: string; efficiency: number }[] = [];

export function resetInterventionValueEfficiencyAnalyzerForTest(): void {
  efficiencyTimeline.length = 0;
}

export function scoreUtilityPerIntervention(input: RuntimePurposeIntegrityObserveInput): number {
  const utility = (input.continuityScore / 100 + input.survivabilityEffectiveness) / 2;
  if (input.interventionDensity <= 0) return utility;
  return Math.round(Math.max(0, Math.min(1, utility / (input.interventionDensity + 0.2))) * 1000) / 1000;
}

export function scoreInterventionEfficiency(input: RuntimePurposeIntegrityObserveInput): number {
  const per = scoreUtilityPerIntervention(input);
  const rounded = Math.round(per * 1000) / 1000;
  efficiencyTimeline.push({ at: new Date().toISOString(), efficiency: rounded });
  if (efficiencyTimeline.length > 64) efficiencyTimeline.shift();
  return rounded;
}

export function getInterventionEfficiencyTimeline(): { at: string; efficiency: number }[] {
  return [...efficiencyTimeline];
}
