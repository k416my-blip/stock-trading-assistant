import {
  BUDGET_EXPLORATION_BALANCED,
  BUDGET_EXPLORATION_RIGID,
  BUDGET_EXPLORATION_RISK,
  BUDGET_EXPLORATION_STAGNANT,
  DOGMA_PRESSURE_RIGID_THRESHOLD,
  DOGMA_PRESSURE_STAGNANT_THRESHOLD,
  EXPLORATION_AUDIT_LABELS_JA,
  EXPLORATION_HEALTH_OVERCLAMPED_THRESHOLD,
  UNCERTAINTY_ACCEPTANCE_UNCERTAIN_THRESHOLD,
  UNSUPPORTED_EXPLORATION_RISK_THRESHOLD,
} from '../constants/adaptiveExplorationAntiDogma';
import type {
  BuildAdaptiveExplorationInput,
  ExplorationAuditSnapshot,
  ExplorationAuditTargetId,
  ExplorationState,
} from '../types/adaptiveExplorationAntiDogma';
import type { AdaptiveExplorationPersisted } from './adaptiveExplorationStorage';

export type AntiDogmaMetrics = {
  strategyRigidityPct: number;
  consensusStagnationPct: number;
  explanationRepetitionPct: number;
  epistemicRigidityPct: number;
  orchestrationFixationPct: number;
  reflectionLoopingPct: number;
  noveltyResistancePct: number;
  explorationSuppressionPct: number;
  adaptiveFlexibilityPct: number;
  safeVariationCapacityPct: number;
  multiPathTolerancePct: number;
  uncertaintyAcceptancePct: number;
  explorationHealthPct: number;
  dogmaPressurePct: number;
  safeExplorationMarginPct: number;
  noveltyBalancePct: number;
  epistemicIntegrityScorePct: number;
  governanceAlignmentPct: number;
  humanIntentAlignmentPct: number;
  unsupportedExplorationRiskPct: number;
};

