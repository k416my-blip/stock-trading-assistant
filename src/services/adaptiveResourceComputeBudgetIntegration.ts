import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { AdaptiveResourceComputeBudgetBundle } from '../types/adaptiveResourceComputeBudget';
import type { LayerRecomputeId } from '../types/reactiveEventOrchestration';
import {
  beginResourceComputeCycle,
  shouldRunLayerWithComputeBudget,
  type ResourceScheduleContext,
} from './adaptiveResourceComputeBudgetRuntime';
import type { ScheduledIntelligenceLayerId } from '../types/adaptiveResourceComputeBudget';

const REACTIVE_TO_RESOURCE: Partial<Record<LayerRecomputeId, ScheduledIntelligenceLayerId>> = {
  data_reliability: 'data_reliability',
  macro: 'macro',
  meta: 'meta',
  strategy: 'strategy',
  reality: 'reality',
  execution: 'execution',
  self_eval: 'self_eval',
  portfolio_risk: 'portfolio_risk',
  capital: 'capital',
  stability: 'stability',
  governance: 'governance',
  proactive_queue: 'proactive_queue',
};

export function attachAdaptiveResourceToContext(
  payload: AiStrategyContextPayload,
  bundle: AdaptiveResourceComputeBudgetBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    adaptiveResourceComputeBudget: bundle,
  };
}

export function mapReactiveLayerToResource(layer: LayerRecomputeId): ScheduledIntelligenceLayerId | null {
  return REACTIVE_TO_RESOURCE[layer] ?? null;
}

/** Combine reactive selective recompute with compute budget scheduler */
export function shouldRecomputeLayerWithBudget(
  layer: LayerRecomputeId,
  reactiveAllows: boolean,
  scheduleCtx: ResourceScheduleContext,
): boolean {
  if (!reactiveAllows) return false;
  const mapped = mapReactiveLayerToResource(layer);
  if (!mapped) return reactiveAllows;
  return shouldRunLayerWithComputeBudget(mapped, scheduleCtx);
}

export function startResourceComputeCycle(): void {
  beginResourceComputeCycle();
}

export function buildResourceScheduleContext(
  bundle: AdaptiveResourceComputeBudgetBundle | null,
  overrides: Partial<ResourceScheduleContext> = {},
): ResourceScheduleContext {
  return {
    batterySaver: overrides.batterySaver ?? false,
    appForeground: overrides.appForeground ?? true,
    memoryPressure: overrides.memoryPressure ?? false,
    offlineMode: overrides.offlineMode ?? false,
    emergencyComputeCut: bundle?.emergencyComputeCut ?? false,
    aiSleepMode: bundle?.aiSleepMode ?? false,
    proactiveQueueSize: overrides.proactiveQueueSize ?? 0,
  };
}
