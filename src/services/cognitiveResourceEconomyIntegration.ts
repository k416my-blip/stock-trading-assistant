import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from '../types/cognitiveResourceEconomyAttentionAllocation';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyCognitiveResourceEconomyOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendEconomySnapshot,
  saveCognitiveResourceEconomyState,
} from './cognitiveResourceEconomyStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

function economyAllowsAdaptation(
  economy: CognitiveResourceEconomyAttentionAllocationBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (economy.explanationOnlyMode) return false;
  if (economy.deepReflectionSuppressed && economy.recursiveThrottleActive) return false;
  return true;
}

export async function persistCognitiveResourceEconomyCycle(
  economy: CognitiveResourceEconomyAttentionAllocationBundle,
): Promise<void> {
  await appendEconomySnapshot({
    at: economy.generatedAt,
    resourceHealthPct: economy.resourceHealthPct,
    resourceState: economy.resourceState,
    attentionEfficiencyPct: economy.attentionEfficiencyPct,
  });
  await saveCognitiveResourceEconomyState({
    version: 1,
    lastResourceState: economy.resourceState,
    lastResourceHealthPct: economy.resourceHealthPct,
    lastOrchestrationBudgetMax: economy.orchestrationBudgetMax,
    economyTimeline: economy.economyTimeline,
    refreshCount: economy.economyTimeline.length,
  });
  applyCognitiveResourceEconomyOrchestrationOverrides({
    budgetMax: economy.orchestrationBudgetMax,
    overloaded: economy.resourceState === 'RESOURCE_OVERLOADED',
    recursivePressure: economy.resourceState === 'RESOURCE_RECURSIVE_PRESSURE',
    wasteful: economy.resourceState === 'RESOURCE_WASTEFUL',
    fragmented: economy.resourceState === 'RESOURCE_FRAGMENTED',
    stressed: economy.resourceState === 'RESOURCE_STRESSED',
    deepReflectionFreeze: economy.deepReflectionSuppressed,
    recursiveThrottle: economy.recursiveThrottleActive,
    speculativeFreeze: economy.speculativeComputeClampActive,
    mobileHardClamp: economy.mobileHardClampActive,
    attentionNarrowing: economy.attentionNarrowingActive,
  });
}

export function applyCognitiveResourceEconomyToStrategy(
  strategy: StrategyExecutionBundle | null,
  economy: CognitiveResourceEconomyAttentionAllocationBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !economy) return strategy;

  const cap = Math.min(economy.attentionEfficiencyPct, 58);

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      let why = r.whyProposedJa;
      if (!economyAllowsAdaptation(economy, systemic) || economy.explanationOnlyMode) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        why = `${why} [リソース経済: 説明のみ — 深い推論抑制]`;
      } else if (economy.speculativeComputeClampActive) {
        why = `${why} [speculative compute clamp]`;
      }
      return {
        ...r,
        action,
        confidencePct: clampConfidence(r.confidencePct, cap),
        whyProposedJa: `${why} [${economy.resourceStateLabelJa}]`.slice(0, 500),
      };
    }),
  };
}

export function applyCognitiveResourceEconomyToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  economy: CognitiveResourceEconomyAttentionAllocationBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !economy) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [リソース経済: ${economy.resourceStateLabelJa} · health ${economy.resourceHealthPct}% · attention ${economy.attentionEfficiencyPct}%]`;
  if (economy.priorityRebuildActive) {
    summary = `${summary} [優先度再構築]`;
  }
  summary = summary.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [リソース経済は systemic safe mode に従属]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (economy.explanationOnlyMode || !economyAllowsAdaptation(economy, systemic)) {
    if (finalDecision === 'buy') {
      finalDecision = 'watch';
      finalDecisionLabelJa = '監視';
    } else if (finalDecision === 'reduce') {
      finalDecision = 'hold';
      finalDecisionLabelJa = '保有';
    }
  }

  return {
    ...governance,
    finalDecision,
    finalDecisionLabelJa,
    consensusScore: Math.min(governance.consensusScore, economy.attentionEfficiencyPct),
    unifiedAiSummaryJa: summary,
  };
}

export function attachCognitiveResourceEconomyToContext(
  payload: AiStrategyContextPayload,
  bundle: CognitiveResourceEconomyAttentionAllocationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, cognitiveResourceEconomyAttentionAllocation: bundle };
}

export function enrichCognitiveResourceEconomyBundleWithOrchestration(
  economy: CognitiveResourceEconomyAttentionAllocationBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): CognitiveResourceEconomyAttentionAllocationBundle {
  return {
    ...economy,
    orchestrationSaturationPct: clampPct(
      Math.max(
        economy.orchestrationSaturationPct,
        100 - (orchestration.orchestrationHealthScore ?? 50),
      ),
    ),
    mobileRuntimeStateJa: `${economy.mobileRuntimeStateJa} · orch ${orchestration.refreshLatencyMs}ms`,
  };
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
