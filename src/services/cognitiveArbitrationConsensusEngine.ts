/**
 * Cognitive Arbitration & Consensus — distributed layer safe consensus (not central AI).
 */
import {
  ARBITRATION_FEATURE_LABELS,
  CONSENSUS_FLOW_JA,
  CONSENSUS_HEALTH_FORMULA_JA,
  CONSENSUS_REGULATORY_JA,
  CONSENSUS_STATE_LABELS_JA,
  CONTRADICTION_FORMULA_JA,
  FINAL_CONSENSUS_FORMULA_JA,
  PARTICIPANT_LABELS_JA,
  PARTICIPANT_PRIORITY,
  REAL_TRADING_ENABLED,
  UNCERTAINTY_DISCLAIMER_JA,
} from '../constants/cognitiveArbitrationConsensus';
import type {
  ArbitrationFeatureId,
  ArbitrationFeatureStatus,
  ArbitrationParticipantId,
  BuildCognitiveArbitrationInput,
  CognitiveArbitrationConsensusBundle,
  ParticipantSignal,
} from '../types/cognitiveArbitrationConsensus';
import type { StrategyAction } from '../types/strategyExecution';
import { loadCognitiveArbitrationState } from './cognitiveArbitrationConsensusStorage';
import {
  classifyConsensusState,
  computeContradictionRisk,
  computeWeightedConsensus,
  resolveConsensus,
  type ArbitrationMetrics,
} from './cognitiveConsensusResolutionEngine';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function collectParticipants(input: BuildCognitiveArbitrationInput): ParticipantSignal[] {
  const mock = input.mockLayerDisagreement === true;
  const govAction = input.governance?.finalDecision ?? input.finalDecision;
  const govConf = input.governance?.consensusScore ?? 55;

  const mk = (
    id: ArbitrationParticipantId,
    active: boolean,
    confidence: number,
    lean: StrategyAction,
    align: number,
    detail: string,
  ): ParticipantSignal => ({
    id,
    labelJa: PARTICIPANT_LABELS_JA[id],
    layerConfidencePct: clamp(confidence),
    layerPriority: PARTICIPANT_PRIORITY[id],
    semanticAlignmentPct: clamp(align),
    actionLean: lean,
    active,
    detailJa: detail,
  });

  return [
    mk('governance', !!input.governance, govConf, govAction, 95, 'absolute priority'),
    mk(
      'stability',
      !!input.stability,
      input.stability?.systemHealthScore ?? 60,
      input.stability?.emergencyReadOnlyActive ? 'hold' : 'watch',
      input.stability?.safeFallbackActive ? 70 : 85,
      'integrity',
    ),
    mk(
      'recovery',
      !!input.recovery,
      input.recovery?.recoveryHealthPct ?? 55,
      input.recovery?.recoveryBlocked ? 'hold' : 'watch',
      input.recovery?.safeRecovery ? 80 : 55,
      input.recovery?.thawState ?? 'recovery',
    ),
    mk(
      'regime',
      !!input.regime,
      input.regime?.regimeConfidencePct ?? 50,
      input.regime?.explanationOnlyMode
        ? 'watch'
        : input.regime?.currentRegime === 'PANIC'
          ? 'hold'
          : 'watch',
      100 - (input.regime?.uncertaintyPct ?? 30),
      input.regime?.currentRegime ?? '—',
    ),
    mk(
      'risk',
      !!input.risk,
      input.risk?.portfolioQualityScore ?? 50,
      input.risk?.riskEscalationActive ? 'hold' : 'watch',
      input.risk?.defensiveModeActive ? 65 : 80,
      `quality ${input.risk?.portfolioQualityScore ?? '—'}`,
    ),
    mk(
      'macro',
      !!input.macro,
      input.macro?.worldRegime.confidencePct ?? 55,
      mock ? 'buy' : 'watch',
      clamp(input.macro?.macroScore ?? 55),
      input.macro?.worldRegime.id ?? 'macro',
    ),
    mk(
      'memory',
      !!input.memory,
      100 - (input.memory?.memorySaturationPct ?? 40),
      'hold',
      input.memory?.cognitiveStabilityFreeze ? 60 : 80,
      'compression',
    ),
    mk(
      'reflection',
      !!input.reflection,
      input.reflection?.metaConfidencePct ?? 50,
      mock ? 'reduce' : 'hold',
      100 - (input.reflection?.confidenceDriftPct ?? 20),
      'self-critique',
    ),
    mk(
      'orchestration',
      !!input.orchestration,
      input.orchestration?.orchestrationHealthScore ?? 50,
      'hold',
      70,
      'orchestration',
    ),
  ];
}

