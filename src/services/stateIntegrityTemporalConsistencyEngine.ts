/**
 * State Integrity & Temporal Consistency — paper only, no real orders.
 */
import {
  ASYNC_RACE_FORMULA_JA,
  CONSENSUS_DRIFT_THRESHOLD,
  DETERMINISTIC_REBUILD_FLOW_JA,
  DRIFT_DETECTION_FORMULA_JA,
  GOVERNANCE_MAX_AGE_MS,
  INTEGRITY_FEATURE_LABELS,
  LAYER_ALIGN_MAX_SKEW_MS,
  LAYER_DEPENDENCY_EDGES,
  REAL_TRADING_ENABLED,
  REPLAY_INTEGRITY_FORMULA_JA,
  REPLAY_MAX_AGE_MS,
  ROLLBACK_FLOW_JA,
  STALE_ISOLATION_FLOW_JA,
  TEMPORAL_FLOW_STEPS_JA,
  TEMPORAL_REGULATORY_JA,
  TRACE_MAX_AGE_MS,
  VERSIONING_FORMULA_JA,
} from '../constants/stateIntegrityTemporalConsistency';
import type {
  BuildStateIntegrityTemporalInput,
  IntegrityFeatureId,
  IntegrityTemporalFeatureStatus,
  LayerTimestampRow,
  ReplayCheckpoint,
  StateIntegrityTemporalConsistencyBundle,
  TemporalLayerId,
} from '../types/stateIntegrityTemporalConsistency';
import type { StrategyAction } from '../types/strategyExecution';
import {
  appendImmutableSnapshot,
  appendReplayCheckpoint,
  compressSnapshotPayload,
  hashIntegrityPayload,
  loadTemporalConsistencyState,
  saveTemporalConsistencyState,
} from './stateIntegrityTemporalConsistencyStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Date.now() - t;
}

function layerTimestamps(input: BuildStateIntegrityTemporalInput): LayerTimestampRow[] {
  const rows: Array<{ layerId: TemporalLayerId; generatedAt: string | null }> = [
    { layerId: 'stability', generatedAt: input.stability?.generatedAt ?? null },
    { layerId: 'governance', generatedAt: input.governance?.generatedAt ?? null },
    { layerId: 'reactive', generatedAt: input.reactive?.generatedAt ?? null },
    { layerId: 'resource', generatedAt: input.resource?.generatedAt ?? null },
    { layerId: 'cognitive_trace', generatedAt: input.trace?.generatedAt ?? null },
    { layerId: 'strategy', generatedAt: input.strategy?.generatedAt ?? null },
    { layerId: 'data_reliability', generatedAt: input.stability?.layerRows.find((r) => r.layerId === 'data_reliability')?.generatedAt ?? null },
    { layerId: 'macro', generatedAt: input.stability?.layerRows.find((r) => r.layerId === 'macro')?.generatedAt ?? null },
  ];
  const ref = rows.find((r) => r.generatedAt)?.generatedAt;
  const refMs = ref ? Date.parse(ref) : null;
  return rows.map((r) => {
    const a = ageMs(r.generatedAt);
    let aligned = true;
    if (refMs != null && r.generatedAt) {
      const skew = Math.abs(Date.parse(r.generatedAt) - refMs);
      aligned = skew <= LAYER_ALIGN_MAX_SKEW_MS;
    }
    return {
      layerId: r.layerId,
      generatedAt: r.generatedAt,
      aligned,
      ageMs: a,
    };
  });
}

function computeDriftScore(input: BuildStateIntegrityTemporalInput): number {
  const gov = input.governance?.consensusScore ?? null;
  const trace = input.trace?.explainableScore ?? null;
  if (gov == null || trace == null) return 0;
  return Math.abs(gov - trace);
}

function validateReplayIntegrity(
  input: BuildStateIntegrityTemporalInput,
  stateVersion: number,
): { ok: boolean; hash: string; stale: boolean } {
  const last = input.trace?.replayTimeline[input.trace.replayTimeline.length - 1];
  if (!last) {
    return { ok: true, hash: hashIntegrityPayload(['empty']), stale: false };
  }
  const hash = hashIntegrityPayload([
    String(stateVersion),
    last.at,
    last.finalDecision,
    String(last.explainableScore),
  ]);
  const stale = (ageMs(last.at) ?? 0) > REPLAY_MAX_AGE_MS;
  const tampered =
    input.trace?.recursiveReasonGuardTriggered === true && last.explainableScore < 30;
  return { ok: !stale && !tampered, hash, stale };
}

