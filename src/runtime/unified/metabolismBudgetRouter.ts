/** Metabolism Budget Router — GC / replay / entropy allocation. */
import type { UnifiedTickGate } from '../../types/runtimeUnifiedOrchestrator';

export function routeMetabolismBudget(gate: UnifiedTickGate): {
  lightGcOnly: boolean;
  allowReplayDecay: boolean;
  entropyDetox: boolean;
} {
  if (gate.survivalOnly) {
    return { lightGcOnly: true, allowReplayDecay: false, entropyDetox: false };
  }
  if (!gate.allowDeepGc) {
    return { lightGcOnly: true, allowReplayDecay: gate.allowReplay, entropyDetox: false };
  }
  return { lightGcOnly: false, allowReplayDecay: gate.allowReplay, entropyDetox: true };
}
