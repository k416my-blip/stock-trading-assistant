/**
 * Adaptive Exploration & Anti-Dogma — 過度固定化の検出・緩和（autonomy・実験ではない）。
 */
import {
  ADAPTIVE_EXPLORATION_FEATURE_LABELS,
  ADAPTIVE_EXPLORATION_REGULATORY_JA,
  ADAPTIVE_EXPLORATION_UI_LABELS_JA,
  DOGMA_PRESSURE_FORMULA_JA,
  EXPLORATION_FLOW_JA,
  EXPLORATION_HEALTH_FORMULA_JA,
  EXPLORATION_STATE_LABELS_JA,
  NOVELTY_BALANCE_FORMULA_JA,
  REAL_TRADING_ENABLED,
  SAFE_EXPLORATION_MARGIN_FORMULA_JA,
} from '../constants/adaptiveExplorationAntiDogma';
import type {
  AdaptiveExplorationAntiDogmaBundle,
  AdaptiveExplorationFeatureId,
  AdaptiveExplorationFeatureStatus,
  BuildAdaptiveExplorationInput,
} from '../types/adaptiveExplorationAntiDogma';
import { loadAdaptiveExplorationState } from './adaptiveExplorationStorage';
import {
  classifyExplorationState,
  collectExplorationAuditTargets,
  computeAntiDogmaMetrics,
  resolveAntiDogmaActions,
} from './antiDogmaEngine';

function buildFeatureStatuses(
  partial: Omit<AdaptiveExplorationAntiDogmaBundle, 'featureStatuses'>,
): AdaptiveExplorationFeatureStatus[] {
  const s = (
    id: AdaptiveExplorationFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): AdaptiveExplorationFeatureStatus => ({
    id,
    labelJa: ADAPTIVE_EXPLORATION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('rigidity_analyzer', partial.dogmaPressurePct < 60, partial.dogmaPressurePct >= 60, `${partial.dogmaPressurePct}%`),
    s('repetition_cache', true, false, 'cached'),
    s('dogma_pressure_meter', partial.dogmaPressurePct < 75, partial.dogmaPressurePct >= 60, `${partial.dogmaPressurePct}%`),
    s('novelty_scorer', partial.noveltyBalancePct >= 50, false, `${partial.noveltyBalancePct}%`),
    s('perspective_widener', !partial.perspectiveWideningActive, partial.perspectiveWideningActive, 'widen'),
    s('safe_alternative_generator', !partial.safeAlternativeGenerationActive, partial.safeAlternativeGenerationActive, 'alt'),
    s('clamp_relaxation_hint', !partial.clampRelaxationSuggestionActive, partial.clampRelaxationSuggestionActive, 'relax'),
    s('uncertainty_acknowledgment', !partial.uncertaintyAcknowledgmentActive, partial.uncertaintyAcknowledgmentActive, 'uncertain'),
    s('fallback_freeze', !partial.fallbackFreezeActive, partial.fallbackFreezeActive, 'freeze'),
    s('exploration_timeline', partial.explorationTimeline.length > 0, false, `${partial.explorationTimeline.length}`),
    s('no_autonomous_experiment', partial.autonomousExperimentationForbidden, false, 'forbidden'),
    s('no_hidden_exploration', partial.hiddenExplorationForbidden, false, 'forbidden'),
    s('no_strategy_mutation', partial.strategyMutationForbidden, false, 'forbidden'),
    s('no_human_intent_override', partial.humanIntentOverrideForbidden, false, 'forbidden'),
    s('mobile_lite_rigidity', true, false, partial.mobileRuntimeStateJa),
    s('cached_repetition_metrics', true, false, 'cache'),
    s('adaptive_exploration_dashboard', true, false, ADAPTIVE_EXPLORATION_UI_LABELS_JA.panelTitle),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
  ];
}

export async function buildAdaptiveExplorationAntiDogmaBundle(
  input: BuildAdaptiveExplorationInput,
): Promise<AdaptiveExplorationAntiDogmaBundle> {
  const persisted = await loadAdaptiveExplorationState();
  const started = input.auditStartedAt ?? Date.now();
  const metrics = computeAntiDogmaMetrics(input, persisted);
  const explorationState = classifyExplorationState(metrics);
  const resolution = resolveAntiDogmaActions(explorationState, metrics);
  const auditTargets = collectExplorationAuditTargets(metrics);

  const repetitionScorePct = Math.min(
    100,
    persisted.repetitionScorePct + metrics.explanationRepetitionPct * 0.08,
  );

  const snapshotPoint = {
    at: new Date().toISOString(),
    explorationHealthPct: metrics.explorationHealthPct,
    explorationState: resolution.explorationState,
    safeExplorationMarginPct: metrics.safeExplorationMarginPct,
  };

  const partial: Omit<AdaptiveExplorationAntiDogmaBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: ADAPTIVE_EXPLORATION_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    autonomousExperimentationForbidden: true,
    hiddenExplorationForbidden: true,
    strategyMutationForbidden: true,
    humanIntentOverrideForbidden: true,
    strategyActionChangeForbidden: true,
    explorationState: resolution.explorationState,
    explorationStateLabelJa: EXPLORATION_STATE_LABELS_JA[resolution.explorationState],
    explorationHealthPct: metrics.explorationHealthPct,
    dogmaPressurePct: metrics.dogmaPressurePct,
    strategyRigidityPct: metrics.strategyRigidityPct,
    consensusStagnationPct: metrics.consensusStagnationPct,
    epistemicRigidityPct: metrics.epistemicRigidityPct,
    noveltyBalancePct: metrics.noveltyBalancePct,
    adaptiveFlexibilityPct: metrics.adaptiveFlexibilityPct,
    safeExplorationMarginPct: metrics.safeExplorationMarginPct,
    unsupportedExplorationRiskPct: metrics.unsupportedExplorationRiskPct,
    explanationOnlyMode: resolution.explanationOnlyMode,
    perspectiveWideningActive: resolution.perspectiveWideningActive,
    safeAlternativeGenerationActive: resolution.safeAlternativeGenerationActive,
    clampRelaxationSuggestionActive: resolution.clampRelaxationSuggestionActive,
    uncertaintyAcknowledgmentActive: resolution.uncertaintyAcknowledgmentActive,
    fallbackFreezeActive: resolution.fallbackFreezeActive,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    explorationSummaryJa: [
      EXPLORATION_STATE_LABELS_JA[resolution.explorationState],
      `health ${metrics.explorationHealthPct}% · dogma ${metrics.dogmaPressurePct}% · margin ${metrics.safeExplorationMarginPct}%`,
      resolution.explanationOnlyMode ? '説明のみ' : resolution.explorationModeJa,
    ]
      .filter(Boolean)
      .join(' — '),
    explorationHealthFormulaJa: EXPLORATION_HEALTH_FORMULA_JA,
    dogmaPressureFormulaJa: DOGMA_PRESSURE_FORMULA_JA,
    safeExplorationMarginFormulaJa: SAFE_EXPLORATION_MARGIN_FORMULA_JA,
    noveltyBalanceFormulaJa: NOVELTY_BALANCE_FORMULA_JA,
    explorationFlowJa: [...EXPLORATION_FLOW_JA],
    auditTargets,
    explorationTimeline: [...persisted.explorationTimeline, snapshotPoint].slice(-48),
    mobileRuntimeStateJa: `lightweight rigidity analysis · ${Date.now() - started}ms · rep ${Math.round(repetitionScorePct)}%`,
    explainRuleBasisJa:
      '適応探索・反ドグマ監査。固定化緩和のみ。strategy変更・human intent override・autonomous experiment禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
