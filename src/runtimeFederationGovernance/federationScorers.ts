import type {
  RuntimeFederationObserveInput,
  RuntimeFederationProfile,
} from '../types/runtimeFederationGovernance';

const round = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;

export function resetFederationScorersForTest(): void {
  /* stateless */
}

export function scoreStackFederationComplexity(input: RuntimeFederationObserveInput): number {
  return round(
    Math.min(1, input.stackCount / 18) * 0.3 +
      Math.min(1, input.layerCount / 32) * 0.25 +
      input.topologyComplexity * 0.25 +
      input.metaRecursionDepth * 0.2,
  );
}

export function scoreCrossLayerCouplingRisk(input: RuntimeFederationObserveInput): number {
  return round(
    input.topologyComplexity * 0.3 +
      input.cognitionLoad * 0.25 +
      input.telemetryEntropy * 0.25 +
      Math.min(1, input.observerDependencyCount / 36) * 0.2,
  );
}

export function scoreMetricExplosionRisk(input: RuntimeFederationObserveInput): number {
  return round(
    Math.min(1, input.metricCount / 260) * 0.4 +
      input.duplicateMetricRatio * 0.3 +
      input.semanticRedundancyRatio * 0.3,
  );
}

export function scoreDashboardSaturationPressure(input: RuntimeFederationObserveInput): number {
  return round(Math.min(1, input.dashboardRowCount / 80) * 0.6 + Math.min(1, input.telemetrySampleCount / 180) * 0.4);
}

export function scoreFederationCompressionRatio(input: RuntimeFederationObserveInput): number {
  return round(
    input.compressionRatio * 0.45 +
      (1 - input.duplicateMetricRatio) * 0.25 +
      (1 - input.semanticRedundancyRatio) * 0.2 +
      input.finiteObservationScore * 0.1,
  );
}

export function scoreObserverFederationDrift(input: RuntimeFederationObserveInput): number {
  return round(input.observerDriftScore * 0.5 + Math.min(1, input.observerDependencyCount / 32) * 0.3 + input.metaRecursionDepth * 0.2);
}

export function scoreGovernanceCoordinationStability(input: RuntimeFederationObserveInput): number {
  return round(
    input.governanceStabilityScore * 0.45 +
      (1 - Math.min(1, input.governanceLayerCount / 14)) * 0.25 +
      scoreFederationCompressionRatio(input) * 0.3,
  );
}

export function scoreRecursiveLayerOverlap(input: RuntimeFederationObserveInput): number {
  return round(input.metaRecursionDepth * 0.35 + input.duplicateMetricRatio * 0.3 + input.semanticRedundancyRatio * 0.2 + input.telemetryEntropy * 0.15);
}

export function scoreSemanticMetricRedundancy(input: RuntimeFederationObserveInput): number {
  return round(input.semanticRedundancyRatio * 0.55 + input.duplicateMetricRatio * 0.3 + input.cognitionLoad * 0.15);
}

export function scoreFederationIntegrity(input: RuntimeFederationObserveInput): number {
  return round(
    scoreFederationCompressionRatio(input) * 0.28 +
      scoreGovernanceCoordinationStability(input) * 0.28 +
      input.finiteObservationScore * 0.24 +
      (1 - scoreCrossLayerCouplingRisk(input)) * 0.2,
  );
}

export function buildRuntimeFederationProfile(input: RuntimeFederationObserveInput): RuntimeFederationProfile {
  return {
    stackFederationComplexity: scoreStackFederationComplexity(input),
    crossLayerCouplingRisk: scoreCrossLayerCouplingRisk(input),
    metricExplosionRisk: scoreMetricExplosionRisk(input),
    dashboardSaturationPressure: scoreDashboardSaturationPressure(input),
    federationCompressionRatio: scoreFederationCompressionRatio(input),
    observerFederationDrift: scoreObserverFederationDrift(input),
    governanceCoordinationStability: scoreGovernanceCoordinationStability(input),
    recursiveLayerOverlap: scoreRecursiveLayerOverlap(input),
    semanticMetricRedundancy: scoreSemanticMetricRedundancy(input),
    federationIntegrityScore: scoreFederationIntegrity(input),
    measuredAt: new Date().toISOString(),
  };
}
