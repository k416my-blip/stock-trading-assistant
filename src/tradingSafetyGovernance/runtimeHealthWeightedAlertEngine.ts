import type { RiskEscalationLevel, TradingSafetyObserveInput } from '../types/tradingSafetyGovernance';

export function resetRuntimeHealthWeightedAlertEngineForTest(): void {
  /* stateless */
}

export function alertSeverityMultiplier(input: TradingSafetyObserveInput, tradingRisk: number): number {
  let mult = 1;
  if (tradingRisk > 0.5) mult += 0.3;
  if (input.thermalState !== 'none' && input.thermalState !== 'light') mult += 0.2;
  if (input.miuiAggressiveReclaim) mult += 0.15;
  return Math.round(Math.min(2, mult) * 100) / 100;
}

export function resolveRiskEscalationLevel(tradingRisk: number): RiskEscalationLevel {
  if (tradingRisk >= 0.85) return 'critical';
  if (tradingRisk >= 0.7) return 'severe';
  if (tradingRisk >= 0.5) return 'elevated';
  if (tradingRisk >= 0.3) return 'watch';
  return 'none';
}
