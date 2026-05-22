/**
 * Semantic Consistency & Decision Coherence — paper only, no orders.
 */
import {
  BEARISH_TERMS,
  BULLISH_TERMS,
  COHERENCE_SCORE_FORMULA_JA,
  CONTRADICTION_DETECTION_FORMULA_JA,
  EMOTIONAL_TERMS,
  EXPLANATION_MAX_AGE_MS,
  HALLUCINATION_GUARD_FLOW_JA,
  NARRATIVE_DOWNGRADE_FLOW_JA,
  SEMANTIC_FEATURE_LABELS,
  SEMANTIC_FLOW_STEPS_JA,
  SEMANTIC_FREEZE_CONDITION_JA,
  SEMANTIC_REGULATORY_JA,
  STALE_ISOLATION_FLOW_JA,
  TRACE_TO_NARRATIVE_FLOW_JA,
  UNSUPPORTED_CLAIM_PATTERNS,
} from '../constants/semanticConsistencyDecisionCoherence';
import type {
  BuildSemanticConsistencyInput,
  NarrativeConsensusRow,
  SemanticConsistencyDecisionCoherenceBundle,
  SemanticDirection,
  SemanticFeatureId,
  SemanticFeatureStatus,
} from '../types/semanticConsistencyDecisionCoherence';
import type { StrategyAction } from '../types/strategyExecution';
import { appendNarrativeHistory, loadSemanticNarrativeState } from './semanticConsistencyDecisionCoherenceStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Date.now() - t;
}

function decisionDirection(d: StrategyAction): SemanticDirection {
  if (d === 'buy') return 'bullish';
  if (d === 'avoid' || d === 'reduce') return 'bearish';
  return 'neutral';
}

function textDirection(text: string): SemanticDirection {
  const lower = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  for (const t of BULLISH_TERMS) if (lower.includes(t.toLowerCase())) bull++;
  for (const t of BEARISH_TERMS) if (lower.includes(t.toLowerCase())) bear++;
  if (bull > bear + 1) return 'bullish';
  if (bear > bull + 1) return 'bearish';
  return 'neutral';
}

function collectTexts(input: BuildSemanticConsistencyInput): string[] {
  const out: string[] = [];
  if (input.governance?.unifiedAiSummaryJa) out.push(input.governance.unifiedAiSummaryJa);
  if (input.trace?.explainableSummaryJa) out.push(input.trace.explainableSummaryJa);
  if (input.strategy?.regimeStrategyJa) out.push(input.strategy.regimeStrategyJa);
  for (const r of input.strategy?.todayRecommendations ?? []) {
    out.push(r.whyProposedJa);
    out.push(r.analystExplanationJa);
  }
  return out;
}

function detectContradictionLanguage(
  texts: string[],
  finalDir: SemanticDirection,
): string[] {
  const out: string[] = [];
  for (const text of texts) {
    const td = textDirection(text);
    if (td === 'neutral' || finalDir === 'neutral') continue;
    if (td !== finalDir) {
      out.push(`説明は${td}寄りだが最終判断は${finalDir}`);
    }
    const hasBull = BULLISH_TERMS.some((t) => text.includes(t));
    const hasBear = BEARISH_TERMS.some((t) => text.includes(t));
    if (hasBull && hasBear) out.push('同一文内で強気・弱気が混在');
  }
  return out.slice(0, 6);
}

function detectUnsupportedClaims(
  input: BuildSemanticConsistencyInput,
  texts: string[],
): string[] {
  const out: string[] = [];
  for (const text of texts) {
    for (const pat of UNSUPPORTED_CLAIM_PATTERNS) {
      if (pat.test(text)) out.push(`断定表現: ${text.slice(0, 40)}…`);
    }
  }
  for (const m of input.trace?.missingEvidenceJa ?? []) {
    out.push(`証拠不足: ${m}`);
  }
  if (!input.governance && texts.some((t) => t.includes('Governance'))) {
    out.push('Governance 未ロードへの言及');
  }
  return [...new Set(out)].slice(0, 8);
}

function detectStaleExplanations(input: BuildSemanticConsistencyInput): string[] {
  const out: string[] = [];
  const govAge = ageMs(input.governance?.generatedAt);
  if (govAge != null && govAge > EXPLANATION_MAX_AGE_MS) {
    out.push(`governance 説明 ${Math.round(govAge / 60000)}分前`);
  }
  const traceAge = ageMs(input.trace?.generatedAt);
  if (traceAge != null && traceAge > EXPLANATION_MAX_AGE_MS) {
    out.push(`trace 説明 ${Math.round(traceAge / 60000)}分前`);
  }
  if (input.temporal && !input.temporal.governanceFresh) {
    out.push('temporal: governance stale');
  }
  return out;
}

