/** Layer Freeze Controller — unified freeze/deferred/stopped. */
import type { UnifiedTickGate } from '../../types/runtimeUnifiedOrchestrator';
import { isThermalSevere } from './thermalAuthorityLayer';
import { isBackgroundMinimalTick } from './backgroundExecutionController';
import type { PerformanceCostRuntimeSnapshot } from '../../types/performanceCost';
import { isHydrationLockActive } from '../stability/hydrationLock';
import type { RuntimeTelemetryMetricsSnapshot } from '../../types/runtimeTelemetry';

export function buildUnifiedTickGate(
  metrics: RuntimeTelemetryMetricsSnapshot,
  performance: PerformanceCostRuntimeSnapshot,
  survivalOnly: boolean,
  emergencyBrake: boolean,
  postConstitution: ReturnType<typeof import('./constitutionalTickGate').postConstitutionGate>,
): UnifiedTickGate {
  const bg = isBackgroundMinimalTick(performance);
  const thermal = isThermalSevere();
  const hydration = isHydrationLockActive();
  const wsStorm = metrics.websocket.reconnectStormDetected;

  if (emergencyBrake || survivalOnly) {
    return {
      allowCuriosity: false,
      allowReplay: false,
      allowDeepGc: false,
      allowDashboard: false,
      allowEvolutionFull: false,
      survivalOnly: true,
    };
  }

  return {
    allowCuriosity: !bg && !thermal && !hydration && !wsStorm && !postConstitution.suppressExploration,
    allowReplay: !bg && !hydration && !postConstitution.replayFreeze && !wsStorm,
    allowDeepGc: !bg && !thermal,
    allowDashboard: !bg && metrics.asyncQueueDepth < 48,
    allowEvolutionFull: !bg && !thermal,
    survivalOnly: false,
  };
}
