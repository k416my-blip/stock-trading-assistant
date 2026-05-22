/**
 * Human Intent Continuity & Alignment Preservation — ユーザー意図整合監査（人格形成・目標生成ではない）。
 */
import {
  ALIGNMENT_FLOW_JA,
  ALIGNMENT_INTEGRITY_FORMULA_JA,
  ALIGNMENT_STATE_LABELS_JA,
  HUMAN_INTENT_CONTINUITY_REGULATORY_JA,
  HUMAN_INTENT_FEATURE_LABELS,
  HUMAN_INTENT_UI_LABELS_JA,
  INTENT_DRIFT_FORMULA_JA,
  INTENT_HEALTH_FORMULA_JA,
  REAL_TRADING_ENABLED,
  SAFE_ALIGNMENT_FORMULA_JA,
} from '../constants/humanIntentContinuityAlignmentPreservation';
import type {
  BuildHumanIntentContinuityInput,
  HumanIntentContinuityAlignmentPreservationBundle,
  HumanIntentFeatureId,
  HumanIntentFeatureStatus,
} from '../types/humanIntentContinuityAlignmentPreservation';
import { loadHumanIntentContinuityState } from './humanIntentContinuityStorage';
import {
  classifyIntentAlignmentState,
  collectIntentAuditTargets,
  computeIntentAlignmentMetrics,
  resolveIntentAlignmentActions,
} from './intentAlignmentEngine';

function buildFeatureStatuses(
  partial: Omit<HumanIntentContinuityAlignmentPreservationBundle, 'featureStatuses'>,
): HumanIntentFeatureStatus[] {
  const s = (
    id: HumanIntentFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): HumanIntentFeatureStatus => ({
    id,
    labelJa: HUMAN_INTENT_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('alignment_collector', partial.auditTargets.length > 0, false, `${partial.auditTargets.length}`),
    s('semantic_continuity_checker', partial.semanticContinuityPct >= 55, false, `${partial.semanticContinuityPct}%`),
    s('goal_integrity_guard', partial.instructionContinuityPct >= 70, false, 'no mutation'),
    s('context_integrity_probe', partial.contextIntegrityPct >= 50, false, `${partial.contextIntegrityPct}%`),
    s(
      'reinterpretation_suppressor',
      !partial.reinterpretationSuppressionActive,
      partial.reinterpretationSuppressionActive,
      `${partial.reinterpretationPressurePct}%`,
    ),
    s(
      'instruction_reinforcer',
      !partial.instructionReinforcementActive,
      partial.instructionReinforcementActive,
      'reinforce',
    ),
    s('context_rebuild', !partial.contextRebuildActive, partial.contextRebuildActive, 'rebuild'),
    s(
      'clarification_downgrade',
      !partial.clarificationDowngradeActive,
      partial.clarificationDowngradeActive,
      'clarify',
    ),
    s('explanation_only_fallback', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'fallback'),
    s('semantic_freeze', !partial.semanticFreezeActive, partial.semanticFreezeActive, 'freeze'),
    s(
      'orchestration_deviation_clamp',
      partial.orchestrationDeviationPct < 65,
      partial.orchestrationDeviationPct >= 50,
      `${partial.orchestrationDeviationPct}%`,
    ),
    s('intent_timeline', partial.intentTimeline.length > 0, false, `${partial.intentTimeline.length}`),
    s('no_hidden_agenda', partial.hiddenIntentionForbidden, false, 'forbidden'),
    s('no_goal_mutation', partial.autonomousGoalCreationForbidden, false, 'forbidden'),
    s('no_persuasion_optimization', true, false, 'forbidden'),
    s('mobile_lite_alignment', true, false, partial.mobileRuntimeStateJa),
    s('cached_intent_snapshots', true, false, 'cache'),
    s('human_intent_dashboard', true, false, HUMAN_INTENT_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

export async function buildHumanIntentContinuityAlignmentPreservationBundle(
  input: BuildHumanIntentContinuityInput,
): Promise<HumanIntentContinuityAlignmentPreservationBundle> {
  const persisted = await loadHumanIntentContinuityState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeIntentAlignmentMetrics(input);
  const alignmentState = classifyIntentAlignmentState(metrics);
  const resolution = resolveIntentAlignmentActions(alignmentState, metrics);
  const auditTargets = collectIntentAuditTargets(metrics);

  const snapshotPoint = {
    at: new Date().toISOString(),
    intentHealthPct: metrics.intentHealthPct,
    alignmentState: resolution.alignmentState,
    safeAlignmentPct: metrics.safeAlignmentPct,
  };

  const partial: Omit<HumanIntentContinuityAlignmentPreservationBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: HUMAN_INTENT_CONTINUITY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    autonomousGoalCreationForbidden: true,
    hiddenIntentionForbidden: true,
    strategyActionChangeForbidden: true,
    alignmentState: resolution.alignmentState,
    alignmentStateLabelJa: ALIGNMENT_STATE_LABELS_JA[resolution.alignmentState],
    intentHealthPct: metrics.intentHealthPct,
    alignmentIntegrityPct: metrics.alignmentIntegrityPct,
    reinterpretationPressurePct: metrics.reinterpretationPressurePct,
    semanticContinuityPct: metrics.semanticContinuityPct,
    strategyAlignmentPct: metrics.strategyAlignmentPct,
    contextIntegrityPct: metrics.contextIntegrityPct,
    instructionContinuityPct: metrics.instructionContinuityPct,
    orchestrationDeviationPct: metrics.orchestrationDeviationPct,
    unsupportedInferenceRiskPct: metrics.unsupportedIntentInferencePct,
    intentDriftPct: metrics.intentDriftPct,
    safeAlignmentPct: metrics.safeAlignmentPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    instructionReinforcementActive: resolution.instructionReinforcementActive,
    contextRebuildActive: resolution.contextRebuildActive,
    reinterpretationSuppressionActive: resolution.reinterpretationSuppressionActive,
    clarificationDowngradeActive: resolution.clarificationDowngradeActive,
    semanticFreezeActive: resolution.semanticFreezeActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    alignmentSummaryJa: [
      ALIGNMENT_STATE_LABELS_JA[resolution.alignmentState],
      `health ${metrics.intentHealthPct}% · safe ${metrics.safeAlignmentPct}%`,
      resolution.explanationOnlyMode ? '説明のみ' : resolution.alignmentModeJa,
    ]
      .filter(Boolean)
      .join(' — '),
    intentHealthFormulaJa: INTENT_HEALTH_FORMULA_JA,
    intentDriftFormulaJa: INTENT_DRIFT_FORMULA_JA,
    alignmentIntegrityFormulaJa: ALIGNMENT_INTEGRITY_FORMULA_JA,
    safeAlignmentFormulaJa: SAFE_ALIGNMENT_FORMULA_JA,
    alignmentFlowJa: [...ALIGNMENT_FLOW_JA],
    auditTargets,
    intentTimeline: [...persisted.intentTimeline, snapshotPoint].slice(-48),
    mobileRuntimeStateJa: `lightweight alignment check · ${Date.now() - started}ms`,
    explainRuleBasisJa:
      '人間意図整合監査。明示指示最優先。勝手な解釈・目標拡張禁止。strategy変更禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
