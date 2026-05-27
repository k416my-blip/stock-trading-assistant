import type { RuntimePurposeIntegrityObserveInput } from '../types/runtimePurposeIntegrity';
import { STABILITY_ADDICTION_SIGNALS } from '../constants/runtimePurposeIntegrity';

const addictionTimeline: { at: string; addiction: number }[] = [];

export function resetRuntimeStabilityAddictionDetectorForTest(): void {
  addictionTimeline.length = 0;
}

export function detectStabilityAddictionSignals(input: RuntimePurposeIntegrityObserveInput): string[] {
  const signals: string[] = [];
  if (input.runtimeCalmnessIndex > 0.75 && input.interventionDensity < 0.2) signals.push('calm_state_lock');
  if (input.interventionDensity < 0.15 && input.survivabilityEffectiveness < 0.6) {
    signals.push('intervention_avoidance');
  }
  if (input.equilibriumPersistence > 0.78 && input.eventLoopLagMs > 250) signals.push('pacing_inertia');
  if (input.recoverySuccessRate < 0.75 && input.runtimeCalmnessIndex > 0.65) {
    signals.push('recovery_hesitation');
  }
  if (input.observerOverheadRatio > 0.45 && input.simplificationIntegrity < 0.5) {
    signals.push('observer_preservation_bias');
  }
  return signals.filter((s) =>
    STABILITY_ADDICTION_SIGNALS.includes(s as (typeof STABILITY_ADDICTION_SIGNALS)[number]),
  );
}

export function scoreRuntimeStabilityAddiction(input: RuntimePurposeIntegrityObserveInput): number {
  const signals = detectStabilityAddictionSignals(input);
  let addiction = signals.length * 0.18;
  addiction += input.equilibriumPersistence * 0.2;
  addiction += input.runtimeCalmnessIndex * 0.15;
  addiction += (1 - input.interventionDensity) * 0.1;
  const rounded = Math.round(Math.min(1, addiction) * 1000) / 1000;
  addictionTimeline.push({ at: new Date().toISOString(), addiction: rounded });
  if (addictionTimeline.length > 64) addictionTimeline.shift();
  return rounded;
}

export function getStabilityAddictionTimeline(): { at: string; addiction: number }[] {
  return [...addictionTimeline];
}
