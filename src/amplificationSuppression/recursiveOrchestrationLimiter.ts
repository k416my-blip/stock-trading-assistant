let orchestrationDepth = 0;

export function resetRecursiveOrchestrationLimiterForTest(): void {
  orchestrationDepth = 0;
}

export function noteOrchestrationRecursion(): void {
  orchestrationDepth += 1;
  if (orchestrationDepth > 32) orchestrationDepth = 32;
}

export function scoreRecursiveOrchestrationRisk(): number {
  return Math.round(Math.min(1, orchestrationDepth / 20) * 1000) / 1000;
}

export function shouldLimitRecursion(): boolean {
  return orchestrationDepth > 12;
}