export function computeArbitrationMetrics(
  input: BuildCognitiveArbitrationInput,
  participants: ParticipantSignal[],
): ArbitrationMetrics {
  const { finalConsensusPct, semanticAlignmentPct } = computeWeightedConsensus(participants);
  const confidences = participants.filter((p) => p.active).map((p) => p.layerConfidencePct);
  const confidenceSpreadPct =
    confidences.length > 1
      ? Math.max(...confidences) - Math.min(...confidences)
      : 0;

  const semanticConflictPct = clamp(
    (input.semantic?.contradictionLanguageJa?.length ?? 0) * 12 +
      (input.semantic?.unsupportedClaimsJa?.length ?? 0) * 8,
  );
  const recommendationDivergencePct = clamp(
    input.mockLayerDisagreement ? 45 : input.strategy ? 15 : 8,
  );
  const rollbackInstabilityPct = clamp(
    (input.recovery?.rollbackDependencyPct ?? 0) +
      (input.recovery?.oscillationRiskPct ?? 0) * 0.35 +
      (input.systemic?.oscillationRiskPct ?? 0) * 0.25,
  );

  const partial = {
    semanticConflictPct,
    recommendationDivergencePct,
    confidenceSpreadPct,
    rollbackInstabilityPct,
  };
  const contradictionRiskPct = computeContradictionRisk(
    participants,
    partial,
    input.mockContradictionBoost ?? 0,
  );

  const governanceStressPct = clamp(
    (input.governance?.vetoLayer ? 25 : 0) +
      (input.systemic?.governanceSaturationPct ?? 0) * 0.5,
  );
  const panicRiskPct = clamp(input.regime?.panicRiskPct ?? 0);
  const stabilityHealthPct = clamp(
    input.systemic?.stabilityHealthScore ?? input.stability?.systemHealthScore ?? 60,
  );
  const uncertaintyPct = clamp(
    input.mockUncertaintyPct ??
      (input.regime?.uncertaintyPct ?? 30) * 0.6 +
        semanticConflictPct * 0.2 +
        (input.regime?.explanationOnlyMode ? 25 : 0),
  );

  return {
    contradictionRiskPct,
    semanticAlignmentPct,
    semanticConflictPct,
    recommendationDivergencePct,
    confidenceSpreadPct,
    rollbackInstabilityPct,
    governanceStressPct,
    panicRiskPct,
    stabilityHealthPct,
    uncertaintyPct,
    freezeSignalPct: clamp(
      (input.systemic?.recursiveFreezeActive ? 30 : 0) +
        (input.regime?.freezeAdaptiveLayers ? 25 : 0) +
        (input.recovery?.recoveryBlocked ? 20 : 0),
    ),
    macroAgreementPct: clamp(input.macro?.macroScore ?? 70),
    finalConsensusPct,
    consensusHealthPct: clamp(
      stabilityHealthPct * 0.25 +
        (input.governance?.consensusScore ?? 50) * 0.25 +
        (input.orchestration?.orchestrationHealthScore ?? 50) * 0.2 +
        (input.recovery?.recoveryHealthPct ?? 50) * 0.15 +
        semanticAlignmentPct * 0.15,
    ),
  };
}