function detectEmotionalBias(texts: string[]): string[] {
  return texts
    .filter((t) => EMOTIONAL_TERMS.some((e) => t.includes(e)))
    .map((t) => `感情語: ${t.slice(0, 30)}…`)
    .slice(0, 4);
}

function sanitizeSummary(text: string): string {
  let s = text;
  for (const pat of UNSUPPORTED_CLAIM_PATTERNS) {
    s = s.replace(pat, '（断定回避）');
  }
  for (const e of EMOTIONAL_TERMS) {
    if (s.includes(e)) s = s.replace(e, '注意');
  }
  return s.slice(0, 600);
}

function buildNarrativeConsensus(input: BuildSemanticConsistencyInput): NarrativeConsensusRow[] {
  const rows: NarrativeConsensusRow[] = [];
  if (input.governance) {
    const dir =
      input.governance.finalDecision === 'buy'
        ? 'bullish'
        : input.governance.finalDecision === 'avoid'
          ? 'bearish'
          : 'neutral';
    rows.push({
      sourceJa: 'Governance',
      direction: dir,
      weightPct: 35,
    });
  }
  if (input.trace) {
    rows.push({
      sourceJa: 'Explainability Trace',
      direction: textDirection(input.trace.explainableSummaryJa),
      weightPct: 30,
    });
  }
  if (input.strategy) {
    rows.push({
      sourceJa: 'Strategy',
      direction: textDirection(input.strategy.regimeStrategyJa),
      weightPct: 20,
    });
  }
  if (input.temporal) {
    rows.push({
      sourceJa: 'Temporal Integrity',
      direction: input.temporal.rollbackApplied ? 'bearish' : 'neutral',
      weightPct: 15,
    });
  }
  return rows;
}

function confidenceWording(merged: number, riskHigh: boolean): string {
  if (riskHigh) return '高リスク — 断定を避け、監視・保留の表現のみ';
  if (merged >= 75) return '信頼度は高めだが、売買断定は避ける';
  if (merged >= 50) return '中程度 — 条件付きの表現';
  return '低 — 「不明」「要確認」を優先';
}

function buildTraceToNarrative(input: BuildSemanticConsistencyInput): string[] {
  const chain = input.trace?.causalChainJa ?? input.trace?.reasoningChainJa ?? [];
  return chain.slice(0, 8).map((line, i) => `${i + 1}. ${line}`);
}

function computeScores(
  input: BuildSemanticConsistencyInput,
  contradictions: string[],
  unsupported: string[],
  stale: string[],
  emotional: string[],
  meaningMismatch: boolean,
  drifted: boolean,
): { coherence: number; nlIntegrity: number; merged: number } {
  const govConf = input.governance?.consensusScore ?? 50;
  const traceConf = input.trace?.explainableScore ?? 50;
  const merged = clamp(traceConf * 0.6 + govConf * 0.4);

  let coherence = 100;
  if (meaningMismatch) coherence -= 20;
  coherence -= Math.min(30, contradictions.length * 10);
  coherence -= Math.min(15, unsupported.length * 5);
  if (drifted) coherence -= 12;
  coherence -= Math.min(10, stale.length * 5);
  coherence -= Math.min(8, emotional.length * 4);
  if (input.temporal && input.temporal.driftScore > 18) coherence -= 10;

  let nl = coherence;
  if (input.trace?.missingEvidenceJa.length) nl -= 8;
  if (input.resource?.emergencyComputeCut) nl -= 10;

  return { coherence: clamp(coherence), nlIntegrity: clamp(nl), merged };
}

