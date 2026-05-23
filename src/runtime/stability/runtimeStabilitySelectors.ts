import type { RuntimeStabilitySnapshot } from '../../types/runtimeStability';
import { getLastRuntimeStabilitySnapshot } from './RuntimeHealthMonitor';

export function selectRuntimeStabilitySnapshot(): RuntimeStabilitySnapshot | null {
  return getLastRuntimeStabilitySnapshot();
}

export function selectRuntimeHealthScore(): number | null {
  return getLastRuntimeStabilitySnapshot()?.healthScore ?? null;
}
