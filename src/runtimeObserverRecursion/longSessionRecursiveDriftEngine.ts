import type { RuntimeObserverRecursionObserveInput } from '../types/runtimeObserverRecursion';
import { RUNTIME_OBSERVER_RECURSION_LONG_SESSION_MIN } from '../constants/runtimeObserverRecursion';
import { scoreObserverRecursionRisk } from './recursiveObserverCascadeModel';

export function resetLongSessionRecursiveDriftEngineForTest(): void {
  /* stateless */
}

export function scoreLongSessionRecursiveDrift(input: RuntimeObserverRecursionObserveInput): number {
  if (input.sessionMinutes < RUNTIME_OBSERVER_RECURSION_LONG_SESSION_MIN) return 0.1;
  return Math.round(Math.min(1, scoreObserverRecursionRisk(input) * 1.2) * 1000) / 1000;
}
