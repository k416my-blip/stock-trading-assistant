import {
  BUDGET_RESOURCE_BALANCED,
  BUDGET_RESOURCE_FRAGMENTED,
  BUDGET_RESOURCE_RISK,
  BUDGET_RESOURCE_STRESSED,
  COMPUTE_WASTE_THRESHOLD,
  RECURSIVE_PRESSURE_THRESHOLD,
  RESOURCE_AUDIT_LABELS_JA,
  RESOURCE_HEALTH_FRAGMENTED_THRESHOLD,
  RESOURCE_HEALTH_OVERLOADED_THRESHOLD,
  RESOURCE_HEALTH_STRESSED_THRESHOLD,
} from '../constants/cognitiveResourceEconomyAttentionAllocation';
import type {
  BuildCognitiveResourceEconomyInput,
  LayerUtilityRank,
  ResourceAuditSnapshot,
  ResourceAuditTargetId,
  ResourceEconomyState,
} from '../types/cognitiveResourceEconomyAttentionAllocation';

export type EconomyMetrics = {
  computePressurePct: number;
  recursiveCostPct: number;
  orchestrationSaturationPct: number;
  latencyInflationPct: number;
  speculativeWastePct: number;
  reflectionFatiguePct: number;
  contradictionProcessingCostPct: number;
  resourceHealthPct: number;
  usefulInferencePct: number;
  totalComputeCostPct: number;
  attentionEfficiencyPct: number;
  recursivePressurePct: number;
  computeWastePct: number;
  batteryPressurePct: number;
  backgroundLoadPct: number;
  mobilePressurePct: number;
  hallucinationComputeAmplificationPct: number;
  consensusOverheadPct: number;
};

