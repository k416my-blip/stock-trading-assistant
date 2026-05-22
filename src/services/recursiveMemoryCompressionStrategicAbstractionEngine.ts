/**
 * Recursive Memory Compression & Strategic Abstraction — paper only, memory optimization.
 */
import {
  ABSTRACTION_FLOW_JA,
  COMPRESSION_FLOW_JA,
  COMPRESSION_RATIO_FORMULA_JA,
  EMERGENCY_COLLAPSE_FLOW_JA,
  ENTROPY_REDUCTION_FORMULA_JA,
  MEMORY_COMPRESSION_FEATURE_LABELS,
  MEMORY_COMPRESSION_REGULATORY_JA,
  MEMORY_SATURATION_FORMULA_JA,
  MEMORY_SATURATION_THRESHOLD,
  REAL_TRADING_ENABLED,
  RECURSIVE_DEPTH_FORMULA_JA,
  RECURSIVE_DEPTH_THRESHOLD,
  REPLAY_ISOLATION_FLOW_JA,
  SNAPSHOT_RECOVERY_FLOW_JA,
  CONTEXT_OVERFLOW_THRESHOLD,
} from '../constants/recursiveMemoryCompressionStrategicAbstraction';
import type {
  BuildMemoryCompressionInput,
  CompressedTimelineChunk,
  MemoryCompressionFeatureId,
  MemoryCompressionFeatureStatus,
  MetaStateSnapshot,
  RecursiveMemoryCompressionStrategicAbstractionBundle,
} from '../types/recursiveMemoryCompressionStrategicAbstraction';
import {
  loadMemoryCompressionState,
  persistCompressionCycle,
} from './recursiveMemoryCompressionStrategicAbstractionStorage';

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function estimateBytes(input: BuildMemoryCompressionInput): number {
  let bytes = 0;
  bytes += (input.governance?.unifiedAiSummaryJa.length ?? 0) * 2;
  bytes += (input.trace?.reasoningChainJa?.join('').length ?? 0) * 2;
  bytes += (input.semantic?.semanticSummaryJa?.length ?? 0) * 2;
  bytes += (input.reflection?.selfCritiqueSummaryJa?.length ?? 0) * 2;
  bytes += (input.epistemic?.reliabilityTimeline?.length ?? 0) * 80;
  bytes += (input.reflection?.driftTimeline?.length ?? 0) * 60;
  bytes += (input.arbitration?.arbitrationTimeline?.length ?? 0) * 60;
  bytes += (input.temporal?.snapshots?.length ?? 0) * 120;
  bytes += input.resource?.traceSizeBytes ?? 0;
  bytes += input.resource?.replaySizeBytes ?? 0;
  return bytes;
}

function countActiveLayers(input: BuildMemoryCompressionInput): number {
  let n = 0;
  if (input.stability) n++;
  if (input.governance) n++;
  if (input.trace) n++;
  if (input.reactive) n++;
  if (input.resource) n++;
  if (input.temporal) n++;
  if (input.semantic) n++;
  if (input.epistemic) n++;
  if (input.arbitration) n++;
  if (input.reflection) n++;
  return n;
}

