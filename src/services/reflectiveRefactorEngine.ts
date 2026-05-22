import {
  ARCH_HEALTH_FRAGMENTED_THRESHOLD,
  ARCH_HEALTH_OVEREXPANDED_THRESHOLD,
  ARCH_HEALTH_REDUNDANT_THRESHOLD,
  BUDGET_ARCH_FRAGMENTED,
  BUDGET_ARCH_MOBILE,
  BUDGET_ARCH_OVEREXPANDED,
  BUDGET_ARCH_RECURSIVE,
  BUDGET_ARCH_REDUNDANT,
  BUDGET_ARCH_STABLE,
  BUDGET_ARCH_UNSUPPORTED,
  LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD,
  MOBILE_PRESSURE_THRESHOLD,
  RECURSIVE_INFLATION_RISK_THRESHOLD,
  STRUCTURE_STATE_LABELS_JA,
} from '../constants/selfEvolvingArchitectureReflectiveRefactor';
import type { BuildSelfEvolvingArchitectureInput } from '../types/selfEvolvingArchitectureReflectiveRefactor';
import type {
  ArchitectureStructureState,
  OptimizationProposal,
  OptimizationProposalKind,
} from '../types/selfEvolvingArchitectureReflectiveRefactor';

export type ArchitectureMetrics = {
  redundancyPct: number;
  fragmentationPct: number;
  recursiveInflationPct: number;
  orchestrationComplexityPct: number;
  latencyPenaltyPct: number;
  mobilePressurePct: number;
  reflectionDensityPct: number;
  stalePipelinesPct: number;
  semanticOverlapPct: number;
  architectureHealthPct: number;
  unsupportedStructureRiskPct: number;
  adaptiveConflictDensityPct: number;
};

