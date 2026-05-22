import {
  BUDGET_EXECUTIVE_FRAGMENTED,
  BUDGET_EXECUTIVE_RISK,
  BUDGET_EXECUTIVE_STABLE,
  BUDGET_EXECUTIVE_STRAINED,
  EXECUTIVE_HEALTH_FRAGMENTED_THRESHOLD,
  EXECUTIVE_HEALTH_STRAINED_THRESHOLD,
  GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD,
  HALLUCINATION_EMERGENCY_THRESHOLD,
  LAYER_STATE_LABELS_JA,
  RECURSIVE_DANGER_THRESHOLD,
} from '../constants/unifiedCognitiveStateExecutiveAwareness';
import type {
  BuildUnifiedCognitiveStateInput,
  ExecutiveState,
  LayerStateInputId,
  LayerStateSnapshot,
} from '../types/unifiedCognitiveStateExecutiveAwareness';

export type ExecutiveMetrics = {
  stabilityHealthPct: number;
  recoveryHealthPct: number;
  regimeConfidencePct: number;
  consensusIntegrityPct: number;
  metaReliabilityPct: number;
  epistemicIntegrityPct: number;
  strategicCoherencePct: number;
  resourceHealthPct: number;
  recursivePressurePct: number;
  orchestrationSaturationPct: number;
  latencyPressurePct: number;
  trustHealthPct: number;
  memoryContinuityPct: number;
  causalContinuityPct: number;
  contradictionPressurePct: number;
  hallucinationRiskPct: number;
  mobilePressurePct: number;
  executiveHealthPct: number;
  executiveFragmentationPct: number;
  safeReasoningDepthPct: number;
  globalCoherencePct: number;
  recursiveDangerPct: number;
  fragmentationScorePct: number;
};

