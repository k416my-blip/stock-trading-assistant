/**
 * Explainable Cognitive Trace — full reasoning trace (paper only, no orders).
 */
import {
  CAUSAL_GRAPH_EDGES,
  CONFIDENCE_EVOLUTION_FORMULA_JA,
  CONTRADICTION_TRACE_FORMULA_JA,
  EXPLAINABLE_SCORE_FORMULA_JA,
  REASONING_FLOW_STEPS_JA,
  TRACE_FEATURE_LABELS,
  TRACE_REGULATORY_JA,
} from '../constants/explainableCognitiveTrace';
import { HIERARCHY_WEIGHT_BY_ID } from '../constants/aiGovernanceDecision';
import type { GovernanceLayerId } from '../types/aiGovernanceDecision';
import type {
  BuildExplainableCognitiveTraceInput,
  ConfidenceEvolutionPoint,
  ConsensusBreakdownRow,
  DecisionTimelineStep,
  ExplainableCognitiveTraceBundle,
  InfluenceEdge,
  ReasonWeightNode,
  TraceFeatureId,
  TraceFeatureStatus,
  TraceLayerId,
} from '../types/explainableCognitiveTrace';
import type { StrategyAction } from '../types/strategyExecution';
import {
  appendCognitiveTraceReplay,
  loadCognitiveTraceState,
  saveCognitiveTraceState,
} from './explainableCognitiveTraceStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function actionLabelJa(a: StrategyAction): string {
  const m: Record<StrategyAction, string> = {
    buy: '買い',
    reduce: '減らす',
    hold: '保有',
    avoid: '回避',
    watch: '監視',
  };
  return m[a];
}

function mapGovLayer(id: GovernanceLayerId): TraceLayerId {
  return id;
}

function stanceJa(s: string): string {
  if (s === 'bullish') return '強気';
  if (s === 'bearish') return '弱気';
  if (s === 'block') return '拒否';
  return '中立';
}

function buildTimeline(input: BuildExplainableCognitiveTraceInput): DecisionTimelineStep[] {
  const steps: DecisionTimelineStep[] = [];
  let order = 1;
  const push = (layerId: TraceLayerId, eventJa: string, outcomeJa: string) => {
    steps.push({
      order: order++,
      at: new Date().toISOString(),
      layerId,
      eventJa,
      outcomeJa,
    });
  };

  if (input.reactive) {
    push(
      'reactive_orchestration',
      'イベント処理',
      `recompute ${input.reactive.recomputePerSec}/s · selective ${input.reactive.selectiveRecomputeActive}`,
    );
  }
  if (input.stability) {
    push(
      'system_stability',
      '健全性監査',
      `health ${input.stability.systemHealthScore} — ${input.stability.healthLabelJa}`,
    );
  }
  if (input.dataReliability) {
    push(
      'data_reliability',
      'データ信頼性',
      `品質 ${input.dataReliability.globalDataQualityScore} · gate ${input.dataReliability.aiInputGateOpen ? '開' : '閉'}`,
    );
  }
  if (input.macro) {
    push(
      'macro',
      'マクロ評価',
      `${input.macro.worldRegime.labelJa} · score ${input.macro.macroScore}`,
    );
  }
  if (input.portfolioRisk) {
    push(
      'portfolio_risk',
      'ポートフォリオリスク',
      `品質 ${input.portfolioRisk.portfolioQualityScore} · escalation ${input.portfolioRisk.riskEscalationActive}`,
    );
  }
  if (input.strategy) {
    const top = input.strategy.todayRecommendations[0];
    push(
      'ai_recommendation',
      'AI推奨',
      top ? `${top.symbol} ${actionLabelJa(top.action)} (${top.confidencePct}%)` : '候補なし',
    );
  }
  if (input.governance) {
    push(
      'governance',
      '最終裁定',
      `${actionLabelJa(input.governance.finalDecision)} · consensus ${input.governance.consensusScore}`,
    );
  }
  return steps;
}

