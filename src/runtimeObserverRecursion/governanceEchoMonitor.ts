import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';

export function resetGovernanceEchoMonitorForTest(): void {
  /* stateless */
}

export function scoreGovernanceEcho(input: RuntimeObserverRecursionObserveInput): number {
  return Math.round((input.governanceConfidence * input.observerOverheadRatio) * 1000) / 1000;
}
