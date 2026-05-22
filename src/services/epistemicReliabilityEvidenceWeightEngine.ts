/**
 * Epistemic Reliability & Evidence Weight — paper only, evidence weighting only.
 */
import {
  CONSENSUS_MERGE_FORMULA_JA,
  CONTRADICTION_PENALTY_FORMULA_JA,
  EPISTEMIC_FEATURE_LABELS,
  EPISTEMIC_FLOW_STEPS_JA,
  EPISTEMIC_REGULATORY_JA,
  EVIDENCE_MAX_AGE_MS,
  EVIDENCE_WEIGHT_FORMULA_JA,
  FRESHNESS_DECAY_FORMULA_JA,
  FRESHNESS_HALF_LIFE_MS,
  GOVERNANCE_AUTHORITY_BASE,
  HALLUCINATION_CLAMP_FORMULA_JA,
  REAL_TRADING_ENABLED,
  RELIABILITY_FORMULA_JA,
  RELIABILITY_FREEZE_FLOW_JA,
  REPLAY_CORRUPTION_TRUST_CAP,
  REPLAY_TRUST_FORMULA_JA,
  TRUST_MATRIX_EDGES,
  TRUST_RECOVERY_FLOW_JA,
  UNSUPPORTED_CONFIDENCE_CAP,
} from '../constants/epistemicReliabilityEvidenceWeight';
import type {
  BuildEpistemicReliabilityInput,
  EpistemicFeatureId,
  EpistemicFeatureStatus,
  EpistemicReliabilityEvidenceWeightBundle,
  EpistemicLayerId,
  EvidenceWeightRow,
  LayerReliabilityRow,
  TrustMatrixEdge,
} from '../types/epistemicReliabilityEvidenceWeight';
import {
  appendReliabilityTimelinePoint,
  loadEpistemicReliabilityState,
} from './epistemicReliabilityEvidenceWeightStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Date.now() - t;
}

function freshnessDecayPct(ageMsVal: number | null): number {
  if (ageMsVal == null || ageMsVal <= 0) return 100;
  return clamp(100 * Math.pow(0.5, ageMsVal / FRESHNESS_HALF_LIFE_MS));
}

function buildLayerRows(input: BuildEpistemicReliabilityInput): LayerReliabilityRow[] {
  const rows: LayerReliabilityRow[] = [];

  const push = (
    layerId: EpistemicLayerId,
    labelJa: string,
    base: number,
    generatedAt: string | null | undefined,
    extraPenalty = 0,
  ) => {
    const age = ageMs(generatedAt);
    const fresh = freshnessDecayPct(age);
    const stale = age != null && age > EVIDENCE_MAX_AGE_MS;
    let score = clamp(base * (fresh / 100) - extraPenalty);
    if (input.reactive && layerId === 'reactive') {
      score = clamp(score - Math.min(20, input.reactive.droppedTotal * 0.5));
    }
    rows.push({
      layerId,
      labelJa,
      reliabilityScore: score,
      evidenceWeightPct: score,
      freshnessPct: fresh,
      stale,
    });
  };

  if (input.stability) {
    push('stability', 'System Stability', input.stability.systemHealthScore, input.stability.generatedAt);
  }
  if (input.governance) {
    let govBase = input.governance.consensusScore;
    if (input.temporal && !input.temporal.governanceFresh) {
      govBase = clamp(govBase * 0.55);
    }
    if (input.governance.vetoLayer) govBase = clamp(govBase + 5);
    push('governance', 'Governance', govBase, input.governance.generatedAt);
  }
  if (input.trace) {
    push('cognitive_trace', 'Cognitive Trace', input.trace.explainableScore, input.trace.generatedAt);
  }
  if (input.temporal) {
    push(
      'temporal',
      'Temporal Integrity',
      input.temporal.stateHealthScore,
      input.temporal.generatedAt,
      input.temporal.rollbackApplied ? 12 : 0,
    );
  }
  if (input.semantic) {
    push(
      'semantic',
      'Semantic Coherence',
      input.semantic.finalDecisionCoherenceScore,
      input.semantic.generatedAt,
      input.semantic.semanticFreeze ? 15 : 0,
    );
  }
  if (input.reactive) {
    push('reactive', 'Reactive', input.reactive.reactiveHealthScore, input.reactive.generatedAt);
  }
  if (input.resource) {
    push('resource', 'Resource Budget', input.resource.resourceHealthScore, input.resource.generatedAt);
  }
  if (input.strategy) {
    push('strategy', 'Strategy', input.strategy.overallConfidencePct, input.strategy.generatedAt);
  }

  return rows;
}

