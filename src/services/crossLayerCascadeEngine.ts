/**
 * Cross-Layer Cascade Suppression & Stability Guard — prevents orchestration/explanation/render storms.
 */
import {
  CASCADE_BUILDING_PRESSURE,
  CASCADE_CRITICAL_PRESSURE,
  CASCADE_FRAGMENTING_PRESSURE,
  CASCADE_STATE_LABELS_JA,
  CASCADE_WINDOW_MS,
} from '../constants/crossLayerCascade';
import type {
  CascadeState,
  CascadeSuppressionActions,
  CrossLayerCascadeEvaluation,
  CrossLayerCascadeMetrics,
  EvaluateCrossLayerCascadeInput,
} from '../types/crossLayerCascade';
import type { LayerRuntimeActions, LayerRuntimeSchedulePlan } from '../types/layerRuntimeScheduler';
import { getBlockedTriggers, getTriggerCountInWindow } from './crossLayerTriggerBudget';
import { getExplanationStormRiskPct } from './explanationStormGuard';
import { applyLongSessionStabilityActions, getSessionMinutes, markSessionStart } from './longSessionStability';

type CascadeEventKind =
  | 'orchestration_rebuild'
  | 'explanation_regeneration'
  | 'freeze_recovery'
  | 'contradiction_repair'
  | 'confidence_recalibration'
  | 'dashboard_render';

const eventLog: { kind: CascadeEventKind; at: number }[] = [];
let recursiveOrchestrationDepth = 0;
let lastEvaluation: CrossLayerCascadeEvaluation | null = null;

export function resetCrossLayerCascadeEngineForTest(): void {
  eventLog.length = 0;
  recursiveOrchestrationDepth = 0;
  lastEvaluation = null;
  markSessionStart();
}

function pruneEvents(now: number): void {
  while (eventLog.length > 0 && now - eventLog[0].at > CASCADE_WINDOW_MS) {
    eventLog.shift();
  }
}

function countEvents(kind: CascadeEventKind, now: number): number {
  pruneEvents(now);
  return eventLog.filter((e) => e.kind === kind).length;
}

export function noteCascadeOrchestrationRebuild(): void {
  eventLog.push({ kind: 'orchestration_rebuild', at: Date.now() });
  recursiveOrchestrationDepth = Math.min(12, recursiveOrchestrationDepth + 1);
}

export function noteCascadeExplanationRegeneration(): void {
  eventLog.push({ kind: 'explanation_regeneration', at: Date.now() });
}

export function noteCascadeFreezeRecovery(): void {
  eventLog.push({ kind: 'freeze_recovery', at: Date.now() });
}

export function noteCascadeContradictionRepair(): void {
  eventLog.push({ kind: 'contradiction_repair', at: Date.now() });
}

export function noteCascadeConfidenceRecalibration(): void {
  eventLog.push({ kind: 'confidence_recalibration', at: Date.now() });
}

