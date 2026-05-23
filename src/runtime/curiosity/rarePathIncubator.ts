/**
 * Rare Path Incubator — protect minority causal paths in sandbox.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { isMinorityEdge } from './minorityEdgePreservation';
import { createSandboxClone, getActiveSandbox } from './curiosityStorage';

export function incubateRarePaths(store: AdaptiveRuntimeLearningState): number {
  const rare = Object.entries(store.edges).filter(([, e]) => isMinorityEdge(e));
  if (rare.length === 0) return 0;
  let sandbox = getActiveSandbox();
  if (!sandbox) sandbox = createSandboxClone(store.edges);
  for (const [key, e] of rare.slice(0, 3)) {
    if (sandbox.edges[key]) {
      sandbox.edges[key].weight = Math.min(0.92, sandbox.edges[key].weight + 0.02);
    } else {
      sandbox.edges[key] = {
        edgeKey: key,
        weight: e.runtimeLearnedWeight,
        from: String(e.from),
        to: String(e.to),
      };
    }
  }
  return rare.length;
}
