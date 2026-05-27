import type {
  RuntimeObserverRealityObserveInput,
  RuntimeObserverRealityTimelineEntry,
} from '../types/runtimeObserverRealitySelection';
import { buildRuntimeObserverRealityProfile } from './observerRealityScorers';
import { recordObserverRealityTimeline } from './observerRealityTimeline';

export type ObserverRealityFlowResult = {
  flow: RuntimeObserverRealityTimelineEntry['flow'];
  detailJa: string;
};

export function runObserverRealityFlows(input: RuntimeObserverRealityObserveInput): ObserverRealityFlowResult[] {
  const profile = buildRuntimeObserverRealityProfile(input);
  const results: ObserverRealityFlowResult[] = [
    {
      flow: 'observer_reality_selection',
      detailJa: `selection ${profile.observerRealitySelectionPressure} · instability ${profile.realitySelectionInstability}`,
    },
    {
      flow: 'semantic_causality_drift',
      detailJa: `drift ${profile.semanticCausalityDrift} · temporal stress ${profile.semanticTemporalCausalityStress}`,
    },
    {
      flow: 'interpretation_branching',
      detailJa: `branching ${profile.recursiveInterpretationBranching} · forks ${profile.observerMeaningForkDensity}`,
    },
    {
      flow: 'reality_coupling',
      detailJa: `coupling ${profile.narrativeRealityCouplingStress} · distance ${profile.semanticRealityDistance}`,
    },
    {
      flow: 'observer_fixation',
      detailJa: 'observer fixation logged only; no steering, correction, stabilization, or forced convergence',
    },
  ];
  for (const result of results) recordObserverRealityTimeline(result.flow, result.detailJa);
  return results;
}
