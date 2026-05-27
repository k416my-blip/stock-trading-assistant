import type {
  RuntimeInterCivilizationObserveInput,
  RuntimeInterCivilizationTimelineEntry,
} from '../types/runtimeInterCivilizationResonance';
import { buildRuntimeInterCivilizationProfile } from './interCivilizationScorers';
import { recordInterCivilizationTimeline } from './interCivilizationTimeline';

export type InterCivilizationFlowResult = {
  flow: RuntimeInterCivilizationTimelineEntry['flow'];
  detailJa: string;
};

export function runInterCivilizationFlows(
  input: RuntimeInterCivilizationObserveInput,
): InterCivilizationFlowResult[] {
  const profile = buildRuntimeInterCivilizationProfile(input);
  const results: InterCivilizationFlowResult[] = [
    {
      flow: 'civilization_resonance',
      detailJa: `resonance ${profile.interCivilizationResonance} · cascade ${profile.semanticResonanceCascadeRisk}`,
    },
    {
      flow: 'ontology_collision',
      detailJa: `collision ${profile.ontologyCollisionDensity} · conflict ${profile.semanticConflictPressure}`,
    },
    {
      flow: 'civilization_divergence',
      detailJa: `drift ${profile.civilizationDriftVelocity} · separation ${profile.worldviewSeparationPressure}`,
    },
    {
      flow: 'observer_interference',
      detailJa: `interference ${profile.observerInterferenceRisk} · sync collapse ${profile.observerSynchronizationCollapse}`,
    },
    {
      flow: 'plurality_stability',
      detailJa: 'plurality stability logged only; no merge, harmonization, arbitration, alignment, or intervention',
    },
  ];
  for (const result of results) recordInterCivilizationTimeline(result.flow, result.detailJa);
  return results;
}
