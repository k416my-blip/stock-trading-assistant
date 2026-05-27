import type { RuntimeSelfLimitationObserveInput } from '../types/runtimeSelfLimitation';
import { computeStabilizationCost, scoreStabilizationBudgetPressure } from './runtimeStabilizationBudgetManager';

export function resetStabilizationBudgetGovernorForTest(): void {
  /* stateless */
}

export function isBudgetOverrun(input: RuntimeSelfLimitationObserveInput): boolean {
  return scoreStabilizationBudgetPressure(input) > 0.85;
}

export function budgetGovernanceSuggestion(input: RuntimeSelfLimitationObserveInput): string {
  if (!isBudgetOverrun(input)) return 'budget_nominal';
  const cost = computeStabilizationCost(input);
  if (cost > 0.7) return 'suggest_stabilization_shedding';
  return 'suggest_observer_throttle';
}
