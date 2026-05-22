import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { LayerRecomputeId } from '../types/reactiveEventOrchestration';
import type { OrchestratedLayerId } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import {
  shouldHydrateOrchestrationDashboard,
  shouldRetainOrchestratedLayer,
  shouldRunOrchestratedLayer,
} from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import { shouldShowOrchestratedDashboard } from './dynamicLayerOrchestrationMobileRuntimeOptimizationEngine';

/** Combines reactive + resource + dynamic orchestration for intelligence layers */
export function orchestratedIntelligenceLayerOn(layer: LayerRecomputeId): boolean {
  return shouldRunOrchestratedLayer(layer);
}

export function orchestratedCognitiveLayerOn(layer: OrchestratedLayerId): boolean {
  return shouldRunOrchestratedLayer(layer);
}

export function shouldRetainIntelligenceLayer(layer: LayerRecomputeId): boolean {
  return shouldRetainOrchestratedLayer(layer);
}

export function shouldRetainCognitiveLayer(layer: OrchestratedLayerId): boolean {
  return shouldRetainOrchestratedLayer(layer);
}

export function attachDynamicOrchestrationToContext(
  payload: AiStrategyContextPayload,
  bundle: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    dynamicLayerOrchestrationMobileRuntimeOptimization: bundle,
  };
}

export function shouldRenderConciergeDashboard(
  layerId: OrchestratedLayerId,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null,
): boolean {
  if (!orchestration) return shouldHydrateOrchestrationDashboard(layerId);
  return shouldShowOrchestratedDashboard(layerId, orchestration);
}

/** Real order safety — orchestration never enables live trading */
export function assertOrchestrationPaperOnly(): { realTradingEnabled: false } {
  return { realTradingEnabled: false };
}
