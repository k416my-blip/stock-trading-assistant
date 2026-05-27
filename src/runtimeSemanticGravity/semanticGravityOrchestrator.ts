import type {
  RuntimeSemanticGravityObserveInput,
  RuntimeSemanticGravityTimelineEntry,
} from '../types/runtimeSemanticGravity';
import { buildRuntimeSemanticGravityProfile } from './semanticGravityScorers';
import { recordSemanticGravityTimeline } from './semanticGravityTimeline';

export type SemanticGravityFlowResult = {
  flow: RuntimeSemanticGravityTimelineEntry['flow'];
  detailJa: string;
};

export function runSemanticGravityFlows(input: RuntimeSemanticGravityObserveInput): SemanticGravityFlowResult[] {
  const profile = buildRuntimeSemanticGravityProfile(input);
  const results: SemanticGravityFlowResult[] = [
    {
      flow: 'semantic_gravity',
      detailJa: `mass ${profile.semanticGravityMass} · singularity ${profile.semanticSingularityRisk}`,
    },
    {
      flow: 'anchor_divergence',
      detailJa: `anchor divergence ${profile.semanticAnchorDivergence} · orbit ${profile.semanticOrbitInstability}`,
    },
    {
      flow: 'ontology_centralization',
      detailJa: `truth pressure ${profile.canonicalTruthPressure} · authority ${profile.ontologyAuthorityConcentration}`,
    },
    {
      flow: 'semantic_religionization',
      detailJa: `dogma ${profile.canonicalDogmatizationRisk} · orthodoxy ${profile.semanticOrthodoxyPressure}`,
    },
    {
      flow: 'semantic_equilibrium',
      detailJa: `equilibrium ${profile.semanticEquilibriumScore} · plurality ${profile.ontologyPluralityIntegrity}`,
    },
    {
      flow: 'observer_belief_clustering',
      detailJa: `consensus ${profile.observerConsensusGravity} · doctrine ${profile.observerDoctrineFormation}`,
    },
    {
      flow: 'plurality_retention',
      detailJa: 'plurality observations recorded only; no forced balancing/convergence',
    },
  ];
  for (const result of results) recordSemanticGravityTimeline(result.flow, result.detailJa);
  return results;
}
