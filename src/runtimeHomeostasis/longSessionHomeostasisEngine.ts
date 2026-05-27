import type { RuntimeHomeostasisObserveInput } from '../types/runtimeHomeostasis';
import { RUNTIME_HOMEOSTASIS_LONG_SESSION_MIN } from '../constants/runtimeHomeostasis';

const longSessionTimeline: { at: string; homeostasis: number }[] = [];

export function resetLongSessionHomeostasisEngineForTest(): void {
  longSessionTimeline.length = 0;
}

export function scoreLongSessionHomeostasis(input: RuntimeHomeostasisObserveInput): number {
  if (input.sessionMinutes < RUNTIME_HOMEOSTASIS_LONG_SESSION_MIN) return 0.85;
  let score = 0.72;
  score -= input.runtimeEntropyScore * 0.15;
  score -= input.interventionDensity * 0.12;
  score -= input.observerOverheadRatio * 0.1;
  score -= input.telemetryAmplificationScore * 0.08;
  if (input.continuityScore > 70) score += 0.05;
  const rounded = Math.round(Math.max(0, Math.min(1, score)) * 1000) / 1000;
  longSessionTimeline.push({ at: new Date().toISOString(), homeostasis: rounded });
  if (longSessionTimeline.length > 64) longSessionTimeline.shift();
  return rounded;
}

export function getLongSessionEquilibriumTimeline(): { at: string; homeostasis: number }[] {
  return [...longSessionTimeline];
}

export function longSessionHomeostasisFlags(input: RuntimeHomeostasisObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_HOMEOSTASIS_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.interventionDensity > 0.45) flags.push('fatigue');
  if (input.runtimeEntropyScore > 0.4) flags.push('entropy_drift');
  if (input.interventionDensity > 0.4) flags.push('orchestration_creep');
  if (input.loadSheddingSeverity > 0.35) flags.push('stabilization_pressure');
  if (input.telemetryAmplificationScore > 0.35) flags.push('telemetry_creep');
  return flags;
}
