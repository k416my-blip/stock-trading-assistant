import type { RuntimeUnifiedUtilityObserveInput } from '../types/runtimeUnifiedUtility';
import { RUNTIME_UNIFIED_UTILITY_LONG_SESSION_MIN } from '../constants/runtimeUnifiedUtility';

export function resetLongSessionExistentialDriftEngineForTest(): void {
  /* stateless */
}

export function longSessionDriftFlags(input: RuntimeUnifiedUtilityObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_UNIFIED_UTILITY_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.valueDilutionRisk > 0.35) flags.push('purpose_erosion');
  if (input.runtimeAuditCoverage > 0.72) flags.push('governance_creep');
  if (input.observerDensityScore > 0.5) flags.push('observer_expansion');
  if (input.equilibriumPersistence > 0.75) flags.push('stability_fixation');
  if (input.metaRecursionRisk > 0.45) flags.push('meta_recursion');
  return flags;
}

export function scoreRuntimeExistentialDriftRisk(input: RuntimeUnifiedUtilityObserveInput): number {
  if (input.sessionMinutes < RUNTIME_UNIFIED_UTILITY_LONG_SESSION_MIN) return 0.1;
  const flags = longSessionDriftFlags(input);
  let risk = flags.length * 0.16;
  risk += (1 - input.longSessionPurposeIntegrity) * 0.3;
  risk += input.runtimePurposeDriftRisk * 0.2;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
