/**
 * Execution Recovery & Adaptive Confidence — conservative thaw only, paper trading.
 */
import {
  ADAPTIVE_CONFIDENCE_FORMULA_JA,
  ADAPTIVE_THAW_FLOW_JA,
  CONFIDENCE_REBUILD_FLOW_JA,
  REAL_TRADING_ENABLED,
  RECOVERY_COOLDOWN_FLOW_JA,
  RECOVERY_CONSENSUS_FORMULA_JA,
  RECOVERY_FEATURE_LABELS,
  RECOVERY_FLOW_JA,
  RECOVERY_HEALTH_FORMULA_JA,
  RECOVERY_OSCILLATION_SUSPEND_THRESHOLD,
  RECOVERY_REGULATORY_JA,
  RECURSIVE_THAW_BLOCK_THRESHOLD,
  THAW_LEVEL_FORMULA_JA,
} from '../constants/executionRecoveryAdaptiveConfidence';
import type {
  BuildExecutionRecoveryInput,
  ExecutionRecoveryAdaptiveConfidenceBundle,
  ExecutionRecoveryFeatureId,
  ExecutionRecoveryFeatureStatus,
  RecoveryStage,
  ThawState,
} from '../types/executionRecoveryAdaptiveConfidence';
import {
  appendRecoveryTimelinePoint,
  isRollbackCooldownActive,
  loadExecutionRecoveryState,
} from './executionRecoveryAdaptiveConfidenceStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countFreezeSignals(input: BuildExecutionRecoveryInput): number {
  let n = 0;
  if (input.semantic?.semanticFreeze) n++;
  if (input.epistemic?.reliabilityFreeze) n++;
  if (input.arbitration?.intentFreeze) n++;
  if (input.reflection?.reflectionFreeze) n++;
  if (input.compression?.cognitiveStabilityFreeze) n++;
  if (input.temporal?.emergencyStateFreeze) n++;
  if (input.systemic?.recursiveFreezeActive) n++;
  return n;
}

function thawStateFromStage(stage: RecoveryStage): ThawState {
  if (stage === 0) return 'frozen';
  if (stage === 1) return 'hold_only';
  if (stage === 2) return 'reduce_hold';
  if (stage === 3) return 'watch';
  return 'buy_watch';
}

function stageFromThawLevel(thawLevel: number, blocked: boolean): RecoveryStage {
  if (blocked || thawLevel < 35) return 0;
  if (thawLevel < 45) return 1;
  if (thawLevel < 55) return 2;
  if (thawLevel < 65) return 3;
  return 4;
}

