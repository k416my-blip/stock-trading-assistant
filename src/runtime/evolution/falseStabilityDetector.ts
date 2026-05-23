/**
 * False Stability Detector — compact hiding divergence, fake confidence plateaus.
 */
import type { FalseStabilityMetrics, FalseStabilityState } from '../../types/runtimeEvolution';
import type { EvolutionMonitorSignals } from '../../types/runtimeEvolution';
import type { ReplayBiasMetrics } from '../../types/runtimeEvolution';
import type { EntropyMetrics } from '../../types/runtimeEvolution';
import { CONFIDENCE_FLATTEN_SPREAD_MAX, STAGNATION_MUTATION_MAX } from '../../constants/runtimeEvolution';
import { getLastGovernanceState } from '../governance/adaptiveRuntimeGovernance';

export function detectFalseStability(
  signals: EvolutionMonitorSignals,
  replayBias: ReplayBiasMetrics,
  entropy: EntropyMetrics,
  journalCompactedRecently = false,
): FalseStabilityMetrics {
  const gov = getLastGovernanceState();
  const contradictions = gov?.contradictions.length ?? 0;

  const lowMutationUnstableReplay =
    signals.graphMutationRate < STAGNATION_MUTATION_MAX && replayBias.replayBiasScore > 0.5;
  const compactHidingDivergence = journalCompactedRecently && replayBias.replayFixation;
  const suppressedContradictions = contradictions > 0 && signals.confidenceFlattening > 0.7;
  const fakeConfidencePlateau = signals.confidenceFlattening > 1 - CONFIDENCE_FLATTEN_SPREAD_MAX;

  let state: FalseStabilityState | 'NONE' = 'NONE';
  if (lowMutationUnstableReplay && fakeConfidencePlateau) state = 'FALSE_STABLE';
  else if (entropy.entropyScore < 0.25 && signals.edgeEntropy < 0.3) state = 'LATENT_COLLAPSE';
  else if ((gov?.drift.driftScore ?? 0) > 0.45 && signals.graphMutationRate < 0.05) state = 'HIDDEN_DRIFT';

  return {
    state,
    lowMutationUnstableReplay,
    compactHidingDivergence,
    suppressedContradictions,
    fakeConfidencePlateau,
  };
}
