/**
 * Cognitive Goal Arbitration & Intent Priority — paper only, arbitration only.
 */
import {
  ARBITRATION_FEATURE_LABELS,
  ARBITRATION_FLOW_STEPS_JA,
  ARBITRATION_REGULATORY_JA,
  CONFLICT_RESOLVER_FORMULA_JA,
  DEADLOCK_RESOLVER_FORMULA_JA,
  DOWNGRADE_FLOW_JA,
  EMERGENCY_SAFE_MODE_FLOW_JA,
  GOAL_BASE_RANK,
  GOVERNANCE_PRIORITY_FORMULA_JA,
  OVERRIDE_HIERARCHY_JA,
  PRIORITY_FORMULA_JA,
  REAL_TRADING_ENABLED,
  RELIABILITY_SAFE_MODE_THRESHOLD,
  ROLLBACK_ARBITRATION_FLOW_JA,
  SEMANTIC_VETO_FLOW_JA,
} from '../constants/cognitiveGoalArbitrationIntentPriority';
import type {
  ActiveGoalRow,
  ArbitrationConflictRow,
  ArbitrationFeatureId,
  ArbitrationFeatureStatus,
  ArbitrationGoalId,
  BuildCognitiveGoalArbitrationInput,
  CognitiveGoalArbitrationIntentPriorityBundle,
  GoalStackEntry,
} from '../types/cognitiveGoalArbitrationIntentPriority';
import {
  appendArbitrationTimelinePoint,
  loadCognitiveGoalArbitrationState,
} from './cognitiveGoalArbitrationIntentPriorityStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function priorityScore(rank: number, boost = 0, penalty = 0): number {
  return clamp(100 - rank * 8 + boost - penalty);
}

type OverrideFlags = {
  safetyFirst: boolean;
  governanceSupreme: boolean;
  semanticFreeze: boolean;
  temporalRollback: boolean;
  reliabilitySafeMode: boolean;
  replayFreeze: boolean;
  resourceEmergency: boolean;
  reactiveEmergency: boolean;
  unsupportedVeto: boolean;
  contradictionVeto: boolean;
  emergencySafeMode: boolean;
  intentFreeze: boolean;
};

function detectOverrides(input: BuildCognitiveGoalArbitrationInput): OverrideFlags {
  const reliabilityHealth = input.epistemic?.reliabilityHealthScore ?? 70;
  const replayOk = input.temporal?.replayIntegrityOk !== false;
  const unsupported =
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) +
    (input.epistemic?.unsupportedClaimsJa?.length ?? 0);
  const contradiction =
    (input.semantic?.contradictionLanguageJa?.length ?? 0) > 0 ||
    input.governance?.contradictionDetected === true;

  return {
    safetyFirst:
      input.temporal?.emergencyStateFreeze === true ||
      input.stability?.systemHealthScore != null && input.stability.systemHealthScore < 40,
    governanceSupreme: !!input.governance?.vetoLayer || input.governance?.humanOverrideActive === true,
    semanticFreeze: input.semantic?.semanticFreeze === true,
    temporalRollback: input.temporal?.rollbackApplied === true,
    reliabilitySafeMode:
      reliabilityHealth < RELIABILITY_SAFE_MODE_THRESHOLD ||
      input.epistemic?.reliabilityFreeze === true,
    replayFreeze: !replayOk || (input.epistemic?.replayTrustPct ?? 100) < 25,
    resourceEmergency: input.resource?.emergencyComputeCut === true,
    reactiveEmergency:
      (input.reactive?.burstProtectionActive ?? false) ||
      (input.reactive?.renderBudgetBlocked ?? 0) > 5,
    unsupportedVeto: unsupported > 0,
    contradictionVeto: contradiction,
    emergencySafeMode: false,
    intentFreeze: false,
  };
}