export type AntiDogmaResolution = {
  explorationState: ExplorationState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  perspectiveWideningActive: boolean;
  safeAlternativeGenerationActive: boolean;
  clampRelaxationSuggestionActive: boolean;
  uncertaintyAcknowledgmentActive: boolean;
  fallbackFreezeActive: boolean;
  explorationModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function audit(
  id: ExplorationAuditTargetId,
  score: number,
  detail: string,
): ExplorationAuditSnapshot {
  return {
    id,
    labelJa: EXPLORATION_AUDIT_LABELS_JA[id],
    scorePct: clamp(score),
    detailJa: detail,
  };
}

export function collectExplorationAuditTargets(metrics: AntiDogmaMetrics): ExplorationAuditSnapshot[] {
  return [
    audit('strategyRigidity', 100 - metrics.strategyRigidityPct, 'lower rigidity preferred'),
    audit('consensusStagnation', 100 - metrics.consensusStagnationPct, 'stagnation pressure'),
    audit('explanationRepetition', 100 - metrics.explanationRepetitionPct, 'repetition'),
    audit('epistemicRigidity', 100 - metrics.epistemicRigidityPct, 'epistemic flexibility'),
    audit('orchestrationFixation', 100 - metrics.orchestrationFixationPct, 'orch fixation'),
    audit('reflectionLooping', 100 - metrics.reflectionLoopingPct, 'reflection loops'),
    audit('noveltyResistance', 100 - metrics.noveltyResistancePct, 'novelty resistance'),
    audit('explorationSuppression', 100 - metrics.explorationSuppressionPct, 'suppression'),
    audit('adaptiveFlexibility', metrics.adaptiveFlexibilityPct, 'flexibility'),
    audit('safeVariationCapacity', metrics.safeVariationCapacityPct, 'safe variation'),
    audit('multiPathTolerance', metrics.multiPathTolerancePct, 'multi-path'),
    audit('uncertaintyAcceptance', metrics.uncertaintyAcceptancePct, 'uncertainty ok'),
  ];
}

export function computeAntiDogmaMetrics(
  input: BuildAdaptiveExplorationInput,
  persisted: AdaptiveExplorationPersisted,
): AntiDogmaMetrics {
  const gov = input.governance;
  const consensus = input.consensus;
  const ep = input.epistemic;
  const economy = input.cognitiveResourceEconomy;
  const executive = input.unifiedCognitiveState;
  const intent = input.humanIntentContinuity;
  const orch = input.orchestration;
  const graph = input.strategicMemoryGraph;
  const stability = input.stability;

  const strategyRigidityPct = clamp(
    (input.strategy?.cooldownActive ? 35 : 18) +
      (executive?.reduceReasoningDepthActive ? 15 : 0) +
      (intent?.instructionReinforcementActive ? 12 : 0) +
      (input.mockStrategyRigidityBoost ?? 0),
  );

  const consensusStagnationPct = clamp(
    (consensus?.consensusState === 'HARD_CONFLICT' ? 40 : 0) +
      (consensus?.consensusState === 'SOFT_CONFLICT' ? 18 : 0) +
      (100 - (consensus?.consensusHealthPct ?? 58)) * 0.45 +
      (consensus?.contradictionRiskPct ?? 0) * 0.25 +
      (input.mockConsensusStagnationBoost ?? 0),
  );

  const explanationRepetitionPct = clamp(
    persisted.repetitionScorePct * 0.55 +
      (ep?.explanationDowngradeActive ? 20 : 0) +
      (intent?.explanationOnlyMode ? 25 : 0),
  );

  const epistemicRigidityPct = clamp(
    (ep?.speculationSuppressed ? 28 : 12) +
      (ep?.predictionThrottleActive ? 22 : 0) +
      (100 - (ep?.truthStabilityPct ?? 55)) * 0.35 +
      (input.mockDogmaPressureBoost ?? 0) * 0.25,
  );

  const orchestrationFixationPct = clamp(
    orch
      ? clamp(100 - (orch.orchestrationHealthScore ?? 50)) * 0.4 +
          (economy?.orchestrationSaturationPct ?? 0) * 0.35
      : (economy?.orchestrationSaturationPct ?? 25) +
          (executive?.orchestrationSaturationPct ?? 0) * 0.3,
  );

  const reflectionLoopingPct = clamp(
    (economy?.recursivePressurePct ?? 0) * 0.4 +
      (graph?.recursiveLoopRiskPct ?? 0) * 0.35 +
      (executive?.recursiveSuppressionActive ? 15 : 0),
  );

  const noveltyResistancePct = clamp(
    strategyRigidityPct * 0.3 +
      epistemicRigidityPct * 0.25 +
      orchestrationFixationPct * 0.25 +
      explanationRepetitionPct * 0.2,
  );

  const explorationSuppressionPct = clamp(
    (intent?.reinterpretationSuppressionActive ? 20 : 0) +
      (intent?.semanticFreezeActive ? 18 : 0) +
      (executive?.deepReasoningFreezeActive ? 15 : 0) +
      (ep?.explanationOnlyMode ? 22 : 0),
  );

  const adaptiveFlexibilityPct = clamp(
    78 -
      strategyRigidityPct * 0.25 -
      consensusStagnationPct * 0.2 -
      explorationSuppressionPct * 0.2 +
      (stability?.systemHealthScore ?? 50) * 0.08,
  );

  const safeVariationCapacityPct = clamp(
    70 -
      noveltyResistancePct * 0.35 -
      epistemicRigidityPct * 0.2 +
      (ep?.unknownStateRatioPct ?? 15) * 0.15,
  );

  const multiPathTolerancePct = clamp(
    (consensus?.consensusHealthPct ?? 55) * 0.35 +
      adaptiveFlexibilityPct * 0.35 +
      (100 - orchestrationFixationPct) * 0.3,
  );

  let uncertaintyAcceptancePct = clamp(
    (ep?.unknownStateRatioPct ?? 20) * 0.45 +
      (100 - epistemicRigidityPct) * 0.35 +
      (intent?.clarificationDowngradeActive ? -15 : 8),
  );
  if (typeof input.mockUncertaintyAcceptancePct === 'number') {
    uncertaintyAcceptancePct = clamp(input.mockUncertaintyAcceptancePct);
  }

  let explorationHealthPct = clamp(
    (adaptiveFlexibilityPct +
      safeVariationCapacityPct +
      multiPathTolerancePct +
      uncertaintyAcceptancePct) /
      4,
  );
  if (typeof input.mockExplorationHealthPct === 'number') {
    explorationHealthPct = clamp(input.mockExplorationHealthPct);
  }

  let dogmaPressurePct = clamp(
    strategyRigidityPct +
      consensusStagnationPct +
      epistemicRigidityPct +
      orchestrationFixationPct,
  );
  if (typeof input.mockDogmaPressureBoost === 'number') {
    dogmaPressurePct = clamp(dogmaPressurePct + input.mockDogmaPressureBoost);
  }
  if (typeof input.mockDogmaPressurePct === 'number') {
    dogmaPressurePct = clamp(input.mockDogmaPressurePct);
  }

  const safeExplorationMarginPct = clamp(explorationHealthPct - dogmaPressurePct);

  const epistemicIntegrityScorePct = ep?.epistemicHealthPct ?? 58;
  const governanceAlignmentPct = clamp(
    (gov?.consensusScore ?? 55) * 0.5 + (consensus?.consensusHealthPct ?? 55) * 0.5,
  );
  const humanIntentAlignmentPct = intent?.safeAlignmentPct ?? intent?.intentHealthPct ?? 60;

  const noveltyBalancePct = clamp(
    (safeVariationCapacityPct +
      epistemicIntegrityScorePct +
      governanceAlignmentPct +
      humanIntentAlignmentPct) /
      4,
  );

  let unsupportedExplorationRiskPct = clamp(
    (ep?.unsupportedClaimsPct ?? 0) * 0.4 +
      (intent?.unsupportedInferenceRiskPct ?? 0) * 0.35 +
      (input.mockUnsupportedExplorationBoost ?? 0),
  );

  return {
    strategyRigidityPct,
    consensusStagnationPct,
    explanationRepetitionPct,
    epistemicRigidityPct,
    orchestrationFixationPct,
    reflectionLoopingPct,
    noveltyResistancePct,
    explorationSuppressionPct,
    adaptiveFlexibilityPct,
    safeVariationCapacityPct,
    multiPathTolerancePct,
    uncertaintyAcceptancePct,
    explorationHealthPct,
    dogmaPressurePct,
    safeExplorationMarginPct,
    noveltyBalancePct,
    epistemicIntegrityScorePct,
    governanceAlignmentPct,
    humanIntentAlignmentPct,
    unsupportedExplorationRiskPct,
  };
}

export function classifyExplorationState(metrics: AntiDogmaMetrics): ExplorationState {
  if (metrics.unsupportedExplorationRiskPct > UNSUPPORTED_EXPLORATION_RISK_THRESHOLD) {
    return 'EXPLORATION_UNSUPPORTED';
  }
  if (metrics.dogmaPressurePct > DOGMA_PRESSURE_STAGNANT_THRESHOLD) {
    return 'EXPLORATION_STAGNANT';
  }
  if (metrics.dogmaPressurePct > DOGMA_PRESSURE_RIGID_THRESHOLD) {
    return 'EXPLORATION_RIGID';
  }
  if (metrics.explorationHealthPct < EXPLORATION_HEALTH_OVERCLAMPED_THRESHOLD) {
    return 'EXPLORATION_OVERCLAMPED';
  }
  if (metrics.uncertaintyAcceptancePct < UNCERTAINTY_ACCEPTANCE_UNCERTAIN_THRESHOLD) {
    return 'EXPLORATION_UNCERTAIN';
  }
  return 'EXPLORATION_BALANCED';
}

export function resolveAntiDogmaActions(
  state: ExplorationState,
  _metrics: AntiDogmaMetrics,
): AntiDogmaResolution {
  const base: AntiDogmaResolution = {
    explorationState: state,
    orchestrationBudgetMax: BUDGET_EXPLORATION_BALANCED,
    explanationOnlyMode: false,
    perspectiveWideningActive: false,
    safeAlternativeGenerationActive: false,
    clampRelaxationSuggestionActive: false,
    uncertaintyAcknowledgmentActive: false,
    fallbackFreezeActive: false,
    explorationModeJa: 'balanced anti-dogma',
  };

  switch (state) {
    case 'EXPLORATION_RIGID':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLORATION_RIGID,
        perspectiveWideningActive: true,
        explorationModeJa: 'controlled perspective widening',
      };
    case 'EXPLORATION_STAGNANT':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLORATION_STAGNANT,
        safeAlternativeGenerationActive: true,
        perspectiveWideningActive: true,
        explorationModeJa: 'safe alternative suggestion only',
      };
    case 'EXPLORATION_OVERCLAMPED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLORATION_STAGNANT,
        clampRelaxationSuggestionActive: true,
        explorationModeJa: 'safe flexibility restore hint',
      };
    case 'EXPLORATION_UNCERTAIN':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLORATION_RIGID,
        uncertaintyAcknowledgmentActive: true,
        explorationModeJa: 'uncertainty-first mode',
      };
    case 'EXPLORATION_UNSUPPORTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXPLORATION_RISK,
        explanationOnlyMode: true,
        fallbackFreezeActive: true,
        explorationModeJa: 'explanation-only fallback freeze',
      };
    default:
      return base;
  }
}