function buildInfluenceGraph(input: BuildExplainableCognitiveTraceInput): InfluenceEdge[] {
  const edges: InfluenceEdge[] = CAUSAL_GRAPH_EDGES.map((e) => ({
    from: e.from,
    to: e.to,
    weightPct: 10,
    noteJa: e.noteJa,
  }));
  if (input.governance) {
    for (const row of input.governance.activeHierarchy) {
      if (!row.active) continue;
      const w = Math.round((HIERARCHY_WEIGHT_BY_ID[row.layerId as GovernanceLayerId] ?? 0.1) * 100);
      edges.push({
        from: mapGovLayer(row.layerId as GovernanceLayerId),
        to: 'governance',
        weightPct: w,
        noteJa: `${row.labelJa} → 裁定 (${stanceJa(row.stance)})`,
      });
    }
  }
  return edges.slice(0, 14);
}

function buildConsensusBreakdown(input: BuildExplainableCognitiveTraceInput): ConsensusBreakdownRow[] {
  if (!input.governance) return [];
  const totalW = input.governance.activeHierarchy
    .filter((r) => r.active)
    .reduce((s, r) => s + (HIERARCHY_WEIGHT_BY_ID[r.layerId as GovernanceLayerId] ?? 0) * r.healthWeight, 0);
  return input.governance.activeHierarchy
    .filter((r) => r.active)
    .map((r) => {
      const w = (HIERARCHY_WEIGHT_BY_ID[r.layerId as GovernanceLayerId] ?? 0) * r.healthWeight;
      return {
        layerId: mapGovLayer(r.layerId as GovernanceLayerId),
        labelJa: r.labelJa,
        stanceJa: stanceJa(r.stance),
        weightPct: Math.round(w * 100),
        contributionPct: totalW > 0 ? Math.round((w / totalW) * 100) : 0,
      };
    });
}

function buildReasonWeightTree(input: BuildExplainableCognitiveTraceInput): ReasonWeightNode[] {
  const nodes: ReasonWeightNode[] = [];
  if (input.stability) {
    nodes.push({
      id: 'stab',
      labelJa: 'System Stability',
      deltaPct: input.stability.systemHealthScore - 50,
      direction: input.stability.systemHealthScore >= 55 ? 'support' : 'oppose',
      detailJa: input.stability.integritySummaryJa,
    });
  }
  if (input.dataReliability) {
    nodes.push({
      id: 'data',
      labelJa: 'Data Reliability',
      deltaPct: input.dataReliability.globalDataQualityScore - 50,
      direction: input.dataReliability.aiInputGateOpen ? 'support' : 'oppose',
      detailJa: input.dataReliability.aiGateNoteJa,
    });
  }
  if (input.governance) {
    nodes.push({
      id: 'gov',
      labelJa: 'Governance Consensus',
      deltaPct: input.governance.consensusScore - 50,
      direction: input.governance.consensusScore >= 55 ? 'support' : 'oppose',
      detailJa: input.governance.unifiedAiSummaryJa,
    });
  }
  if (input.portfolioRisk?.riskEscalationActive) {
    nodes.push({
      id: 'risk',
      labelJa: 'Risk Escalation',
      deltaPct: -20,
      direction: 'oppose',
      detailJa: input.portfolioRisk.riskEscalationBannerJa ?? 'escalation',
    });
  }
  return nodes;
}

function buildCausalChain(
  timeline: DecisionTimelineStep[],
  input: BuildExplainableCognitiveTraceInput,
): string[] {
  const chain = timeline.map((t) => `${t.order}. [${t.layerId}] ${t.eventJa} → ${t.outcomeJa}`);
  if (input.governance?.vetoReasonJa) {
    chain.push(`Veto: ${input.governance.vetoReasonJa}`);
  }
  if (input.governance?.contradictionDetected) {
    chain.push(`矛盾: ${input.governance.contradictionDetailJa ?? '層間逆方向'}`);
  }
  for (const d of input.governance?.downgradedRecommendations ?? []) {
    chain.push(`Downgrade ${d.symbol}: ${d.fromAction}→${d.toAction} — ${d.reasonJa}`);
  }
  return chain;
}

function buildReasoningChain(causalChain: string[]): string[] {
  return causalChain.slice(0, 12);
}

function computeExplainableScore(
  input: BuildExplainableCognitiveTraceInput,
  causalChain: string[],
  missingEvidence: string[],
  recursiveLoop: boolean,
): number {
  let score = 100;
  if (!input.governance) score -= 20;
  if (causalChain.length < 3) score -= 15;
  if (missingEvidence.length > 0) score -= Math.min(10, missingEvidence.length * 3);
  if (input.marketContext.symbols.some((s) => s.stale)) score -= 10;
  if (recursiveLoop) score -= 15;
  if (!input.strategy) score -= 8;
  return clamp(score);
}