function buildFeatureStatuses(
  partial: Omit<CognitiveArbitrationConsensusBundle, 'featureStatuses'>,
): ArbitrationFeatureStatus[] {
  const s = (
    id: ArbitrationFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ArbitrationFeatureStatus => ({
    id,
    labelJa: ARBITRATION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('layer_output_collector', partial.participantSignals.length >= 5, false, `${partial.participantSignals.length}`),
    s('contradiction_mapper', partial.contradictionRiskPct < 70, partial.contradictionRiskPct >= 45, `${partial.contradictionRiskPct}%`),
    s('semantic_alignment_scorer', partial.semanticAlignmentPct >= 50, partial.semanticAlignmentPct < 40, `${partial.semanticAlignmentPct}%`),
    s('weighted_consensus_engine', partial.finalConsensusPct >= 45, false, `${partial.finalConsensusPct}%`),
    s('governance_validator', !partial.governanceOverrideActive, partial.governanceOverrideActive, 'gov'),
    s('unstable_downgrade_gate', !partial.watchHoldOnly, partial.watchHoldOnly, partial.downgradeReasonJa),
    s('orchestration_handoff', true, false, partial.orchestrationImpactJa),
    s('consensus_timeline', partial.consensusTimeline.length > 0, false, `${partial.consensusTimeline.length}`),
    s('panic_simplified_consensus', partial.consensusState !== 'PANIC_CONSENSUS', partial.consensusState === 'PANIC_CONSENSUS', 'panic'),
    s('hard_conflict_resolver', partial.consensusState !== 'HARD_CONFLICT', partial.consensusState === 'HARD_CONFLICT', 'hard'),
    s('soft_conflict_retainer', partial.consensusState !== 'SOFT_CONFLICT', partial.consensusState === 'SOFT_CONFLICT', 'soft'),
    s('governance_override_guard', !partial.governanceOverrideActive, partial.governanceOverrideActive, 'override'),
    s('unsupported_explanation_mode', !partial.explanationOnlyMode, partial.explanationOnlyMode, 'unsupported'),
    s('freeze_signal_clamp', partial.uncertaintyPct < 75, partial.uncertaintyPct >= 75, 'freeze'),
    s('recommendation_divergence_scan', partial.contradictionRiskPct < 60, false, 'divergence'),
    s('confidence_spread_analyzer', true, false, 'spread'),
    s('rollback_instability_detector', true, false, 'rollback'),
    s('macro_agreement_checker', true, false, 'macro'),
    s('semantic_integrity_meter', partial.semanticAlignmentPct >= 55, false, `${partial.semanticAlignmentPct}`),
    s('mobile_arbitration_debounce', true, false, partial.mobileRuntimeStateJa),
    s('stale_consensus_retain', partial.consensusState === 'SOFT_CONFLICT', false, 'stale'),
    s('background_lightweight_mode', true, false, 'mobile'),
    s('cognitive_consensus_dashboard', true, false, 'panel'),
    s('paper_trading_safety', partial.realTradingEnabled === false, false, 'paper'),
    s('no_central_ai_dictator', true, false, 'distributed'),
    s('uncertainty_preservation', partial.uncertaintyPct > 0, false, `${partial.uncertaintyPct}%`),
    s('participant_priority_queue', true, false, 'priority'),
    s('orchestration_budget_adapter', true, false, `${partial.orchestrationBudgetMax}`),
    s('downgrade_reason_tracker', true, partial.watchHoldOnly, partial.downgradeReasonJa),
  ];
}

export async function buildCognitiveArbitrationConsensusBundle(
  input: BuildCognitiveArbitrationInput,
): Promise<CognitiveArbitrationConsensusBundle> {
  const persisted = await loadCognitiveArbitrationState();
  const started = input.arbitrationStartedAt ?? Date.now();
  const participants = collectParticipants(input);
  const metrics = computeArbitrationMetrics(input, participants);
  const systemicEmergency = input.systemic?.systemicEmergencySafeMode === true;
  const regimePanic =
    input.regime?.currentRegime === 'PANIC' || metrics.panicRiskPct > 70;

  let state = classifyConsensusState(metrics, systemicEmergency);
  if (regimePanic && state === 'CONSENSUS_OK') state = 'PANIC_CONSENSUS';

  const resolution = resolveConsensus(state, metrics, regimePanic);
  const activeParticipantsJa = participants
    .filter((p) => p.active)
    .map((p) => p.id)
    .join(', ');

  const partial: Omit<CognitiveArbitrationConsensusBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: CONSENSUS_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    consensusState: resolution.consensusState,
    consensusStateLabelJa: CONSENSUS_STATE_LABELS_JA[resolution.consensusState],
    finalConsensusPct: metrics.finalConsensusPct,
    contradictionRiskPct: metrics.contradictionRiskPct,
    semanticAlignmentPct: metrics.semanticAlignmentPct,
    consensusHealthPct: metrics.consensusHealthPct,
    uncertaintyPct: metrics.uncertaintyPct,
    governanceOverrideActive: resolution.governanceOverrideActive,
    explanationOnlyMode: resolution.explanationOnlyMode,
    watchHoldOnly: resolution.watchHoldOnly,
    governancePriorityOnly: resolution.governancePriorityOnly,
    orchestrationBudgetMax: resolution.orchestrationBudgetMax,
    orchestrationImpactJa: resolution.orchestrationImpactJa,
    arbitrationLatencyMs: Date.now() - started,
    downgradeReasonJa: resolution.downgradeReasonJa,
    panicInteractionJa: resolution.panicInteractionJa,
    activeParticipantsJa: activeParticipantsJa || '—',
    suppressedLayersJa: resolution.suppressedLayersJa,
    mobileRuntimeStateJa: resolution.mobileRuntimeStateJa,
    consensusSummaryJa: [
      CONSENSUS_STATE_LABELS_JA[resolution.consensusState],
      `consensus ${metrics.finalConsensusPct}% · contradiction ${metrics.contradictionRiskPct}%`,
      metrics.uncertaintyPct > 40 ? '（不確実性あり — 断定禁止）' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    uncertaintyDisclaimerJa: UNCERTAINTY_DISCLAIMER_JA,
    finalConsensusFormulaJa: FINAL_CONSENSUS_FORMULA_JA,
    contradictionFormulaJa: CONTRADICTION_FORMULA_JA,
    consensusHealthFormulaJa: CONSENSUS_HEALTH_FORMULA_JA,
    consensusFlowJa: [...CONSENSUS_FLOW_JA],
    participantSignals: participants,
    consensusTimeline: [
      ...persisted.consensusTimeline,
      {
        at: new Date().toISOString(),
        state: resolution.consensusState,
        contradictionRiskPct: metrics.contradictionRiskPct,
        finalConsensusPct: metrics.finalConsensusPct,
      },
    ].slice(-8),
    explainRuleBasisJa:
      '分散layerの安全合議。governance最優先。中央支配AIではない。攻撃的売買は生成しない。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}