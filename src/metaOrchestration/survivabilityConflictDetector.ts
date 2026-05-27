import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

export function resetSurvivabilityConflictDetectorForTest(): void {
  /* stateless */
}

export function scoreSurvivabilityConflict(input: MetaOrchestrationObserveInput): number {
  let conflict = 0;
  if (input.recoverySuccessRate < 0.7 && input.governanceConfidence < 0.65) conflict += 0.25;
  if (input.observerOverheadRatio > 0.5 && input.continuityScore < 75) conflict += 0.2;
  if (input.hydrationOverlapCount > 1 && input.governanceMode !== 'full_observe') conflict += 0.15;
  if (input.causalConfidence > 0.7 && input.rootCauseScore > 0.6) conflict += 0.1;
  if (input.runtimeSafeTradingScore < 60 && input.recoverySuccessRate > 0.8) conflict += 0.12;
  return Math.round(Math.min(1, conflict) * 1000) / 1000;
}

export function detectActiveConflicts(input: MetaOrchestrationObserveInput): string[] {
  const conflicts: string[] = [];
  if (input.recoverySuccessRate < 0.65 && input.governanceMode === 'recovery_paced') {
    conflicts.push('recovery_vs_governance');
  }
  if (input.observerOverheadRatio > 0.55 && input.continuityScore < 70) {
    conflicts.push('telemetry_vs_continuity');
  }
  if (input.staleHydrationRisk > 0.4 && input.governanceMode === 'observer_balanced') {
    conflicts.push('governance_vs_hydration');
  }
  return conflicts;
}
