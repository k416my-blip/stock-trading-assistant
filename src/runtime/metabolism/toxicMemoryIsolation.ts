/**
 * Toxic Memory Isolation — contradictions / unsupported inference quarantine.
 */
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';
import { isolateToxicMemory } from './metabolismStorage';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';

export function isolateToxicMemories(store: AdaptiveRuntimeLearningState): { isolated: number } {
  let isolated = 0;
  const gov = getLastGovernanceState();

  for (const c of gov?.contradictions ?? []) {
    isolateToxicMemory('contradiction', c.edgeKeys?.[0] ?? 'graph', c.detailJa);
    isolated += 1;
  }

  for (const fp of store.falsePositives) {
    if (fp.count >= 3 && fp.penalty > 0.5) {
      isolateToxicMemory('unsupported', fp.edgeKey, `${fp.predictedRoot}→${fp.actualOutcome}`);
      const rec = store.edges[fp.edgeKey];
      if (rec && !rec.protectedInvariant && !isProtectedEdge(String(rec.from), String(rec.to), rec.relation)) {
        rec.runtimeLearnedWeight *= 0.5;
      }
      isolated += 1;
    }
  }

  return { isolated };
}