function buildActiveGoals(flags: OverrideFlags, input: BuildCognitiveGoalArbitrationInput): ActiveGoalRow[] {
  const goals: Array<{ id: ArbitrationGoalId; labelJa: string; rank: number; boost: number; active: boolean; isolated: boolean }> = [
    { id: 'safety', labelJa: 'Safety-first', rank: GOAL_BASE_RANK.safety, boost: flags.safetyFirst ? 12 : 0, active: flags.safetyFirst, isolated: false },
    { id: 'governance', labelJa: 'Governance supreme', rank: GOAL_BASE_RANK.governance, boost: flags.governanceSupreme ? 10 : 0, active: !!input.governance, isolated: false },
    { id: 'replay', labelJa: 'Replay integrity', rank: GOAL_BASE_RANK.replay, boost: flags.replayFreeze ? 8 : 0, active: flags.replayFreeze, isolated: flags.replayFreeze },
    { id: 'semantic', labelJa: 'Semantic coherence', rank: GOAL_BASE_RANK.semantic, boost: flags.semanticFreeze ? 8 : 0, active: !!input.semantic, isolated: flags.semanticFreeze },
    { id: 'temporal', labelJa: 'Temporal integrity', rank: GOAL_BASE_RANK.temporal, boost: flags.temporalRollback ? 8 : 0, active: !!input.temporal, isolated: false },
    { id: 'reliability', labelJa: 'Epistemic reliability', rank: GOAL_BASE_RANK.reliability, boost: flags.reliabilitySafeMode ? 6 : 0, active: !!input.epistemic, isolated: flags.reliabilitySafeMode },
    { id: 'resource', labelJa: 'Resource budget', rank: GOAL_BASE_RANK.resource, boost: flags.resourceEmergency ? 6 : 0, active: !!input.resource, isolated: flags.resourceEmergency },
    { id: 'reactive', labelJa: 'Reactive orchestration', rank: GOAL_BASE_RANK.reactive, boost: flags.reactiveEmergency ? 4 : 0, active: !!input.reactive, isolated: false },
    { id: 'performance', labelJa: 'Performance', rank: GOAL_BASE_RANK.performance, boost: 0, active: !!input.resource, isolated: false },
    { id: 'consensus', labelJa: 'Multi-layer consensus', rank: GOAL_BASE_RANK.consensus, boost: 0, active: true, isolated: false },
  ];
  return goals.map((g) => ({
    goalId: g.id,
    labelJa: g.labelJa,
    priorityRank: g.rank,
    priorityScore: priorityScore(g.rank, g.boost),
    active: g.active,
    isolated: g.isolated,
  }));
}

function buildConflicts(
  flags: OverrideFlags,
  input: BuildCognitiveGoalArbitrationInput,
): ArbitrationConflictRow[] {
  const rows: ArbitrationConflictRow[] = [];
  let i = 0;
  const add = (layers: string, conflict: string, resolver: string, winner: string) => {
    rows.push({ id: `c-${i++}`, layersJa: layers, conflictJa: conflict, resolverJa: resolver, winnerJa: winner });
  };

  if (input.reactive && input.governance) {
    add('governance vs reactive', '最終決定の競合', 'governance_vs_reactive → governance優先', 'governance');
  }
  if (input.temporal && input.semantic) {
    const winner = flags.temporalRollback ? 'temporal' : flags.semanticFreeze ? 'semantic' : 'temporal';
    add('temporal vs semantic', '整合性優先', 'temporal_vs_semantic', winner);
  }
  if (input.epistemic && input.resource) {
    add('reliability vs performance', '安定性 vs 計算', 'reliability_vs_performance → reliability', 'reliability');
  }
  if (flags.contradictionVeto) {
    add('layers', '矛盾検出', 'contradiction_arbitration → veto', 'governance');
  }
  if (flags.unsupportedVeto) {
    add('semantic/epistemic', 'unsupported claims', 'unsupported_suppression → veto', 'semantic');
  }
  if (flags.replayFreeze) {
    add('replay/temporal', 'replay破損', 'replay_integrity → freeze', 'replay');
  }
  return rows;
}

