/** Zombie Orchestration Detector — orphan tick detection. */
import { getLastUnifiedTickAtMs, noteZombieTick } from './unifiedOrchestratorStorage';
import { UNIFIED_TICK_MIN_INTERVAL_MS } from '../../constants/runtimeUnifiedOrchestrator';

export function detectZombieOrchestration(nowMs = Date.now()): boolean {
  const last = getLastUnifiedTickAtMs();
  if (last === 0) return false;
  const gap = nowMs - last;
  if (gap > UNIFIED_TICK_MIN_INTERVAL_MS * 8) {
    noteZombieTick();
    return true;
  }
  return false;
}
