/** Curiosity Isolation Guard — block curiosity runaway. */
import { isSafeModeActive, isEmergencyBrakeActive } from './unifiedOrchestratorStorage';

export function shouldRunCuriosityPhase(
  allowByGate: boolean,
  curiosityBudget: number,
): boolean {
  if (isSafeModeActive() || isEmergencyBrakeActive()) return false;
  if (!allowByGate) return false;
  return curiosityBudget > 0;
}
