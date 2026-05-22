import { useMemo } from 'react';
import { useProactiveConciergeOptional } from '../context/ProactiveConciergeContext';

/** Narrow subscriptions — reduces dashboard rerenders when unrelated bundles change. */
export function useUnifiedCognitiveDashboardBundle() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.unifiedCognitiveStateExecutiveAwarenessBundle ?? null,
    [ctx?.unifiedCognitiveStateExecutiveAwarenessBundle],
  );
}

export function useStrategicMemoryDashboardBundle() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.strategicMemoryGraphTemporalCausalityBundle ?? null,
    [ctx?.strategicMemoryGraphTemporalCausalityBundle],
  );
}

export function useRuntimeSurvivalDashboardBundle() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.runtimeSurvivalMobileResilienceBundle ?? null,
    [ctx?.runtimeSurvivalMobileResilienceBundle],
  );
}

export function useLayerRuntimeSchedulePlan() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(() => ctx?.layerRuntimeSchedulePlan ?? null, [ctx?.layerRuntimeSchedulePlan]);
}

export function useExplainableGovernanceDashboardBundle() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.explainableGovernanceTransparentReasoningBundle ?? null,
    [ctx?.explainableGovernanceTransparentReasoningBundle],
  );
}

export function useCrossLayerCascadeEvaluation() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.crossLayerCascadeEvaluation ?? null,
    [ctx?.crossLayerCascadeEvaluation],
  );
}

export function useAsyncRuntimeEvaluation() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(() => ctx?.asyncRuntimeEvaluation ?? null, [ctx?.asyncRuntimeEvaluation]);
}

export function useRuntimeTelemetryDashboardBundle() {
  const ctx = useProactiveConciergeOptional();
  return useMemo(
    () => ctx?.runtimeTelemetryDashboardBundle ?? null,
    [ctx?.runtimeTelemetryDashboardBundle],
  );
}