function buildEvidenceWeights(
  input: BuildEpistemicReliabilityInput,
  layers: LayerReliabilityRow[],
): EvidenceWeightRow[] {
  const rows: EvidenceWeightRow[] = [];
  let i = 0;
  const add = (sourceJa: string, base: number, at: string | null | undefined) => {
    const age = ageMs(at);
    const stale = age != null && age > EVIDENCE_MAX_AGE_MS;
    const w = clamp(base * (freshnessDecayPct(age) / 100));
    rows.push({
      id: `ev-${i++}`,
      sourceJa,
      weightPct: w,
      ageMs: age,
      stale,
    });
  };
  if (input.governance) add('Governance summary', input.governance.consensusScore, input.governance.generatedAt);
  if (input.trace) add('Trace summary', input.trace.explainableScore, input.trace.generatedAt);
  for (const m of input.trace?.missingEvidenceJa ?? []) {
    add(`Missing: ${m}`, 20, input.trace?.generatedAt);
  }
  for (const layer of layers.filter((l) => !l.stale).slice(0, 4)) {
    add(layer.labelJa, layer.reliabilityScore, new Date().toISOString());
  }
  return rows.slice(0, 12);
}

function buildTrustMatrix(layers: LayerReliabilityRow[]): TrustMatrixEdge[] {
  const byId = new Map(layers.map((l) => [l.layerId, l.reliabilityScore]));
  return TRUST_MATRIX_EDGES.map((e) => ({
    from: e.from,
    to: e.to,
    trustPct: clamp((e.base + (byId.get(e.from) ?? 50)) / 2),
  }));
}

function computeReplayTrust(input: BuildEpistemicReliabilityInput): number {
  const traceScore = input.trace?.explainableScore ?? 50;
  const integrityOk = input.temporal?.replayIntegrityOk !== false;
  const corruption =
    !integrityOk ||
    input.trace?.recursiveReasonGuardTriggered === true ||
    (input.temporal?.replayFreshnessJa.includes('stale') ?? false);
  let trust = traceScore;
  if (!integrityOk) trust = Math.min(trust, REPLAY_CORRUPTION_TRUST_CAP);
  if (corruption) trust = Math.min(trust, REPLAY_CORRUPTION_TRUST_CAP);
  return clamp(trust);
}

function computeMetrics(
  input: BuildEpistemicReliabilityInput,
  layers: LayerReliabilityRow[],
  unsupported: string[],
  contradictionCount: number,
  replayTrust: number,
): {
  health: number;
  consensus: number;
  govAuthority: number;
  semanticTrust: number;
  temporalTrust: number;
  confidenceDrift: number;
  reliabilityDrift: number;
} {
  const active = layers.filter((l) => !l.stale && l.reliabilityScore > 0);
  const totalW = active.reduce((s, l) => s + l.evidenceWeightPct, 0) || 1;
  let health = active.reduce((s, l) => s + l.reliabilityScore * l.evidenceWeightPct, 0) / totalW;

  const contradictionPenalty = Math.min(25, contradictionCount * 8);
  const unsupportedPenalty = Math.min(20, unsupported.length * 6);
  health -= contradictionPenalty + unsupportedPenalty;
  if (!input.temporal?.replayIntegrityOk) health -= 15;

  const semanticTrust = input.semantic?.finalDecisionCoherenceScore ?? 55;
  const temporalTrust = input.temporal?.consistencyScore ?? 55;
  let govAuthority = GOVERNANCE_AUTHORITY_BASE;
  if (input.governance) {
    govAuthority = clamp(
      input.governance.consensusScore * (input.temporal?.governanceFresh === false ? 0.6 : 1),
    );
  }
  if (input.governance?.vetoLayer) govAuthority = clamp(govAuthority + 10);

  const consensus = clamp(
    50 +
      0.35 * govAuthority +
      0.25 * replayTrust +
      0.2 * semanticTrust +
      0.2 * temporalTrust -
      unsupportedPenalty,
  );

  const traceConf = input.trace?.explainableScore ?? 50;
  const govConf = input.governance?.consensusScore ?? 50;
  const confidenceDrift = Math.abs(traceConf - govConf);

  return {
    health: clamp(health),
    consensus,
    govAuthority,
    semanticTrust,
    temporalTrust,
    confidenceDrift,
    reliabilityDrift: 0,
  };
}

