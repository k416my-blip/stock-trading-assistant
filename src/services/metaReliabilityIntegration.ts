import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { MetaReliabilityLongitudinalTrustBundle } from '../types/metaReliabilityLongitudinalTrust';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyAction, StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyMetaReliabilityOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendLongitudinalSnapshot,
  saveMetaReliabilityState,
} from './metaReliabilityLongitudinalTrustStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

function metaAllowsAdaptation(
  meta: MetaReliabilityLongitudinalTrustBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (meta.governancePriorityOnly) return false;
  if (meta.freezeAdaptiveLearning) return false;
  if (meta.explanationOnlyMode) return false;
  if (meta.watchHoldOnly) return false;
  return true;
}

export async function persistMetaReliabilityCycle(
  meta: MetaReliabilityLongitudinalTrustBundle,
  finalDecision: string,
  regimeId: string,
): Promise<void> {
  await appendLongitudinalSnapshot(
    {
      at: meta.generatedAt,
      metaReliabilityPct: meta.metaReliabilityPct,
      trustState: meta.trustState,
      trustDecayPct: meta.trustDecayPct,
      semanticDriftPct: meta.semanticDriftPct,
      finalDecision: finalDecision as StrategyAction,
      regimeId,
    },
    finalDecision,
    regimeId,
  );
  await saveMetaReliabilityState({
    version: 1,
    lastTrustState: meta.trustState,
    lastMetaReliabilityPct: meta.metaReliabilityPct,
    lastOrchestrationBudgetMax: meta.orchestrationBudgetMax,
    longitudinalTimeline: meta.longitudinalTimeline,
    lastFinalDecision: finalDecision,
    lastRegimeId: regimeId,
    refreshCount: meta.longitudinalTimeline.length,
  });
  applyMetaReliabilityOrchestrationOverrides({
    budgetMax: meta.orchestrationBudgetMax,
    trustCritical: meta.trustState === 'TRUST_CRITICAL' || meta.governancePriorityOnly,
    trustUnstable:
      meta.trustState === 'TRUST_UNSTABLE' || meta.trustState === 'TRUST_DECAYING',
    explanationDivergence: meta.trustState === 'EXPLANATION_DIVERGENCE',
    longitudinalUnsupported: meta.trustState === 'LONGITUDINAL_UNSUPPORTED',
    freezeAdaptive: meta.freezeAdaptiveLearning,
    governancePriorityOnly: meta.governancePriorityOnly,
  });
}

export function applyMetaReliabilityToStrategy(
  strategy: StrategyExecutionBundle | null,
  meta: MetaReliabilityLongitudinalTrustBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !meta) return strategy;
  if (!metaAllowsAdaptation(meta, systemic)) {
    return {
      ...strategy,
      todayRecommendations: strategy.todayRecommendations.map((r) => {
        let action = r.action;
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        return {
          ...r,
          action,
          confidencePct: clampConfidence(r.confidencePct, meta.confidenceClampPct),
          whyProposedJa: `${r.whyProposedJa} [Meta trust: ${meta.trustState}]`,
        };
      }),
    };
  }

  const cap = meta.confidenceClampPct;
  const downgradeUnstable =
    meta.trustState === 'TRUST_UNSTABLE' || meta.trustState === 'TRUST_DECAYING';

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (meta.explanationOnlyMode || meta.trustState === 'EXPLANATION_DIVERGENCE') {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
      } else if (downgradeUnstable) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
      }
      const decayed = clampConfidence(
        r.confidencePct,
        meta.trustDecayPct > 40 ? Math.min(cap, 55) : cap,
      );
      return {
        ...r,
        action,
        confidencePct: decayed,
        whyProposedJa: `${r.whyProposedJa} [Meta ${meta.trustStateLabelJa}]`,
      };
    }),
  };
}

export function applyMetaReliabilityToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  meta: MetaReliabilityLongitudinalTrustBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !meta) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Meta trust: ${meta.trustStateLabelJa} · ${meta.metaReliabilityPct}% · decay ${meta.trustDecayPct}%]`;
  summary = `${summary} ${meta.uncertaintyDisclaimerJa}`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Meta defers to systemic safe mode]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (
    !metaAllowsAdaptation(meta, systemic) ||
    meta.watchHoldOnly ||
    meta.explanationOnlyMode
  ) {
    if (finalDecision === 'buy') {
      finalDecision = 'watch';
      finalDecisionLabelJa = '監視';
    } else if (finalDecision === 'reduce') {
      finalDecision = 'hold';
      finalDecisionLabelJa = '保有';
    }
  } else if (meta.trustState === 'TRUST_UNSTABLE') {
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
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function attachMetaReliabilityToContext(
  payload: AiStrategyContextPayload,
  bundle: MetaReliabilityLongitudinalTrustBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, metaReliabilityLongitudinalTrust: bundle };
}

export function enrichMetaReliabilityBundleWithOrchestration(
  meta: MetaReliabilityLongitudinalTrustBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): MetaReliabilityLongitudinalTrustBundle {
  return {
    ...meta,
    orchestrationInteractionJa: `${meta.orchestrationInteractionJa} · orch health ${orchestration.orchestrationHealthScore}%`,
  };
}