export type ExecutiveResolution = {
  executiveState: ExecutiveState;
  orchestrationBudgetMax: number;
  explanationOnlyMode: boolean;
  predictionThrottleActive: boolean;
  recursiveSuppressionActive: boolean;
  deepReasoningFreezeActive: boolean;
  priorityCoherenceRebuildActive: boolean;
  reduceReasoningDepthActive: boolean;
  reasoningModeJa: string;
  orchestrationModeJa: string;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function mkLayer(
  id: LayerStateInputId,
  value: number,
  detail: string,
): LayerStateSnapshot {
  return {
    id,
    labelJa: LAYER_STATE_LABELS_JA[id],
    valuePct: clamp(value),
    detailJa: detail,
  };
}

export function collectLayerStates(input: BuildUnifiedCognitiveStateInput): LayerStateSnapshot[] {
  const orch = input.orchestration;
  const ep = input.epistemic;
  const graph = input.strategicMemoryGraph;
  const economy = input.cognitiveResourceEconomy;
  const consensus = input.consensus;
  const meta = input.metaReliability;

  const stabilityHealth = input.stability?.systemHealthScore ?? 60;
  const recoveryHealth = input.recovery?.recoveryHealthPct ?? 55;
  const regimeConfidence = input.regime?.regimeConfidencePct ?? 50;
  const consensusIntegrity = consensus?.consensusHealthPct ?? 100 - (consensus?.contradictionRiskPct ?? 30);
  const metaReliability = meta?.metaReliabilityPct ?? 55;
  const epistemicIntegrity = ep?.epistemicHealthPct ?? 58;
  const strategicCoherence = graph?.graphHealthPct ?? graph?.memoryIntegrityPct ?? 55;
  const resourceHealth = economy?.resourceHealthPct ?? 60;
  const recursivePressure =
    economy?.recursivePressurePct ?? graph?.recursiveLoopRiskPct ?? 25;
  const orchestrationSaturation = orch
    ? clamp(100 - (orch.orchestrationHealthScore ?? 50))
    : economy?.orchestrationSaturationPct ?? 30;
  const latencyPressure = economy?.latencyInflationPct ?? (orch?.refreshLatencyMs ?? 0) > 700 ? 60 : 25;
  const trustHealth = meta?.metaReliabilityPct ?? meta?.longitudinalConsistencyPct ?? 55;
  const memoryContinuity = graph?.timelineContinuityPct ?? 50;
  const causalContinuity = graph?.causalConfidencePct ?? 45;
  const contradictionPressure = clamp(
    (consensus?.contradictionRiskPct ?? 0) * 0.45 +
      (ep?.contradictionDensityPct ?? 0) * 0.35 +
      (input.mockContradictionPressureBoost ?? 0),
  );
  const hallucinationRisk = clamp(
    (ep?.hallucinationRiskPct ?? 0) * 0.5 +
      (meta?.hallucinationRiskPct ?? 0) * 0.25 +
      (graph?.hallucinationPropagationPct ?? 0) * 0.2 +
      (input.mockHallucinationRiskBoost ?? 0),
  );
  const mobilePressure = economy?.mobilePressurePct ?? (input.batterySaver ? 65 : 22);

  return [
    mkLayer('stabilityHealth', stabilityHealth, input.stability?.healthLabelJa ?? '—'),
    mkLayer('recoveryHealth', recoveryHealth, input.recovery?.thawState ?? '—'),
    mkLayer('regimeConfidence', regimeConfidence, input.regime?.currentRegime ?? '—'),
    mkLayer('consensusIntegrity', consensusIntegrity, consensus?.consensusState ?? '—'),
    mkLayer('metaReliability', metaReliability, meta?.trustState ?? '—'),
    mkLayer('epistemicIntegrity', epistemicIntegrity, ep?.epistemicState ?? '—'),
    mkLayer('strategicCoherence', strategicCoherence, graph?.graphState ?? '—'),
    mkLayer('resourceHealth', resourceHealth, economy?.resourceState ?? '—'),
    mkLayer('recursivePressure', recursivePressure, 'recursive'),
    mkLayer('orchestrationSaturation', orchestrationSaturation, 'saturation'),
    mkLayer('latencyPressure', latencyPressure, `${orch?.refreshLatencyMs ?? 0}ms`),
    mkLayer('trustHealth', trustHealth, 'trust'),
    mkLayer('memoryContinuity', memoryContinuity, 'memory'),
    mkLayer('causalContinuity', causalContinuity, 'causal（仮説）'),
    mkLayer('contradictionPressure', contradictionPressure, 'contradiction'),
    mkLayer('hallucinationRisk', hallucinationRisk, 'hallucination'),
    mkLayer('mobilePressure', mobilePressure, input.batterySaver ? 'battery' : 'normal'),
  ];
}

export function computeExecutiveMetrics(
  input: BuildUnifiedCognitiveStateInput,
  layers: LayerStateSnapshot[],
): ExecutiveMetrics {
  const v = (id: LayerStateInputId) => layers.find((l) => l.id === id)?.valuePct ?? 0;

  const stabilityHealthPct = v('stabilityHealth');
  const recoveryHealthPct = v('recoveryHealth');
  const regimeConfidencePct = v('regimeConfidence');
  const consensusIntegrityPct = v('consensusIntegrity');
  const metaReliabilityPct = v('metaReliability');
  const epistemicIntegrityPct = v('epistemicIntegrity');
  const strategicCoherencePct = v('strategicCoherence');
  const resourceHealthPct = v('resourceHealth');
  const recursivePressurePct = v('recursivePressure');
  const orchestrationSaturationPct = v('orchestrationSaturation');
  const latencyPressurePct = v('latencyPressure');
  const trustHealthPct = v('trustHealth');
  const memoryContinuityPct = v('memoryContinuity');
  const causalContinuityPct = v('causalContinuity');
  const contradictionPressurePct = v('contradictionPressure');
  const hallucinationRiskPct = v('hallucinationRisk');
  const mobilePressurePct = v('mobilePressure');

  let executiveHealthPct = clamp(
    (stabilityHealthPct +
      recoveryHealthPct +
      consensusIntegrityPct +
      epistemicIntegrityPct +
      strategicCoherencePct +
      resourceHealthPct +
      trustHealthPct) /
      7,
  );
  if (typeof input.mockExecutiveHealthPct === 'number') {
    executiveHealthPct = clamp(input.mockExecutiveHealthPct);
  }

  const executiveFragmentationPct = clamp(
    contradictionPressurePct * 0.28 +
      orchestrationSaturationPct * 0.22 +
      recursivePressurePct * 0.25 +
      hallucinationRiskPct * 0.25,
  );

  const safeReasoningDepthPct = clamp(executiveHealthPct - executiveFragmentationPct);

  let globalCoherencePct = clamp(
    (causalContinuityPct + memoryContinuityPct + strategicCoherencePct + consensusIntegrityPct) / 4,
  );
  if (typeof input.mockGlobalCoherencePct === 'number') {
    globalCoherencePct = clamp(input.mockGlobalCoherencePct);
  }

  let recursiveDangerPct = clamp(
    (recursivePressurePct / 100) *
      (orchestrationSaturationPct / 100) *
      (contradictionPressurePct / 100) *
      10000,
  );
  recursiveDangerPct = clamp(Math.sqrt(recursiveDangerPct) + (input.mockRecursiveDangerBoost ?? 0));

  const fragmentationScorePct = clamp(executiveFragmentationPct);

  return {
    stabilityHealthPct,
    recoveryHealthPct,
    regimeConfidencePct,
    consensusIntegrityPct,
    metaReliabilityPct,
    epistemicIntegrityPct,
    strategicCoherencePct,
    resourceHealthPct,
    recursivePressurePct,
    orchestrationSaturationPct,
    latencyPressurePct,
    trustHealthPct,
    memoryContinuityPct,
    causalContinuityPct,
    contradictionPressurePct,
    hallucinationRiskPct,
    mobilePressurePct,
    executiveHealthPct,
    executiveFragmentationPct,
    safeReasoningDepthPct,
    globalCoherencePct,
    recursiveDangerPct,
    fragmentationScorePct,
  };
}

export function classifyExecutiveState(
  metrics: ExecutiveMetrics,
  governanceBlocks: boolean,
): ExecutiveState {
  if (metrics.hallucinationRiskPct > HALLUCINATION_EMERGENCY_THRESHOLD) {
    return 'EXECUTIVE_EMERGENCY';
  }
  if (metrics.recursiveDangerPct > RECURSIVE_DANGER_THRESHOLD) {
    return 'EXECUTIVE_RECURSIVE_RISK';
  }
  if (metrics.globalCoherencePct < GLOBAL_COHERENCE_UNCERTAIN_THRESHOLD) {
    return 'EXECUTIVE_UNCERTAIN';
  }
  if (metrics.executiveHealthPct < EXECUTIVE_HEALTH_FRAGMENTED_THRESHOLD) {
    return 'EXECUTIVE_FRAGMENTED';
  }
  if (metrics.executiveHealthPct < EXECUTIVE_HEALTH_STRAINED_THRESHOLD || governanceBlocks) {
    return 'EXECUTIVE_STRAINED';
  }
  return 'EXECUTIVE_STABLE';
}

export function resolveExecutiveActions(
  state: ExecutiveState,
  metrics: ExecutiveMetrics,
): ExecutiveResolution {
  const base: ExecutiveResolution = {
    executiveState: state,
    orchestrationBudgetMax: BUDGET_EXECUTIVE_STABLE,
    explanationOnlyMode: false,
    predictionThrottleActive: false,
    recursiveSuppressionActive: false,
    deepReasoningFreezeActive: false,
    priorityCoherenceRebuildActive: false,
    reduceReasoningDepthActive: false,
    reasoningModeJa: 'balanced depth',
    orchestrationModeJa: 'coherent orchestration',
  };

  switch (state) {
    case 'EXECUTIVE_STRAINED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXECUTIVE_STRAINED,
        reduceReasoningDepthActive: true,
        reasoningModeJa: 'reduced depth',
        orchestrationModeJa: 'strained coherence',
      };
    case 'EXECUTIVE_FRAGMENTED':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXECUTIVE_FRAGMENTED,
        priorityCoherenceRebuildActive: true,
        deepReasoningFreezeActive: true,
        reduceReasoningDepthActive: true,
        reasoningModeJa: 'shallow — coherence rebuild',
        orchestrationModeJa: 'fragmented — priority rebuild',
      };
    case 'EXECUTIVE_UNCERTAIN':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXECUTIVE_FRAGMENTED,
        predictionThrottleActive: true,
        reduceReasoningDepthActive: true,
        reasoningModeJa: 'uncertain — prediction downgrade',
        orchestrationModeJa: 'uncertain coherence',
      };
    case 'EXECUTIVE_RECURSIVE_RISK':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXECUTIVE_RISK,
        recursiveSuppressionActive: true,
        deepReasoningFreezeActive: true,
        reasoningModeJa: 'recursive suppressed',
        orchestrationModeJa: 'recursive shutdown',
      };
    case 'EXECUTIVE_EMERGENCY':
      return {
        ...base,
        orchestrationBudgetMax: BUDGET_EXECUTIVE_RISK,
        explanationOnlyMode: true,
        predictionThrottleActive: true,
        recursiveSuppressionActive: true,
        deepReasoningFreezeActive: true,
        reasoningModeJa: 'explanation-only fallback',
        orchestrationModeJa: 'emergency safe mode',
      };
    default:
      return base;
  }
}
