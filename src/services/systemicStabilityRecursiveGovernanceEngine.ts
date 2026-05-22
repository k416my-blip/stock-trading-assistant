/**
 * Systemic Stability & Recursive Governance — paper only, stability/governance only.
 */
import {
  CASCADE_PREVENTION_FORMULA_JA,
  CASCADE_PREVENTION_FLOW_JA,
  CASCADE_RISK_THRESHOLD,
  EMERGENCY_SAFE_MODE_FLOW_JA,
  EQUILIBRIUM_FORMULA_JA,
  FREEZE_CHAIN_THRESHOLD,
  GOVERNANCE_COOLDOWN_FLOW_JA,
  GOVERNANCE_SATURATION_THRESHOLD,
  FREEZE_CHAIN_BREAKER_FLOW_JA,
  OSCILLATION_CLAMP_FLOW_JA,
  OSCILLATION_RISK_THRESHOLD,
  REAL_TRADING_ENABLED,
  RECURSIVE_GOVERNANCE_FLOW_JA,
  RECURSIVE_ISOLATION_FLOW_JA,
  RECURSIVE_RISK_FORMULA_JA,
  RECURSIVE_RISK_THRESHOLD,
  STABILITY_FLOW_JA,
  STABILITY_HEALTH_FORMULA_JA,
  SYSTEMIC_FEATURE_LABELS,
  SYSTEMIC_STABILITY_REGULATORY_JA,
} from '../constants/systemicStabilityRecursiveGovernance';
import type {
  BuildSystemicStabilityInput,
  SystemicStabilityFeatureId,
  SystemicStabilityFeatureStatus,
  SystemicStabilityRecursiveGovernanceBundle,
} from '../types/systemicStabilityRecursiveGovernance';
import {
  appendStabilityTimelinePoint,
  loadSystemicStabilityState,
} from './systemicStabilityRecursiveGovernanceStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countFreezeChain(input: BuildSystemicStabilityInput): number {
  let n = 0;
  if (input.semantic?.semanticFreeze) n++;
  if (input.epistemic?.reliabilityFreeze) n++;
  if (input.arbitration?.intentFreeze) n++;
  if (input.reflection?.reflectionFreeze) n++;
  if (input.compression?.cognitiveStabilityFreeze) n++;
  if (input.temporal?.emergencyStateFreeze) n++;
  return n;
}

function countActiveRecursiveLayers(input: BuildSystemicStabilityInput): number {
  let n = 0;
  if (input.epistemic) n++;
  if (input.arbitration) n++;
  if (input.reflection) n++;
  if (input.compression) n++;
  if (input.semantic) n++;
  if (input.temporal) n++;
  return n;
}