export function noteCascadeDashboardRender(): void {
  eventLog.push({ kind: 'dashboard_render', at: Date.now() });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function classifyState(pressure: number): CascadeState {
  if (pressure >= CASCADE_CRITICAL_PRESSURE) return 'CASCADE_CRITICAL';
  if (pressure >= CASCADE_FRAGMENTING_PRESSURE) return 'CASCADE_FRAGMENTING';
  if (pressure >= CASCADE_BUILDING_PRESSURE) return 'CASCADE_BUILDING';
  return 'CASCADE_STABLE';
}

function buildSuppressionActions(state: CascadeState): CascadeSuppressionActions {
  const stable: CascadeSuppressionActions = {
    explanationThrottling: false,
    dashboardRefreshIntervalIncrease: false,
    orchestrationDebounce: false,
    epistemicTemporaryFreeze: false,
    adaptiveExplorationPause: false,
    explanationReuseCache: false,
    rerenderSuppression: false,
    deepOrchestrationHardFreeze: false,
    strategicMemoryPause: false,
    websocketLightweightMode: false,
    fallbackExplanationMode: false,
    minimalDashboardRendering: false,
    longSessionLightweightFallback: false,
    memoryGraphPruning: false,
    explanationCacheCompaction: false,
    websocketIdleDowngrade: false,
    orchestrationSimplification: false,
  };

  if (state === 'CASCADE_BUILDING') {
    return {
      ...stable,
      explanationThrottling: true,
      dashboardRefreshIntervalIncrease: true,
      orchestrationDebounce: true,
      explanationReuseCache: true,
    };
  }

  if (state === 'CASCADE_FRAGMENTING') {
    return {
      ...stable,
      explanationThrottling: true,
      dashboardRefreshIntervalIncrease: true,
      orchestrationDebounce: true,
      epistemicTemporaryFreeze: true,
      adaptiveExplorationPause: true,
      explanationReuseCache: true,
      rerenderSuppression: true,
    };
  }

  if (state === 'CASCADE_CRITICAL') {
    return {
      ...stable,
      explanationThrottling: true,
      dashboardRefreshIntervalIncrease: true,
      orchestrationDebounce: true,
      epistemicTemporaryFreeze: true,
      adaptiveExplorationPause: true,
      explanationReuseCache: true,
      rerenderSuppression: true,
      deepOrchestrationHardFreeze: true,
      strategicMemoryPause: true,
      websocketLightweightMode: true,
      fallbackExplanationMode: true,
      minimalDashboardRendering: true,
      orchestrationSimplification: true,
      websocketIdleDowngrade: true,
    };
  }

  return stable;
}

export function evaluateCrossLayerCascade(
  input: EvaluateCrossLayerCascadeInput,
): CrossLayerCascadeEvaluation {
  const now = Date.now();
  pruneEvents(now);

  const orchRebuilds = countEvents('orchestration_rebuild', now);
  const explanationRebuilds = countEvents('explanation_regeneration', now);
  const freezeLoops = countEvents('freeze_recovery', now);
  const contradictionRepairs = countEvents('contradiction_repair', now);
  const confidenceLoops = countEvents('confidence_recalibration', now);
  const renderBursts = countEvents('dashboard_render', now);

  const explanationStormRisk = getExplanationStormRiskPct();
  const fanout =
    orchRebuilds +
    explanationRebuilds +
    freezeLoops +
    contradictionRepairs +
    Math.min(8, confidenceLoops);

  const cascadePressure = clamp(
    orchRebuilds * 9 +
      explanationRebuilds * 7 +
      freezeLoops * 8 +
      contradictionRepairs * 6 +
      confidenceLoops * 4 +
      input.renderBurstRate * 3 +
      (input.memoryPressure ? 12 : 0) +
      (input.contradictionActive ? 10 : 0) +
      explanationStormRisk * 0.25,
  );

  const state = classifyState(cascadePressure);
  const metrics: CrossLayerCascadeMetrics = {
    cascadePressure,
    recursiveOrchestrationDepth,
    explanationRebuildRate: explanationRebuilds,
    freezeRecoveryLoopRate: freezeLoops,
    crossLayerTriggerFanout: fanout,
    orchestrationFanout: orchRebuilds + getTriggerCountInWindow('orchestration_rebuild'),
    reasoningLoopRisk: clamp(confidenceLoops * 10 + freezeLoops * 8 + recursiveOrchestrationDepth * 6),
    renderCascadeRisk: clamp(renderBursts * 8 + input.renderBurstRate * 5),
    explanationStormRisk,
    crossLayerHealth: clamp(100 - cascadePressure * 0.85),
    cascadeState: state,
    sessionMinutes: getSessionMinutes(now),
    measuredAt: new Date(now).toISOString(),
  };

  let actions = buildSuppressionActions(state);
  actions = applyLongSessionStabilityActions(actions);

  const evaluation: CrossLayerCascadeEvaluation = {
    state,
    stateLabelJa: CASCADE_STATE_LABELS_JA[state],
    metrics,
    actions,
    summaryJa: [
      CASCADE_STATE_LABELS_JA[state],
      `pressure ${cascadePressure}% · fanout ${fanout}`,
      `session ${metrics.sessionMinutes.toFixed(0)}m`,
    ].join(' · '),
    triggerBudgetBlocked: getBlockedTriggers(),
  };

  lastEvaluation = evaluation;
  if (state === 'CASCADE_STABLE' && recursiveOrchestrationDepth > 0) {
    recursiveOrchestrationDepth = Math.max(0, recursiveOrchestrationDepth - 1);
  }

  return evaluation;
}

export function getLastCrossLayerCascadeEvaluation(): CrossLayerCascadeEvaluation | null {
  return lastEvaluation;
}

export function mergeCascadeIntoLayerPlan(
  plan: LayerRuntimeSchedulePlan,
  cascade: CrossLayerCascadeEvaluation,
): LayerRuntimeSchedulePlan {
  const a = cascade.actions;
  const mergedActions: LayerRuntimeActions = {
    ...plan.actions,
    deepOrchestrationFreeze:
      plan.actions.deepOrchestrationFreeze || a.deepOrchestrationHardFreeze,
    memoryGraphPause: plan.actions.memoryGraphPause || a.strategicMemoryPause || a.memoryGraphPruning,
    adaptiveExplorationPause:
      plan.actions.adaptiveExplorationPause || a.adaptiveExplorationPause,
    uiUpdateThrottle: plan.actions.uiUpdateThrottle || a.rerenderSuppression,
    dashboardMinimalRender:
      plan.actions.dashboardMinimalRender || a.minimalDashboardRendering,
    explanationSimplification:
      plan.actions.explanationSimplification || a.explanationThrottling || a.fallbackExplanationMode,
    deepReasoningFreeze:
      plan.actions.deepReasoningFreeze || a.epistemicTemporaryFreeze || a.deepOrchestrationHardFreeze,
    websocketPollingSlowdown:
      plan.actions.websocketPollingSlowdown || a.websocketLightweightMode || a.websocketIdleDowngrade,
  };

  const layers = { ...plan.layers };
  if (a.epistemicTemporaryFreeze || a.deepOrchestrationHardFreeze) {
    layers.epistemicIntegrity = false;
  }
  if (a.strategicMemoryPause || a.memoryGraphPruning) {
    layers.strategicMemoryGraph = false;
  }
  if (a.adaptiveExplorationPause) {
    layers.adaptiveExploration = false;
  }

  return {
    ...plan,
    layers,
    actions: mergedActions,
    summaryJa: [plan.summaryJa, cascade.summaryJa].join(' · '),
  };
}

export function shouldDeferOrchestrationRebuild(cascade: CrossLayerCascadeEvaluation | null): boolean {
  if (!cascade) return false;
  return (
    cascade.actions.orchestrationDebounce ||
    cascade.actions.deepOrchestrationHardFreeze ||
    cascade.triggerBudgetBlocked.includes('orchestration_rebuild')
  );
}

export function shouldSkipDeepLayerForCascade(
  layer: 'epistemicIntegrity' | 'strategicMemoryGraph' | 'adaptiveExploration',
  cascade: CrossLayerCascadeEvaluation | null,
): boolean {
  if (!cascade) return false;
  if (layer === 'epistemicIntegrity') return cascade.actions.epistemicTemporaryFreeze;
  if (layer === 'strategicMemoryGraph') return cascade.actions.strategicMemoryPause;
  if (layer === 'adaptiveExploration') return cascade.actions.adaptiveExplorationPause;
  return false;
}