function buildGoalStack(flags: OverrideFlags, conflicts: ArbitrationConflictRow[]): GoalStackEntry[] {
  const stack: GoalStackEntry[] = [];
  let rank = 1;
  const push = (goalId: ArbitrationGoalId, labelJa: string, reasonJa: string) => {
    stack.push({ rank: rank++, goalId, labelJa, reasonJa });
  };
  if (flags.safetyFirst) push('safety', 'Safety-first', '安全最優先 override');
  push('governance', 'Governance supreme', '最上位 authority');
  if (flags.replayFreeze) push('replay', 'Replay integrity', 'replay corruption freeze');
  if (flags.semanticFreeze) push('semantic', 'Semantic freeze', 'buy禁止');
  if (flags.temporalRollback) push('temporal', 'Temporal rollback', 'downgrade必須');
  if (flags.reliabilitySafeMode) push('reliability', 'Reliability safe mode', `health<${RELIABILITY_SAFE_MODE_THRESHOLD}`);
  if (flags.resourceEmergency) push('resource', 'Resource emergency', 'compute cut');
  if (flags.reactiveEmergency) push('reactive', 'Reactive emergency', 'burst/budget');
  if (conflicts.length > 0) push('consensus', 'Consensus', 'conflict resolved');
  return stack;
}

function computeHealth(flags: OverrideFlags, conflictCount: number, deadlock: boolean): number {
  let health = 85;
  if (flags.reliabilitySafeMode) health -= 25;
  if (flags.replayFreeze) health -= 20;
  if (flags.semanticFreeze) health -= 10;
  if (flags.temporalRollback) health -= 12;
  if (flags.unsupportedVeto) health -= 8;
  if (flags.contradictionVeto) health -= 10;
  if (flags.reactiveEmergency) health -= 5;
  if (flags.resourceEmergency) health -= 8;
  if (conflictCount > 3) health -= 10;
  if (deadlock) health -= 15;
  return clamp(health);
}

function buildFeatureStatuses(
  partial: Omit<CognitiveGoalArbitrationIntentPriorityBundle, 'featureStatuses'>,
  flags: OverrideFlags,
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
    s('global_intent_priority_engine', partial.activeGoals.length > 0, false, `${partial.activeGoals.length}`),
    s('goal_arbitration_matrix', partial.arbitrationConflicts.length >= 0, partial.arbitrationConflicts.length > 2, `${partial.arbitrationConflicts.length}`),
    s('safety_first_override', !flags.safetyFirst, flags.safetyFirst, 'safety'),
    s('governance_supreme_authority', true, false, partial.governanceAuthorityJa),
    s('semantic_freeze_priority', !flags.semanticFreeze, flags.semanticFreeze, partial.semanticVetoJa ?? 'no'),
    s('temporal_rollback_priority', !flags.temporalRollback, flags.temporalRollback, 'rollback'),
    s('reliability_override', !flags.reliabilitySafeMode, flags.reliabilitySafeMode, partial.reliabilityOverrideJa ?? 'no'),
    s('resource_emergency_priority', !flags.resourceEmergency, flags.resourceEmergency, 'resource'),
    s('replay_integrity_priority', !flags.replayFreeze, flags.replayFreeze, partial.freezeSourceJa ?? 'no'),
    s('contradiction_arbitration', !flags.contradictionVeto, flags.contradictionVeto, 'veto'),
    s('unsupported_claim_suppression', !flags.unsupportedVeto, flags.unsupportedVeto, 'suppress'),
    s('confidence_priority_clamp', true, false, 'clamp'),
    s('reactive_emergency_arbitration', !flags.reactiveEmergency, flags.reactiveEmergency, 'reactive'),
    s('multi_layer_conflict_resolver', partial.arbitrationConflicts.length < 4, partial.arbitrationConflicts.length >= 4, 'resolver'),
    s('governance_vs_reactive_resolver', true, false, 'governance'),
    s('temporal_vs_semantic_resolver', true, false, 'temporal>semantic on rollback'),
    s('reliability_vs_performance_resolver', true, false, 'reliability'),
    s('consensus_arbitration', partial.arbitrationHealthScore >= 50, false, `${partial.arbitrationHealthScore}`),
    s('intent_downgrade_engine', true, !!partial.downgradeReasonJa, partial.downgradeReasonJa ?? 'none'),
    s('emergency_intent_freeze', !partial.intentFreeze, partial.intentFreeze, partial.freezeSourceJa ?? 'no'),
    s('ai_goal_stack', partial.goalStack.length > 0, false, `${partial.goalStack.length}`),
    s('priority_escalation_engine', flags.safetyFirst || flags.replayFreeze, false, 'escalation'),
    s('decision_deadlock_detector', !partial.deadlockDetected, partial.deadlockDetected, 'deadlock'),
    s('arbitration_replay_timeline', partial.arbitrationTimeline.length > 0, false, `${partial.arbitrationTimeline.length}`),
    s('priority_drift_detector', partial.priorityDriftPct < 15, partial.priorityDriftPct >= 15, `${partial.priorityDriftPct}`),
    s('explainability_priority_narrator', partial.priorityNarrativeJa.length > 0, false, 'narrator'),
    s('goal_isolation_guard', partial.activeGoals.filter((g) => g.isolated).length === 0, partial.activeGoals.some((g) => g.isolated), 'isolation'),
    s('arbitration_health_score', partial.arbitrationHealthScore >= 55, partial.arbitrationHealthScore < 40, `${partial.arbitrationHealthScore}`),
    s('arbitration_dashboard', true, false, 'panel'),
    s('emergency_safe_mode', !partial.emergencySafeMode, partial.emergencySafeMode, 'safe'),
  ];
}

