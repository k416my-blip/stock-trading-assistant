/** Tick Budget Engine — CPU/heap/async budget per tick. */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import type { UnifiedLayerBudget } from '../../types/runtimeUnifiedOrchestrator';
import {
  UNIFIED_MAX_ASYNC_BURST,
  UNIFIED_MAX_CURIOSITY_SANDBOX_PER_TICK,
  UNIFIED_MAX_REPLAY_PER_TICK,
} from '../../constants/runtimeUnifiedOrchestrator';

export function allocateTickBudget(
  metrics: RuntimeTelemetryMetricsSnapshot,
  survivalOnly: boolean,
): UnifiedLayerBudget {
  if (survivalOnly) {
    return {
      observability: 5,
      selfHealing: 10,
      evolution: 0,
      constitution: 15,
      metabolism: 5,
      curiosity: 0,
      longevity: 0,
      orchestration: 20,
      ux: 0,
    };
  }
  const heapPressure = metrics.memoryTrendPct / 100;
  const base = 100 - Math.round(heapPressure * 30);
  return {
    observability: Math.round(base * 0.12),
    selfHealing: Math.round(base * 0.14),
    evolution: Math.round(base * 0.1),
    constitution: Math.round(base * 0.16),
    metabolism: Math.round(base * 0.18),
    curiosity: Math.min(UNIFIED_MAX_CURIOSITY_SANDBOX_PER_TICK, Math.round(base * 0.08)),
    longevity: Math.round(base * 0.1),
    orchestration: Math.round(base * 0.12),
    ux: Math.round(base * 0.06),
  };
}

export function getReplayBudgetCap(): number {
  return UNIFIED_MAX_REPLAY_PER_TICK;
}

export function getAsyncBurstCap(): number {
  return UNIFIED_MAX_ASYNC_BURST;
}

export function computeLayerBudgetUsage(spent: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(Math.min(1, spent / total) * 1000) / 1000;
}
