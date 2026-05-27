import type {
  RuntimeCivilizationTopologyObserveInput,
  RuntimeCivilizationTopologyTimelineEntry,
} from '../types/runtimeCivilizationTopology';
import { buildCivilizationTopologyProfile } from './civilizationTopologyScorers';
import { recordCivilizationTopologyTimeline } from './civilizationTopologyTimeline';

export type CivilizationTopologyFlowResult = {
  flow: RuntimeCivilizationTopologyTimelineEntry['flow'];
  detailJa: string;
};

export function runCivilizationTopologyFlows(
  input: RuntimeCivilizationTopologyObserveInput,
): CivilizationTopologyFlowResult[] {
  const profile = buildCivilizationTopologyProfile(input);
  const results: CivilizationTopologyFlowResult[] = [
    {
      flow: 'cognition_topology_flow',
      detailJa: `complexity ${profile.cognitionTopologyComplexity} · collapse ${profile.topologyCollapseRisk}`,
    },
    {
      flow: 'epistemic_stability',
      detailJa: `stability ${profile.epistemicStabilityScore} · variance ${profile.semanticWorldModelVariance}`,
    },
    {
      flow: 'recursive_cognition_loop',
      detailJa: 'observer → governance → telemetry → replay → observer',
    },
    {
      flow: 'semantic_civilization_chain',
      detailJa: `world variance ${profile.semanticWorldModelVariance} · context ${profile.civilizationContextInstability}`,
    },
    {
      flow: 'governance_meaning_propagation',
      detailJa: `belief drift ${profile.governanceBeliefDrift} · confidence ${input.governanceConfidence}`,
    },
    {
      flow: 'observer_worldview_fragmentation',
      detailJa: `perspective ${profile.observerPerspectiveFragmentation} · chain ${profile.observerChainDepth}`,
    },
    {
      flow: 'epistemic_amplification_route',
      detailJa: `meaning topology ${profile.recursiveMeaningTopology} · replay ${input.replayCount}`,
    },
    {
      flow: 'narrative_reality_coupling',
      detailJa: `coupling ${profile.narrativeRealityCoupling} · anchor ${input.realityAnchorConfidence}`,
    },
    {
      flow: 'topology_drift_record',
      detailJa: 'epistemic topology suggestions recorded (observe-only)',
    },
  ];
  for (const result of results) recordCivilizationTopologyTimeline(result.flow, result.detailJa);
  return results;
}
