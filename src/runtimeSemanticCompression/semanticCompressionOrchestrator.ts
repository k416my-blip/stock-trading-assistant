import type {
  RuntimeSemanticCompressionObserveInput,
  RuntimeSemanticCompressionTimelineEntry,
} from '../types/runtimeSemanticCompression';
import { buildRuntimeSemanticCompressionProfile } from './semanticCompressionScorers';
import { recordSemanticCompressionTimeline } from './semanticCompressionTimeline';

export type SemanticCompressionFlowResult = {
  flow: RuntimeSemanticCompressionTimelineEntry['flow'];
  detailJa: string;
};

export function runSemanticCompressionFlows(
  input: RuntimeSemanticCompressionObserveInput,
): SemanticCompressionFlowResult[] {
  const profile = buildRuntimeSemanticCompressionProfile(input);
  const results: SemanticCompressionFlowResult[] = [
    {
      flow: 'semantic_aliasing',
      detailJa: `aliases ${profile.semanticAliasClusterCount} · overlap ${profile.crossLayerSemanticOverlap}`,
    },
    {
      flow: 'canonical_metric_pressure',
      detailJa: `pressure ${profile.metricCanonicalizationPressure} · confidence ${profile.canonicalMetricConfidence}`,
    },
    {
      flow: 'metric_family_topology',
      detailJa: `duplicate density ${profile.duplicateMeaningDensity} · integrity ${profile.semanticClusterIntegrity}`,
    },
    {
      flow: 'dashboard_semantic_overload',
      detailJa: `crowding ${profile.dashboardSemanticCrowding} · fatigue ${profile.operatorSemanticFatigue}`,
    },
    {
      flow: 'observer_dependency_deadlock',
      detailJa: `loop ${profile.observerDependencyLoopRisk} · deadlock ${profile.canonicalizationDeadlockRisk}`,
    },
    {
      flow: 'ontology_compression',
      detailJa: `ratio ${profile.ontologyCompressionRatio} · stress ${profile.canonicalOntologyStress}`,
    },
    {
      flow: 'semantic_density',
      detailJa: `vocabulary entropy ${profile.metricVocabularyEntropy} · identity instability ${profile.metricIdentityInstability}`,
    },
    {
      flow: 'compression_suggestions',
      detailJa: 'canonicalization suggestions recorded only; no merge/delete/rewrite',
    },
  ];
  for (const result of results) recordSemanticCompressionTimeline(result.flow, result.detailJa);
  return results;
}