function detectMissingEvidence(input: BuildExplainableCognitiveTraceInput): string[] {
  const out: string[] = [];
  if (!input.dataReliability) out.push('Data Reliability 未ロード');
  if (input.dataReliability && !input.dataReliability.aiInputGateOpen) {
    out.push('AIゲート閉鎖 — 強い判断の根拠不足');
  }
  for (const s of input.marketContext.symbols) {
    if (s.dataQualityScore != null && s.dataQualityScore < 45) {
      out.push(`${s.symbol}: データ品質 ${s.dataQualityScore}`);
    }
    if (s.intradayChangePct == null) {
      out.push(`${s.symbol}: 価格変化不明`);
    }
  }
  return out;
}

function buildWeakSignals(input: BuildExplainableCognitiveTraceInput): string[] {
  const weak: string[] = [];
  if (input.strategy) {
    for (const r of input.strategy.todayRecommendations) {
      if (r.confidencePct < 55) weak.push(`${r.symbol}: confidence ${r.confidencePct}%`);
    }
  }
  if (input.governance && input.governance.aggregatedConfidencePct < 50) {
    weak.push(`統合 confidence ${input.governance.aggregatedConfidencePct}%`);
  }
  return weak.slice(0, 6);
}

function buildSourceWeights(input: BuildExplainableCognitiveTraceInput): Array<{
  sourceJa: string;
  weightPct: number;
}> {
  const q = input.dataReliability?.globalDataQualityScore ?? 50;
  return [
    { sourceJa: '株価・OHLCV', weightPct: clamp(q) },
    { sourceJa: 'ニュース/API', weightPct: clamp((input.dataReliability?.globalDataQualityScore ?? 50) * 0.9) },
    { sourceJa: 'マクロレジーム', weightPct: clamp(input.macro?.macroScore ?? 50) },
    { sourceJa: 'Paper執行ログ', weightPct: clamp(input.execution?.trustScore ?? 60) },
  ];
}

function buildHealthImpact(input: BuildExplainableCognitiveTraceInput): string[] {
  const lines: string[] = [];
  if (input.stability) {
    lines.push(`Stability ${input.stability.systemHealthScore}/100 → refresh/render 抑制`);
    if (input.stability.emergencyReadOnlyActive) lines.push('Read-only — 強気判断ブロック');
  }
  if (input.reactive) {
    lines.push(`Reactive health ${input.reactive.reactiveHealthScore} · dropped ${input.reactive.droppedTotal}`);
  }
  return lines;
}

function buildConfidenceEvolution(
  input: BuildExplainableCognitiveTraceInput,
  persisted: Awaited<ReturnType<typeof loadCognitiveTraceState>>,
): ConfidenceEvolutionPoint[] {
  const now = new Date().toISOString();
  const points: ConfidenceEvolutionPoint[] = [...persisted.confidenceHistory];
  const add = (layerId: TraceLayerId, pct: number) => {
    points.push({ at: now, layerId, confidencePct: pct });
  };
  if (input.stability) add('system_stability', input.stability.systemHealthScore);
  if (input.dataReliability) add('data_reliability', input.dataReliability.globalDataQualityScore);
  if (input.portfolioRisk) add('portfolio_risk', input.portfolioRisk.portfolioQualityScore);
  if (input.macro) add('macro', input.macro.macroScore);
  if (input.governance) add('governance', input.governance.aggregatedConfidencePct);
  if (input.strategy) {
    const avg =
      input.strategy.todayRecommendations.length > 0
        ? input.strategy.todayRecommendations.reduce((s, r) => s + r.confidencePct, 0) /
          input.strategy.todayRecommendations.length
        : 50;
    add('ai_recommendation', Math.round(avg));
  }
  return points.slice(-120);
}