function buildFeatureStatuses(
  partial: Omit<SystemicStabilityRecursiveGovernanceBundle, 'featureStatuses'>,
  reflectionRecursionHigh: boolean,
): SystemicStabilityFeatureStatus[] {
  const s = (
    id: SystemicStabilityFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): SystemicStabilityFeatureStatus => ({
    id,
    labelJa: SYSTEMIC_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('recursive_governance_stabilizer', partial.recursiveRiskPct < 60, partial.recursiveRiskPct >= 60, `${partial.recursiveRiskPct}`),
    s('systemic_stability_engine', partial.stabilityHealthScore >= 55, partial.stabilityHealthScore < 40, `${partial.stabilityHealthScore}`),
    s('self_conflict_isolation', !partial.cascadeIsolationActive, partial.cascadeIsolationActive, 'isolate'),
    s('cascade_prevention_engine', partial.cascadeRiskPct < CASCADE_RISK_THRESHOLD, partial.cascadeRiskPct >= CASCADE_RISK_THRESHOLD, `${partial.cascadeRiskPct}`),
    s('freeze_chain_breaker', partial.freezeChainCount <= FREEZE_CHAIN_THRESHOLD, partial.freezeChainCount > FREEZE_CHAIN_THRESHOLD, `${partial.freezeChainCount}`),
    s('recursive_loop_detector', partial.recursiveLoopRiskPct < 50, partial.recursiveLoopRiskPct >= 50, `${partial.recursiveLoopRiskPct}`),
    s('arbitration_oscillation_guard', partial.oscillationRiskPct < OSCILLATION_RISK_THRESHOLD, partial.oscillationRiskPct >= OSCILLATION_RISK_THRESHOLD, `${partial.oscillationRiskPct}`),
    s('confidence_collapse_preventer', partial.stabilityHealthScore >= 45, false, 'clamp'),
    s('governance_saturation_detector', partial.governanceSaturationPct < GOVERNANCE_SATURATION_THRESHOLD, partial.governanceSaturationPct >= GOVERNANCE_SATURATION_THRESHOLD, `${partial.governanceSaturationPct}`),
    s('stability_consensus_engine', partial.stabilityConsensusPct >= 50, false, `${partial.stabilityConsensusPct}`),
    s('meta_governance_layer', true, partial.governanceCooldownActive, 'meta'),
    s('reflection_recursion_guard', partial.arbitrationRecursionPct < 40, partial.arbitrationRecursionPct >= 40, 'reflection'),
    s('downgrade_cascade_limiter', partial.downgradeCascadePct < 50, partial.downgradeCascadePct >= 50, `${partial.downgradeCascadePct}`),
    s('self_critique_dampener', !reflectionRecursionHigh, reflectionRecursionHigh, 'dampen'),
    s('cognitive_oscillation_clamp', partial.oscillationRiskPct < 60, partial.oscillationRiskPct >= 60, 'clamp'),
    s('layer_interference_resolver', true, false, 'resolve'),
    s('recursive_freeze_governor', !partial.recursiveFreezeActive, partial.recursiveFreezeActive, 'freeze'),
    s('meta_stability_snapshot', partial.metaStabilitySnapshots.length > 0, false, `${partial.metaStabilitySnapshots.length}`),
    s('stability_recovery_engine', partial.recoveryHealthPct >= 55, partial.recoveryHealthPct < 45, `${partial.recoveryHealthPct}`),
    s('governance_cooldown_engine', !partial.governanceCooldownActive, partial.governanceCooldownActive, 'cooldown'),
    s('recursive_load_balancer', partial.governanceLoadPct < 75, partial.governanceLoadPct >= 75, `${partial.governanceLoadPct}`),
    s('stability_drift_tracker', partial.stabilityDriftPct < 20, partial.stabilityDriftPct >= 20, `${partial.stabilityDriftPct}`),
    s('emergency_governance_halt', !partial.emergencyGovernanceHalt, partial.emergencyGovernanceHalt, 'halt'),
    s('self_healing_stabilizer', partial.recoveryHealthPct >= 50, false, 'heal'),
    s('cognitive_equilibrium_engine', partial.cognitiveEquilibriumPct >= 50, false, `${partial.cognitiveEquilibriumPct}`),
    s('recursive_arbitration_isolation', !partial.arbitrationHalted, partial.arbitrationHalted, 'halt arb'),
    s('stability_timeline_compressor', partial.stabilityTimeline.length > 0, false, `${partial.stabilityTimeline.length}`),
    s('governance_memory_pruner', true, false, 'prune'),
    s('stability_dashboard', true, false, 'panel'),
    s('systemic_emergency_safe_mode', !partial.systemicEmergencySafeMode, partial.systemicEmergencySafeMode, 'safe'),
  ];
}

export async function buildSystemicStabilityRecursiveGovernanceBundle(
  input: BuildSystemicStabilityInput,
): Promise<SystemicStabilityRecursiveGovernanceBundle> {
  const persisted = await loadSystemicStabilityState();
  const fatigueHigh = (input.reflection?.fatigueScore ?? 0) >= 70;
  const compressionSuppressed = fatigueHigh && (input.compression?.memorySaturationPct ?? 0) > 50;

  const recursiveDepth =
    (input.compression?.recursiveDepth ?? 0) +
    countActiveRecursiveLayers(input);
  const freezeChainCount = countFreezeChain(input);
  const freezeFrequency = clamp(freezeChainCount * 18);
  const arbitrationLoops = input.arbitration?.arbitrationConflicts.length ?? 0;
  const arbitrationRecursionPct = clamp(
    arbitrationLoops * 12 +
      (input.arbitration?.deadlockDetected ? 25 : 0) +
      (input.arbitration?.priorityDriftPct ?? 0) * 0.5,
  );

  const recursiveRiskPct = clamp(
    (recursiveDepth / 12) * 40 + freezeFrequency * 0.3 + arbitrationRecursionPct * 0.4,
  );

  const rollbackPropagation = input.temporal?.rollbackApplied ? 25 : 0;
  const downgradeCascadePct = clamp(
    rollbackPropagation +
      (input.arbitration?.downgradeReasonJa ? 20 : 0) +
      (input.reflection?.conservativeRecoveryActive ? 15 : 0) +
      (input.compression?.cognitiveStabilityFreeze ? 10 : 0),
  );
  const cascadeRiskPct = clamp(
    downgradeCascadePct + freezeChainCount * 12 + rollbackPropagation,
  );

  const compressionOscillation =
    Math.abs((input.compression?.compressionRatioPct ?? 50) - 55) < 15 &&
    (input.compression?.memorySaturationPct ?? 0) > 60;
  const oscillationRiskPct = clamp(
    (input.reflection?.confidenceVolatilityPct ?? 0) * 0.4 +
      arbitrationRecursionPct * 0.3 +
      (compressionOscillation && !compressionSuppressed ? 20 : 0) +
      (input.epistemic?.confidenceDriftPct ?? 0) * 0.3,
  );

  const governanceSaturationPct = clamp(
    (input.governance?.unifiedAiSummaryJa.length ?? 0) / 40 +
      (input.governance?.vetoLayer ? 15 : 0) +
      countActiveRecursiveLayers(input) * 8,
  );

  const governanceLoadPct = clamp(
    governanceSaturationPct * 0.5 +
      recursiveRiskPct * 0.3 +
      (input.resource?.aiLoadPct ?? 0) * 0.2,
  );

  const govScore = input.governance?.consensusScore ?? 50;
  const relScore = input.epistemic?.reliabilityHealthScore ?? 50;
  const semScore = input.semantic?.finalDecisionCoherenceScore ?? 50;
  const arbScore = input.arbitration?.arbitrationHealthScore ?? 50;
  const oscillationPenalty = oscillationRiskPct * 0.35;
  const cognitiveEquilibriumPct = clamp(
    (govScore + relScore + semScore + arbScore) / 4 - oscillationPenalty,
  );

  const stabilityConsensusPct = clamp(
    (cognitiveEquilibriumPct +
      (input.reflection?.reflectionConsensusPct ?? 50) +
      (input.epistemic?.reliabilityConsensusPct ?? 50)) /
      3,
  );

  const contradictionTrend = input.reflection?.contradictionTrendPct ?? 0;
  const instabilityDrift = input.epistemic?.reliabilityDriftPct ?? 0;

  let stabilityHealthScore = clamp(
    100 -
      recursiveRiskPct * 0.2 -
      cascadeRiskPct * 0.2 -
      oscillationRiskPct * 0.15 -
      governanceLoadPct * 0.1 -
      downgradeCascadePct * 0.1 -
      freezeChainCount * 2.5 -
      contradictionTrend * 0.1 -
      instabilityDrift * 0.05,
  );

  if (contradictionTrend >= 25) stabilityHealthScore = clamp(stabilityHealthScore - 8);

  const recursiveLoopRiskPct = clamp(
    recursiveRiskPct + (recursiveDepth > 10 ? 15 : 0) + (arbitrationRecursionPct > 40 ? 10 : 0),
  );

  const arbitrationHalted = recursiveLoopRiskPct > 50 || input.arbitration?.deadlockDetected === true;
  const governanceCooldownActive = governanceSaturationPct > GOVERNANCE_SATURATION_THRESHOLD;
  const cascadeIsolationActive = cascadeRiskPct > CASCADE_RISK_THRESHOLD;
  const recursiveFreezeActive = recursiveRiskPct > RECURSIVE_RISK_THRESHOLD;
  const replayCorrupt =
    input.temporal?.replayIntegrityOk === false || input.compression?.replayCorruptionDetected === true;

  const systemicEmergencySafeMode =
    recursiveFreezeActive ||
    cascadeIsolationActive ||
    input.reflection?.metaEmergencyShutdown === true ||
    input.compression?.emergencyContextCollapse === true ||
    stabilityHealthScore < 35;
  const emergencyGovernanceHalt = systemicEmergencySafeMode || replayCorrupt;

  if (systemicEmergencySafeMode) stabilityHealthScore = clamp(stabilityHealthScore - 10);

  const recoveryHealthPct = clamp(
    100 -
      (replayCorrupt ? 25 : 0) -
      (systemicEmergencySafeMode ? 30 : 0) +
      (persisted.metaStabilitySnapshots.length > 0 ? 12 : 0),
  );

  const stabilityDriftPct = await appendStabilityTimelinePoint(
    {
      at: new Date().toISOString(),
      stabilityHealth: stabilityHealthScore,
      recursiveRisk: recursiveRiskPct,
      cascadeRisk: cascadeRiskPct,
    },
    {
      id: `stab-${Date.now()}`,
      at: new Date().toISOString(),
      stabilityHealth: stabilityHealthScore,
      governanceLoadPct,
    },
  );

  const reflectionRecursionHigh =
    (input.reflection?.driftTimeline?.length ?? 0) > 5 ||
    (input.reflection?.selfCritiqueScore ?? 100) < 40;

  const partial: Omit<SystemicStabilityRecursiveGovernanceBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: SYSTEMIC_STABILITY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    stabilityHealthScore,
    healthLabelJa:
      stabilityHealthScore >= 75
        ? '系統安定'
        : stabilityHealthScore >= 50
          ? '系統注意'
          : '系統危険 — safe mode',
    recursiveLoopRiskPct,
    governanceSaturationPct,
    cascadeRiskPct,
    oscillationRiskPct,
    freezeChainCount,
    arbitrationRecursionPct,
    downgradeCascadePct,
    stabilityConsensusPct,
    cognitiveEquilibriumPct,
    governanceLoadPct,
    stabilityDriftPct,
    recoveryHealthPct,
    recursiveRiskPct,
    arbitrationHalted,
    governanceCooldownActive,
    cascadeIsolationActive,
    recursiveFreezeActive,
    systemicEmergencySafeMode,
    emergencyGovernanceHalt,
    stabilitySummaryJa: [
      `health ${stabilityHealthScore}`,
      `recursive ${recursiveRiskPct}% cascade ${cascadeRiskPct}%`,
      arbitrationHalted ? 'ARBITRATION HALTED' : null,
      governanceCooldownActive ? 'GOV COOLDOWN' : null,
      systemicEmergencySafeMode ? 'SYSTEMIC SAFE MODE' : null,
      compressionSuppressed ? 'compression suppressed (fatigue)' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    equilibriumFormulaJa: EQUILIBRIUM_FORMULA_JA,
    cascadePreventionFormulaJa: CASCADE_PREVENTION_FORMULA_JA,
    stabilityHealthFormulaJa: STABILITY_HEALTH_FORMULA_JA,
    recursiveRiskFormulaJa: RECURSIVE_RISK_FORMULA_JA,
    stabilityFlowJa: [...STABILITY_FLOW_JA],
    recursiveGovernanceFlowJa: [...RECURSIVE_GOVERNANCE_FLOW_JA],
    cascadePreventionFlowJa: [...CASCADE_PREVENTION_FLOW_JA],
    oscillationClampFlowJa: [...OSCILLATION_CLAMP_FLOW_JA],
    recursiveIsolationFlowJa: [...RECURSIVE_ISOLATION_FLOW_JA],
    freezeChainBreakerFlowJa: [...FREEZE_CHAIN_BREAKER_FLOW_JA],
    governanceCooldownFlowJa: [...GOVERNANCE_COOLDOWN_FLOW_JA],
    emergencySafeModeFlowJa: [...EMERGENCY_SAFE_MODE_FLOW_JA],
    stabilityTimeline: [
      ...persisted.stabilityTimeline,
      {
        at: new Date().toISOString(),
        stabilityHealth: stabilityHealthScore,
        recursiveRisk: recursiveRiskPct,
        cascadeRisk: cascadeRiskPct,
      },
    ].slice(-8),
    metaStabilitySnapshots: [
      ...persisted.metaStabilitySnapshots,
      {
        id: `stab-snap-${Date.now()}`,
        at: new Date().toISOString(),
        stabilityHealth: stabilityHealthScore,
        governanceLoadPct,
      },
    ].slice(-6),
    explainRuleBasisJa:
      '再帰 layer 不安定伝播を防止。stability/governance のみ調整し新規売買は生成しない。',
  };

  const featureStatuses = buildFeatureStatuses(partial, reflectionRecursionHigh);
  return { ...partial, featureStatuses };
}
