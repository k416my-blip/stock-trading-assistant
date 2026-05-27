import type { RuntimeResourceStabilityObserveInput } from '../types/runtimeResourceStability';
import { scoreRuntimeMemoryPressure } from './memoryPressureMonitor';

export function resetLongSessionResourceDriftEngineForTest(): void {
  /* stateless */
}

export function scoreLongSessionResourceDrift(input: RuntimeResourceStabilityObserveInput): number {
  if (input.sessionMinutes < 120) return 0.1;
  return Math.round(Math.min(1, scoreRuntimeMemoryPressure(input) * 1.15) * 1000) / 1000;
}