function buildStateSnapshotLink(input: BuildExplainableCognitiveTraceInput): ExplainableCognitiveTraceBundle['stateSnapshotLink'] {
  const layers: Array<{ layerId: TraceLayerId; generatedAt: string | null }> = [
    { layerId: 'system_stability', generatedAt: input.stability?.generatedAt ?? null },
    { layerId: 'data_reliability', generatedAt: input.dataReliability?.generatedAt ?? null },
    { layerId: 'macro', generatedAt: input.macro?.generatedAt ?? null },
    { layerId: 'portfolio_risk', generatedAt: input.portfolioRisk?.generatedAt ?? null },
    { layerId: 'ai_recommendation', generatedAt: input.strategy?.generatedAt ?? null },
    { layerId: 'governance', generatedAt: input.governance?.generatedAt ?? null },
  ];
  return {
    fingerprintJa: input.stateFingerprintJa,
    layerTimestamps: layers,
  };
}

function buildRecommendationDiffs(
  input: BuildExplainableCognitiveTraceInput,
): ExplainableCognitiveTraceBundle['recommendationDiffs'] {
  const prev = new Map(input.previousRecommendations.map((r) => [r.symbol.toUpperCase(), r.action]));
  const recs = input.strategy?.todayRecommendations ?? [];
  return recs.map((r) => {
    const prevAction = prev.get(r.symbol.toUpperCase()) ?? null;
    return {
      symbol: r.symbol,
      previousAction: prevAction,
      currentAction: r.action,
      changed: prevAction != null && prevAction !== r.action,
    };
  });
}

function reasonHash(chain: string[]): string {
  return chain.join('|').slice(0, 200);
}

function buildSelfReflection(
  input: BuildExplainableCognitiveTraceInput,
  missing: string[],
  contradiction: boolean,
): string {
  const parts: string[] = [];
  if (contradiction) parts.push('層間で方向が割れ、裁定前に迷いが生じました。');
  if (missing.length > 0) parts.push(`証拠が薄い領域: ${missing.slice(0, 2).join(', ')}。`);
  if (input.governance?.cooldownActive) parts.push('直前の決定からクールダウン中で変更を抑えました。');
  if (parts.length === 0) parts.push('主要層の方向は概ね一致し、迷いは限定的でした。');
  return parts.join(' ');
}

