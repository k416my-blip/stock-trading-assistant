/**
 * Adaptive Resource & Compute Budget — runtime metrics (orchestration only).
 */
import {
  LAYER_SCHEDULE_TIER,
  TIER_PRIORITY_RANK,
} from '../constants/adaptiveResourceComputeBudget';
import type {
  LayerScheduleTier,
  ScheduledIntelligenceLayerId,
} from '../types/adaptiveResourceComputeBudget';

let throttledEvents = 0;
let droppedRecomputes = 0;
let aiTickThrottles = 0;
let visibilityPaused = false;
let layersSkippedThisCycle = 0;
let renderCostAccum = 0;

export function resetResourceMetricsForTest(): void {
  throttledEvents = 0;
  droppedRecomputes = 0;
  aiTickThrottles = 0;
  visibilityPaused = false;
  layersSkippedThisCycle = 0;
  renderCostAccum = 0;
}

export function beginResourceComputeCycle(): void {
  layersSkippedThisCycle = 0;
  renderCostAccum = 0;
}

export function noteResourceEventThrottled(): void {
  throttledEvents += 1;
}

export function noteResourceRecomputeDropped(): void {
  droppedRecomputes += 1;
}

export function noteAiTickThrottled(): void {
  aiTickThrottles += 1;
}

export function setResourceVisibilityPaused(paused: boolean): void {
  visibilityPaused = paused;
}

export function noteLayerSkipped(): void {
  layersSkippedThisCycle += 1;
}

export function noteRenderCostScore(delta: number): void {
  renderCostAccum += delta;
}

export function getResourceRuntimeMetrics(): {
  throttledEvents: number;
  droppedRecomputes: number;
  aiTickThrottles: number;
  visibilityPaused: boolean;
  layersSkippedThisCycle: number;
  renderCostScore: number;
} {
  return {
    throttledEvents,
    droppedRecomputes,
    aiTickThrottles,
    visibilityPaused,
    layersSkippedThisCycle,
    renderCostScore: Math.min(100, renderCostAccum),
  };
}

export type ResourceScheduleContext = {
  batterySaver: boolean;
  appForeground: boolean;
  memoryPressure: boolean;
  offlineMode: boolean;
  emergencyComputeCut: boolean;
  aiSleepMode: boolean;
  proactiveQueueSize: number;
};

export function shouldRunLayerWithComputeBudget(
  layerId: ScheduledIntelligenceLayerId,
  ctx: ResourceScheduleContext,
): boolean {
  const tier: LayerScheduleTier = LAYER_SCHEDULE_TIER[layerId];
  const rank = TIER_PRIORITY_RANK[tier];

  if (ctx.emergencyComputeCut) return rank === 0;
  if (ctx.aiSleepMode) return rank <= 1;
  if (!ctx.appForeground && rank >= 2) {
    noteLayerSkipped();
    return false;
  }
  if (ctx.batterySaver && rank >= 3) {
    noteLayerSkipped();
    return false;
  }
  if (ctx.memoryPressure && ctx.proactiveQueueSize > 50 && rank >= 2) {
    noteLayerSkipped();
    return false;
  }
  if (ctx.offlineMode && rank >= 2) {
    noteLayerSkipped();
    return false;
  }
  return true;
}
