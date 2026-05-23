/** Runtime Safety Envelope — hard safety caps. */
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';
import {
  UNIFIED_CPU_DEGRADED_THRESHOLD,
  UNIFIED_HEAP_PRIORITY_THRESHOLD,
  UNIFIED_RECOVERY_EMERGENCY_COUNT,
} from '../../constants/runtimeUnifiedOrchestrator';
import { getRecoveryStreak } from './unifiedOrchestratorStorage';
import { FORBIDDEN_UNIFIED_ACTIONS } from '../../constants/runtimeUnifiedOrchestrator';

export function auditUnifiedAction(detailJa: string): boolean {
  const blob = detailJa.toLowerCase().replace(/[\s_-]/g, '');
  return !FORBIDDEN_UNIFIED_ACTIONS.some((f) => blob.includes(f.replace(/_/g, '')));
}

export function evaluateSafetyEnvelope(metrics: RuntimeTelemetryMetricsSnapshot): {
  cpuDegraded: boolean;
  heapPriority: boolean;
  recoveryEmergency: boolean;
} {
  const cpuProxy = Math.min(100, metrics.eventLoopLatencyMs / 2);
  return {
    cpuDegraded: cpuProxy > UNIFIED_CPU_DEGRADED_THRESHOLD,
    heapPriority: metrics.memoryTrendPct > UNIFIED_HEAP_PRIORITY_THRESHOLD,
    recoveryEmergency: getRecoveryStreak() >= UNIFIED_RECOVERY_EMERGENCY_COUNT,
  };
}
