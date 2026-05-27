import type {
  RuntimeMetaLimitObserveInput,
  RuntimeMetaLimitTimelineEntry,
} from '../types/runtimeMetaLimitGovernance';
import { buildRuntimeMetaLimitProfile } from './metaLimitScorers';
import { recordMetaLimitTimeline } from './metaLimitTimeline';

export type MetaLimitFlowResult = {
  flow: RuntimeMetaLimitTimelineEntry['flow'];
  detailJa: string;
};

export function runMetaLimitFlows(input: RuntimeMetaLimitObserveInput): MetaLimitFlowResult[] {
  const profile = buildRuntimeMetaLimitProfile(input);
  const results: MetaLimitFlowResult[] = [
    {
      flow: 'recursive_boundary_flow',
      detailJa: `depth ${profile.metaRecursionDepth} · boundary ${profile.recursionBoundaryStability}`,
    },
    {
      flow: 'observer_of_observer_chain',
      detailJa: `observer-of-observer ${profile.observerOfObserverDepth} · termination ${profile.observerTerminationConfidence}`,
    },
    {
      flow: 'monitoring_chain_expansion',
      detailJa: `expansion ${profile.monitoringChainExpansionRisk} · layers ${input.monitoringLayerCount}`,
    },
    {
      flow: 'semantic_infinite_loop',
      detailJa: `semantic infinity ${profile.semanticInfiniteLoopRisk} · self reference ${input.semanticSelfReferenceScore}`,
    },
    {
      flow: 'governance_meta_cascade',
      detailJa: `governance cascade ${profile.governanceMetaCascadeRisk} · drift ${input.governanceDrift}`,
    },
    {
      flow: 'topology_self_reference',
      detailJa: `topology self-reference ${profile.topologySelfReferenceScore}`,
    },
    {
      flow: 'boundedness_stability',
      detailJa: `finite ${profile.finiteObservationScore} · epistemic boundary ${profile.epistemicBoundaryIntegrity}`,
    },
    {
      flow: 'epistemic_boundary_integrity',
      detailJa: `integrity ${profile.epistemicBoundaryIntegrity} · epistemic ${input.epistemicStabilityScore}`,
    },
    {
      flow: 'observer_termination_confidence',
      detailJa: `termination confidence ${profile.observerTerminationConfidence}`,
    },
  ];
  for (const result of results) recordMetaLimitTimeline(result.flow, result.detailJa);
  return results;
}