function buildFeatureStatuses(
  partial: Omit<ExecutionRecoveryAdaptiveConfidenceBundle, 'featureStatuses'>,
): ExecutionRecoveryFeatureStatus[] {
  const s = (
    id: ExecutionRecoveryFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): ExecutionRecoveryFeatureStatus => ({
    id,
    labelJa: RECOVERY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('recovery_health_scanner', partial.recoveryHealthPct >= 50, partial.recoveryHealthPct < 40, `${partial.recoveryHealthPct}`),
    s('confidence_rehabilitation_engine', partial.adaptiveConfidencePct >= 45, false, `${partial.adaptiveConfidencePct}`),
    s('adaptive_thaw_engine', partial.thawLevelPct >= 35, partial.thawLevelPct < 35, `${partial.thawLevelPct}`),
    s('conservative_recommendation_rebuilder', partial.safeRecovery, !partial.safeRecovery, 'rebuild'),
    s('stability_validation_gate', partial.recoveryConsensusPct >= 50, partial.recoveryConsensusPct < 45, `${partial.recoveryConsensusPct}`),
    s('recovery_consensus_engine', partial.recoveryConsensusPct >= 55, false, `${partial.recoveryConsensusPct}`),
    s('rollback_immunity_guard', !partial.cooldownActive, partial.cooldownActive, partial.cooldownStatusJa),
    s('anti_oscillation_recovery', !partial.recoverySuspended, partial.recoverySuspended, 'suspend'),
    s('thaw_level_computer', partial.thawLevelPct > 0, false, `${partial.thawLevelPct}`),
    s('adaptive_confidence_engine', partial.adaptiveConfidencePct >= 40, false, `${partial.adaptiveConfidencePct}`),
    s('freeze_gradual_release', partial.recoveryStage >= 1, partial.recoveryStage === 0, `stage ${partial.recoveryStage}`),
    s('hold_watch_exit_bridge', partial.recoveryStage >= 3, partial.recoveryStage < 2, partial.thawState),
    s('replay_integrity_restorer', partial.replayIntegrityOk, !partial.replayIntegrityOk, 'replay'),
    s('contradiction_trend_dampener', partial.contradictionTrendPct < 30, partial.contradictionTrendPct >= 30, `${partial.contradictionTrendPct}`),
    s('unsupported_trend_dampener', partial.unsupportedTrendPct < 30, partial.unsupportedTrendPct >= 30, `${partial.unsupportedTrendPct}`),
    s('governance_stability_probe', partial.recoveryConsensusPct >= 45, false, 'gov'),
    s('reflection_health_probe', partial.recoveryHealthPct >= 45, false, 'reflection'),
    s('systemic_equilibrium_probe', partial.recursiveRiskPct < 60, partial.recursiveRiskPct >= 60, `${partial.recursiveRiskPct}`),
    s('recovery_cooldown_engine', !partial.cooldownActive, partial.cooldownActive, 'cooldown'),
    s('thaw_rate_limiter', partial.freezeFrequencyPct < 50, partial.freezeFrequencyPct >= 50, 'half rate'),
    s('recovery_suspend_guard', !partial.recoverySuspended, partial.recoverySuspended, 'suspended'),
    s('recursive_thaw_blocker', partial.recursiveRiskPct < RECURSIVE_THAW_BLOCK_THRESHOLD, partial.recursiveRiskPct >= RECURSIVE_THAW_BLOCK_THRESHOLD, `${partial.recursiveRiskPct}`),
    s('governance_cooldown_thaw_limit', partial.recoveryStage <= 3, partial.recoveryStage > 3, 'gov cooldown'),
    s('confidence_ceiling_enforcer', true, false, '≤65'),
    s('safe_mode_respect_guard', !partial.recoveryBlocked, partial.recoveryBlocked, 'blocked'),
    s('recovery_timeline_compressor', partial.recoveryTimeline.length > 0, false, `${partial.recoveryTimeline.length}`),
    s('meta_recovery_snapshot', true, false, 'snap'),
    s('partial_restore_engine', partial.partialRestoreActive, false, 'partial'),
    s('recovery_dashboard', true, false, 'panel'),
    s('conservative_recovery_safe_mode', !partial.recoveryBlocked, partial.recoveryBlocked, 'conservative'),
  ];
}

export async function buildExecutionRecoveryAdaptiveConfidenceBundle(
  input: BuildExecutionRecoveryInput,
): Promise<ExecutionRecoveryAdaptiveConfidenceBundle> {
  const persisted = await loadExecutionRecoveryState();
  const rollbackCooldown = isRollbackCooldownActive(persisted);

  const contradictionTrendPct = input.reflection?.contradictionTrendPct ?? 0;
  const unsupportedTrendPct = input.reflection?.unsupportedTrendPct ?? 0;
  const rollbackDependencyPct = input.reflection?.rollbackDependencyPct ?? 0;
  const freezeCount = countFreezeSignals(input);
  const freezeFrequencyPct = clamp(freezeCount * 16);
  const oscillationRiskPct = input.systemic?.oscillationRiskPct ?? 0;
  const recursiveRiskPct = input.systemic?.recursiveRiskPct ?? 0;
  const instabilityDrift = input.epistemic?.reliabilityDriftPct ?? 0;

  const replayIntegrityOk =
    input.temporal?.replayIntegrityOk !== false &&
    !input.compression?.replayCorruptionDetected &&
    !input.compression?.replayIsolated;

  let recoveryHealthPct = clamp(
    100 -
      contradictionTrendPct * 0.2 -
      unsupportedTrendPct * 0.2 -
      recursiveRiskPct * 0.15 -
      rollbackDependencyPct * 0.15 -
      freezeFrequencyPct * 0.1 -
      oscillationRiskPct * 0.1 -
      instabilityDrift * 0.05,
  );

  const governanceTrust = input.governance?.consensusScore ?? 50;
  const replayTrust = input.epistemic?.replayTrustPct ?? (replayIntegrityOk ? 70 : 25);
  const semanticHealth = input.semantic?.finalDecisionCoherenceScore ?? 50;
  const arbitrationHealth = input.arbitration?.arbitrationHealthScore ?? 50;
  const reflectionHealth = input.reflection?.selfCritiqueScore ?? 50;
  const systemicHealth = input.systemic?.stabilityHealthScore ?? 50;

  const recoveryPenalty =
    (rollbackCooldown ? 18 : 0) +
    (input.systemic?.systemicEmergencySafeMode ? 25 : 0) +
    (input.systemic?.cascadeIsolationActive ? 20 : 0);

  const adaptiveConfidencePct = clamp(
    (governanceTrust + replayTrust + semanticHealth + arbitrationHealth + reflectionHealth + systemicHealth) /
      6 -
      recoveryPenalty,
  );

  let thawRateMultiplier = 1;
  if (freezeCount > 4) thawRateMultiplier = 0.5;

  let thawLevelPct = clamp(
    recoveryHealthPct * 0.5 * thawRateMultiplier +
      adaptiveConfidencePct * 0.5 * thawRateMultiplier -
      oscillationRiskPct,
  );

  const recoveryConsensusPct = clamp(
    (governanceTrust +
      (input.epistemic?.reliabilityHealthScore ?? 50) +
      arbitrationHealth +
      (input.reflection?.reflectionConsensusPct ?? 50) +
      (input.compression?.recoveryHealthPct ?? 50) +
      systemicHealth) /
      6,
  );

  const metaEmergency = input.reflection?.metaEmergencyShutdown === true;
  const cascadeBlock = input.systemic?.cascadeIsolationActive === true;
  const systemicEmergency = input.systemic?.systemicEmergencySafeMode === true;
  const recursiveFreeze = input.systemic?.recursiveFreezeActive === true;
  const governanceCooldown = input.systemic?.governanceCooldownActive === true;
  const replayIsolation = input.compression?.replayIsolated === true;
  const contextOverflow = input.compression?.contextOverflowRisk === true;

  const recoverySuspended = oscillationRiskPct > RECOVERY_OSCILLATION_SUSPEND_THRESHOLD;
  const recursiveThawBlocked = recursiveRiskPct > RECURSIVE_THAW_BLOCK_THRESHOLD;

  let recoveryBlocked =
    systemicEmergency ||
    cascadeBlock ||
    metaEmergency ||
    recursiveThawBlocked ||
    recoverySuspended;

  if (governanceCooldown) {
    thawLevelPct = Math.min(thawLevelPct, 64);
  }

  if (rollbackCooldown || rollbackDependencyPct > 50 || input.temporal?.rollbackApplied) {
    thawLevelPct = Math.min(thawLevelPct, 64);
  }

  if (recursiveFreeze || replayIsolation) {
    recoveryBlocked = recoveryBlocked || recursiveThawBlocked;
    thawLevelPct = Math.min(thawLevelPct, 54);
  }

  if (contextOverflow) {
    recoveryHealthPct = clamp(recoveryHealthPct - 10);
    thawLevelPct = Math.min(thawLevelPct, 55);
  }

  const cooldownActive =
    rollbackCooldown ||
    recursiveFreeze ||
    systemicEmergency ||
    replayIsolation ||
    input.temporal?.rollbackApplied === true;

  let recoveryStage = stageFromThawLevel(thawLevelPct, recoveryBlocked);
  if (governanceCooldown && recoveryStage > 3) recoveryStage = 3;
  if (cooldownActive) recoveryStage = Math.min(recoveryStage, 3) as RecoveryStage;

  const gradualMax = persisted.lastRecoveryStage + 1;
  if (!recoveryBlocked && recoveryConsensusPct >= 55 && thawLevelPct >= 40) {
    recoveryStage = Math.min(recoveryStage, gradualMax) as RecoveryStage;
  }

  const thawState = thawStateFromStage(recoveryStage);
  const safeRecovery =
    !recoveryBlocked &&
    !recoverySuspended &&
    recoveryConsensusPct >= 55 &&
    recoveryHealthPct >= 50 &&
    replayIntegrityOk;

  const partialRestoreActive = safeRecovery && recoveryStage >= 2;

  const cooldownStatusJa = cooldownActive
    ? rollbackCooldown
      ? 'rollback cooldown active'
      : systemicEmergency
        ? 'emergency — recovery blocked'
        : 'recovery cooldown'
    : 'none';

  await appendRecoveryTimelinePoint(
    {
      at: new Date().toISOString(),
      recoveryHealth: recoveryHealthPct,
      thawLevel: thawLevelPct,
      recoveryStage,
    },
    {
      rollbackApplied: input.temporal?.rollbackApplied === true,
      reasonJa: cooldownStatusJa,
    },
  );

  const partial: Omit<ExecutionRecoveryAdaptiveConfidenceBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: RECOVERY_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    recoveryHealthPct,
    adaptiveConfidencePct,
    thawLevelPct,
    recoveryConsensusPct,
    oscillationRiskPct,
    freezeFrequencyPct,
    rollbackDependencyPct,
    cooldownActive,
    cooldownStatusJa,
    recoveryStage,
    thawState,
    recoverySuspended,
    recoveryBlocked,
    safeRecovery,
    partialRestoreActive,
    replayIntegrityOk,
    contradictionTrendPct,
    unsupportedTrendPct,
    recursiveRiskPct,
    recoverySummaryJa: [
      `health ${recoveryHealthPct}% thaw ${thawLevelPct}%`,
      `stage ${recoveryStage} (${thawState})`,
      safeRecovery ? 'SAFE RECOVERY' : 'remain hold/watch',
      recoveryBlocked ? 'RECOVERY BLOCKED' : null,
      recoverySuspended ? 'RECOVERY SUSPENDED' : null,
      partialRestoreActive ? 'partial restore' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    recoveryHealthFormulaJa: RECOVERY_HEALTH_FORMULA_JA,
    adaptiveConfidenceFormulaJa: ADAPTIVE_CONFIDENCE_FORMULA_JA,
    thawLevelFormulaJa: THAW_LEVEL_FORMULA_JA,
    recoveryConsensusFormulaJa: RECOVERY_CONSENSUS_FORMULA_JA,
    recoveryFlowJa: [...RECOVERY_FLOW_JA],
    adaptiveThawFlowJa: [...ADAPTIVE_THAW_FLOW_JA],
    confidenceRebuildFlowJa: [...CONFIDENCE_REBUILD_FLOW_JA],
    recoveryCooldownFlowJa: [...RECOVERY_COOLDOWN_FLOW_JA],
    recoveryTimeline: [
      ...persisted.recoveryTimeline,
      {
        at: new Date().toISOString(),
        recoveryHealth: recoveryHealthPct,
        thawLevel: thawLevelPct,
        recoveryStage,
      },
    ].slice(-8),
    cooldownTimeline: persisted.cooldownTimeline.slice(-6),
    explainRuleBasisJa:
      '安全な復帰のみ。emergency safe mode / governance を bypass しない。aggressive buy/sell 禁止。',
  };

  return { ...partial, featureStatuses: buildFeatureStatuses(partial) };
}
