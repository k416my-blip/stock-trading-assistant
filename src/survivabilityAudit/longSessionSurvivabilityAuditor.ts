import type { SurvivabilityAuditObserveInput } from '../types/survivabilityAuditValidation';
import { SURVIVABILITY_AUDIT_LONG_SESSION_MIN } from '../constants/survivabilityAuditValidation';

export function resetLongSessionSurvivabilityAuditorForTest(): void {
  /* stateless */
}

export function scoreLongSessionStabilityIntegrity(input: SurvivabilityAuditObserveInput): number {
  if (input.sessionMinutes < SURVIVABILITY_AUDIT_LONG_SESSION_MIN) return 0.85;
  let integrity = 0.75;
  integrity -= input.runtimeEntropyScore * 0.2;
  integrity -= input.observerOverheadRatio * 0.15;
  integrity -= (1 - input.runtimeEquilibriumStability) * 0.15;
  if (input.reconnectPerMin > 5) integrity -= 0.1;
  if (input.continuityScore < 75) integrity -= 0.1;
  return Math.round(Math.max(0, Math.min(1, integrity)) * 1000) / 1000;
}

export function longSessionAuditFlags(input: SurvivabilityAuditObserveInput): string[] {
  if (input.sessionMinutes < SURVIVABILITY_AUDIT_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.runtimeEntropyScore > 0.45) flags.push('entropy_drift');
  if (input.observerOverheadRatio > 0.5) flags.push('observer_fatigue');
  if (input.loadSheddingSeverity > 0.4) flags.push('pacing_degradation');
  if (input.reconnectPerMin > 4) flags.push('websocket_degradation');
  if (input.continuityScore < 72) flags.push('continuity_degradation');
  return flags;
}