function detectZombieStates(input: BuildStateIntegrityTemporalInput): string[] {
  const out: string[] = [];
  if (input.stability) {
    for (const row of input.stability.layerRows) {
      if (row.enabled && !row.loaded) out.push(`${row.layerId}: enabled未ロード`);
    }
  }
  if (input.reactive && input.reactive.staleQueueCount > 0) {
    out.push(`reactive stale queue ${input.reactive.staleQueueCount}`);
  }
  return out;
}

function detectAsyncConflicts(input: BuildStateIntegrityTemporalInput): string[] {
  const out: string[] = [];
  if (input.refreshGenerationStale) out.push(`async gen ${input.refreshGeneration} stale`);
  if (input.duplicateRefreshBlocked) out.push('duplicate refresh blocked');
  if (input.reactive && input.reactive.renderBudgetBlocked > 5) {
    out.push(`render blocked ${input.reactive.renderBudgetBlocked}`);
  }
  return out;
}

function detectTimelineGaps(input: BuildStateIntegrityTemporalInput): number {
  const timeline = input.trace?.decisionTimeline ?? [];
  if (timeline.length < 2) return 0;
  let gaps = 0;
  for (let i = 1; i < timeline.length; i++) {
    const prev = Date.parse(timeline[i - 1].at);
    const cur = Date.parse(timeline[i].at);
    if (Number.isNaN(prev) || Number.isNaN(cur) || cur < prev) gaps++;
  }
  return gaps;
}

function circularStateDetected(input: BuildStateIntegrityTemporalInput): boolean {
  return (
    input.reactive?.droppedEvents.some((e) => e.dropReasonJa?.includes('circular')) ?? false
  );
}

function computeStateHealth(
  consistencyScore: number,
  replayOk: boolean,
  staleCount: number,
  asyncCount: number,
  freeze: boolean,
): number {
  let score = consistencyScore;
  if (!replayOk) score -= 20;
  if (staleCount > 2) score -= 10;
  if (asyncCount > 0) score -= 8;
  if (freeze) score -= 15;
  return clamp(score);
}