export type ArchitectureResolution = {
  structureState: ArchitectureStructureState;
  orchestrationBudgetMax: number;
  orchestrationReviewJa: string;
  governanceApprovalPending: boolean;
  governanceApprovalStateJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function proposal(
  kind: OptimizationProposalKind,
  labelJa: string,
  detailJa: string,
): OptimizationProposal {
  return {
    id: `${kind}-${Date.now()}`,
    kind,
    labelJa,
    detailJa,
    sandboxOnly: true,
    requiresGovernanceApproval: true,
    automaticApplyForbidden: true,
  };
}

export function computeArchitectureMetrics(
  input: BuildSelfEvolvingArchitectureInput,
): ArchitectureMetrics {
  const semanticOverlapPct = clamp(
    (input.semantic?.contradictionLanguageJa?.length ?? 0) * 8 +
      (input.consensus?.contradictionRiskPct ?? 0) * 0.2 +
      (input.mockLayerRedundancyBoost ?? 0) * 0.35,
  );
  const duplicatedGovernance = clamp(
    (input.governance?.vetoLayer ? 15 : 0) +
      (input.consensus?.governanceOverrideActive ? 25 : 0) +
      (input.metaReliability?.governanceDeviationPct ?? 0) * 0.3,
  );
  const stalePipelinesPct = clamp(
    (input.recovery?.rollbackDependencyPct ?? 0) * 0.35 +
      (input.metaReliability?.staleReasoningRiskPct ?? 0) * 0.25 +
      (input.mockLayerRedundancyBoost ?? 0) * 0.2,
  );
  const redundancyPct = clamp(
    semanticOverlapPct * 0.4 + duplicatedGovernance * 0.35 + stalePipelinesPct * 0.25,
  );

  const fragmentationPct = clamp(
    (input.orchestration?.skippedLayerCount ?? 0) * 6 +
      (input.memory?.memorySaturationPct ?? 0) * 0.25 +
      (input.systemic?.oscillationRiskPct ?? 0) * 0.2,
  );

  const recursiveDepth = clamp(
    (input.memory?.recursiveDepth ?? 2) * 12 +
      (input.systemic?.recursiveFreezeActive ? 18 : 0) +
      (input.reflection?.rollbackDependencyPct ?? 0) * 0.2,
  );
  const reflectionLoops = clamp(
    (input.reflection?.freezeFrequencyPct ?? 0) * 0.4 +
      (input.reflection?.contradictionTrendPct ?? 0) * 0.35 +
      10,
  );
  const arbitrationLoops = clamp((input.consensus?.contradictionRiskPct ?? 0) * 0.5 + 8);
  const recursiveInflationPct = clamp(
    recursiveDepth * 0.35 +
      reflectionLoops * 0.35 +
      arbitrationLoops * 0.3 +
      (input.mockRecursiveInflationBoost ?? 0),
  );

  const orchestrationComplexityPct = clamp(
    (input.orchestration?.layerSchedule.length ?? 0) * 2.5 +
      (input.orchestration?.deferredLayers.length ?? 0) * 5 +
      (input.orchestration?.blockedLayers.length ?? 0) * 8,
  );

  const latencyPenaltyPct = clamp(
    (input.orchestration?.refreshLatencyMs ?? 0) / 40 +
      (input.metaReliability?.trustDecayPct ?? 0) * 0.15,
  );

  const computeBudgetRatio =
    input.orchestration && input.orchestration.computeBudgetMax > 0
      ? (input.orchestration.computeBudgetUsed / input.orchestration.computeBudgetMax) * 55
      : 25;
  const memoryPressureScore = input.memoryPressure ? 28 : 8;
  const hydrationCost = input.orchestration?.progressiveHydration === 'full' ? 22 : 10;
  const orchestrationWakeups = clamp((input.orchestration?.activeLayers.length ?? 0) * 4);
  const mobilePressurePct = clamp(
    computeBudgetRatio +
      memoryPressureScore +
      hydrationCost +
      orchestrationWakeups +
      (input.batterySaver ? 15 : 0) +
      (input.mockMobilePressureBoost ?? 0),
  );

  const reflectionDensityPct = clamp(
    (input.reflection?.fatigueScore ?? 0) * 0.45 +
      (input.reflection?.confidenceDriftPct ?? 0) * 0.35 +
      reflectionLoops * 0.2,
  );

  const adaptiveConflictDensityPct = clamp(
    (input.consensus?.contradictionRiskPct ?? 0) * 0.4 +
      (input.metaReliability?.semanticDriftPct ?? 0) * 0.3,
  );

  let architectureHealthPct = clamp(
    100 -
      redundancyPct * 0.2 -
      fragmentationPct * 0.15 -
      recursiveInflationPct * 0.2 -
      orchestrationComplexityPct * 0.15 -
      latencyPenaltyPct * 0.1 -
      mobilePressurePct * 0.1 -
      reflectionDensityPct * 0.1,
  );
  if (typeof input.mockArchitectureHealthPct === 'number') {
    architectureHealthPct = clamp(input.mockArchitectureHealthPct);
  }

  const unsupportedStructureRiskPct = clamp(
    (latencyPenaltyPct > LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD &&
    fragmentationPct > LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD
      ? 85
      : 20) +
      (architectureHealthPct < ARCH_HEALTH_OVEREXPANDED_THRESHOLD ? 25 : 0),
  );

  return {
    redundancyPct,
    fragmentationPct,
    recursiveInflationPct,
    orchestrationComplexityPct,
    latencyPenaltyPct,
    mobilePressurePct,
    reflectionDensityPct,
    stalePipelinesPct,
    semanticOverlapPct,
    architectureHealthPct,
    unsupportedStructureRiskPct,
    adaptiveConflictDensityPct,
  };
}

export function classifyArchitectureState(
  metrics: ArchitectureMetrics,
  governanceBlocks: boolean,
): ArchitectureStructureState {
  if (governanceBlocks) return 'ARCH_UNSUPPORTED_STRUCTURE';
  if (
    metrics.latencyPenaltyPct > LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD &&
    metrics.fragmentationPct > LATENCY_FRAGMENTATION_UNSUPPORTED_THRESHOLD
  ) {
    return 'ARCH_UNSUPPORTED_STRUCTURE';
  }
  if (metrics.recursiveInflationPct > RECURSIVE_INFLATION_RISK_THRESHOLD) {
    return 'ARCH_RECURSIVE_RISK';
  }
  if (metrics.mobilePressurePct > MOBILE_PRESSURE_THRESHOLD) {
    return 'ARCH_MOBILE_PRESSURE';
  }
  if (metrics.architectureHealthPct < ARCH_HEALTH_OVEREXPANDED_THRESHOLD) {
    return 'ARCH_OVEREXPANDED';
  }
  if (metrics.architectureHealthPct < ARCH_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'ARCH_FRAGMENTED';
  }
  if (metrics.architectureHealthPct < ARCH_HEALTH_REDUNDANT_THRESHOLD) {
    return 'ARCH_REDUNDANT';
  }
  return 'ARCH_STABLE';
}

export function generateOptimizationProposals(
  state: ArchitectureStructureState,
  metrics: ArchitectureMetrics,
): OptimizationProposal[] {
  const proposals: OptimizationProposal[] = [];

  switch (state) {
    case 'ARCH_REDUNDANT':
      proposals.push(
        proposal(
          'merge_candidate_layers',
          'レイヤー統合候補（提案のみ）',
          `redundancy ${metrics.redundancyPct}% — semantic/governance 重複の統合候補を sandbox で検討`,
        ),
      );
      break;
    case 'ARCH_FRAGMENTED':
      proposals.push(
        proposal(
          'pipeline_simplify',
          'パイプライン簡素化（提案のみ）',
          `fragmentation ${metrics.fragmentationPct}% — 断片化パイプラインの整理案`,
        ),
        proposal(
          'orchestration_simplification',
          'オーケストレーション簡素化',
          'deferred/skipped 層の見直し — 自動適用なし',
        ),
      );
      break;
    case 'ARCH_OVEREXPANDED':
      proposals.push(
        proposal(
          'layer_freeze_recommendation',
          'レイヤー凍結推奨',
          `health ${metrics.architectureHealthPct}% — 新規 adaptive 層の追加停止（提案）`,
        ),
      );
      break;
    case 'ARCH_RECURSIVE_RISK':
      proposals.push(
        proposal(
          'reflection_throttle',
          'Reflection スロットル',
          `recursive inflation ${metrics.recursiveInflationPct}% — reflection loop 密度を下げる提案`,
        ),
      );
      break;
    case 'ARCH_MOBILE_PRESSURE':
      proposals.push(
        proposal(
          'mobile_downgrade_suggestion',
          'モバイルライト推奨',
          `mobile pressure ${metrics.mobilePressurePct}% — 低優先度 layer sleep 提案`,
        ),
        proposal(
          'dashboard_lazy_hydration',
          'ダッシュボード遅延読込',
          'Redmi 等向け lazy hydration — 提案のみ',
        ),
      );
      break;
    case 'ARCH_UNSUPPORTED_STRUCTURE':
      proposals.push(
        proposal(
          'minimal_orchestration',
          '最小オーケストレーション',
          'latency+fragmentation critical — governance/stability のみの安全構成案',
        ),
        proposal(
          'safe_mode_architecture',
          'セーフモード構造',
          'unsupported structure — 自動リファクタ禁止・承認待ち',
        ),
      );
      break;
    default:
      break;
  }

  if (metrics.stalePipelinesPct > 40) {
    proposals.push(
      proposal(
        'stale_recovery_removal',
        '古い Recovery パス整理',
        `stale pipelines ${metrics.stalePipelinesPct}% — 削除は governance 承認後のみ`,
      ),
    );
  }
  if (metrics.semanticOverlapPct > 35) {
    proposals.push(
      proposal(
        'memory_cache_normalization',
        'メモリキャッシュ正規化',
        'memory fragmentation 緩和案 — sandbox only',
      ),
    );
  }

  return proposals;
}

export function resolveArchitectureActions(
  state: ArchitectureStructureState,
  metrics: ArchitectureMetrics,
  proposalCount: number,
): ArchitectureResolution {
  const governanceApprovalPending = proposalCount > 0 && state !== 'ARCH_STABLE';
  const base: ArchitectureResolution = {
    structureState: state,
    orchestrationBudgetMax: BUDGET_ARCH_STABLE,
    orchestrationReviewJa: '構造監査 — 提案のみ・自動リファクタなし',
    governanceApprovalPending,
    governanceApprovalStateJa: governanceApprovalPending
      ? '承認待ち（自動適用禁止）'
      : '不要（構造安定）',
  };

  switch (state) {
    case 'ARCH_REDUNDANT':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_REDUNDANT,
        orchestrationReviewJa: 'merge proposal — orchestration review only',
      };
    case 'ARCH_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_FRAGMENTED,
        orchestrationReviewJa: 'pipeline simplify proposal — no runtime mutation',
      };
    case 'ARCH_OVEREXPANDED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_OVEREXPANDED,
        orchestrationReviewJa: 'layer freeze recommendation — proposal only',
      };
    case 'ARCH_RECURSIVE_RISK':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_RECURSIVE,
        orchestrationReviewJa: 'reflection throttle proposal — recursive risk',
      };
    case 'ARCH_MOBILE_PRESSURE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_MOBILE,
        orchestrationReviewJa: 'mobile-lite orchestration recommendation',
      };
    case 'ARCH_UNSUPPORTED_STRUCTURE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_ARCH_UNSUPPORTED,
        orchestrationReviewJa: 'minimal orchestration — safe-mode architecture proposal',
        governanceApprovalStateJa: '必須 — unsupported structure',
      };
    default:
      return base;
  }
}

export function structureStateLabelJa(state: ArchitectureStructureState): string {
  return STRUCTURE_STATE_LABELS_JA[state];
}
