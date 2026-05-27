import type { TradingSurvivabilityObserveInput } from '../types/tradingSurvivabilityOrchestration';

let lastPacingFactor = 1;

export function resetTradingExecutionPacingEngineForTest(): void {
  lastPacingFactor = 1;
}

export function computeExecutionPacingFactor(input: TradingSurvivabilityObserveInput): number {
  let factor = 1;
  if (input.thermalState !== 'none' && input.thermalState !== 'light') factor *= 1.35;
  if (input.batterySaver) factor *= 1.2;
  if (input.eventLoopLagMs > 300) factor *= 1.25;
  if (input.screenOff) factor *= 1.5;
  lastPacingFactor = Math.round(Math.min(3, factor) * 100) / 100;
  return lastPacingFactor;
}

export function getLastExecutionPacingFactor(): number {
  return lastPacingFactor;
}
