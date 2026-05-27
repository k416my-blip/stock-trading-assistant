import type { MetaOrchestrationObserveInput } from '../types/metaRuntimeOrchestration';

let amplificationHistory: number[] = [];

export function resetTelemetryAmplificationLimiterForTest(): void {
  amplificationHistory = [];
}

export function scoreTelemetryAmplification(input: MetaOrchestrationObserveInput): number {
  let amp = input.observerOverheadRatio * 0.4;
  if (input.recoverySuccessRate < 0.75) amp += 0.15;
  if (input.eventLoopLagMs > 300) amp += 0.12;
  if (input.observerOverheadRatio > 0.45 && input.recoverySuccessRate < 0.8) amp += 0.2;
  const rounded = Math.round(Math.min(1, amp) * 1000) / 1000;
  amplificationHistory.push(rounded);
  if (amplificationHistory.length > 48) amplificationHistory.shift();
  return rounded;
}

export function shouldBlockAmplificationLoop(input: MetaOrchestrationObserveInput): boolean {
  return scoreTelemetryAmplification(input) > 0.55;
}

export function getAmplificationTrend(): number {
  if (amplificationHistory.length < 3) return 0;
  const recent = amplificationHistory.slice(-5);
  return recent[recent.length - 1] - recent[0];
}
