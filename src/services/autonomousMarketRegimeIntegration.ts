import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { AutonomousMarketRegimeDetectionBundle } from '../types/autonomousMarketRegimeDetection';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from '../types/executionRecoveryAdaptiveConfidence';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import { applyRegimeOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendRegimeTimelinePoint,
  saveMarketRegimeState,
} from './autonomousMarketRegimeDetectionStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

/** Never bypass systemic emergency or governance authority */
function regimeAllowsAdaptation(
  regime: AutonomousMarketRegimeDetectionBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (systemic?.cascadeIsolationActive && regime.currentRegime === 'PANIC') return false;
  if (regime.explanationOnlyMode) return false;
  return true;
}

export async function persistRegimeCycle(
  regime: AutonomousMarketRegimeDetectionBundle,
): Promise<void> {
  await appendRegimeTimelinePoint({
    at: regime.generatedAt,
    regime: regime.currentRegime,
    regimeConfidence: regime.regimeConfidencePct,
    uncertainty: regime.uncertaintyPct,
  });
  await saveMarketRegimeState({
    version: 1,
    lastRegime: regime.currentRegime,
    lastOrchestrationBudgetMax: regime.orchestrationBudgetMax,
    regimeTimeline: regime.regimeTimeline,
    adaptationCooldownUntil: null,
  });
  applyRegimeOrchestrationOverrides({
    budgetMax: regime.orchestrationBudgetMax,
    panicOnlyLayers: regime.currentRegime === 'PANIC' || regime.governancePriorityMode,
    governancePriority: regime.governancePriorityMode,
  });
}

export function applyMarketRegimeToStrategy(
  strategy: StrategyExecutionBundle | null,
  regime: AutonomousMarketRegimeDetectionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
  recovery: ExecutionRecoveryAdaptiveConfidenceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !regime) return strategy;
  if (!regimeAllowsAdaptation(regime, systemic)) {
    return {
      ...strategy,
      todayRecommendations: strategy.todayRecommendations.map((r) => {
        let action = r.action;
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        return {
          ...r,
          action,
          confidencePct: Math.min(r.confidencePct, regime.confidenceClampPct),
          whyProposedJa: `${r.whyProposedJa} [Regime blocked: ${regime.currentRegime}]`,
        };
      }),
    };
  }

  const cap = regime.confidenceClampPct;

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      if (regime.currentRegime === 'PANIC' || regime.explanationOnlyMode) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
      } else if (regime.currentRegime === 'VOLATILE_BEAR' && action === 'buy') {
        action = 'watch';
      } else if (regime.uncertaintyPct > 60 && action === 'buy') {
        action = 'watch';
      }

      return {
        ...r,
        action,
        confidencePct: clampConfidence(r.confidencePct, cap),
        whyProposedJa: `${r.whyProposedJa} [Regime ${regime.currentRegime}: cap ${cap}%]`,
      };
    }),
    tacticalMode:
      regime.currentRegime === 'PANIC' || regime.currentRegime === 'VOLATILE_BEAR'
        ? 'defensive'
        : strategy.tacticalMode,
  };
}

export function applyMarketRegimeToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  regime: AutonomousMarketRegimeDetectionBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !regime) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Regime: ${regime.regimeLabelJa} · confidence ${regime.regimeConfidencePct}% · uncertainty ${regime.uncertaintyPct}%]`;
  summary = `${summary} ${regime.classificationDisclaimerJa}`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Regime defers to systemic safe mode]`;
  }
  if (regime.explanationOnlyMode) {
    summary = `${summary} [Explanation-only — no escalation]`;
  }
  if (regime.governancePriorityMode) {
    summary = `${summary} [Governance priority mode]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;
  if (
    regimeAllowsAdaptation(regime, systemic) &&
    (regime.currentRegime === 'PANIC' || regime.uncertaintyPct > 75)
  ) {
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

export function attachMarketRegimeToContext(
  payload: AiStrategyContextPayload,
  bundle: AutonomousMarketRegimeDetectionBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return {
    ...payload,
    autonomousMarketRegimeDetection: bundle,
  };
}

export function enrichRegimeBundleWithOrchestration(
  regime: AutonomousMarketRegimeDetectionBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null,
): AutonomousMarketRegimeDetectionBundle {
  if (!orchestration) return regime;
  const suspended = [
    ...orchestration.sleepingLayers,
    ...orchestration.deferredLayers,
    ...orchestration.blockedLayers,
  ];
  return {
    ...regime,
    orchestrationBudgetMax: orchestration.computeBudgetMax,
    activeLayersSummaryJa: orchestration.activeLayers.join(', ') || '—',
    suspendedLayersSummaryJa: suspended.slice(0, 12).join(', ') || '—',
    governanceOverrideJa: regime.governancePriorityMode
      ? 'regime governance priority'
      : orchestration.emergencyOverrideActive
        ? 'orchestration emergency'
        : 'none',
    recoveryInteractionJa: regime.recoveryInteractionJa,
  };
}