function buildFeatureStatuses(
  partial: Omit<StateIntegrityTemporalConsistencyBundle, 'featureStatuses'>,
  input: BuildStateIntegrityTemporalInput,
): IntegrityTemporalFeatureStatus[] {
  const s = (
    id: IntegrityFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): IntegrityTemporalFeatureStatus => ({
    id,
    labelJa: INTEGRITY_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('global_state_versioning', partial.stateVersion > 0, false, `v${partial.stateVersion}`),
    s('immutable_snapshot_system', partial.snapshots.length > 0, false, `${partial.snapshots.length}`),
    s('temporal_ordering_engine', partial.timelineGapCount === 0, partial.timelineGapCount > 0, `${partial.timelineGapCount} gaps`),
    s('event_causality_validation', !partial.circularStateDetected, partial.circularStateDetected, 'causal'),
    s('replay_integrity_guard', partial.replayIntegrityOk, !partial.replayIntegrityOk, partial.replayIntegrityOk ? 'ok' : 'fail'),
    s('snapshot_fingerprint', partial.snapshots.length > 0, false, partial.snapshots[partial.snapshots.length - 1]?.fingerprint.slice(0, 16) ?? ''),
    s('zombie_state_detection', partial.zombieStatesJa.length === 0, partial.zombieStatesJa.length > 0, `${partial.zombieStatesJa.length}`),
    s('async_race_resolver', partial.asyncConflictCount === 0, partial.asyncConflictCount > 0, `${partial.asyncConflictCount}`),
    s('consensus_drift_detector', partial.driftScore <= CONSENSUS_DRIFT_THRESHOLD, partial.driftScore > CONSENSUS_DRIFT_THRESHOLD, `${partial.driftScore}`),
    s('governance_freshness_gate', partial.governanceFresh, !partial.governanceFresh, partial.governanceAgeMs != null ? `${partial.governanceAgeMs}ms` : 'n/a'),
    s('stale_replay_isolation', partial.replayFreshnessJa.includes('fresh'), partial.replayFreshnessJa.includes('stale'), partial.replayFreshnessJa),
    s('timeline_integrity_audit', partial.timelineGapCount === 0, partial.timelineGapCount > 0, 'timeline'),
    s('layer_dependency_validator', true, false, `${LAYER_DEPENDENCY_EDGES.length} edges`),
    s('circular_state_guard', !partial.circularStateDetected, partial.circularStateDetected, 'guard'),
    s('multi_refresh_lock', !partial.multiRefreshLocked, partial.multiRefreshLocked, partial.multiRefreshLocked ? 'locked' : 'open'),
    s('temporal_rollback', !partial.rollbackApplied, partial.rollbackApplied, partial.rollbackApplied ? 'applied' : 'none'),
    s('snapshot_compression', true, false, 'compress'),
    s('replay_checkpoint', partial.rollbackPoints.length > 0, false, `${partial.rollbackPoints.length}`),
    s('state_recovery_engine', partial.stateHealthScore >= 50, partial.stateHealthScore < 40, `${partial.stateHealthScore}`),
    s('partial_recompute_validator', !input.partialRecomputeActive || input.reactive?.selectiveRecomputeActive === true, input.partialRecomputeActive, 'partial'),
    s('contradiction_persistence_audit', true, (input.trace?.contradictionTimeline.length ?? 0) > 3, `${input.trace?.contradictionTimeline.length ?? 0}`),
    s('governance_version_sync', partial.governanceVersionSynced, !partial.governanceVersionSynced, 'sync'),
    s('layer_timestamp_alignment', partial.layerTimestamps.every((t) => t.aligned), partial.layerTimestamps.some((t) => !t.aligned), 'align'),
    s('deterministic_rebuild', !input.refreshGenerationStale, input.refreshGenerationStale, 'rebuild'),
    s('ai_context_isolation', REAL_TRADING_ENABLED === false, false, 'isolated'),
    s('trace_consistency_score', partial.traceConsistencyScore >= 60, partial.traceConsistencyScore < 50, `${partial.traceConsistencyScore}`),
    s('event_replay_simulator', partial.replayIntegrityOk, !partial.replayIntegrityOk, 'sim'),
    s('state_health_score', partial.stateHealthScore >= 60, partial.stateHealthScore < 45, `${partial.stateHealthScore}`),
    s('integrity_dashboard', true, false, 'panel'),
    s('emergency_state_freeze', !partial.emergencyStateFreeze, partial.emergencyStateFreeze, partial.emergencyStateFreeze ? 'frozen' : 'active'),
  ];
}

export async function buildStateIntegrityTemporalConsistencyBundle(
  input: BuildStateIntegrityTemporalInput,
): Promise<StateIntegrityTemporalConsistencyBundle> {
  const persisted = await loadTemporalConsistencyState();
  const snapshotPayload = compressSnapshotPayload(input.stateFingerprintJa);
  const snapshotRecord = {
    id: `snap-${Date.now()}`,
    version: persisted.globalStateVersion + 1,
    at: new Date().toISOString(),
    fingerprint: hashIntegrityPayload([input.stateFingerprintJa]),
    immutable: true as const,
    compressedBytes: snapshotPayload,
  };
  const saved = await appendImmutableSnapshot(snapshotRecord);

  const govAge = ageMs(input.governance?.generatedAt);
  const governanceFresh = govAge == null || govAge <= GOVERNANCE_MAX_AGE_MS;
  const traceAge = ageMs(input.trace?.generatedAt);
  const traceStale = traceAge != null && traceAge > TRACE_MAX_AGE_MS;

  const replayCheck = validateReplayIntegrity(input, saved.globalStateVersion);
  const driftScore = computeDriftScore(input);
  const zombieStatesJa = detectZombieStates(input);
  const asyncConflictsJa = detectAsyncConflicts(input);
  const timelineGapCount = detectTimelineGaps(input);
  const circular = circularStateDetected(input);
  const multiRefreshLocked = input.duplicateRefreshBlocked || (input.reactive?.renderBudgetBlocked ?? 0) > 5;

  const traceConsistencyScore = clamp(
    (input.trace?.explainableScore ?? 70) -
      (traceStale ? 15 : 0) -
      (input.trace?.missingEvidenceJa.length ?? 0) * 2,
  );

  let consistencyScore = 100;
  if (!governanceFresh) consistencyScore -= 25;
  if (!replayCheck.ok) consistencyScore -= 20;
  if (driftScore > CONSENSUS_DRIFT_THRESHOLD) consistencyScore -= 12;
  if (input.refreshGenerationStale) consistencyScore -= 18;
  if (zombieStatesJa.length > 0) consistencyScore -= 8;
  if (timelineGapCount > 0) consistencyScore -= 6;
  consistencyScore = clamp(consistencyScore);

  const emergencyStateFreeze =
    consistencyScore < 40 || !replayCheck.ok || input.refreshGenerationStale;
  const rollbackApplied =
    emergencyStateFreeze || !governanceFresh || (input.governance?.finalDecision === 'buy' && !governanceFresh);

  const governanceVersionSynced =
    saved.lastGovernanceVersion == null ||
    saved.lastGovernanceVersion === saved.globalStateVersion ||
    governanceFresh;

  const staleStatesJa: string[] = [];
  if (!governanceFresh) staleStatesJa.push('governance stale');
  if (replayCheck.stale) staleStatesJa.push('replay stale');
  if (traceStale) staleStatesJa.push('trace stale');

  const replayFreshnessJa = replayCheck.stale
    ? 'stale — isolated'
    : replayCheck.ok
      ? 'fresh'
      : 'integrity fail';

  const rollbackPoints: ReplayCheckpoint[] = saved.checkpoints.slice(-5);
  if (input.trace?.replayTimeline.length) {
    const last = input.trace.replayTimeline[input.trace.replayTimeline.length - 1];
    const cp: ReplayCheckpoint = {
      id: `cp-${Date.now()}`,
      at: last.at,
      version: saved.globalStateVersion,
      integrityHash: replayCheck.hash,
      rollbackSafe: replayCheck.ok && governanceFresh,
    };
    await appendReplayCheckpoint(cp);
    rollbackPoints.push(cp);
  }

  const stateHealthScore = computeStateHealth(
    consistencyScore,
    replayCheck.ok,
    staleStatesJa.length,
    asyncConflictsJa.length,
    emergencyStateFreeze,
  );

  const partial: Omit<StateIntegrityTemporalConsistencyBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: TEMPORAL_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    stateVersion: saved.globalStateVersion,
    globalStateVersionLabelJa: `global v${saved.globalStateVersion}`,
    stateHealthScore,
    healthLabelJa:
      stateHealthScore >= 75 ? '整合性良好' : stateHealthScore >= 50 ? '注意' : '要 rollback/freeze',
    consistencyScore,
    traceConsistencyScore,
    driftScore,
    replayFreshnessJa,
    governanceAgeMs: govAge,
    governanceFresh,
    staleStateCount: staleStatesJa.length,
    asyncConflictCount: asyncConflictsJa.length,
    snapshotCount: saved.snapshots.length,
    replayIntegrityOk: replayCheck.ok,
    replayIntegrityFormulaJa: REPLAY_INTEGRITY_FORMULA_JA,
    versioningFormulaJa: VERSIONING_FORMULA_JA,
    driftDetectionFormulaJa: DRIFT_DETECTION_FORMULA_JA,
    asyncRaceFormulaJa: ASYNC_RACE_FORMULA_JA,
    temporalFlowJa: [...TEMPORAL_FLOW_STEPS_JA],
    rollbackFlowJa: [...ROLLBACK_FLOW_JA],
    staleIsolationFlowJa: [...STALE_ISOLATION_FLOW_JA],
    deterministicRebuildFlowJa: [...DETERMINISTIC_REBUILD_FLOW_JA],
    rollbackPoints: rollbackPoints.slice(-5),
    staleStatesJa,
    asyncConflictsJa,
    zombieStatesJa,
    timelineGapCount,
    circularStateDetected: circular,
    multiRefreshLocked,
    emergencyStateFreeze,
    rollbackApplied,
    governanceVersionSynced,
    layerTimestamps: layerTimestamps(input),
    snapshots: saved.snapshots.slice(-5),
    integritySummaryJa: [
      `v${saved.globalStateVersion} · 整合 ${consistencyScore}/100`,
      governanceFresh ? 'governance fresh' : 'governance STALE — buy blocked',
      replayCheck.ok ? 'replay ok' : 'replay INTEGRITY FAIL',
      rollbackApplied ? 'rollback watch/hold applied' : 'no rollback',
      `realTrading=${REAL_TRADING_ENABLED}`,
    ].join(' — '),
    explainRuleBasisJa:
      'Governance + Reactive + Resource + Trace の時系列・バージョン・ハッシュ整合。修復は watch/hold 降格のみ。',
  };

  await saveTemporalConsistencyState({
    ...saved,
    lastGovernanceVersion: saved.globalStateVersion,
    contradictionAuditCount:
      persisted.contradictionAuditCount + (input.trace?.contradictionTimeline.length ?? 0),
  });

  const featureStatuses = buildFeatureStatuses(partial, input);
  return { ...partial, featureStatuses };
}
