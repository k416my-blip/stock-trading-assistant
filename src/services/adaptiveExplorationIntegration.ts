import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { AdaptiveExplorationAntiDogmaBundle } from '../types/adaptiveExplorationAntiDogma';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyAdaptiveExplorationOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendExplorationSnapshot,
  saveAdaptiveExplorationState,
} from './adaptiveExplorationStorage';

export async function persistAdaptiveExplorationCycle(
  exploration: AdaptiveExplorationAntiDogmaBundle,
): Promise<void> {
  const repetitionRow = exploration.auditTargets.find((a) => a.id === 'explanationRepetition');
  const repetitionScorePct = repetitionRow ? clampRepetition(100 - repetitionRow.scorePct) : 25;
  await appendExplorationSnapshot(
    {
      at: exploration.generatedAt,
      explorationHealthPct: exploration.explorationHealthPct,
      explorationState: exploration.explorationState,
      safeExplorationMarginPct: exploration.safeExplorationMarginPct,
    },
    repetitionScorePct,
  );
  await saveAdaptiveExplorationState({
    version: 1,
    lastExplorationState: exploration.explorationState,
    lastExplorationHealthPct: exploration.explorationHealthPct,
    lastOrchestrationBudgetMax: exploration.orchestrationBudgetMax,
    explorationTimeline: exploration.explorationTimeline,
    repetitionScorePct,
    refreshCount: exploration.explorationTimeline.length,
  });
  applyAdaptiveExplorationOrchestrationOverrides({
    budgetMax: exploration.orchestrationBudgetMax,
    rigid: exploration.explorationState === 'EXPLORATION_RIGID',
    stagnant: exploration.explorationState === 'EXPLORATION_STAGNANT',
    overclamped: exploration.explorationState === 'EXPLORATION_OVERCLAMPED',
    uncertain: exploration.explorationState === 'EXPLORATION_UNCERTAIN',
    unsupported: exploration.explorationState === 'EXPLORATION_UNSUPPORTED',
    perspectiveWidening: exploration.perspectiveWideningActive,
    safeAlternativeGeneration: exploration.safeAlternativeGenerationActive,
    clampRelaxationSuggestion: exploration.clampRelaxationSuggestionActive,
    uncertaintyAcknowledgment: exploration.uncertaintyAcknowledgmentActive,
    explanationOnly: exploration.explanationOnlyMode,
    fallbackFreeze: exploration.fallbackFreezeActive,
  });
}

/** Exploration layer does not change strategy — anti-dogma audit only. */
export function applyAdaptiveExplorationToStrategy(
  strategy: StrategyExecutionBundle | null,
  _exploration: AdaptiveExplorationAntiDogmaBundle | null,
  _systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  return strategy;
}

export function applyAdaptiveExplorationToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  exploration: AdaptiveExplorationAntiDogmaBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !exploration) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Exploration: ${exploration.explorationStateLabelJa} · health ${exploration.explorationHealthPct}% · dogma ${exploration.dogmaPressurePct}%]`;
  if (exploration.perspectiveWideningActive) {
    summary = `${summary} [視点拡張・制御のみ]`;
  }
  if (exploration.explanationOnlyMode) {
    summary = `${summary} [探索未支持 — fallback freeze]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Explorationは systemic safe mode に従属 — governance最優先]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary,
  };
}

export function attachAdaptiveExplorationToContext(
  payload: AiStrategyContextPayload,
  bundle: AdaptiveExplorationAntiDogmaBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, adaptiveExplorationAntiDogma: bundle };
}

function clampRepetition(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function enrichAdaptiveExplorationBundleWithOrchestration(
  exploration: AdaptiveExplorationAntiDogmaBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): AdaptiveExplorationAntiDogmaBundle {
  const fixation = 100 - (orchestration.orchestrationHealthScore ?? 50);
  const strategyRigidityPct = Math.min(
    100,
    Math.round(exploration.strategyRigidityPct + fixation * 0.08),
  );
  return {
    ...exploration,
    strategyRigidityPct,
    mobileRuntimeStateJa: `${exploration.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}
