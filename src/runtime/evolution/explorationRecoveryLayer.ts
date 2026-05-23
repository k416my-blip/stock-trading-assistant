/**
 * Exploration Recovery Layer — unlock learning deadlocks safely.
 */
import type { ExplorationRecoveryResult } from '../../types/runtimeEvolution';
import type { AdaptiveRuntimeLearningState } from '../../types/adaptiveRuntimeLearning';
import { isProtectedEdge } from '../../constants/adaptiveRuntimeLearning';
import { GOVERNANCE_PROTECTED_INVARIANT_KINDS } from '../../constants/adaptiveRuntimeGovernance';

export function runExplorationRecovery(
  store: AdaptiveRuntimeLearningState,
  entropyLow: boolean,
): ExplorationRecoveryResult {
  if (!entropyLow) {
    return {
      dormantEdgesRevived: 0,
      alternativePathsOpened: 0,
      sandboxContradictions: 0,
      lowRiskReplays: 0,
    };
  }

  let dormantEdgesRevived = 0;
  let alternativePathsOpened = 0;
  let sandboxContradictions = 0;
  let lowRiskReplays = 0;

  for (const rec of Object.values(store.edges)) {
    const fromStr = String(rec.from);
    if (GOVERNANCE_PROTECTED_INVARIANT_KINDS.some((k) => fromStr.includes(k) || String(rec.to).includes(k))) {
      continue;
    }
    if (rec.protectedInvariant || isProtectedEdge(fromStr, String(rec.to), rec.relation)) {
      continue;
    }
    if (rec.runtimeLearnedWeight < 0.15 && rec.hitCount >= 1) {
      rec.runtimeLearnedWeight = Math.min(0.4, rec.runtimeLearnedWeight + 0.12);
      dormantEdgesRevived += 1;
    }
    if (rec.falsePositiveCount > 0 && rec.confidenceEma < 0.5) {
      rec.confidenceEma = Math.min(0.55, rec.confidenceEma + 0.05);
      alternativePathsOpened += 1;
    }
  }

  for (const fp of store.falsePositives.slice(0, 3)) {
    if (!fp.predictedRoot.includes('ownership') && !fp.predictedRoot.includes('duplicate_socket')) {
      sandboxContradictions += 1;
    }
  }

  if (store.replayCount > 0) {
    store.replayCount = Math.max(0, store.replayCount - 1);
    lowRiskReplays = 1;
  }

  return {
    dormantEdgesRevived,
    alternativePathsOpened,
    sandboxContradictions,
    lowRiskReplays,
  };
}
