import type {
  RuntimeFederationObserveInput,
  RuntimeFederationTimelineEntry,
} from '../types/runtimeFederationGovernance';
import { buildRuntimeFederationProfile } from './federationScorers';
import { recordFederationTimeline } from './federationTimeline';

export type FederationFlowResult = {
  flow: RuntimeFederationTimelineEntry['flow'];
  detailJa: string;
};

export function runFederationFlows(input: RuntimeFederationObserveInput): FederationFlowResult[] {
  const profile = buildRuntimeFederationProfile(input);
  const results: FederationFlowResult[] = [
    {
      flow: 'federation_governance_flow',
      detailJa: `complexity ${profile.stackFederationComplexity} · integrity ${profile.federationIntegrityScore}`,
    },
    {
      flow: 'cross_layer_causal_trace',
      detailJa: `topology → cognition → telemetry → governance · coupling ${profile.crossLayerCouplingRisk}`,
    },
    {
      flow: 'metric_redundancy_analysis',
      detailJa: `explosion ${profile.metricExplosionRisk} · redundancy ${profile.semanticMetricRedundancy}`,
    },
    {
      flow: 'observer_dependency_topology',
      detailJa: `dependencies ${input.observerDependencyCount} · drift ${profile.observerFederationDrift}`,
    },
    {
      flow: 'telemetry_federation_graph',
      detailJa: `compression ${profile.federationCompressionRatio} · samples ${input.telemetrySampleCount}`,
    },
    {
      flow: 'dashboard_saturation_origin',
      detailJa: `dashboard pressure ${profile.dashboardSaturationPressure} · rows ${input.dashboardRowCount}`,
    },
    {
      flow: 'semantic_drift_propagation',
      detailJa: `recursive overlap ${profile.recursiveLayerOverlap} · semantic redundancy ${profile.semanticMetricRedundancy}`,
    },
    {
      flow: 'federation_integrity_record',
      detailJa: 'federation grouping and compression hints recorded (observe-only)',
    },
  ];
  for (const result of results) recordFederationTimeline(result.flow, result.detailJa);
  return results;
}
