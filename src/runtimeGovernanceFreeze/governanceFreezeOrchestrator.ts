import type {
  RuntimeGovernanceFreezeObserveInput,
  RuntimeGovernanceFreezeTimelineEntry,
} from '../types/runtimeGovernanceFreeze';
import { buildRuntimeGovernanceFreezeProfile } from './governanceFreezeScorers';
import { recordGovernanceFreezeTimeline } from './governanceFreezeTimeline';

export type GovernanceFreezeFlowResult = {
  flow: RuntimeGovernanceFreezeTimelineEntry['flow'];
  detailJa: string;
};

export function runGovernanceFreezeFlows(
  input: RuntimeGovernanceFreezeObserveInput,
): GovernanceFreezeFlowResult[] {
  const profile = buildRuntimeGovernanceFreezeProfile(input);
  const results: GovernanceFreezeFlowResult[] = [
    {
      flow: 'expansion_governance',
      detailJa: `entropy ${profile.runtimeExpansionEntropy} · proliferation ${profile.recursiveLayerProliferationRisk}`,
    },
    {
      flow: 'maintainability',
      detailJa: `maintainability ${profile.stackMaintainabilityIndex} · verify stress ${profile.verifyExecutionStress}`,
    },
    {
      flow: 'operational_convergence',
      detailJa: `convergence ${profile.operationalConvergenceScore} · stabilization ${profile.stabilizationNecessityIndex}`,
    },
    {
      flow: 'freeze_readiness',
      detailJa: `freeze confidence ${profile.expansionFreezeConfidence} · finalization ${profile.stackFinalizationReadiness}`,
    },
    {
      flow: 'simplification_suggestion',
      detailJa: 'suggestion/logging only; no cleanup, consolidation, pruning, deletion, compression, or mutation',
    },
  ];
  for (const result of results) recordGovernanceFreezeTimeline(result.flow, result.detailJa);
  return results;
}
