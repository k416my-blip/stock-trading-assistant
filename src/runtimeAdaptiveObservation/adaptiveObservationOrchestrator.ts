import type {
  RuntimeAdaptiveObservationObserveInput,
  RuntimeAdaptiveObservationTimelineEntry,
} from '../types/runtimeAdaptiveObservation';
import { buildRuntimeAdaptiveObservationProfile } from './adaptiveObservationScorers';
import { recordAdaptiveObservationTimeline } from './adaptiveObservationTimeline';

export type AdaptiveObservationFlowResult = {
  flow: RuntimeAdaptiveObservationTimelineEntry['flow'];
  detailJa: string;
};

export function runAdaptiveObservationFlows(
  input: RuntimeAdaptiveObservationObserveInput,
): AdaptiveObservationFlowResult[] {
  const profile = buildRuntimeAdaptiveObservationProfile(input);
  const results: AdaptiveObservationFlowResult[] = [
    {
      flow: 'observation_load',
      detailJa: `observer load ${profile.observerAttentionLoad} · runtime pressure ${profile.runtimeObservationPressure}`,
    },
    {
      flow: 'adaptive_routing',
      detailJa: `routing complexity ${profile.observationRoutingComplexity} · focus drift ${profile.observerFocusDrift}`,
    },
    {
      flow: 'telemetry_saturation',
      detailJa: `flood ${profile.telemetryFloodRisk} · overflow ${profile.dashboardSignalOverflow}`,
    },
    {
      flow: 'semantic_load_shedding',
      detailJa: `shedding pressure ${profile.semanticLoadSheddingPressure} · no runtime shedding executed`,
    },
    {
      flow: 'observer_suggestion',
      detailJa: 'suggestion/logging only; no routing rewrite, pruning, suppression, deletion, or load balancing',
    },
  ];
  for (const result of results) recordAdaptiveObservationTimeline(result.flow, result.detailJa);
  return results;
}