function buildFeatureStatuses(
  partial: Omit<EpistemicReliabilityEvidenceWeightBundle, 'featureStatuses'>,
  input: BuildEpistemicReliabilityInput,
): EpistemicFeatureStatus[] {
  const s = (
    id: EpistemicFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): EpistemicFeatureStatus => ({
    id,
    labelJa: EPISTEMIC_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('layer_reliability_score', partial.layerReliability.length > 0, false, `${partial.layerReliability.length}`),
    s('dynamic_evidence_weight', partial.evidenceWeights.length > 0, false, `${partial.evidenceWeights.length}`),
    s('freshness_reliability_decay', partial.staleEvidenceJa.length < 3, partial.staleEvidenceJa.length > 0, 'decay'),
    s('replay_corruption_penalty', partial.replayTrustPct >= 40, partial.replayTrustPct < REPLAY_CORRUPTION_TRUST_CAP, `${partial.replayTrustPct}`),
    s('governance_authority_weight', partial.governanceAuthorityPct >= 45, partial.governanceAuthorityPct < 40, `${partial.governanceAuthorityPct}`),
    s('reactive_noise_suppression', true, (input.reactive?.droppedTotal ?? 0) > 10, 'noise'),
    s('semantic_confidence_merge', partial.semanticTrustPct >= 50, false, `${partial.semanticTrustPct}`),
    s('temporal_reliability_alignment', partial.temporalTrustPct >= 50, false, `${partial.temporalTrustPct}`),
    s('cross_layer_trust_matrix', partial.trustMatrix.length > 0, false, `${partial.trustMatrix.length}`),
    s('contradiction_reliability_drop', partial.unsupportedClaimsJa.length < 2, partial.unsupportedClaimsJa.length > 0, 'drop'),
    s('unsupported_claim_penalty', partial.unsupportedClaimsJa.length === 0, partial.unsupportedClaimsJa.length > 0, `${partial.unsupportedClaimsJa.length}`),
    s('source_consensus_weight', partial.reliabilityConsensusPct >= 55, false, `${partial.reliabilityConsensusPct}`),
    s('stale_evidence_isolation', partial.staleEvidenceJa.length === 0, partial.staleEvidenceJa.length > 0, `${partial.staleEvidenceJa.length}`),
    s('reliability_drift_detector', partial.reliabilityDriftPct < 15, partial.reliabilityDriftPct >= 15, `${partial.reliabilityDriftPct}`),
    s('replay_trust_validator', partial.replayTrustPct >= 50, partial.replayTrustPct < 30, `${partial.replayTrustPct}`),
    s('governance_override_authority', true, input.governance?.humanOverrideActive === true, 'override'),
    s('confidence_saturation_guard', partial.confidenceDriftPct < 25, partial.confidenceDriftPct >= 25, `${partial.confidenceDriftPct}`),
    s('hallucination_reliability_clamp', partial.unsupportedClaimsJa.length < 3, partial.unsupportedClaimsJa.length >= 3, 'clamp'),
    s('ai_confidence_compression', true, false, 'compress'),
    s('layer_trust_recovery', partial.reliabilityHealthScore >= 55, false, 'recovery'),
    s('reliability_replay_timeline', partial.reliabilityTimeline.length > 0, false, `${partial.reliabilityTimeline.length}`),
    s('evidence_aging_engine', partial.staleEvidenceJa.length < 4, partial.staleEvidenceJa.length >= 4, 'aging'),
    s('confidence_divergence_detector', partial.confidenceDriftPct < 20, partial.confidenceDriftPct >= 20, `${partial.confidenceDriftPct}`),
    s('semantic_trust_alignment', partial.semanticTrustPct >= 55, false, `${partial.semanticTrustPct}`),
    s('multi_layer_reliability_consensus', partial.reliabilityConsensusPct >= 50, partial.reliabilityConsensusPct < 45, `${partial.reliabilityConsensusPct}`),
    s('explainability_reliability_merge', !!input.trace, !input.trace, 'trace'),
    s('reliability_freeze', !partial.reliabilityFreeze, partial.reliabilityFreeze, partial.reliabilityFreeze ? 'yes' : 'no'),
    s('reliability_health_score', partial.reliabilityHealthScore >= 55, partial.reliabilityHealthScore < 40, `${partial.reliabilityHealthScore}`),
    s('reliability_dashboard', true, false, 'panel'),
    s('emergency_reliability_fallback', !partial.emergencyFallbackApplied, partial.emergencyFallbackApplied, 'fallback'),
  ];
}

export async function buildEpistemicReliabilityEvidenceWeightBundle(
  input: BuildEpistemicReliabilityInput,
): Promise<EpistemicReliabilityEvidenceWeightBundle> {
  const persisted = await loadEpistemicReliabilityState();
  const unsupported = [
    ...(input.semantic?.unsupportedClaimsJa ?? []),
    ...(input.trace?.missingEvidenceJa.map((m) => `trace: ${m}`) ?? []),
  ];
  const contradictionCount =
    (input.semantic?.contradictionLanguageJa.length ?? 0) +
    (input.temporal?.driftScore && input.temporal.driftScore > 18 ? 1 : 0) +
    (input.governance?.contradictionDetected ? 1 : 0);

  const layerReliability = buildLayerRows(input);
  const evidenceWeights = buildEvidenceWeights(input, layerReliability);
  const trustMatrix = buildTrustMatrix(layerReliability);
  const replayTrustPct = computeReplayTrust(input);

  const metrics = computeMetrics(
    input,
    layerReliability,
    unsupported,
    contradictionCount,
    replayTrustPct,
  );

  const reliabilityDriftPct = await appendReliabilityTimelinePoint({
    at: new Date().toISOString(),
    healthScore: metrics.health,
    consensusPct: metrics.consensus,
  });

  const staleEvidenceJa = [
    ...layerReliability.filter((l) => l.stale).map((l) => `${l.labelJa} stale`),
    ...evidenceWeights.filter((e) => e.stale).map((e) => e.sourceJa),
    ...(input.temporal && !input.temporal.governanceFresh ? ['governance authority decay'] : []),
  ];

  const reliabilityFreeze =
    metrics.health < 40 ||
    input.temporal?.emergencyStateFreeze === true ||
    replayTrustPct < 20 ||
    unsupported.length >= 3 ||
    input.semantic?.semanticFreeze === true;

  const emergencyFallbackApplied =
    reliabilityFreeze || input.temporal?.rollbackApplied === true;

  const emergencyFallbackJa = emergencyFallbackApplied
    ? '信頼度異常 — buy→watch / reduce→hold のみ許可。新規売買戦略は生成しません。'
    : null;

  const partial: Omit<EpistemicReliabilityEvidenceWeightBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: EPISTEMIC_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    reliabilityHealthScore: metrics.health,
    healthLabelJa:
      metrics.health >= 75
        ? '信頼度良好'
        : metrics.health >= 50
          ? '信頼度注意'
          : '信頼度低下 — fallback',
    reliabilityConsensusPct: metrics.consensus,
    governanceAuthorityPct: metrics.govAuthority,
    replayTrustPct,
    semanticTrustPct: metrics.semanticTrust,
    temporalTrustPct: metrics.temporalTrust,
    confidenceDriftPct: metrics.confidenceDrift,
    reliabilityDriftPct,
    layerReliability,
    evidenceWeights,
    trustMatrix,
    staleEvidenceJa,
    unsupportedClaimsJa: unsupported,
    reliabilityTimeline: [
      ...persisted.reliabilityTimeline,
      {
        at: new Date().toISOString(),
        healthScore: metrics.health,
        consensusPct: metrics.consensus,
      },
    ].slice(-12),
    reliabilityFreeze,
    emergencyFallbackApplied,
    emergencyFallbackJa,
    reliabilityFormulaJa: RELIABILITY_FORMULA_JA,
    evidenceWeightFormulaJa: EVIDENCE_WEIGHT_FORMULA_JA,
    freshnessDecayFormulaJa: FRESHNESS_DECAY_FORMULA_JA,
    contradictionPenaltyFormulaJa: CONTRADICTION_PENALTY_FORMULA_JA,
    consensusMergeFormulaJa: CONSENSUS_MERGE_FORMULA_JA,
    hallucinationClampFormulaJa: HALLUCINATION_CLAMP_FORMULA_JA,
    replayTrustFormulaJa: REPLAY_TRUST_FORMULA_JA,
    reliabilityFlowJa: [...EPISTEMIC_FLOW_STEPS_JA],
    trustRecoveryFlowJa: [...TRUST_RECOVERY_FLOW_JA],
    reliabilityFreezeFlowJa: [...RELIABILITY_FREEZE_FLOW_JA],
    reliabilitySummaryJa: [
      `health ${metrics.health}/100 · consensus ${metrics.consensus}%`,
      `gov ${metrics.govAuthority}% · replay ${replayTrustPct}%`,
      `unsupported ${unsupported.length} · drift ${reliabilityDriftPct}`,
      emergencyFallbackApplied ? 'emergency fallback ON' : 'normal',
    ].join(' — '),
    explainRuleBasisJa:
      '全 layer の reliability を重み付け。説明・confidence のみ調整し売買ロジックは新規生成しない。',
  };

  const featureStatuses = buildFeatureStatuses(partial, input);
  return { ...partial, featureStatuses };
}
