import type {
  RuntimeOntologyObserveInput,
  RuntimeOntologyTimelineEntry,
} from '../types/runtimeOntologyStabilization';
import { buildRuntimeOntologyProfile } from './ontologyScorers';
import { recordOntologyTimeline } from './ontologyTimeline';

export type OntologyFlowResult = {
  flow: RuntimeOntologyTimelineEntry['flow'];
  detailJa: string;
};

export function runOntologyFlows(input: RuntimeOntologyObserveInput): OntologyFlowResult[] {
  const profile = buildRuntimeOntologyProfile(input);
  const results: OntologyFlowResult[] = [
    {
      flow: 'ontology_stability_flow',
      detailJa: `anchor ${profile.runtimeRealityAnchorScore} · drift ${profile.semanticOntologyDrift}`,
    },
    {
      flow: 'semantic_grounding',
      detailJa: `grounding ${profile.semanticGroundingStrength} · density ${profile.symbolicAnchorDensity}`,
    },
    {
      flow: 'reality_anchor_trace',
      detailJa: `integrity ${profile.semanticAnchorIntegrity} · reality distance ${profile.narrativeRealityDistance}`,
    },
    {
      flow: 'observer_reference_chain',
      detailJa: `reference integrity ${profile.referenceChainIntegrity} · observer reality ${profile.observerGeneratedRealityRisk}`,
    },
    {
      flow: 'narrative_reality_divergence',
      detailJa: `distance ${profile.narrativeRealityDistance} · persistence ${profile.replayMeaningPersistence}`,
    },
    {
      flow: 'ontology_recursion',
      detailJa: `recursive depth ${profile.recursiveOntologyDepth} · universe isolation ${profile.semanticUniverseIsolationRisk}`,
    },
    {
      flow: 'symbolic_drift',
      detailJa: `symbolic instability ${profile.symbolicReferenceInstability} · closed loop ${profile.symbolicClosedLoopRisk}`,
    },
    {
      flow: 'semantic_persistence',
      detailJa: `half-life ${profile.semanticPersistenceHalfLife} · compression stress ${profile.ontologyCompressionStress}`,
    },
  ];
  for (const result of results) recordOntologyTimeline(result.flow, result.detailJa);
  return results;
}
