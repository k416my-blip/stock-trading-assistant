import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from '../types/selfEvolvingArchitectureReflectiveRefactor';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applySelfArchitectureOrchestrationReview } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendArchitectureSnapshot,
  saveSelfArchitectureState,
} from './selfArchitectureAuditStorage';

/** Proposal-only — never mutates strategy actions or confidence. */
export function applySelfArchitectureToStrategy(
  strategy: StrategyExecutionBundle | null,
  arch: SelfEvolvingArchitectureReflectiveRefactorBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !arch || arch.optimizationProposals.length === 0) return strategy;
  const proposalNote = arch.optimizationProposals
    .slice(0, 2)
    .map((p) => p.labelJa)
    .join(' · ');
  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => ({
      ...r,
      whyProposedJa: `${r.whyProposedJa} [構造提案のみ: ${proposalNote}]`.slice(0, 500),
    })),
  };
}

/** Append audit summary only — no decision override. */
export function applySelfArchitectureToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  arch: SelfEvolvingArchitectureReflectiveRefactorBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !arch) return governance;

  const proposalSummary =
    arch.optimizationProposals.length > 0
      ? arch.optimizationProposals.map((p) => p.labelJa).join(' / ')
      : '提案なし';
  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [構造監査: ${arch.structureStateLabelJa} · health ${arch.architectureHealthPct}% · ${proposalSummary}]`;
  summary = `${summary} ${arch.governanceApprovalStateJa}. 自動リファクタ禁止。`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [構造監査は systemic safe mode に従属]`;
  }

  return {
    ...governance,
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export async function persistSelfArchitectureCycle(
  arch: SelfEvolvingArchitectureReflectiveRefactorBundle,
): Promise<void> {
  await appendArchitectureSnapshot(
    {
      at: arch.generatedAt,
      architectureHealthPct: arch.architectureHealthPct,
      structureState: arch.structureState,
      redundancyPct: arch.redundancyPct,
      recursiveInflationPct: arch.recursiveInflationPct,
    },
    arch.optimizationProposals.length,
  );
  await saveSelfArchitectureState({
    version: 1,
    lastStructureState: arch.structureState,
    lastArchitectureHealthPct: arch.architectureHealthPct,
    lastOrchestrationBudgetMax: arch.orchestrationBudgetMax,
    architectureTimeline: arch.architectureTimeline,
    pendingProposalCount: arch.optimizationProposals.length,
    refreshCount: arch.architectureTimeline.length,
  });
  applySelfArchitectureOrchestrationReview({
    budgetMax: arch.orchestrationBudgetMax,
    recursiveRisk: arch.structureState === 'ARCH_RECURSIVE_RISK',
    mobilePressure: arch.structureState === 'ARCH_MOBILE_PRESSURE',
    unsupportedStructure: arch.structureState === 'ARCH_UNSUPPORTED_STRUCTURE',
    overexpanded: arch.structureState === 'ARCH_OVEREXPANDED',
    proposalOnly: true,
  });
}

export function attachSelfArchitectureToContext(
  payload: AiStrategyContextPayload,
  bundle: SelfEvolvingArchitectureReflectiveRefactorBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, selfEvolvingArchitectureReflectiveRefactor: bundle };
}

export function enrichSelfArchitectureBundleWithOrchestration(
  arch: SelfEvolvingArchitectureReflectiveRefactorBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): SelfEvolvingArchitectureReflectiveRefactorBundle {
  return {
    ...arch,
    orchestrationReviewJa: `${arch.orchestrationReviewJa} · latency ${orchestration.refreshLatencyMs}ms · skipped ${orchestration.skippedLayerCount}`,
    latencyPenaltyPct: Math.min(
      100,
      arch.latencyPenaltyPct + Math.round(orchestration.refreshLatencyMs / 50),
    ),
  };
}