function buildFeatureStatuses(
  partial: Omit<ExplainableCognitiveTraceBundle, 'featureStatuses'>,
): TraceFeatureStatus[] {
  const s = (
    id: TraceFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): TraceFeatureStatus => ({
    id,
    labelJa: TRACE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('cognitive_trace_engine', partial.causalChainJa.length >= 3, false, `${partial.causalChainJa.length} steps`),
    s('decision_timeline', partial.decisionTimeline.length >= 4, partial.decisionTimeline.length < 3, `${partial.decisionTimeline.length} steps`),
    s('influence_graph', partial.influenceGraph.length > 0, false, `${partial.influenceGraph.length} edges`),
    s('reason_weight_tree', partial.reasonWeightTree.length > 0, false, `${partial.reasonWeightTree.length} nodes`),
    s('consensus_breakdown', partial.consensusBreakdown.length > 0, false, `${partial.consensusBreakdown.length} rows`),
    s('veto_explanation', !partial.vetoExplanationJa, !!partial.vetoExplanationJa, partial.vetoExplanationJa ?? 'なし'),
    s('conflict_explanation', !partial.conflictExplanationJa, !!partial.conflictExplanationJa, partial.conflictExplanationJa ?? 'なし'),
    s('downgrade_reason_chain', partial.downgradeReasonChain.length === 0, partial.downgradeReasonChain.length > 0, `${partial.downgradeReasonChain.length}件`),
    s('health_impact_trace', partial.healthImpactTraceJa.length > 0, false, partial.healthImpactTraceJa[0] ?? ''),
    s('confidence_evolution', partial.confidenceEvolution.length >= 2, false, `${partial.confidenceEvolution.length} points`),
    s('state_snapshot_link', !!partial.stateSnapshotLink.fingerprintJa, false, partial.stateSnapshotLink.fingerprintJa.slice(0, 24)),
    s('market_context_capture', partial.marketContext.symbols.length > 0, false, `${partial.marketContext.symbols.length} symbols`),
    s('ai_recommendation_diff', true, partial.recommendationDiffs.some((d) => d.changed), `${partial.recommendationDiffs.filter((d) => d.changed).length} changed`),
    s('strategy_drift_tracker', !partial.strategyDriftJa, !!partial.strategyDriftJa, partial.strategyDriftJa ?? '一貫'),
    s('human_override_trace', !partial.humanOverrideTraceJa, !!partial.humanOverrideTraceJa, partial.humanOverrideTraceJa ?? 'なし'),
    s('emergency_override_trace', !partial.emergencyOverrideTraceJa, !!partial.emergencyOverrideTraceJa, partial.emergencyOverrideTraceJa ?? 'なし'),
    s('recursive_reason_guard', !partial.recursiveReasonGuardTriggered, partial.recursiveReasonGuardTriggered, 'hash loop'),
    s('contradiction_timeline', partial.contradictionTimeline.length > 0, false, `${partial.contradictionTimeline.length} entries`),
    s('explainable_score', partial.explainableScore >= 65, partial.explainableScore < 50, `${partial.explainableScore}`),
    s('missing_evidence_detector', partial.missingEvidenceJa.length === 0, partial.missingEvidenceJa.length > 0, `${partial.missingEvidenceJa.length}`),
    s('weak_signal_isolation', partial.weakSignalsJa.length === 0, partial.weakSignalsJa.length > 0, `${partial.weakSignalsJa.length}`),
    s(
      'data_freshness_trace',
      !partial.dataFreshnessTraceJa.some((x) => x.includes('古い')),
      partial.dataFreshnessTraceJa.some((x) => x.includes('古い')),
      partial.dataFreshnessTraceJa[0]?.slice(0, 40) ?? '',
    ),
    s('source_reliability_weight', partial.sourceReliabilityWeights.length >= 3, false, '4 sources'),
    s('causal_chain_builder', partial.causalChainJa.length >= 3, false, 'chain ok'),
    s('explainable_summary_generator', partial.explainableSummaryJa.length > 20, false, 'summary'),
    s('ai_self_reflection', partial.aiSelfReflectionJa.length > 5, false, 'reflection'),
    s('explainability_health_score', partial.explainabilityHealthScore >= 60, partial.explainabilityHealthScore < 50, `${partial.explainabilityHealthScore}`),
    s('replay_engine', partial.replayTimeline.length > 0, false, `${partial.replayTimeline.length} replays`),
    s('decision_comparator', !!partial.decisionComparatorJa, false, partial.decisionComparatorJa ?? '初回'),
    s('explainability_dashboard', true, false, 'panel'),
  ];
}

export async function buildExplainableCognitiveTraceBundle(
  input: BuildExplainableCognitiveTraceInput,
): Promise<ExplainableCognitiveTraceBundle> {
  const persisted = await loadCognitiveTraceState();
  const timeline = buildTimeline(input);
  const causalChain = buildCausalChain(timeline, input);
  const reasoningChain = buildReasoningChain(causalChain);
  const missingEvidence = detectMissingEvidence(input);
  const hash = reasonHash(causalChain);
  const recursiveLoop = persisted.recentReasonHashes.includes(hash);
  const explainableScore = computeExplainableScore(input, causalChain, missingEvidence, recursiveLoop);

  const finalDecision = input.governance?.finalDecision ?? input.strategy?.todayRecommendations[0]?.action ?? 'hold';
  const contradiction = input.governance?.contradictionDetected ?? false;

  const contradictionTimeline = [
    ...persisted.contradictionHistory.map((c) => ({
      at: c.at,
      detailJa: c.detailJa,
      resolvedJa: input.governance?.vetoReasonJa ?? null,
    })),
  ];
  if (contradiction && input.governance?.contradictionDetailJa) {
    contradictionTimeline.push({
      at: new Date().toISOString(),
      detailJa: input.governance.contradictionDetailJa,
      resolvedJa: input.governance.vetoReasonJa,
    });
  }

  const confidenceEvolution = buildConfidenceEvolution(input, persisted);
  const recommendationDiffs = buildRecommendationDiffs(input);

  const strategyDriftJa = input.governance?.strategyConsistencyJa.includes('ブレ')
    ? input.governance.strategyConsistencyJa
    : input.macro && input.strategy && input.macro.integration.recommendedTacticalMode !== input.strategy.tacticalMode
      ? `Strategy ${input.strategy.tacticalMode} vs Macro推奨 ${input.macro.integration.recommendedTacticalMode}`
      : null;

  const dataFreshnessTraceJa = [
    input.marketContext.priceSyncStatusJa,
    ...input.marketContext.symbols.filter((s) => s.stale).map((s) => `${s.symbol} stale`),
  ];

  let decisionComparatorJa: string | null = null;
  if (persisted.lastExplainableScore != null) {
    decisionComparatorJa = `explainable ${persisted.lastExplainableScore}→${explainableScore} · decision ${persisted.lastRecommendations[0]?.action ?? '?'}→${finalDecision}`;
  }

  const explainableSummaryJa = [
    `最終 ${actionLabelJa(finalDecision)}（説明可能性 ${explainableScore}/100）`,
    input.governance?.unifiedAiSummaryJa ?? 'Governance 未適用',
    contradiction ? '矛盾あり — veto/downgrade を確認' : '矛盾なし',
    missingEvidence.length ? `証拠不足: ${missingEvidence[0]}` : '主要証拠は揃っている',
  ].join(' — ');

  const partial: Omit<ExplainableCognitiveTraceBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: TRACE_REGULATORY_JA,
    paperTradingOnly: true,
    finalDecision,
    finalDecisionLabelJa: actionLabelJa(finalDecision),
    reasoningChainJa: reasoningChain,
    causalChainJa: causalChain,
    influenceGraph: buildInfluenceGraph(input),
    reasonWeightTree: buildReasonWeightTree(input),
    consensusBreakdown: buildConsensusBreakdown(input),
    vetoExplanationJa: input.governance?.vetoReasonJa ?? null,
    conflictExplanationJa: input.governance?.contradictionDetailJa ?? null,
    downgradeReasonChain: (input.governance?.downgradedRecommendations ?? []).map(
      (d) => `${d.symbol}: ${d.fromAction}→${d.toAction} — ${d.reasonJa}`,
    ),
    healthImpactTraceJa: buildHealthImpact(input),
    confidenceEvolution,
    stateSnapshotLink: buildStateSnapshotLink(input),
    marketContext: input.marketContext,
    recommendationDiffs,
    strategyDriftJa,
    humanOverrideTraceJa: input.governance?.humanOverrideActive
      ? input.governance.humanOverrideNoteJa ?? '人間 override 保有優先'
      : null,
    emergencyOverrideTraceJa: input.governance?.emergencyOverrideJa ?? null,
    recursiveReasonGuardTriggered: recursiveLoop,
    contradictionTimeline: contradictionTimeline.slice(-10),
    explainableScore,
    explainableScoreFormulaJa: EXPLAINABLE_SCORE_FORMULA_JA,
    confidenceEvolutionFormulaJa: CONFIDENCE_EVOLUTION_FORMULA_JA,
    contradictionTraceFormulaJa: CONTRADICTION_TRACE_FORMULA_JA,
    missingEvidenceJa: missingEvidence,
    weakSignalsJa: buildWeakSignals(input),
    dataFreshnessTraceJa,
    sourceReliabilityWeights: buildSourceWeights(input),
    explainableSummaryJa,
    aiSelfReflectionJa: buildSelfReflection(input, missingEvidence, contradiction),
    explainabilityHealthScore: explainableScore,
    explainabilityHealthLabelJa:
      explainableScore >= 75 ? '高い説明可能性' : explainableScore >= 50 ? '注意' : 'trace 不足',
    replayTimeline: persisted.replayTimeline,
    decisionComparatorJa,
    decisionTimeline: timeline,
    explainRuleBasisJa:
      'Governance hierarchy + layer bundles + market snapshot の因果合成。取引執行は行いません。',
  };

  const featureStatuses = buildFeatureStatuses(partial);
  const bundle: ExplainableCognitiveTraceBundle = { ...partial, featureStatuses };

  const replayEntry = {
    id: `trace-${Date.now()}`,
    at: bundle.generatedAt,
    finalDecision: bundle.finalDecision,
    explainableScore: bundle.explainableScore,
    summaryJa: bundle.explainableSummaryJa,
  };
  await appendCognitiveTraceReplay(replayEntry);

  const nextHashes = [...persisted.recentReasonHashes, hash].slice(-20);
  await saveCognitiveTraceState({
    ...persisted,
    confidenceHistory: confidenceEvolution,
    lastRecommendations: (input.strategy?.todayRecommendations ?? []).map((r) => ({
      symbol: r.symbol,
      action: r.action,
    })),
    lastExplainableScore: explainableScore,
    contradictionHistory: contradictionTimeline.map((c) => ({ at: c.at, detailJa: c.detailJa })),
    recentReasonHashes: nextHashes,
  });

  return bundle;
}
