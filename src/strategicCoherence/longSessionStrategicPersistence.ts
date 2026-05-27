import type { StrategicCoherenceObserveInput } from '../types/strategicCoherence';
import { STRATEGIC_COHERENCE_LONG_SESSION_MIN } from '../constants/strategicCoherence';

export function resetLongSessionStrategicPersistenceForTest(): void {
  /* stateless */
}

export function scoreLongSessionStrategicPersistence(input: StrategicCoherenceObserveInput): number {
  if (input.sessionMinutes < STRATEGIC_COHERENCE_LONG_SESSION_MIN) return 0.85;
  let score = 0.7;
  score -= input.stabilityDriftRisk * 0.15;
  score -= input.interventionDensity * 0.12;
  score -= Math.abs(input.simplificationIntegrity - input.continuityScore / 100) * 0.1;
  if (input.continuityScore > 70) score += 0.05;
  return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
}

export function longSessionStrategicFlags(input: StrategicCoherenceObserveInput): string[] {
  if (input.sessionMinutes < STRATEGIC_COHERENCE_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.stabilityDriftRisk > 0.4) flags.push('objective_drift');
  if (input.interventionDensity > 0.45) flags.push('intervention_ideology_drift');
  if (input.metaCoordinationStability < 0.6) flags.push('orchestration_creep');
  if (input.continuityScore < 72) flags.push('continuity_distortion');
  return flags;
}
