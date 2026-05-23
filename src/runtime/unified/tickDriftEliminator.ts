/** Tick Drift Eliminator — correct tick timing drift. */
import { UNIFIED_TICK_DRIFT_TOLERANCE_MS, UNIFIED_TICK_MIN_INTERVAL_MS } from '../../constants/runtimeUnifiedOrchestrator';
import { getLastUnifiedTickAtMs } from './unifiedOrchestratorStorage';

export function measureTickDrift(nowMs = Date.now()): number {
  const last = getLastUnifiedTickAtMs();
  if (last === 0) return 0;
  const expected = last + UNIFIED_TICK_MIN_INTERVAL_MS;
  const drift = nowMs - expected;
  return Math.max(0, drift);
}

export function shouldDeferTickForDrift(nowMs = Date.now()): boolean {
  return measureTickDrift(nowMs) < -UNIFIED_TICK_DRIFT_TOLERANCE_MS;
}
