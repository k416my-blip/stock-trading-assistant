import type {
  RuntimeFiniteBoundaryObserveInput,
  RuntimeFiniteBoundaryTimelineEntry,
} from '../types/runtimeFiniteBoundary';
import { buildRuntimeFiniteBoundaryProfile } from './finiteBoundaryScorers';
import { recordFiniteBoundaryTimeline } from './finiteBoundaryTimeline';

export type FiniteBoundaryFlowResult = {
  flow: RuntimeFiniteBoundaryTimelineEntry['flow'];
  detailJa: string;
};

export function runFiniteBoundaryFlows(input: RuntimeFiniteBoundaryObserveInput): FiniteBoundaryFlowResult[] {
  const profile = buildRuntimeFiniteBoundaryProfile(input);
  const results: FiniteBoundaryFlowResult[] = [
    {
      flow: 'observation_budget',
      detailJa: `observer ${profile.observerBudgetConsumption} · mass ${profile.civilizationStackMassIndex}`,
    },
    {
      flow: 'recursion_budget',
      detailJa: `recursion usage ${profile.recursionBudgetUsage} · termination ${profile.recursionTerminationProbability}`,
    },
    {
      flow: 'semantic_entropy',
      detailJa: `entropy budget ${profile.semanticEntropyBudget} · containment ${profile.semanticEntropyContainment}`,
    },
    {
      flow: 'finite_boundary',
      detailJa: `boundary index ${profile.runtimeFiniteBoundaryIndex} · confidence ${profile.boundednessConfidence}`,
    },
    {
      flow: 'observer_mass',
      detailJa: `cascade containment ${profile.observerCascadeContainment} · closure ${profile.observerClosureIntegrity}`,
    },
    {
      flow: 'dashboard_ceiling',
      detailJa: `attention budget ${profile.dashboardAttentionBudget} · ceiling ${profile.dashboardCognitiveCeiling}`,
    },
    {
      flow: 'containment_stress',
      detailJa: `topology stress ${profile.topologyContainmentStress} · replay containment ${profile.replayContainmentIntegrity}`,
    },
    {
      flow: 'stopping_analysis',
      detailJa: 'stopping suggestions recorded only; no forced stop/runtime cutoff',
    },
  ];
  for (const result of results) recordFiniteBoundaryTimeline(result.flow, result.detailJa);
  return results;
}
