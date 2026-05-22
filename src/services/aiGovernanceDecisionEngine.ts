/**
 * AI Governance & Decision Hierarchy — unify multi-layer judgments (no new trading logic).
 */
import {
  CONSENSUS_FORMULA_JA,
  CONTRADICTION_FORMULA_JA,
  DECISION_COOLDOWN_MS,
  DECISION_FLOW_STEPS_JA,
  DECISION_HIERARCHY,
  DOWNGRADE_CONDITIONS_JA,
  GOVERNANCE_FEATURE_LABELS,
  GOVERNANCE_REGULATORY_JA,
  HIERARCHY_WEIGHT_BY_ID,
  STALE_LAYER_MS,
  VETO_FLOW_STEPS_JA,
} from '../constants/aiGovernanceDecision';
import type {
  AiGovernanceDecisionBundle,
  BuildAiGovernanceDecisionInput,
  DecisionTreeNode,
  DowngradeRecord,
  GovernanceFeatureId,
  GovernanceFeatureStatus,
  GovernanceLayerId,
  GovernanceStance,
  HierarchyRow,
  VetoRecord,
} from '../types/aiGovernanceDecision';
import type { StrategyAction } from '../types/strategyExecution';
import {
  appendGovernanceAuditEntry,
  loadAiGovernanceState,
} from './aiGovernanceDecisionStorage';

