import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';
import { META_ORCHESTRATION_LONG_SESSION_MIN } from '../constants/metaRuntimeOrchestration';

export function resetLongSessionOrchestrationBalancerForTest(): void {
  /* stateless */
}

export function isLongSessionOrchestration(input: MetaOrchestrationObserveInput): boolean {
  return input.sessionMinutes >= META_ORCHESTRATION_LONG_SESSION_MIN;
}

export function longSessionOrchestrationAdjustments(input: MetaOrchestrationObserveInput): string[] {
  if (!isLongSessionOrchestration(input)) return [];
  const adj: string[] = ['observer_suppression', 'thermal_pacing'];
  if (input.observerOverheadRatio > 0.4) adj.push('recovery_pacing');
  if (input.miuiAggressiveReclaim) adj.push('reclaim_arbitration');
  return adj;
}

export function scoreOrchestrationBalance(input: MetaOrchestrationObserveInput): number {
  let balance = 0.8;
  if (isLongSessionOrchestration(input)) balance -= 0.1;
  balance -= input.observerOverheadRatio * 0.15;
  balance += input.governanceConfidence * 0.1;
  balance += (input.continuityScore / 100) * 0.08;
  return Math.round(Math.max(0, Math.min(1, balance)) * 1000) / 1000;
}
