import type { RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';
import { RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN } from '../constants/runtimeSelfRecursionEndurance';

export function resetLongSessionDriftMonitorForTest(): void {
  /* stateless */
}

export function scoreLongSessionDriftRisk(input: RuntimeSelfRecursionEnduranceObserveInput): number {
  if (input.sessionMinutes < RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN) {
    return Math.round(Math.min(0.35, input.memoryTrendPct / 300) * 1000) / 1000;
  }
  const sessionFactor = Math.min(1, (input.sessionMinutes - RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN) / 480);
  const drift = input.memoryTrendPct / 100 * 0.45 + sessionFactor * 0.35 + input.telemetryAmplificationScore * 0.2;
  return Math.round(Math.min(1, drift) * 1000) / 1000;
}
