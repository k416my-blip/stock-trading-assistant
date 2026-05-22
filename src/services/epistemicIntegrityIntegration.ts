import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { EpistemicIntegrityTruthCalibrationBundle } from '../types/epistemicIntegrityTruthCalibration';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { applyEpistemicIntegrityOrchestrationOverrides } from './dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime';
import {
  appendEpistemicSnapshot,
  saveEpistemicIntegrityState,
} from './epistemicIntegrityStorage';

function clampConfidence(pct: number, cap: number): number {
  return Math.min(pct, cap);
}

function epistemicAllowsTradingAdaptation(
  ep: EpistemicIntegrityTruthCalibrationBundle,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): boolean {
  if (systemic?.systemicEmergencySafeMode) return false;
  if (ep.explanationOnlyMode) return false;
  if (ep.predictionThrottleActive && ep.speculationSuppressed) return false;
  return true;
}

export async function persistEpistemicIntegrityCycle(
  ep: EpistemicIntegrityTruthCalibrationBundle,
): Promise<void> {
  await appendEpistemicSnapshot({
    at: ep.generatedAt,
    epistemicHealthPct: ep.epistemicHealthPct,
    epistemicState: ep.epistemicState,
    hallucinationRiskPct: ep.hallucinationRiskPct,
    confidenceCalibrationPct: ep.confidenceCalibrationPct,
  });
  await saveEpistemicIntegrityState({
    version: 1,
    lastEpistemicState: ep.epistemicState,
    lastEpistemicHealthPct: ep.epistemicHealthPct,
    lastOrchestrationBudgetMax: ep.orchestrationBudgetMax,
    epistemicTimeline: ep.epistemicTimeline,
    refreshCount: ep.epistemicTimeline.length,
  });
  applyEpistemicIntegrityOrchestrationOverrides({
    budgetMax: ep.orchestrationBudgetMax,
    hallucinationRisk: ep.epistemicState === 'EPISTEMIC_HALLUCINATION_RISK',
    unsupported: ep.epistemicState === 'EPISTEMIC_UNSUPPORTED',
    speculative: ep.epistemicState === 'EPISTEMIC_SPECULATIVE',
    contradicted: ep.epistemicState === 'EPISTEMIC_CONTRADICTED',
    explanationOnly: ep.explanationOnlyMode,
    predictionFreeze: ep.predictionThrottleActive,
  });
}

export function applyEpistemicIntegrityToStrategy(
  strategy: StrategyExecutionBundle | null,
  ep: EpistemicIntegrityTruthCalibrationBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): StrategyExecutionBundle | null {
  if (!strategy || !ep) return strategy;

  const cap = ep.confidenceClampPct;

  return {
    ...strategy,
    todayRecommendations: strategy.todayRecommendations.map((r) => {
      let action = r.action;
      let why = r.whyProposedJa;

      if (!epistemicAllowsTradingAdaptation(ep, systemic) || ep.explanationOnlyMode) {
        if (action === 'buy') action = 'watch';
        if (action === 'reduce') action = 'hold';
        why = `${why} [Epistemic: 説明のみ — 根拠不足]`;
      } else if (ep.explanationDowngradeActive) {
        why = `${why} [Epistemic: 説明 downgrade]`;
      } else if (ep.predictionThrottleActive && action === 'buy') {
        action = 'watch';
        why = `${why} [Epistemic: prediction throttle]`;
      }

      const calibrated = clampConfidence(
        Math.min(r.confidencePct, ep.confidenceCalibrationPct),
        cap,
      );

      return {
        ...r,
        action,
        confidencePct: calibrated,
        whyProposedJa: `${why} [${ep.epistemicStateLabelJa}]`.slice(0, 500),
      };
    }),
  };
}

export function applyEpistemicIntegrityToGovernance(
  governance: AiGovernanceDecisionBundle | null,
  ep: EpistemicIntegrityTruthCalibrationBundle | null,
  systemic: SystemicStabilityRecursiveGovernanceBundle | null,
): AiGovernanceDecisionBundle | null {
  if (!governance || !ep) return governance;

  let summary = governance.unifiedAiSummaryJa;
  summary = `${summary} [Epistemic: ${ep.epistemicStateLabelJa} · health ${ep.epistemicHealthPct}% · calibration ${ep.confidenceCalibrationPct}%]`;
  if (ep.unknownStateRatioPct > 15) {
    summary = `${summary} 不明比率 ${ep.unknownStateRatioPct}%（正常）`;
  }
  if (ep.consensusRevalidationRequested) {
    summary = `${summary} [合議再検証要求]`;
  }
  summary = `${summary} ${ep.uncertaintyDisclaimerJa}`.slice(0, 800);

  if (systemic?.systemicEmergencySafeMode) {
    summary = `${summary} [Epistemic defers to systemic safe mode]`;
  }

  let finalDecision = governance.finalDecision;
  let finalDecisionLabelJa = governance.finalDecisionLabelJa;

  if (ep.explanationOnlyMode || !epistemicAllowsTradingAdaptation(ep, systemic)) {
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
    consensusScore: Math.min(governance.consensusScore, ep.confidenceClampPct),
    unifiedAiSummaryJa: summary.slice(0, 800),
  };
}

export function attachEpistemicIntegrityToContext(
  payload: AiStrategyContextPayload,
  bundle: EpistemicIntegrityTruthCalibrationBundle | null,
): AiStrategyContextPayload {
  if (!bundle) return payload;
  return { ...payload, epistemicIntegrityTruthCalibration: bundle };
}

export function enrichEpistemicIntegrityBundleWithOrchestration(
  ep: EpistemicIntegrityTruthCalibrationBundle,
  orchestration: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
): EpistemicIntegrityTruthCalibrationBundle {
  return {
    ...ep,
    mobileRuntimeStateJa: `${ep.mobileRuntimeStateJa} · orch latency ${orchestration.refreshLatencyMs}ms`,
  };
}
