import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';
import { scoreObserverRecursionRisk } from './recursiveObserverCascadeModel';
import { scoreTelemetryAmplificationRisk } from './telemetryEchoInflationDetector';
import { scoreRecursiveSignalEchoRisk } from './signalEchoLoopDetector';

export function resetObserverRecursionConfidenceEngineForTest(): void {
  /* stateless */
}

export function scoreRuntimeObserverConfidence(input: RuntimeObserverRecursionObserveInput): number {
  const confidence =
    (1 -
      (scoreObserverRecursionRisk(input) +
        scoreTelemetryAmplificationRisk(input) +
        scoreRecursiveSignalEchoRisk(input)) /
        3) *
    (1 - input.observerOverheadRatio * 0.25);
  return Math.round(Math.max(0, Math.min(1, confidence)) * 1000) / 1000;
}