function dedupeNarrative(text: string): string {
  const parts = text.split(/[。.·\n]+/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = p.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique.slice(0, 6).join(' · ');
}

function abstractSummary(input: BuildMemoryCompressionInput): string {
  const parts = [
    input.governance
      ? `Gov:${input.governance.finalDecision} c${input.governance.consensusScore}`
      : null,
    input.temporal ? `Temporal:v${input.temporal.stateVersion} h${input.temporal.stateHealthScore}` : null,
    input.epistemic ? `Rel:health${input.epistemic.reliabilityHealthScore}` : null,
    input.reflection ? `Critique:${input.reflection.selfCritiqueScore}` : null,
    input.arbitration ? `Arb:${input.arbitration.arbitrationHealthScore}` : null,
  ].filter(Boolean);
  return parts.join(' | ').slice(0, 400);
}

function buildFeatureStatuses(
  partial: Omit<RecursiveMemoryCompressionStrategicAbstractionBundle, 'featureStatuses'>,
  fatigueHigh: boolean,
): MemoryCompressionFeatureStatus[] {
  const s = (
    id: MemoryCompressionFeatureId,
    ok: boolean,
    watch: boolean,
    detail: string,
  ): MemoryCompressionFeatureStatus => ({
    id,
    labelJa: MEMORY_COMPRESSION_FEATURE_LABELS[id],
    statusJa: ok ? 'ok' : watch ? 'watch' : 'critical',
    detailJa: detail,
  });

  return [
    s('recursive_memory_compressor', partial.compressionRatioPct > 20, false, `${partial.compressionRatioPct}%`),
    s('strategic_abstraction_engine', partial.abstractionLevel >= 2, false, `L${partial.abstractionLevel}`),
    s('narrative_deduplication', true, false, 'dedupe'),
    s('timeline_entropy_reducer', partial.timelineEntropyPct < 60, partial.timelineEntropyPct >= 60, `${partial.timelineEntropyPct}`),
    s('context_window_optimizer', partial.contextLoadPct < 80, partial.contextLoadPct >= 80, `${partial.contextLoadPct}`),
    s('semantic_density_balancer', partial.semanticDensityPct < 85, partial.semanticDensityPct >= 85, `${partial.semanticDensityPct}`),
    s('drift_memory_pruner', true, false, 'prune'),
    s('replay_compression_engine', partial.replaySizeBytes < 50000, partial.replaySizeBytes >= 50000, `${partial.replaySizeBytes}`),
    s('governance_snapshot_generator', partial.snapshotCount > 0, false, `${partial.snapshotCount}`),
    s('layer_state_aggregator', true, false, 'aggregate'),
    s('longitudinal_summary_compressor', true, false, 'long'),
    s('reflection_archive_optimizer', true, false, 'reflection'),
    s('arbitration_history_reducer', true, false, 'arb'),
    s('contradiction_archive_compressor', true, false, 'stats'),
    s('unsupported_claim_decay', true, false, 'decay'),
    s('confidence_history_quantizer', true, false, 'quantize'),
    s('freeze_timeline_condenser', true, false, 'freeze'),
    s('meta_state_snapshot_engine', partial.snapshotCount >= 1, false, `${partial.snapshotCount}`),
    s('hierarchical_memory_layering', true, false, 'hier'),
    s('temporal_chunk_partitioning', partial.compressedTimeline.length > 0, false, `${partial.compressedTimeline.length}`),
    s('recursive_context_sanitizer', !partial.replayCorruptionDetected, partial.replayCorruptionDetected, 'sanitize'),
    s('ai_cognitive_load_estimator', partial.cognitiveLoadPct < 75, partial.cognitiveLoadPct >= 75, `${partial.cognitiveLoadPct}`),
    s('memory_saturation_detector', partial.memorySaturationPct < MEMORY_SATURATION_THRESHOLD, partial.memorySaturationPct >= MEMORY_SATURATION_THRESHOLD, `${partial.memorySaturationPct}`),
    s('replay_corruption_isolation', !partial.replayIsolated, partial.replayIsolated, 'isolate'),
    s('context_recovery_engine', partial.recoveryHealthPct >= 50, partial.recoveryHealthPct < 50, `${partial.recoveryHealthPct}`),
    s('safe_compression_mode', !partial.safeCompressionMode, partial.safeCompressionMode, 'safe'),
    s('emergency_context_collapse', !partial.emergencyContextCollapse, partial.emergencyContextCollapse, 'collapse'),
    s('snapshot_recovery_engine', partial.recoveryHealthPct >= 55, false, `${partial.recoveryHealthPct}`),
    s('compression_dashboard', true, false, 'panel'),
    s('cognitive_stability_freeze', !partial.cognitiveStabilityFreeze, partial.cognitiveStabilityFreeze, fatigueHigh ? 'no-aggressive' : 'ok'),
  ];
}

export async function buildRecursiveMemoryCompressionStrategicAbstractionBundle(
  input: BuildMemoryCompressionInput,
): Promise<RecursiveMemoryCompressionStrategicAbstractionBundle> {
  const persisted = await loadMemoryCompressionState();
  const rawBytes = estimateBytes(input);
  const fatigueHigh = (input.reflection?.fatigueScore ?? 0) >= 70;

  const replayCorruptionDetected =
    input.temporal?.replayIntegrityOk === false ||
    (input.epistemic?.replayTrustPct ?? 100) < 25;

  const freezeSignals =
    (input.semantic?.semanticFreeze ? 1 : 0) +
    (input.epistemic?.reliabilityFreeze ? 1 : 0) +
    (input.arbitration?.intentFreeze ? 1 : 0) +
    (input.reflection?.reflectionFreeze ? 1 : 0);

  const rollbackCount = input.temporal?.rollbackApplied ? 1 : 0;
  const reflectionCycles = input.reflection?.driftTimeline.length ?? 0;
  const recursiveDepth = countActiveLayers(input) + freezeSignals + rollbackCount + Math.min(3, reflectionCycles);

  const timelinePoints =
    (input.epistemic?.reliabilityTimeline.length ?? 0) +
    (input.reflection?.driftTimeline.length ?? 0) +
    (input.arbitration?.arbitrationTimeline.length ?? 0) +
    persisted.compressedTimeline.length;
  const timelineEntropyPct = clamp(Math.min(100, timelinePoints * 8 + freezeSignals * 5));

  const semanticDensityPct = clamp(
    (input.semantic?.unsupportedClaimsJa?.length ?? 0) * 10 +
      (input.semantic?.contradictionLanguageJa?.length ?? 0) * 8 +
      (input.governance?.unifiedAiSummaryJa.length ?? 0) / 50,
  );

  const replaySizeBytes = input.resource?.replaySizeBytes ?? 0;

  const contextLoadPct = clamp(
    rawBytes / 800 +
      (input.resource?.aiLoadPct ?? 0) * 0.3 +
      timelineEntropyPct * 0.2,
  );

  const memorySaturationPct = clamp(
    contextLoadPct * 0.3 +
      Math.min(100, replaySizeBytes / 1000) * 0.25 +
      timelineEntropyPct * 0.2 +
      recursiveDepth * 10 * 0.15 +
      semanticDensityPct * 0.1,
  );

  let abstractionLevel = 1;
  if (memorySaturationPct > 50) abstractionLevel = 2;
  if (memorySaturationPct > MEMORY_SATURATION_THRESHOLD) abstractionLevel = 3;

  const aggressiveAllowed = !fatigueHigh && !replayCorruptionDetected;
  let compressionTarget = aggressiveAllowed ? 0.45 : 0.65;
  if (input.reflection?.metaEmergencyShutdown) compressionTarget = 0.55;
  const compressedBytes = Math.round(rawBytes * compressionTarget);

  const narrativeRaw = [
    input.governance?.unifiedAiSummaryJa ?? '',
    input.semantic?.semanticSummaryJa ?? '',
    input.reflection?.selfCritiqueSummaryJa ?? '',
  ].join(' ');
  const abstractedNarrativeJa = dedupeNarrative(
    `${abstractSummary(input)} — ${narrativeRaw.slice(0, 200)}`,
  ).slice(0, 500);

  const contradictionStats = {
    count:
      (input.semantic?.contradictionLanguageJa?.length ?? 0) +
      (input.governance?.contradictionDetected ? 1 : 0),
    trend: input.reflection?.contradictionTrendPct ?? 0,
  };
  const unsupportedDecay = Math.max(
    0,
    100 - (input.reflection?.unsupportedTrendPct ?? 0) - reflectionCycles * 3,
  );

  const entropyBefore = timelineEntropyPct;
  const compressionRatioEstimate =
    rawBytes <= 0 ? 0 : Math.round(100 * (1 - compressedBytes / rawBytes));
  const { compressionRatioPct } = await persistCompressionCycle({
    chunk: {
      id: `chunk-${Date.now()}`,
      periodJa: new Date().toISOString().slice(0, 10),
      summaryJa: abstractedNarrativeJa.slice(0, 200),
      entropyBefore,
      entropyAfter: clamp(entropyBefore * (1 - compressionRatioEstimate / 100)),
    },
    snapshot: {
      id: `snap-${Date.now()}`,
      at: new Date().toISOString(),
      abstractionLevel,
      bytesEstimate: compressedBytes,
    },
    rawBytes,
    compressedBytes,
  });

  const entropyAfter = clamp(entropyBefore * (1 - compressionRatioPct / 100));
  const cognitiveLoadPct = clamp(contextLoadPct * 0.6 + memorySaturationPct * 0.4);

  const contextOverflowRisk = contextLoadPct >= CONTEXT_OVERFLOW_THRESHOLD;
  const safeCompressionMode = memorySaturationPct > MEMORY_SATURATION_THRESHOLD;
  const emergencyContextCollapse =
    contextOverflowRisk || (replayCorruptionDetected && memorySaturationPct > 70);
  const replayIsolated = replayCorruptionDetected;
  const cognitiveStabilityFreeze =
    recursiveDepth > RECURSIVE_DEPTH_THRESHOLD ||
    emergencyContextCollapse ||
    input.reflection?.reflectionFreeze === true;

  const recoveryHealthPct = clamp(
    100 -
      (replayCorruptionDetected ? 30 : 0) -
      (emergencyContextCollapse ? 25 : 0) -
      (memorySaturationPct > 90 ? 20 : 0) +
      (persisted.metaSnapshots.length > 0 ? 10 : 0),
  );

  const partial: Omit<RecursiveMemoryCompressionStrategicAbstractionBundle, 'featureStatuses'> = {
    generatedAt: new Date().toISOString(),
    safetyBannerJa: MEMORY_COMPRESSION_REGULATORY_JA,
    paperTradingOnly: true,
    realTradingEnabled: REAL_TRADING_ENABLED,
    memorySaturationPct,
    contextLoadPct,
    replaySizeBytes,
    abstractionLevel,
    compressionRatioPct,
    replayCorruptionDetected,
    recursiveDepth,
    timelineEntropyPct: entropyAfter,
    semanticDensityPct,
    snapshotCount: persisted.metaSnapshots.length + 1,
    recoveryHealthPct,
    cognitiveLoadPct,
    safeCompressionMode,
    emergencyContextCollapse,
    cognitiveStabilityFreeze,
    replayIsolated,
    contextOverflowRisk,
    compressionSummaryJa: [
      `saturation ${memorySaturationPct}%`,
      `ratio ${compressionRatioPct}%`,
      `depth ${recursiveDepth}`,
      `unsupported decay ${unsupportedDecay}`,
      `contradiction stats n=${contradictionStats.count}`,
      replayIsolated ? 'REPLAY ISOLATED' : null,
      cognitiveStabilityFreeze ? 'FREEZE' : null,
      fatigueHigh ? 'no aggressive compression' : null,
    ]
      .filter(Boolean)
      .join(' — '),
    abstractedNarrativeJa,
    compressedTimeline: [
      ...persisted.compressedTimeline,
      {
        id: `chunk-live`,
        periodJa: 'current',
        summaryJa: abstractedNarrativeJa.slice(0, 120),
        entropyBefore,
        entropyAfter,
      },
    ].slice(-8),
    metaSnapshots: [
      ...persisted.metaSnapshots,
      {
        id: `snap-live`,
        at: new Date().toISOString(),
        abstractionLevel,
        bytesEstimate: compressedBytes,
      },
    ].slice(-6),
    entropyReductionFormulaJa: ENTROPY_REDUCTION_FORMULA_JA,
    recursiveDepthFormulaJa: RECURSIVE_DEPTH_FORMULA_JA,
    compressionRatioFormulaJa: COMPRESSION_RATIO_FORMULA_JA,
    memorySaturationFormulaJa: MEMORY_SATURATION_FORMULA_JA,
    replayIsolationFlowJa: [...REPLAY_ISOLATION_FLOW_JA],
    snapshotRecoveryFlowJa: [...SNAPSHOT_RECOVERY_FLOW_JA],
    emergencyCollapseFlowJa: [...EMERGENCY_COLLAPSE_FLOW_JA],
    compressionFlowJa: [...COMPRESSION_FLOW_JA],
    abstractionFlowJa: [...ABSTRACTION_FLOW_JA],
    explainRuleBasisJa:
      'memory 最適化のみ。narrative 圧縮・timeline 削減。新規売買ロジックは生成しない。',
  };

  const featureStatuses = buildFeatureStatuses(partial, fatigueHigh);
  return { ...partial, featureStatuses };
}
