import type { EnduranceRiskBand, RuntimeSelfRecursionEnduranceObserveInput } from '../types/runtimeSelfRecursionEndurance';
import { RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN } from '../constants/runtimeSelfRecursionEndurance';

export function resetOperationalEnduranceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeOperationalEnduranceScore(
  input: RuntimeSelfRecursionEnduranceObserveInput,
): number {
  let score = 0.82;
  if (input.sessionMinutes >= RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN) {
    score -= Math.min(0.35, (input.sessionMinutes - RUNTIME_SELF_RECURSION_ENDURANCE_LONG_SESSION_MIN) / 600);
  }
  if (input.jsHeapMb > 160) score -= 0.12;
  if (input.memoryTrendPct > 60) score -= 0.1;
  if (input.eventLoopLagMs > 200) score -= 0.08;
  if (input.renderFps < 12) score -= 0.06;
  if (!input.appForeground || input.screenOff) score -= 0.05;
  if (input.batterySaver) score -= 0.04;
  return Math.round(Math.max(0.1, Math.min(1, score)) * 1000) / 1000;
}

export function classifyEnduranceRiskBand(
  circuitRisk: number,
  enduranceScore: number,
): EnduranceRiskBand {
  if (circuitRisk >= 0.62 || enduranceScore < 0.42) return 'high';
  if (circuitRisk >= 0.38 || enduranceScore < 0.58) return 'medium';
  return 'low';
}