export async function buildCognitiveGoalArbitrationIntentPriorityBundle(
  input: BuildCognitiveGoalArbitrationInput,
): Promise<CognitiveGoalArbitrationIntentPriorityBundle> {
  const persisted = await loadCognitiveGoalArbitrationState();
  const flags = detectOverrides(input);

  flags.emergencySafeMode =
    flags.reliabilitySafeMode ||
    flags.replayFreeze ||
    flags.safetyFirst ||
    input.temporal?.emergencyStateFreeze === true;
  flags.intentFreeze =
    flags.replayFreeze ||
    flags.semanticFreeze ||
    flags.emergencySafeMode ||
    input.epistemic?.reliabilityFreeze === true;

  const activeGoals = buildActiveGoals(flags, input);
  const arbitrationConflicts = buildConflicts(flags, input);
  const goalStack = buildGoalStack(flags, arbitrationConflicts);

  const sortedGoals = [...activeGoals].sort((a, b) => a.priorityRank - b.priorityRank);
  const priorityOrderJa = sortedGoals.map((g) => `${g.priorityRank}. ${g.labelJa} (${g.priorityScore})`);

  const deadlockDetected =
    arbitrationConflicts.length >= 4 &&
    flags.contradictionVeto &&
    flags.reliabilitySafeMode &&
    flags.temporalRollback;

  const arbitrationHealthScore = computeHealth(flags, arbitrationConflicts.length, deadlockDetected);

  const priorityDriftPct = await appendArbitrationTimelinePoint({
    at: new Date().toISOString(),
    healthScore: arbitrationHealthScore,
    deadlockDetected,
    safeMode: flags.emergencySafeMode,
  });

  const freezeSourceJa = flags.replayFreeze
    ? 'replay corruption'
    : flags.semanticFreeze
      ? 'semantic freeze'
      : flags.intentFreeze
        ? 'intent freeze'
        : null;

  const downgradeReasonJa =
    flags.temporalRollback || flags.reliabilitySafeMode || flags.emergencySafeMode
      ? 'buy→watch / reduce→hold（rollback・safe mode・reliability）'
      : null;

  const overrideReasonJa = flags.governanceSupreme
    ? `Governance supreme: ${input.governance?.vetoLayer ?? 'override'}`
    : flags.safetyFirst
      ? 'Safety-first override'
      : null;

  const semanticVetoJa = flags.semanticFreeze
    ? input.semantic?.emergencyNarrativeFallbackJa ?? 'semantic freeze — buy禁止'
    : flags.unsupportedVeto
      ? `unsupported veto: ${(input.semantic?.unsupportedClaimsJa ?? []).slice(0, 2).join(', ')}`
      : null;

  const reliabilityOverrideJa = flags.reliabilitySafeMode
    ? `reliability health ${input.epistemic?.reliabilityHealthScore ?? 0}% < ${RELIABILITY_SAFE_MODE_THRESHOLD}`
    : null;

  const governanceAuthorityJa = input.governance?.vetoLayer
    ? `Governance veto: ${input.governance.vetoLayer} — supreme authority`
    : 'Governance consensus — default supreme';

  const priorityNarrativeJa = [
    overrideReasonJa,
    semanticVetoJa,
    reliabilityOverrideJa,
    downgradeReasonJa,
    flags.emergencySafeMode ? 'Emergency safe mode: watch/hold only' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const partial: Omit<CognitiveGoalArbitrationIntentPriorityBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: ARBITRATION_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    arbitrationHealthScore,
    healthLabelJa:
      arbitrationHealthScore >= 75
        ? '調停安定'
        : arbitrationHealthScore >= 50
          ? '調停注意'
          : '調停危険 — safe mode',
    priorityOrderJa,
    activeGoals: sortedGoals,
    arbitrationConflicts,
    goalStack,
    overrideReasonJa,
    freezeSourceJa,
    downgradeReasonJa,
    governanceAuthorityJa,
    semanticVetoJa,
    reliabilityOverrideJa,
    emergencySafeMode: flags.emergencySafeMode,
    intentFreeze: flags.intentFreeze,
    deadlockDetected,
    priorityDriftPct,
    priorityNarrativeJa: priorityNarrativeJa || '通常調停 — governance 最上位',
    arbitrationTimeline: [
      ...persisted.arbitrationTimeline,
      {
        at: new Date().toISOString(),
        healthScore: arbitrationHealthScore,
        deadlockDetected,
        safeMode: flags.emergencySafeMode,
      },
    ].slice(-12),
    priorityFormulaJa: PRIORITY_FORMULA_JA,
    overrideHierarchyJa: [...OVERRIDE_HIERARCHY_JA],
    governancePriorityFormulaJa: GOVERNANCE_PRIORITY_FORMULA_JA,
    semanticVetoFlowJa: [...SEMANTIC_VETO_FLOW_JA],
    rollbackArbitrationFlowJa: [...ROLLBACK_ARBITRATION_FLOW_JA],
    conflictResolverFormulaJa: CONFLICT_RESOLVER_FORMULA_JA,
    deadlockResolverFormulaJa: DEADLOCK_RESOLVER_FORMULA_JA,
    downgradeFlowJa: [...DOWNGRADE_FLOW_JA],
    emergencySafeModeFlowJa: [...EMERGENCY_SAFE_MODE_FLOW_JA],
    arbitrationFlowJa: [...ARBITRATION_FLOW_STEPS_JA],
    arbitrationSummaryJa: [
      `health ${arbitrationHealthScore}/100`,
      `conflicts ${arbitrationConflicts.length}`,
      flags.emergencySafeMode ? 'SAFE MODE' : 'normal',
      deadlockDetected ? 'DEADLOCK' : 'ok',
    ].join(' — '),
    explainRuleBasisJa:
      '複数 layer の intent を調停。新規 buy/sell は生成せず downgrade/freeze/hold/watch のみ。',
  };

  const featureStatuses = buildFeatureStatuses(partial, flags);
  return { ...partial, featureStatuses };
}