export type EconomyResolution = {
  resourceState: ResourceEconomyState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  attentionNarrowingActive: boolean;
  priorityRebuildActive: boolean;
  deepReflectionSuppressed: boolean;
  recursiveThrottleActive: boolean;
  speculativeComputeClampActive: boolean;
  mobileHardClampActive: boolean;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function mkAudit(
  id: ResourceAuditTargetId,
  load: number,
  detail: string,
): ResourceAuditSnapshot {
  return {
    id,
    labelJa: RESOURCE_AUDIT_LABELS_JA[id],
    loadPct: clamp(load),
    detailJa: detail,
  };
}

export function collectComputeMetrics(input: BuildCognitiveResourceEconomyInput): ResourceAuditSnapshot[] {
  const orch = input.orchestration;
  const ep = input.epistemic;
  const graph = input.strategicMemoryGraph;
  const consensus = input.consensus;
  const reflection = input.reflection;
  const resource = input.resource;

  return [
    mkAudit('attentionFocus', ep?.confidenceCalibrationPct ? 100 - ep.confidenceCalibrationPct : 45, 'attention'),
    mkAudit(
      'computePressure',
      (resource ? 100 - resource.computeBudgetRemainingPct : 40) + (input.memoryPressure ? 15 : 0),
      'compute',
    ),
    mkAudit(
      'recursiveCost',
      (graph?.recursiveLoopRiskPct ?? 0) * 0.4 +
        (reflection?.contradictionTrendPct ?? 0) * 0.35 +
        (input.mockRecursiveLoadBoost ?? 0),
      'recursive',
    ),
    mkAudit('reflectionFatigue', reflection?.fatigueScore ?? 30, 'reflection'),
    mkAudit('layerUtility', resource?.resourceHealthScore ?? 55, 'utility'),
    mkAudit(
      'speculativeWaste',
      (ep?.epistemicState === 'EPISTEMIC_SPECULATIVE' ? 55 : 20) + (input.mockComputeWasteBoost ?? 0) * 0.5,
      'speculative',
    ),
    mkAudit(
      'latencyInflation',
      (orch?.refreshLatencyMs ?? 0) > 800 ? 65 : 25,
      `${orch?.refreshLatencyMs ?? 0}ms`,
    ),
    mkAudit('batteryPressure', input.batterySaver ? 70 : 25, input.batterySaver ? 'saver on' : 'normal'),
    mkAudit('backgroundLoad', input.appForeground ? 20 : 55, input.appForeground ? 'foreground' : 'background'),
    mkAudit(
      'contradictionProcessingCost',
      (consensus?.contradictionRiskPct ?? 0) * 0.5 + (ep?.contradictionDensityPct ?? 0) * 0.35,
      'contradiction',
    ),
    mkAudit(
      'hallucinationComputeAmplification',
      (ep?.hallucinationRiskPct ?? 0) * 0.6 + (graph?.hallucinationPropagationPct ?? 0) * 0.25,
      'hallucination amp',
    ),
    mkAudit('consensusOverhead', consensus?.contradictionRiskPct ?? 30, 'consensus'),
    mkAudit(
      'orchestrationSaturation',
      orch ? 100 - (orch.orchestrationHealthScore ?? 50) : 35,
      'orch saturation',
    ),
  ];
}

export function estimateLayerUtility(input: BuildCognitiveResourceEconomyInput): LayerUtilityRank[] {
  const layers: LayerUtilityRank[] = [
    { layerId: 'governance', labelJa: 'Governance', utilityPct: 95, costPct: 12 },
    { layerId: 'stability', labelJa: 'Stability', utilityPct: 90, costPct: 15 },
    {
      layerId: 'consensus',
      labelJa: 'Consensus',
      utilityPct: input.consensus ? 72 : 50,
      costPct: 28,
    },
    {
      layerId: 'epistemic',
      labelJa: 'Epistemic',
      utilityPct: input.epistemic ? 68 : 45,
      costPct: 32,
    },
    {
      layerId: 'reflection',
      labelJa: 'Reflection',
      utilityPct: input.reflection ? 55 : 40,
      costPct: 48,
    },
    {
      layerId: 'strategic_memory',
      labelJa: 'Strategic Memory',
      utilityPct: input.strategicMemoryGraph ? 62 : 42,
      costPct: 38,
    },
    {
      layerId: 'orchestration',
      labelJa: 'Orchestration',
      utilityPct: input.orchestration ? 70 : 48,
      costPct: 35,
    },
  ];
  return layers.sort((a, b) => b.utilityPct - a.utilityPct - (b.costPct - a.costPct) * 0.2);
}

export function computeEconomyMetrics(
  input: BuildCognitiveResourceEconomyInput,
  audits: ResourceAuditSnapshot[],
): EconomyMetrics {
  const byId = (id: ResourceAuditTargetId) => audits.find((a) => a.id === id)?.loadPct ?? 0;

  const computePressurePct = clamp(byId('computePressure') + (input.memoryPressure ? 10 : 0));
  const recursiveCostPct = clamp(byId('recursiveCost'));
  const orchestrationSaturationPct = clamp(byId('orchestrationSaturation'));
  const latencyInflationPct = clamp(byId('latencyInflation') + (input.mockMobilePressureBoost ?? 0) * 0.4);
  const speculativeWastePct = clamp(byId('speculativeWaste'));
  const reflectionFatiguePct = clamp(byId('reflectionFatigue'));
  const contradictionProcessingCostPct = clamp(byId('contradictionProcessingCost'));

  let resourceHealthPct = clamp(
    100 -
      computePressurePct * 0.2 -
      recursiveCostPct * 0.15 -
      orchestrationSaturationPct * 0.15 -
      latencyInflationPct * 0.15 -
      speculativeWastePct * 0.1 -
      reflectionFatiguePct * 0.1 -
      contradictionProcessingCostPct * 0.15,
  );
  if (typeof input.mockResourceHealthPct === 'number') {
    resourceHealthPct = clamp(input.mockResourceHealthPct);
  }

  const totalComputeCostPct = clamp(
    computePressurePct * 0.35 +
      recursiveCostPct * 0.25 +
      orchestrationSaturationPct * 0.2 +
      reflectionFatiguePct * 0.2,
  );
  const usefulInferencePct = clamp(
    (input.governance?.consensusScore ?? 50) * 0.4 +
      (input.epistemic?.confidenceCalibrationPct ?? 50) * 0.35 +
      (input.consensus?.finalConsensusPct ?? 50) * 0.25,
  );
  const attentionEfficiencyPct = clamp(
    totalComputeCostPct > 0 ? (usefulInferencePct / totalComputeCostPct) * 100 : usefulInferencePct,
  );

  const recursiveDepth = clamp(recursiveCostPct * 0.4 + (input.mockRecursiveLoadBoost ?? 0) * 0.35);
  const orchestrationLoops = clamp(orchestrationSaturationPct * 0.35);
  const reflectionCycles = clamp(reflectionFatiguePct * 0.25);
  const recursivePressurePct = clamp(
    recursiveDepth * (orchestrationLoops / 100) * (reflectionCycles / 100) * 100 +
      (input.mockRecursiveLoadBoost ?? 0),
  );

  const computeWastePct = clamp(
    (epUnsupported(input) ? 25 : 0) +
      speculativeWastePct * 0.35 +
      reflectionFatiguePct * 0.2 +
      contradictionProcessingCostPct * 0.25 +
      (input.mockComputeWasteBoost ?? 0),
  );

  const batteryPressurePct = clamp(byId('batteryPressure'));
  const backgroundLoadPct = clamp(byId('backgroundLoad'));
  const mobilePressurePct = clamp(
    batteryPressurePct * 0.45 + backgroundLoadPct * 0.35 + latencyInflationPct * 0.2,
  );

  return {
    computePressurePct,
    recursiveCostPct,
    orchestrationSaturationPct,
    latencyInflationPct,
    speculativeWastePct,
    reflectionFatiguePct,
    contradictionProcessingCostPct,
    resourceHealthPct,
    usefulInferencePct,
    totalComputeCostPct,
    attentionEfficiencyPct,
    recursivePressurePct,
    computeWastePct,
    batteryPressurePct,
    backgroundLoadPct,
    mobilePressurePct,
    hallucinationComputeAmplificationPct: clamp(byId('hallucinationComputeAmplification')),
    consensusOverheadPct: clamp(byId('consensusOverhead')),
  };
}

function epUnsupported(input: BuildCognitiveResourceEconomyInput): boolean {
  const ep = input.epistemic;
  return ep?.epistemicState === 'EPISTEMIC_UNSUPPORTED' || ep?.explanationOnlyMode === true;
}

export function classifyResourceState(
  metrics: EconomyMetrics,
  governanceBlocks: boolean,
): ResourceEconomyState {
  if (governanceBlocks && metrics.resourceHealthPct < RESOURCE_HEALTH_STRESSED_THRESHOLD) {
    return 'RESOURCE_STRESSED';
  }
  if (metrics.recursivePressurePct > RECURSIVE_PRESSURE_THRESHOLD) {
    return 'RESOURCE_RECURSIVE_PRESSURE';
  }
  if (metrics.computeWastePct > COMPUTE_WASTE_THRESHOLD) {
    return 'RESOURCE_WASTEFUL';
  }
  if (metrics.resourceHealthPct < RESOURCE_HEALTH_OVERLOADED_THRESHOLD) {
    return 'RESOURCE_OVERLOADED';
  }
  if (metrics.resourceHealthPct < RESOURCE_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'RESOURCE_FRAGMENTED';
  }
  if (metrics.resourceHealthPct < RESOURCE_HEALTH_STRESSED_THRESHOLD) {
    return 'RESOURCE_STRESSED';
  }
  return 'RESOURCE_BALANCED';
}

export function resolveEconomyActions(
  state: ResourceEconomyState,
  metrics: EconomyMetrics,
  input: BuildCognitiveResourceEconomyInput,
): EconomyResolution {
  const base: EconomyResolution = {
    resourceState: state,
    orchestrationBudgetMax: BUDGET_RESOURCE_BALANCED,
    explanationOnlyMode: false,
    attentionNarrowingActive: false,
    priorityRebuildActive: false,
    deepReflectionSuppressed: false,
    recursiveThrottleActive: false,
    speculativeComputeClampActive: false,
    mobileHardClampActive: input.batterySaver || metrics.mobilePressurePct > 65,
  };

  switch (state) {
    case 'RESOURCE_STRESSED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RESOURCE_STRESSED,
        attentionNarrowingActive: true,
      };
    case 'RESOURCE_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RESOURCE_FRAGMENTED,
        priorityRebuildActive: true,
        attentionNarrowingActive: true,
      };
    case 'RESOURCE_OVERLOADED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RESOURCE_RISK,
        deepReflectionSuppressed: true,
        attentionNarrowingActive: true,
        mobileHardClampActive: true,
      };
    case 'RESOURCE_RECURSIVE_PRESSURE':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RESOURCE_RISK,
        recursiveThrottleActive: true,
        deepReflectionSuppressed: true,
        mobileHardClampActive: true,
      };
    case 'RESOURCE_WASTEFUL':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_RESOURCE_STRESSED,
        speculativeComputeClampActive: true,
        explanationOnlyMode: epUnsupported(input),
        attentionNarrowingActive: true,
      };
    default:
      return base;
  }
}
