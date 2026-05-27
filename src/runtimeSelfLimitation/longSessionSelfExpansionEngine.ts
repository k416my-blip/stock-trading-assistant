import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { RUNTIME_SELF_LIMITATION_LONG_SESSION_MIN } from '../constants/runtimeSelfLimitation';

const expansionEvolution: { at: string; expansion: number }[] = [];

export function resetLongSessionSelfExpansionEngineForTest(): void {
  expansionEvolution.length = 0;
}

export function scoreSelfExpansion(input: RuntimeSelfLimitationObserveInput): number {
  if (input.sessionMinutes < RUNTIME_SELF_LIMITATION_LONG_SESSION_MIN) return 0.15;
  let expansion = 0;
  expansion += Math.min(1, input.orchestrationEdgeCount / 26) * 0.2;
  expansion += input.observerDensityScore * 0.2;
  expansion += input.telemetryAmplificationScore * 0.18;
  expansion += input.runtimeAuditCoverage * 0.15;
  expansion += input.interventionDensity * 0.12;
  expansion += input.runtimeTradingSuppression * 0.1;
  const rounded = Math.round(Math.min(1, expansion) * 1000) / 1000;
  expansionEvolution.push({ at: new Date().toISOString(), expansion: rounded });
  if (expansionEvolution.length > 64) expansionEvolution.shift();
  return rounded;
}

export function getSelfExpansionEvolution(): { at: string; expansion: number }[] {
  return [...expansionEvolution];
}

export function longSessionExpansionFlags(input: RuntimeSelfLimitationObserveInput): string[] {
  if (input.sessionMinutes < RUNTIME_SELF_LIMITATION_LONG_SESSION_MIN) return [];
  const flags: string[] = [];
  if (input.orchestrationEdgeCount > 16) flags.push('orchestration_creep');
  if (input.observerDensityScore > 0.5) flags.push('observer_accumulation');
  if (input.telemetryAmplificationScore > 0.38) flags.push('telemetry_inflation');
  if (input.runtimeAuditCoverage > 0.72) flags.push('recursive_audit_growth');
  if (input.loadSheddingSeverity > 0.35) flags.push('stabilization_fatigue');
  if (input.runtimeTradingSuppression > 0.38) flags.push('suppression_persistence');
  return flags;
}