type LayerSignal = {
  layerId: GovernanceLayerId;
  labelJa: string;
  rank: number;
  stance: GovernanceStance;
  confidencePct: number;
  healthWeight: number;
  stale: boolean;
  summaryJa: string;
  active: boolean;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function stanceValue(s: GovernanceStance): number {
  if (s === 'bullish') return 1;
  if (s === 'bearish') return -1;
  if (s === 'block') return -1.5;
  return 0;
}

function isStaleBundle(generatedAt: string | undefined | null, forcedStale: boolean): boolean {
  if (forcedStale || !generatedAt) return true;
  return Date.now() - new Date(generatedAt).getTime() > STALE_LAYER_MS;
}

function actionLabelJa(a: StrategyAction): string {
  const map: Record<StrategyAction, string> = {
    buy: '買い',
    reduce: '減らす',
    hold: '保有',
    avoid: '回避',
    watch: '監視',
  };
  return map[a];
}

function downgradeAction(action: StrategyAction): StrategyAction {
  if (action === 'buy') return 'watch';
  if (action === 'reduce') return 'hold';
  return action;
}

function extractSignals(input: BuildAiGovernanceDecisionInput): LayerSignal[] {
  const staleSet = new Set(input.staleLayerIds);
  const signals: LayerSignal[] = [];

  const stab = input.systemStability;
  if (stab) {
    const stale = isStaleBundle(stab.generatedAt, staleSet.has('system_stability'));
    let stance: GovernanceStance = 'neutral';
    if (stab.emergencyReadOnlyActive || stab.systemHealthScore < 40) stance = 'block';
    else if (stab.systemHealthScore < 55 || stab.safeFallbackActive) stance = 'bearish';
    else if (stab.systemHealthScore >= 78) stance = 'bullish';
    signals.push({
      layerId: 'system_stability',
      labelJa: 'System Stability',
      rank: 1,
      stance,
      confidencePct: stab.systemHealthScore,
      healthWeight: stale ? 0.15 : clamp(stab.systemHealthScore) / 100,
      stale,
      summaryJa: stab.integritySummaryJa,
      active: true,
    });
  }

  const risk = input.portfolioRisk;
  if (risk) {
    const stale = isStaleBundle(risk.generatedAt, staleSet.has('portfolio_risk'));
    let stance: GovernanceStance = 'neutral';
    if (risk.riskEscalationActive) stance = 'block';
    else if (risk.defensiveModeActive || risk.portfolioQualityScore < 45) stance = 'bearish';
    else if (risk.portfolioQualityScore >= 72 && !risk.riskEscalationActive) stance = 'bullish';
    signals.push({
      layerId: 'portfolio_risk',
      labelJa: 'Portfolio Risk',
      rank: 2,
      stance,
      confidencePct: risk.portfolioQualityScore,
      healthWeight: stale ? 0.15 : clamp(risk.portfolioQualityScore) / 100,
      stale,
      summaryJa: risk.aiPortfolioSummaryJa,
      active: true,
    });
  }

  const data = input.dataReliability;
  if (data) {
    const stale = isStaleBundle(data.generatedAt, staleSet.has('data_reliability'));
    let stance: GovernanceStance = 'neutral';
    if (!data.aiInputGateOpen) stance = 'block';
    else if (data.reliabilityTier === 'low') stance = 'bearish';
    else if (data.reliabilityTier === 'high') stance = 'bullish';
    signals.push({
      layerId: 'data_reliability',
      labelJa: 'Data Reliability',
      rank: 3,
      stance,
      confidencePct: data.globalDataQualityScore,
      healthWeight: stale ? 0.15 : clamp(data.globalDataQualityScore) / 100,
      stale,
      summaryJa: data.aiGateNoteJa,
      active: true,
    });
  }

  const macro = input.macro;
  if (macro) {
    const stale = isStaleBundle(macro.generatedAt, staleSet.has('macro'));
    const rid = macro.worldRegime.id;
    let stance: GovernanceStance = 'neutral';
    if (
      rid === 'panic' ||
      rid === 'liquidity_crisis' ||
      macro.integration.forceEmergencyMode
    ) {
      stance = 'block';
    } else if (rid === 'risk_off' || macro.integration.forceDefensiveStrategy) {
      stance = 'bearish';
    } else if (macro.macroScore >= 68 && rid === 'risk_on') stance = 'bullish';
    signals.push({
      layerId: 'macro',
      labelJa: 'Macro Intelligence',
      rank: 4,
      stance,
      confidencePct: clamp(macro.macroScore),
      healthWeight: stale ? 0.15 : clamp(macro.worldRegime.confidencePct) / 100,
      stale,
      summaryJa: macro.integration.macroSummaryJa,
      active: !macro.insufficientData,
    });
  }

  const exec = input.execution;
  if (exec) {
    const stale = isStaleBundle(exec.generatedAt, staleSet.has('execution'));
    let stance: GovernanceStance = 'neutral';
    if (exec.maxDrawdownPct >= 18) stance = 'bearish';
    else if (exec.maxDrawdownPct <= 8 && (exec.trustScore ?? 70) >= 65) stance = 'bullish';
    signals.push({
      layerId: 'execution',
      labelJa: 'Execution Intelligence',
      rank: 5,
      stance,
      confidencePct: clamp(exec.trustScore ?? 70 - exec.maxDrawdownPct),
      healthWeight: stale ? 0.15 : 0.75,
      stale,
      summaryJa: exec.safetyChecksJa.join(' · ') || '紙上執行',
      active: true,
    });
  }

  const cap = input.capitalAllocation;
  if (cap) {
    const stale = isStaleBundle(cap.generatedAt, staleSet.has('capital_allocation'));
    const buys = cap.suggestedOrders?.length ?? 0;
    const stance: GovernanceStance = buys > 0 ? 'bullish' : 'neutral';
    const avgConf =
      buys > 0
        ? cap.suggestedOrders.reduce((s, o) => s + o.confidencePct, 0) / buys
        : 50;
    signals.push({
      layerId: 'capital_allocation',
      labelJa: 'Capital Allocation',
      rank: 6,
      stance,
      confidencePct: clamp(avgConf),
      healthWeight: stale ? 0.15 : 0.7,
      stale,
      summaryJa: cap.aiSizingSummaryJa,
      active: true,
    });
  }

  const strat = input.strategy;
  if (strat) {
    const stale = isStaleBundle(strat.generatedAt, staleSet.has('ai_recommendation'));
    const recs = strat.todayRecommendations;
    const buyN = recs.filter((r) => r.action === 'buy').length;
    const avoidN = recs.filter((r) => r.action === 'avoid' || r.action === 'reduce').length;
    let stance: GovernanceStance = 'neutral';
    if (avoidN > buyN) stance = 'bearish';
    else if (buyN > 0) stance = 'bullish';
    const avgConf =
      recs.length > 0
        ? recs.reduce((s, r) => s + r.confidencePct, 0) / recs.length
        : 50;
    signals.push({
      layerId: 'ai_recommendation',
      labelJa: 'AI Recommendation',
      rank: 7,
      stance,
      confidencePct: clamp(avgConf),
      healthWeight: stale ? 0.15 : 0.65,
      stale,
      summaryJa: strat.regimeStrategyJa,
      active: true,
    });
  }

  return signals;
}

function computeConsensus(signals: LayerSignal[]): number {
  let num = 0;
  let den = 0;
  for (const s of signals) {
    if (!s.active || s.healthWeight < 0.1) continue;
    const w = HIERARCHY_WEIGHT_BY_ID[s.layerId] * s.healthWeight;
    num += stanceValue(s.stance) * w;
    den += w;
  }
  if (den <= 0) return 50;
  return clamp(50 + (num / den) * 35);
}

function detectContradiction(signals: LayerSignal[]): {
  detected: boolean;
  detailJa: string | null;
  bullW: number;
  bearW: number;
  totalW: number;
} {
  const active = signals.filter((s) => s.active && s.healthWeight >= 0.2);
  let bullW = 0;
  let bearW = 0;
  let totalW = 0;
  for (const s of active) {
    const w = HIERARCHY_WEIGHT_BY_ID[s.layerId] * s.healthWeight;
    totalW += w;
    if (s.stance === 'bullish') bullW += w;
    if (s.stance === 'bearish' || s.stance === 'block') bearW += w;
  }
  const top = active.filter((s) => s.rank <= 3);
  const bottom = active.filter((s) => s.rank >= 5);
  const topBull = top.some((s) => s.stance === 'bullish');
  const topBear = top.some((s) => s.stance === 'bearish' || s.stance === 'block');
  const botBull = bottom.some((s) => s.stance === 'bullish');
  const botBear = bottom.some((s) => s.stance === 'bearish' || s.stance === 'block');
  const cross =
    (topBull && botBear) ||
    (topBear && botBull) ||
    (bullW >= 0.12 && bearW >= 0.12 && Math.abs(bullW - bearW) < 0.35 * totalW);
  const detected = cross && bullW > 0 && bearW > 0;
  const detailJa = detected
    ? `上位層と下位層が逆方向（bullW=${bullW.toFixed(2)}, bearW=${bearW.toFixed(2)}）`
    : null;
  return { detected, detailJa, bullW, bearW, totalW };
}

function resolveVetoes(signals: LayerSignal[]): VetoRecord[] {
  const vetoes: VetoRecord[] = [];
  const byRank = [...signals].sort((a, b) => a.rank - b.rank);
  for (let i = 0; i < byRank.length; i++) {
    const high = byRank[i];
    if (!high.active) continue;
    if (high.stance !== 'block' && high.stance !== 'bearish') continue;
    for (let j = i + 1; j < byRank.length; j++) {
      const low = byRank[j];
      if (!low.active || low.stance !== 'bullish') continue;
      vetoes.push({
        vetoLayer: high.layerId,
        vetoLayerLabelJa: high.labelJa,
        blockedLayer: low.layerId,
        reasonJa: `${high.labelJa}（${high.stance}）が ${low.labelJa} の強気判断を拒否`,
      });
    }
  }
  return vetoes;
}

function strategyPrimaryAction(input: BuildAiGovernanceDecisionInput): StrategyAction {
  const recs = input.strategy?.todayRecommendations ?? [];
  if (recs.length === 0) return 'hold';
  const buy = recs.find((r) => r.action === 'buy');
  if (buy) return 'buy';
  const avoid = recs.find((r) => r.action === 'avoid');
  if (avoid) return 'avoid';
  return recs[0].action;
}

function emergencyActive(input: BuildAiGovernanceDecisionInput, signals: LayerSignal[]): boolean {
  if (input.macro?.worldRegime.id === 'panic') return true;
  if (input.portfolioRisk?.riskEscalationActive) return true;
  if (input.systemStability?.emergencyReadOnlyActive) return true;
  if (input.macro?.integration.forceEmergencyMode) return true;
  return signals.some((s) => s.rank <= 2 && s.stance === 'block');
}

function arbitrate(
  input: BuildAiGovernanceDecisionInput,
  consensus: number,
  contradiction: boolean,
  emergency: boolean,
  humanHold: boolean,
): StrategyAction {
  if (humanHold) return 'hold';
  if (emergency) return consensus < 40 ? 'avoid' : 'hold';
  const raw = strategyPrimaryAction(input);
  if (input.dataReliability && !input.dataReliability.aiInputGateOpen) {
    return raw === 'buy' ? 'watch' : 'hold';
  }
  if (consensus >= 68 && !contradiction) return raw === 'avoid' ? 'watch' : raw === 'buy' ? 'buy' : 'watch';
  if (consensus >= 55) return contradiction && raw === 'buy' ? 'watch' : raw === 'buy' ? 'watch' : 'hold';
  if (consensus < 45) return raw === 'buy' ? 'watch' : 'avoid';
  return contradiction && raw === 'buy' ? 'watch' : 'hold';
}

function buildDowngrades(
  input: BuildAiGovernanceDecisionInput,
  final: StrategyAction,
  contradiction: boolean,
  vetoes: VetoRecord[],
): DowngradeRecord[] {
  const out: DowngradeRecord[] = [];
  const recs = input.strategy?.todayRecommendations ?? [];
  for (const r of recs) {
    if (r.action !== 'buy') continue;
    let to: StrategyAction = r.action;
    let reason = '';
    if (contradiction) {
      to = 'watch';
      reason = '層間矛盾 — strong buy を watch に downgrade';
    } else if (vetoes.length > 0) {
      to = 'watch';
      reason = `veto: ${vetoes[0].vetoLayerLabelJa}`;
    } else if (final !== 'buy') {
      to = downgradeAction(r.action);
      reason = `最終決定 ${actionLabelJa(final)} により downgrade`;
    }
    if (to !== r.action) {
      out.push({ symbol: r.symbol, fromAction: r.action, toAction: to, reasonJa: reason });
    }
  }
  return out;
}

function buildExplainTree(
  signals: LayerSignal[],
  consensus: number,
  final: StrategyAction,
  vetoes: VetoRecord[],
  emergency: boolean,
): DecisionTreeNode[] {
  return [
    {
      id: 'root',
      labelJa: '階層エンジン',
      outcomeJa: `consensus ${consensus} → ${actionLabelJa(final)}`,
      children: [
        {
          id: 'hierarchy',
          labelJa: 'Hierarchy 評価',
          outcomeJa: signals.map((s) => `${s.labelJa}:${s.stance}`).join(' · '),
        },
        {
          id: 'veto',
          labelJa: 'Veto',
          outcomeJa: vetoes.length ? vetoes.map((v) => v.reasonJa).join(' / ') : 'なし',
        },
        {
          id: 'emergency',
          labelJa: 'Emergency Override',
          outcomeJa: emergency ? 'risk/stability 最優先' : '通常',
        },
      ],
    },
  ];
}

function buildFeatureStatuses(
  bundle: Omit<AiGovernanceDecisionBundle, 'featureStatuses'>,
): GovernanceFeatureStatus[] {
  const status = (
    id: GovernanceFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): GovernanceFeatureStatus => ({
    id,
    labelJa: GOVERNANCE_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    status('decision_hierarchy_engine', true, false, `${DECISION_HIERARCHY.length} 層`),
    status('ai_conflict_resolver', !bundle.contradictionDetected, bundle.contradictionDetected, bundle.contradictionDetailJa ?? '整合'),
    status('veto_engine', bundle.vetoes.length === 0, bundle.vetoes.length > 0, `${bundle.vetoes.length} 件`),
    status('confidence_aggregator', bundle.aggregatedConfidencePct >= 50, bundle.aggregatedConfidencePct < 55, `${bundle.aggregatedConfidencePct}%`),
    status('consensus_score', bundle.consensusScore >= 50, bundle.consensusScore < 45, `${bundle.consensusScore}/100`),
    status('contradiction_detector', !bundle.contradictionDetected, bundle.contradictionDetected, bundle.contradictionFormulaJa),
    status('emergency_override', !bundle.emergencyOverrideActive, bundle.emergencyOverrideActive, bundle.emergencyOverrideJa ?? '通常'),
    status('ai_arbitration_engine', true, bundle.cooldownActive, bundle.arbitrationNoteJa),
    status('explainable_decision_tree', bundle.explainTree.length > 0, false, '木構造生成済'),
    status('human_override_layer', !bundle.humanOverrideActive, bundle.humanOverrideActive, bundle.humanOverrideNoteJa ?? '自動'),
    status('recommendation_downgrade', bundle.downgradedRecommendations.length === 0, bundle.downgradedRecommendations.length > 0, `${bundle.downgradedRecommendations.length} 件`),
    status('layer_health_weight', true, bundle.activeHierarchy.some((h) => h.healthWeight < 0.3), 'healthWeight 適用'),
    status('stale_layer_isolation', !bundle.activeHierarchy.some((h) => h.stale), bundle.activeHierarchy.some((h) => h.stale), '古い層は weight 0.15'),
    status('recursive_decision_guard', !bundle.recursiveGuardTriggered, bundle.recursiveGuardTriggered, '短時間フリップ抑制'),
    status('decision_cooldown', !bundle.cooldownActive, bundle.cooldownActive, bundle.cooldownNoteJa ?? 'なし'),
    status('strategy_consistency_checker', true, bundle.strategyConsistencyJa.includes('ブレ'), bundle.strategyConsistencyJa.slice(0, 60)),
    status('exposure_consensus_guard', true, false, bundle.exposureConsensusJa.slice(0, 60)),
    status('global_risk_consensus', bundle.globalRiskScore >= 45, bundle.globalRiskScore < 45, bundle.globalRiskConsensusJa.slice(0, 60)),
    status('unified_ai_summary', bundle.unifiedAiSummaryJa.length > 10, false, '統合文'),
    status('decision_audit_trail', bundle.auditTrailPreview.length > 0, false, `${bundle.auditTrailPreview.length} 件`),
  ];
}

export async function buildAiGovernanceDecisionBundle(
  input: BuildAiGovernanceDecisionInput,
): Promise<AiGovernanceDecisionBundle> {
  const signals = extractSignals(input);
  const activeHierarchy: HierarchyRow[] = DECISION_HIERARCHY.map((h) => {
    const sig = signals.find((s) => s.layerId === h.id);
    return {
      rank: h.rank,
      layerId: h.id,
      labelJa: h.labelJa,
      active: sig?.active ?? false,
      stance: sig?.stance ?? 'neutral',
      confidencePct: sig?.confidencePct ?? 0,
      healthWeight: sig?.healthWeight ?? 0,
      stale: sig?.stale ?? true,
      summaryJa: sig?.summaryJa ?? '未ロード',
    };
  });

  const consensusScore = computeConsensus(signals);
  const contradiction = detectContradiction(signals);
  const vetoes = resolveVetoes(signals);
  const emergency = emergencyActive(input, signals);
  const humanHold =
    input.humanGovernanceOverride.preferHold ||
    (input.portfolioHumanRiskOverride?.maxExposurePct === 0);
  const humanOverrideActive = humanHold || input.humanGovernanceOverride.noteJa != null;

  let finalDecision = arbitrate(
    input,
    consensusScore,
    contradiction.detected,
    emergency,
    humanHold,
  );

  const vetoLayer = vetoes[0]?.vetoLayer ?? null;
  const vetoLayerLabelJa = vetoes[0]?.vetoLayerLabelJa ?? null;
  const vetoReasonJa = vetoes[0]?.reasonJa ?? null;

  const blockedDecisions: string[] = [];
  for (const v of vetoes) {
    blockedDecisions.push(`${v.blockedLayer}: 強気判断 → 拒否（${v.vetoLayer}）`);
  }
  if (input.dataReliability && !input.dataReliability.aiInputGateOpen) {
    blockedDecisions.push('ai_recommendation: speculative buy（data gate 閉鎖）');
  }

  const downgradedRecommendations = buildDowngrades(
    input,
    finalDecision,
    contradiction.detected,
    vetoes,
  );

  const aggregatedConfidencePct = clamp(
    signals.reduce((s, x) => s + x.confidencePct * x.healthWeight, 0) /
      Math.max(0.01, signals.reduce((s, x) => s + x.healthWeight, 0)),
  );

  let cooldownActive = false;
  let cooldownNoteJa: string | null = null;
  const persisted = await loadAiGovernanceState();
  if (
    persisted.lastDecisionAt &&
    persisted.lastFinalDecision &&
    persisted.lastFinalDecision !== finalDecision &&
    Date.now() - new Date(persisted.lastDecisionAt).getTime() < DECISION_COOLDOWN_MS &&
    !emergency
  ) {
    cooldownActive = true;
    cooldownNoteJa = `5分クールダウン — 前回 ${actionLabelJa(persisted.lastFinalDecision)} を維持`;
    finalDecision = persisted.lastFinalDecision;
  }

  const recursiveGuardTriggered =
    input.recentAuditFlipCount >= 4 && !emergency;
  if (recursiveGuardTriggered && finalDecision === 'buy') {
    finalDecision = 'watch';
  }

  const globalRiskScore = clamp(
    (input.portfolioRisk?.portfolioQualityScore ?? 50) * 0.35 +
      (input.systemStability?.systemHealthScore ?? 50) * 0.35 +
      (input.dataReliability?.globalDataQualityScore ?? 50) * 0.3,
  );

  const stratMode = input.strategy?.tacticalMode ?? 'balanced';
  const macroMode = input.macro?.integration.recommendedTacticalMode;
  const strategyConsistencyJa =
    macroMode && macroMode !== stratMode
      ? `戦略ブレ: Strategy=${stratMode} / Macro推奨=${macroMode}`
      : `戦略一貫: ${stratMode}（Macro整合）`;

  const sectorPct = input.portfolioRisk?.sectorConcentrationPct ?? 0;
  const exposureConsensusJa =
    sectorPct > 45
      ? `セクター集中 ${sectorPct}% — 合意より防御的に`
      : `エクスポーザ分散 — 合意可能範囲`;

  const emergencyOverrideJa = emergency
    ? 'panic / risk escalation / stability read-only — risk 最優先'
    : null;

  const unifiedAiSummaryJa = [
    `最終: ${actionLabelJa(finalDecision)}（合意 ${consensusScore}/100）`,
    vetoLayerLabelJa ? `Veto: ${vetoLayerLabelJa}` : null,
    contradiction.detected ? '矛盾あり — downgrade 適用' : '矛盾なし',
    `総合リスク ${globalRiskScore}/100`,
    humanOverrideActive ? '人間 override 優先' : null,
  ]
    .filter(Boolean)
    .join(' — ');

  const explainTree = buildExplainTree(
    signals,
    consensusScore,
    finalDecision,
    vetoes,
    emergency,
  );

  const arbitrationNoteJa = [
    `裁定: ${actionLabelJa(finalDecision)}`,
    `confidence 統合 ${aggregatedConfidencePct}%`,
    cooldownActive ? 'cooldown 適用' : null,
    recursiveGuardTriggered ? 'recursive guard' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const partial: Omit<AiGovernanceDecisionBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: GOVERNANCE_REGULATORY_JA,
    finalDecision,
    finalDecisionLabelJa: actionLabelJa(finalDecision),
    vetoLayer,
    vetoLayerLabelJa,
    vetoReasonJa,
    consensusScore,
    aggregatedConfidencePct,
    contradictionDetected: contradiction.detected,
    contradictionDetailJa: contradiction.detailJa,
    contradictionFormulaJa: CONTRADICTION_FORMULA_JA,
    consensusFormulaJa: CONSENSUS_FORMULA_JA,
    activeHierarchy,
    blockedDecisions,
    emergencyOverrideActive: emergency,
    emergencyOverrideJa,
    humanOverrideActive,
    humanOverrideNoteJa: input.humanGovernanceOverride.noteJa,
    downgradedRecommendations,
    downgradeConditionsJa: [...DOWNGRADE_CONDITIONS_JA],
    globalRiskConsensusJa: `総合リスク ${globalRiskScore}/100 — ${exposureConsensusJa}`,
    globalRiskScore,
    unifiedAiSummaryJa,
    explainTree,
    vetoes,
    arbitrationNoteJa,
    cooldownActive,
    cooldownNoteJa,
    recursiveGuardTriggered,
    exposureConsensusJa,
    strategyConsistencyJa,
    auditTrailPreview: persisted.auditTrail.slice(-5),
    explainRuleBasisJa:
      '階層重み・veto・consensus のルール合成。DECISION_HIERARCHY 順に最終決定権。Paperのみ。',
  };

  const featureStatuses = buildFeatureStatuses(partial);
  const bundle: AiGovernanceDecisionBundle = { ...partial, featureStatuses };

  await appendGovernanceAuditEntry({
    finalDecision: bundle.finalDecision,
    consensusScore: bundle.consensusScore,
    contradiction: bundle.contradictionDetected,
    vetoLayer: bundle.vetoLayer,
    summaryJa: bundle.unifiedAiSummaryJa,
  });

  return bundle;
}

export type GovernanceLayerInputs = Pick<
  BuildAiGovernanceDecisionInput,
  | 'systemStability'
  | 'portfolioRisk'
  | 'dataReliability'
  | 'macro'
  | 'execution'
  | 'capitalAllocation'
  | 'strategy'
>;

export function collectStaleGovernanceLayerIds(layers: GovernanceLayerInputs): GovernanceLayerId[] {
  const stale: GovernanceLayerId[] = [];
  const check = (id: GovernanceLayerId, at: string | undefined) => {
    if (!at || Date.now() - new Date(at).getTime() > STALE_LAYER_MS) stale.push(id);
  };
  if (layers.systemStability) check('system_stability', layers.systemStability.generatedAt);
  if (layers.portfolioRisk) check('portfolio_risk', layers.portfolioRisk.generatedAt);
  if (layers.dataReliability) check('data_reliability', layers.dataReliability.generatedAt);
  if (layers.macro) check('macro', layers.macro.generatedAt);
  if (layers.execution) check('execution', layers.execution.generatedAt);
  if (layers.capitalAllocation) check('capital_allocation', layers.capitalAllocation.generatedAt);
  if (layers.strategy) check('ai_recommendation', layers.strategy.generatedAt);
  return stale;
}