function buildFeatureStatuses(
  partial: Omit<SemanticConsistencyDecisionCoherenceBundle, 'featureStatuses'>,
  input: BuildSemanticConsistencyInput,
): SemanticFeatureStatus[] {
  const s = (
    id: SemanticFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): SemanticFeatureStatus => ({
    id,
    labelJa: SEMANTIC_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('decision_meaning_validator', partial.finalDecisionCoherenceScore >= 60, partial.finalDecisionCoherenceScore < 50, `${partial.finalDecisionCoherenceScore}`),
    s('bullish_bearish_semantic_diff', partial.semanticDirection !== 'neutral', false, partial.semanticDirectionLabelJa),
    s('recommendation_tone_alignment', partial.naturalLanguageIntegrityScore >= 55, false, 'tone'),
    s('governance_narrative_sync', partial.governanceNarrativeSyncJa.length > 5, false, 'synced'),
    s('contradiction_language_detector', partial.contradictionLanguageJa.length === 0, partial.contradictionLanguageJa.length > 0, `${partial.contradictionLanguageJa.length}`),
    s('replay_narrative_consistency', !!partial.semanticReplayDiffJa, false, partial.semanticReplayDiffJa ?? 'same'),
    s('downgrade_explanation_sync', !!partial.downgradeNarrativeJa, false, partial.downgradeNarrativeJa ?? 'none'),
    s('confidence_language_scaling', true, false, partial.confidenceWordingJa.slice(0, 30)),
    s('stale_explanation_isolation', partial.staleExplanationJa.length === 0, partial.staleExplanationJa.length > 0, `${partial.staleExplanationJa.length}`),
    s('veto_narrative_injection', !!partial.vetoNarrativeJa, false, partial.vetoNarrativeJa ?? 'none'),
    s('drifted_narrative_detector', !partial.driftedNarrativeJa, !!partial.driftedNarrativeJa, partial.driftedNarrativeJa ?? 'ok'),
    s('final_decision_coherence_score', partial.finalDecisionCoherenceScore >= 65, partial.finalDecisionCoherenceScore < 45, `${partial.finalDecisionCoherenceScore}`),
    s('risk_language_enforcement', !partial.confidenceWordingJa.includes('高リスク'), partial.confidenceWordingJa.includes('高リスク'), 'risk'),
    s('hallucination_explanation_guard', partial.unsupportedClaimsJa.length < 3, partial.unsupportedClaimsJa.length >= 3, 'guard'),
    s('unsupported_claim_detector', partial.unsupportedClaimsJa.length === 0, partial.unsupportedClaimsJa.length > 0, `${partial.unsupportedClaimsJa.length}`),
    s('ai_summary_sanitizer', true, false, 'sanitized'),
    s('semantic_replay_diff', !!partial.semanticReplayDiffJa, false, 'diff'),
    s('governance_override_narrative', !input.governance?.humanOverrideActive, input.governance?.humanOverrideActive === true, 'override'),
    s('causal_narrative_alignment', partial.causalNarrativeAlignmentJa.length > 5, false, 'aligned'),
    s('explainability_confidence_merge', partial.explainabilityConfidenceMerged >= 50, false, `${partial.explainabilityConfidenceMerged}`),
    s('strategy_narrative_validator', !!input.strategy, !input.strategy, 'strategy'),
    s('emotional_bias_limiter', partial.contradictionLanguageJa.every((c) => !c.includes('感情')), false, 'bias'),
    s('autonomous_tone_restriction', true, false, 'no auto assert'),
    s('recommendation_downgrade_narrator', !!partial.downgradeNarrativeJa, false, 'narrator'),
    s('semantic_freeze', !partial.semanticFreeze, partial.semanticFreeze, partial.semanticFreeze ? 'frozen' : 'active'),
    s('natural_language_integrity_score', partial.naturalLanguageIntegrityScore >= 60, partial.naturalLanguageIntegrityScore < 50, `${partial.naturalLanguageIntegrityScore}`),
    s('trace_to_narrative_mapper', partial.traceToNarrativeJa.length > 0, false, `${partial.traceToNarrativeJa.length}`),
    s('multi_layer_narrative_consensus', partial.narrativeConsensus.length >= 2, false, `${partial.narrativeConsensus.length}`),
    s('semantic_dashboard', true, false, 'panel'),
    s('emergency_narrative_fallback', !partial.emergencyNarrativeFallbackJa, !!partial.emergencyNarrativeFallbackJa, 'fallback'),
  ];
}

export async function buildSemanticConsistencyDecisionCoherenceBundle(
  input: BuildSemanticConsistencyInput,
): Promise<SemanticConsistencyDecisionCoherenceBundle> {
  await loadSemanticNarrativeState();
  const texts = collectTexts(input);
  const combined = texts.join(' ');
  const finalDir = decisionDirection(input.finalDecision);
  const textDir = textDirection(combined);
  const meaningMismatch = finalDir !== 'neutral' && textDir !== 'neutral' && finalDir !== textDir;

  const contradictionLanguageJa = detectContradictionLanguage(texts, finalDir);
  const unsupportedClaimsJa = detectUnsupportedClaims(input, texts);
  const staleExplanationJa = detectStaleExplanations(input);
  const emotional = detectEmotionalBias(texts);
  const drifted =
    input.temporal != null && input.temporal.driftScore > 18
      ? `説明ドリフト: governance/trace 差 ${input.temporal.driftScore}`
      : null;

  const scores = computeScores(
    input,
    contradictionLanguageJa,
    unsupportedClaimsJa,
    staleExplanationJa,
    emotional,
    meaningMismatch,
    !!drifted,
  );

  const riskHigh =
    input.resource?.emergencyComputeCut === true ||
    input.temporal?.emergencyStateFreeze === true ||
    (input.governance?.consensusScore ?? 100) < 45;

  const semanticFreeze =
    scores.coherence < 40 ||
    input.temporal?.emergencyStateFreeze === true ||
    unsupportedClaimsJa.length >= 3 ||
    (contradictionLanguageJa.length >= 2 && input.finalDecision === 'buy');

  const vetoNarrativeJa = input.governance?.vetoReasonJa
    ? `[Veto ${input.governance.vetoLayerLabelJa ?? ''}] ${input.governance.vetoReasonJa}`
    : null;

  const downgradeParts = [
    ...(input.governance?.downgradedRecommendations.map(
      (d) => `${d.symbol}: ${d.fromAction}→${d.toAction} — ${d.reasonJa}`,
    ) ?? []),
    ...(input.trace?.downgradeReasonChain ?? []),
  ];
  const downgradeNarrativeJa =
    downgradeParts.length > 0 ? downgradeParts.slice(0, 4).join(' · ') : null;

  const govSync = input.governance
    ? sanitizeSummary(input.governance.unifiedAiSummaryJa)
    : 'Governance 未適用';

  const traceNarrative = buildTraceToNarrative(input);
  const causalNarrativeAlignmentJa =
    traceNarrative.length > 0
      ? `因果 ${traceNarrative.length} ステップと ${finalDir} 判断を同期`
      : '因果説明なし';

  const summaryForHistory = semanticFreeze
    ? '安全説明モード'
    : sanitizeSummary(
        [govSync, input.trace?.explainableSummaryJa ?? ''].filter(Boolean).join(' — '),
      );

  const semanticReplayDiffJa = await appendNarrativeHistory(
    summaryForHistory,
    input.finalDecision,
  );

  const emergencyNarrativeFallbackJa = semanticFreeze
    ? '意味的矛盾または整合性低下のため、断定・売買推奨を含む説明を停止しました。Paper Trading の監視・保留のみを参照してください。'
    : null;

  const partial: Omit<SemanticConsistencyDecisionCoherenceBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: SEMANTIC_REGULATORY_JA,
    paperTradingOnly: true,
    finalDecisionCoherenceScore: scores.coherence,
    naturalLanguageIntegrityScore: scores.nlIntegrity,
    healthLabelJa:
      scores.coherence >= 75
        ? '意味的一貫'
        : scores.coherence >= 50
          ? '表現要注意'
          : '意味矛盾 — freeze/fallback',
    semanticDirection: finalDir,
    semanticDirectionLabelJa:
      finalDir === 'bullish' ? '強気' : finalDir === 'bearish' ? '弱気' : '中立',
    explainabilityConfidenceMerged: scores.merged,
    contradictionLanguageJa,
    staleExplanationJa,
    unsupportedClaimsJa,
    vetoNarrativeJa,
    downgradeNarrativeJa,
    confidenceWordingJa: confidenceWording(scores.merged, riskHigh),
    driftedNarrativeJa: drifted,
    semanticReplayDiffJa,
    governanceNarrativeSyncJa: govSync,
    causalNarrativeAlignmentJa,
    traceToNarrativeJa: traceNarrative,
    narrativeConsensus: buildNarrativeConsensus(input),
    semanticFreeze,
    emergencyNarrativeFallbackJa,
    explanationFreshnessJa:
      staleExplanationJa.length === 0 ? 'fresh' : `stale: ${staleExplanationJa[0]}`,
    coherenceScoreFormulaJa: COHERENCE_SCORE_FORMULA_JA,
    contradictionDetectionFormulaJa: CONTRADICTION_DETECTION_FORMULA_JA,
    semanticFlowJa: [...SEMANTIC_FLOW_STEPS_JA],
    narrativeDowngradeFlowJa: [...NARRATIVE_DOWNGRADE_FLOW_JA],
    staleIsolationFlowJa: [...STALE_ISOLATION_FLOW_JA],
    hallucinationGuardFlowJa: [...HALLUCINATION_GUARD_FLOW_JA],
    traceToNarrativeFlowJa: [...TRACE_TO_NARRATIVE_FLOW_JA],
    semanticFreezeConditionJa: SEMANTIC_FREEZE_CONDITION_JA,
    semanticSummaryJa: semanticFreeze
      ? emergencyNarrativeFallbackJa!
      : [
          `整合 ${scores.coherence}/100 · 方向 ${finalDir}`,
          `矛盾語 ${contradictionLanguageJa.length} · 未証拠 ${unsupportedClaimsJa.length}`,
          vetoNarrativeJa ? 'veto 記載あり' : 'veto なし',
        ].join(' — '),
    explainRuleBasisJa:
      'Governance/Trace/Strategy/Temporal の自然文を横断検証。新規売買断定は生成しません。',
  };

  const featureStatuses = buildFeatureStatuses(partial, input);
  return { ...partial, featureStatuses };
}
