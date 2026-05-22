/**
 * Dynamic orchestration runtime — per-refresh plan, layer sleep/wake, stale reuse.
 */
import {
  ALL_ORCHESTRATED_LAYER_IDS,
  DASHBOARD_LAYER_IDS,
  LAYER_COMPUTE_COST,
  LAYER_PRIORITY_RANK,
  MOBILE_REFRESH_BUDGET_MAX,
  DESKTOP_REFRESH_BUDGET_MAX,
  STALE_GATE_LAYER_IDS,
  STALE_GATE_TTL_MS,
  STALE_TTL_MS,
} from '../constants/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { LayerRecomputeId } from '../types/reactiveEventOrchestration';
import type {
  LayerScheduleEntry,
  LayerWakeState,
  OrchestratedLayerId,
} from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { ResourceScheduleContext } from './adaptiveResourceComputeBudgetRuntime';
import { shouldRunLayerWithComputeBudget } from './adaptiveResourceComputeBudgetRuntime';
import { mapReactiveLayerToResource } from './adaptiveResourceComputeBudgetIntegration';
import { shouldRecomputeLayer, getPendingRecomputeLayers } from './reactiveEventOrchestrationRuntime';
import {
  loadDynamicOrchestrationState,
  noteLayerCacheHit,
  persistLayerCache,
} from './dynamicLayerOrchestrationMobileRuntimeOptimizationStorage';

export type OrchestrationCycleInput = {
  stateFingerprintJa: string;
  batterySaver: boolean;
  appForeground: boolean;
  memoryPressure: boolean;
  offlineMode: boolean;
  emergencyOverride: boolean;
  dataReliabilityLow: boolean;
  governanceVeto: boolean;
  mobileOptimizationMode: boolean;
  resourceCtx: ResourceScheduleContext;
  invalidateLayers?: OrchestratedLayerId[];
  progressiveHydrationFull?: boolean;
  /** Cached regime handoff — calm 95 / volatile 65 / panic safety-only */
  regimeComputeBudgetMax?: number;
  regimePanicOnly?: boolean;
  regimeGovernancePriority?: boolean;
  /** Cached consensus handoff */
  consensusBudgetMax?: number;
  consensusHardConflict?: boolean;
  consensusPanicOnly?: boolean;
  consensusGovernancePriority?: boolean;
  /** Cached meta reliability / longitudinal trust handoff */
  metaReliabilityBudgetMax?: number;
  metaTrustCritical?: boolean;
  metaTrustUnstable?: boolean;
  metaExplanationDivergence?: boolean;
  metaLongitudinalUnsupported?: boolean;
  metaGovernancePriorityOnly?: boolean;
  /** Cached self-architecture review handoff (proposal-only hints) */
  selfArchitectureBudgetMax?: number;
  selfArchRecursiveRisk?: boolean;
  selfArchMobilePressure?: boolean;
  selfArchUnsupported?: boolean;
  selfArchOverexpanded?: boolean;
  /** Cached epistemic integrity handoff */
  epistemicIntegrityBudgetMax?: number;
  epistemicHallucinationRisk?: boolean;
  epistemicUnsupported?: boolean;
  epistemicSpeculative?: boolean;
  epistemicContradicted?: boolean;
  epistemicExplanationOnly?: boolean;
  epistemicPredictionFreeze?: boolean;
  /** Cached strategic memory graph handoff */
  strategicMemoryGraphBudgetMax?: number;
  graphCausalUncertain?: boolean;
  graphContradicted?: boolean;
  graphOverconnected?: boolean;
  graphTemporallyDrifting?: boolean;
  graphFragmented?: boolean;
  graphCausalFreeze?: boolean;
  graphEdgePruning?: boolean;
  /** Cached cognitive resource economy handoff */
  cognitiveResourceEconomyBudgetMax?: number;
  resourceOverloaded?: boolean;
  resourceRecursivePressure?: boolean;
  resourceWasteful?: boolean;
  resourceFragmented?: boolean;
  resourceStressed?: boolean;
  resourceDeepReflectionFreeze?: boolean;
  resourceRecursiveThrottle?: boolean;
  resourceSpeculativeFreeze?: boolean;
  resourceMobileHardClamp?: boolean;
  resourceAttentionNarrowing?: boolean;
  /** Cached unified cognitive state handoff */
  unifiedCognitiveStateBudgetMax?: number;
  executiveStrained?: boolean;
  executiveFragmented?: boolean;
  executiveUncertain?: boolean;
  executiveRecursiveRisk?: boolean;
  executiveEmergency?: boolean;
  executiveDeepReasoningFreeze?: boolean;
  executiveRecursiveSuppression?: boolean;
  executiveExplanationOnly?: boolean;
  executivePredictionThrottle?: boolean;
  executiveCoherenceRebuild?: boolean;
  executiveReduceDepth?: boolean;
  /** Cached human intent continuity handoff */
  humanIntentContinuityBudgetMax?: number;
  intentDrifting?: boolean;
  intentFragmented?: boolean;
  intentReinterpreting?: boolean;
  intentUncertain?: boolean;
  intentUnsupported?: boolean;
  intentInstructionReinforcement?: boolean;
  intentContextRebuild?: boolean;
  intentReinterpretationSuppression?: boolean;
  intentClarificationDowngrade?: boolean;
  intentSemanticFreeze?: boolean;
  intentExplanationOnly?: boolean;
  intentOrchestrationDeviationClamp?: boolean;
  /** Cached adaptive exploration handoff */
  adaptiveExplorationBudgetMax?: number;
  explorationRigid?: boolean;
  explorationStagnant?: boolean;
  explorationOverclamped?: boolean;
  explorationUncertain?: boolean;
  explorationUnsupported?: boolean;
  explorationPerspectiveWidening?: boolean;
  explorationSafeAlternative?: boolean;
  explorationClampRelaxation?: boolean;
  explorationUncertaintyAck?: boolean;
  explorationFallbackFreeze?: boolean;
  /** Cached constitutional governance handoff */
  constitutionalGovernanceBudgetMax?: number;
  constitutionalConflict?: boolean;
  constitutionalCollision?: boolean;
  constitutionalFragmented?: boolean;
  constitutionalEmergency?: boolean;
  constitutionalUnsupported?: boolean;
  constitutionalPrecedenceArbitration?: boolean;
  constitutionalOverrideFreeze?: boolean;
  constitutionalHierarchyRebuild?: boolean;
  constitutionalFallbackFreeze?: boolean;
  /** Cached explainable governance handoff */
  explainableGovernanceBudgetMax?: number;
  explainablePartial?: boolean;
  explainableOpaque?: boolean;
  explainableRisk?: boolean;
  explainableUnsupported?: boolean;
  explainableContradicted?: boolean;
  explainableSafeSimplification?: boolean;
  explainableFallbackExplanation?: boolean;
  explainableExplanationSuppression?: boolean;
  explainableConsistencyRebuild?: boolean;
  explainableExplanationOnly?: boolean;
  /** Cached runtime survival handoff */
  runtimeSurvivalBudgetMax?: number;
  runtimeStressed?: boolean;
  runtimeDegraded?: boolean;
  runtimeFragmented?: boolean;
  runtimeOffline?: boolean;
  runtimeCritical?: boolean;
  runtimeSurvivalMode?: boolean;
  runtimeLightweight?: boolean;
  runtimeDeepOrchSuppression?: boolean;
  runtimeRebuild?: boolean;
  runtimeOfflineFallback?: boolean;
  runtimeWebsocketPause?: boolean;
  runtimeCacheFirst?: boolean;
  runtimeDashboardLowRefresh?: boolean;
  runtimeSpeculativeStop?: boolean;
  runtimeDeepReflectionStop?: boolean;
};

type LayerPlan = {
  schedule: LayerScheduleEntry[];
  runFlags: Record<OrchestratedLayerId, boolean>;
  retainFlags: Record<OrchestratedLayerId, boolean>;
  hydrateFlags: Record<OrchestratedLayerId, boolean>;
  budgetUsed: number;
  budgetMax: number;
  skipped: OrchestratedLayerId[];
  explanations: string[];
};

let currentPlan: LayerPlan | null = null;
let cycleStartedAt = 0;

const COGNITIVE_ONLY_LAYERS: OrchestratedLayerId[] = [
  'temporal',
  'semantic',
  'epistemic',
  'arbitration',
  'reflection',
  'compression',
  'systemic',
  'recovery',
  'orchestration',
];

function isReactiveLayer(id: OrchestratedLayerId): id is LayerRecomputeId {
  return !COGNITIVE_ONLY_LAYERS.includes(id);
}

function reactiveAllows(id: OrchestratedLayerId): boolean {
  if (!isReactiveLayer(id)) return true;
  return shouldRecomputeLayer(id);
}

function resourceAllows(id: OrchestratedLayerId, ctx: ResourceScheduleContext): boolean {
  if (!isReactiveLayer(id)) {
    if (ctx.emergencyComputeCut) return LAYER_PRIORITY_RANK[id] <= 5;
    if (ctx.aiSleepMode) return LAYER_PRIORITY_RANK[id] <= 8;
    if (!ctx.appForeground) return LAYER_PRIORITY_RANK[id] <= 6;
    if (ctx.batterySaver) return LAYER_PRIORITY_RANK[id] <= 10;
    return true;
  }
  const mapped = mapReactiveLayerToResource(id);
  if (!mapped) return reactiveAllows(id);
  return shouldRunLayerWithComputeBudget(mapped, ctx);
}

function staleAllows(
  id: OrchestratedLayerId,
  fingerprint: string,
  cacheAt: string | undefined,
): boolean {
  if (!cacheAt) return false;
  const ttl = STALE_GATE_LAYER_IDS.includes(id) ? STALE_GATE_TTL_MS : STALE_TTL_MS;
  const age = Date.now() - new Date(cacheAt).getTime();
  return age < ttl;
}

export function resetOrchestrationRuntimeForTest(): void {
  currentPlan = null;
  cycleStartedAt = 0;
}

export async function beginDynamicOrchestrationCycle(
  input: OrchestrationCycleInput,
): Promise<LayerPlan> {
  cycleStartedAt = Date.now();
  const persisted = await loadDynamicOrchestrationState();
  const invalidate = new Set(input.invalidateLayers ?? []);
  const pending = new Set(getPendingRecomputeLayers());
  const selective = pending.size > 0 && pending.size < 12;
  let budgetMax = input.mobileOptimizationMode
    ? MOBILE_REFRESH_BUDGET_MAX
    : DESKTOP_REFRESH_BUDGET_MAX;
  if (typeof input.regimeComputeBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.regimeComputeBudgetMax);
  }
  if (typeof input.consensusBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.consensusBudgetMax);
  }
  if (typeof input.metaReliabilityBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.metaReliabilityBudgetMax);
  }
  if (typeof input.selfArchitectureBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.selfArchitectureBudgetMax);
  }
  if (typeof input.epistemicIntegrityBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.epistemicIntegrityBudgetMax);
  }
  if (typeof input.strategicMemoryGraphBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.strategicMemoryGraphBudgetMax);
  }
  if (typeof input.cognitiveResourceEconomyBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.cognitiveResourceEconomyBudgetMax);
  }
  if (typeof input.unifiedCognitiveStateBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.unifiedCognitiveStateBudgetMax);
  }
  if (typeof input.humanIntentContinuityBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.humanIntentContinuityBudgetMax);
  }
  if (typeof input.adaptiveExplorationBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.adaptiveExplorationBudgetMax);
  }
  if (typeof input.constitutionalGovernanceBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.constitutionalGovernanceBudgetMax);
  }
  if (typeof input.explainableGovernanceBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.explainableGovernanceBudgetMax);
  }
  if (typeof input.runtimeSurvivalBudgetMax === 'number') {
    budgetMax = Math.min(budgetMax, input.runtimeSurvivalBudgetMax);
  }
  const regimePanicOnly = input.regimePanicOnly === true;
  const consensusPanicOnly = input.consensusPanicOnly === true;
  const metaTrustCritical = input.metaTrustCritical === true;
  const metaLongitudinalUnsupported = input.metaLongitudinalUnsupported === true;
  const panicOnly =
    regimePanicOnly || consensusPanicOnly || metaTrustCritical || metaLongitudinalUnsupported;
  const regimeGovPriority =
    input.regimeGovernancePriority === true || input.emergencyOverride;
  const consensusGovPriority = input.consensusGovernancePriority === true;
  const metaGovPriority = input.metaGovernancePriorityOnly === true;
  const govPriority = regimeGovPriority || consensusGovPriority || metaGovPriority;
  const hardConflict = input.consensusHardConflict === true;
  const metaTrustUnstable = input.metaTrustUnstable === true;
  const metaExplanationDivergence = input.metaExplanationDivergence === true;
  const selfArchRecursive = input.selfArchRecursiveRisk === true;
  const selfArchMobile = input.selfArchMobilePressure === true;
  const selfArchUnsupported = input.selfArchUnsupported === true;
  const selfArchOverexpanded = input.selfArchOverexpanded === true;
  const epistemicHallucination = input.epistemicHallucinationRisk === true;
  const epistemicUnsupported = input.epistemicUnsupported === true;
  const epistemicSpeculative = input.epistemicSpeculative === true;
  const epistemicContradicted = input.epistemicContradicted === true;
  const epistemicExplanationOnly = input.epistemicExplanationOnly === true;
  const epistemicPredictionFreeze = input.epistemicPredictionFreeze === true;
  const graphCausalUncertain = input.graphCausalUncertain === true;
  const graphContradicted = input.graphContradicted === true;
  const graphOverconnected = input.graphOverconnected === true;
  const graphTemporallyDrifting = input.graphTemporallyDrifting === true;
  const graphFragmented = input.graphFragmented === true;
  const graphCausalFreeze = input.graphCausalFreeze === true || graphCausalUncertain;
  const graphEdgePruning = input.graphEdgePruning === true || graphOverconnected;
  const resourceOverloaded = input.resourceOverloaded === true;
  const resourceRecursivePressure = input.resourceRecursivePressure === true;
  const resourceWasteful = input.resourceWasteful === true;
  const resourceFragmented = input.resourceFragmented === true;
  const resourceStressed = input.resourceStressed === true;
  const resourceDeepReflectionFreeze = input.resourceDeepReflectionFreeze === true || resourceOverloaded;
  const resourceRecursiveThrottle =
    input.resourceRecursiveThrottle === true || resourceRecursivePressure;
  const resourceSpeculativeFreeze = input.resourceSpeculativeFreeze === true || resourceWasteful;
  const resourceMobileHardClamp = input.resourceMobileHardClamp === true;
  const resourceAttentionNarrowing =
    input.resourceAttentionNarrowing === true || resourceStressed || resourceFragmented;
  const executiveEmergency = input.executiveEmergency === true;
  const executiveRecursiveRisk = input.executiveRecursiveRisk === true;
  const executiveFragmented = input.executiveFragmented === true;
  const executiveUncertain = input.executiveUncertain === true;
  const executiveStrained = input.executiveStrained === true;
  const executiveDeepFreeze =
    input.executiveDeepReasoningFreeze === true || executiveEmergency || executiveFragmented;
  const executiveRecursiveSuppression =
    input.executiveRecursiveSuppression === true || executiveRecursiveRisk || executiveEmergency;
  const executiveExplanationOnly =
    input.executiveExplanationOnly === true || executiveEmergency;
  const executivePredictionThrottle =
    input.executivePredictionThrottle === true || executiveUncertain || executiveEmergency;
  const executiveCoherenceRebuild =
    input.executiveCoherenceRebuild === true || executiveFragmented;
  const executiveReduceDepth =
    input.executiveReduceDepth === true || executiveStrained || executiveFragmented;
  const intentUnsupported = input.intentUnsupported === true;
  const intentReinterpreting = input.intentReinterpreting === true;
  const intentFragmented = input.intentFragmented === true;
  const intentDrifting = input.intentDrifting === true;
  const intentUncertain = input.intentUncertain === true;
  const intentExplanationOnly =
    input.intentExplanationOnly === true || intentUnsupported;
  const intentSemanticFreeze =
    input.intentSemanticFreeze === true || intentReinterpreting || intentFragmented;
  const intentReinterpretationSuppression =
    input.intentReinterpretationSuppression === true || intentReinterpreting || intentUnsupported;
  const intentContextRebuild = input.intentContextRebuild === true || intentFragmented;
  const intentClarificationDowngrade =
    input.intentClarificationDowngrade === true || intentUncertain;
  const intentInstructionReinforcement =
    input.intentInstructionReinforcement === true || intentDrifting || intentFragmented;
  const intentOrchestrationDeviationClamp = input.intentOrchestrationDeviationClamp === true;
  const explorationUnsupported = input.explorationUnsupported === true;
  const explorationStagnant = input.explorationStagnant === true;
  const explorationRigid = input.explorationRigid === true;
  const explorationOverclamped = input.explorationOverclamped === true;
  const explorationUncertain = input.explorationUncertain === true;
  const explorationFallbackFreeze =
    input.explorationFallbackFreeze === true || explorationUnsupported;
  const explorationPerspectiveWidening =
    input.explorationPerspectiveWidening === true || explorationRigid || explorationStagnant;
  const explorationSafeAlternative =
    input.explorationSafeAlternative === true || explorationStagnant;
  const explorationClampRelaxation =
    input.explorationClampRelaxation === true || explorationOverclamped;
  const explorationUncertaintyAck =
    input.explorationUncertaintyAck === true || explorationUncertain;
  const constitutionalUnsupported = input.constitutionalUnsupported === true;
  const constitutionalEmergency =
    input.constitutionalEmergency === true || constitutionalUnsupported;
  const constitutionalCollision = input.constitutionalCollision === true;
  const constitutionalConflict =
    input.constitutionalConflict === true || constitutionalCollision;
  const constitutionalFragmented = input.constitutionalFragmented === true;
  const constitutionalOverrideFreeze =
    input.constitutionalOverrideFreeze === true || constitutionalCollision || constitutionalEmergency;
  const constitutionalPrecedenceArbitration =
    input.constitutionalPrecedenceArbitration === true ||
    constitutionalConflict ||
    constitutionalFragmented;
  const constitutionalHierarchyRebuild = input.constitutionalHierarchyRebuild === true;
  const constitutionalFallbackFreeze =
    input.constitutionalFallbackFreeze === true || constitutionalUnsupported;
  const explainableUnsupported = input.explainableUnsupported === true;
  const explainableRisk = input.explainableRisk === true || explainableUnsupported;
  const explainableOpaque = input.explainableOpaque === true || explainableRisk;
  const explainablePartial = input.explainablePartial === true || explainableOpaque;
  const explainableContradicted = input.explainableContradicted === true;
  const explainableExplanationSuppression =
    input.explainableExplanationSuppression === true || explainableRisk;
  const explainableFallbackExplanation =
    input.explainableFallbackExplanation === true || explainableOpaque || explainableUnsupported;
  const explainableConsistencyRebuild =
    input.explainableConsistencyRebuild === true || explainableContradicted;
  const explainableSafeSimplification =
    input.explainableSafeSimplification === true || explainablePartial;
  const explainableExplanationOnly =
    input.explainableExplanationOnly === true || explainableUnsupported;

  const sorted = [...ALL_ORCHESTRATED_LAYER_IDS].sort((a, b) => {
    const d = LAYER_PRIORITY_RANK[a] - LAYER_PRIORITY_RANK[b];
    return d !== 0 ? d : a.localeCompare(b);
  });

  let budgetUsed = 0;
  const schedule: LayerScheduleEntry[] = [];
  const runFlags = {} as Record<OrchestratedLayerId, boolean>;
  const retainFlags = {} as Record<OrchestratedLayerId, boolean>;
  const hydrateFlags = {} as Record<OrchestratedLayerId, boolean>;
  const skipped: OrchestratedLayerId[] = [];
  const explanations: string[] = [];

  for (const id of sorted) {
    const cost = LAYER_COMPUTE_COST[id];
    const priorityRank = LAYER_PRIORITY_RANK[id];
    let state: LayerWakeState = 'active';
    let willRun = true;
    let retainPrevious = false;
    let detail = 'scheduled';

    const cacheEntry = persisted.layerCache[id];
    const cacheHit = await noteLayerCacheHit(id, input.stateFingerprintJa);
    const staleOk =
      cacheHit &&
      staleAllows(id, input.stateFingerprintJa, cacheEntry?.at) &&
      !invalidate.has(id);

    if (panicOnly && priorityRank > 5) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = metaTrustCritical || metaLongitudinalUnsupported
        ? 'meta trust critical — governance/stability only'
        : consensusPanicOnly
          ? 'consensus panic — safety/governance only'
          : 'regime panic — safety/governance only';
    } else if (selfArchRecursive && id === 'reflection') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'self-arch reflection throttle proposal — review only';
    } else if (selfArchMobile && priorityRank > 14) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'self-arch mobile pressure — low-priority sleep proposal';
    } else if (selfArchUnsupported && priorityRank > 5 && id !== 'governance' && id !== 'stability') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'self-arch unsupported — minimal orchestration proposal';
    } else if (selfArchOverexpanded && priorityRank > 11) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'self-arch overexpanded — layer freeze proposal';
    } else if (epistemicPredictionFreeze && (id === 'macro' || id === 'arbitration')) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic prediction freeze';
    } else if (epistemicHallucination && id === 'epistemic') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic hallucination risk — deep validation deferred';
    } else if (epistemicUnsupported && priorityRank > 8 && id !== 'governance' && id !== 'stability') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic unsupported — explanation-only orchestration';
    } else if (epistemicContradicted && id === 'arbitration') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic contradicted — consensus revalidation';
    } else if (epistemicSpeculative && priorityRank > 12) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic speculative — confidence reduction';
    } else if (epistemicExplanationOnly && priorityRank > 10) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'epistemic explanation-only fallback';
    } else if (graphCausalFreeze && (id === 'reflection' || id === 'epistemic') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'causal graph freeze — hypothesis-only';
    } else if (graphContradicted && id === 'arbitration' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'graph contradicted — consensus rebuild';
    } else if (graphEdgePruning && (id === 'reflection' || id === 'compression') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'graph overconnected — recursive edge suppression';
    } else if (graphTemporallyDrifting && id === 'temporal' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'graph temporally drifting — timeline reconstruction';
    } else if (graphFragmented && priorityRank > 12 && willRun) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'graph fragmented — memory simplification';
    } else if (graphCausalUncertain && priorityRank > 9 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'graph causality uncertain — causal downgrade';
    } else if (resourceDeepReflectionFreeze && id === 'reflection' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'resource overloaded — deep reflection freeze';
    } else if (resourceRecursiveThrottle && id === 'reflection' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'resource recursive pressure — recursive suppression';
    } else if (resourceSpeculativeFreeze && (id === 'macro' || id === 'epistemic') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'resource wasteful — speculative compute freeze';
    } else if (resourceFragmented && priorityRank > 11 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'resource fragmented — priority rebuild';
    } else if (resourceAttentionNarrowing && priorityRank > 13 && willRun) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'resource stressed — attention narrowing';
    } else if (resourceMobileHardClamp && priorityRank > 10 && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'mobile hard clamp — lightweight orchestration';
    } else if (executiveEmergency && priorityRank > 4 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'executive emergency — explanation-only orchestration';
    } else if (executiveDeepFreeze && id === 'reflection' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'executive fragmented — deep reasoning freeze';
    } else if (executiveRecursiveSuppression && id === 'reflection' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'executive recursive risk — recursive shutdown';
    } else if (executivePredictionThrottle && (id === 'macro' || id === 'arbitration') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'executive uncertain — prediction throttle';
    } else if (executiveCoherenceRebuild && id === 'arbitration' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'executive fragmented — coherence rebuild';
    } else if (executiveReduceDepth && priorityRank > 12 && willRun) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'executive strained — reduce reasoning depth';
    } else if (intentExplanationOnly && priorityRank > 5 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent unsupported — explanation-only fallback';
    } else if (intentSemanticFreeze && id === 'semantic' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent reinterpreting — semantic freeze';
    } else if (intentReinterpretationSuppression && (id === 'arbitration' || id === 'semantic') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent — reinterpretation suppression';
    } else if (intentContextRebuild && id === 'temporal' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent fragmented — context rebuild';
    } else if (intentClarificationDowngrade && (id === 'macro' || id === 'arbitration') && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent uncertain — clarification downgrade';
    } else if (intentInstructionReinforcement && id === 'arbitration' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'intent drifting — instruction reinforcement';
    } else if (intentOrchestrationDeviationClamp && priorityRank > 11 && willRun) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'intent — orchestration deviation clamp';
    } else if (explorationFallbackFreeze && priorityRank > 6 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'exploration unsupported — fallback freeze';
    } else if (explorationUncertaintyAck && id === 'macro' && !willRun && retainPrevious) {
      state = 'active';
      willRun = true;
      retainPrevious = false;
      detail = 'exploration uncertain — uncertainty-first acknowledgment';
    } else if (explorationClampRelaxation && priorityRank > 13 && !willRun && retainPrevious) {
      state = 'active';
      willRun = true;
      retainPrevious = false;
      detail = 'exploration overclamped — safe flexibility restore hint';
    } else if (explorationPerspectiveWidening && id === 'macro' && !willRun && retainPrevious) {
      state = 'active';
      willRun = true;
      retainPrevious = false;
      detail = 'exploration rigid — controlled perspective widening';
    } else if (explorationSafeAlternative && id === 'arbitration' && !willRun && retainPrevious) {
      state = 'active';
      willRun = true;
      retainPrevious = false;
      detail = 'exploration stagnant — safe alternative suggestion only';
    } else if (constitutionalFallbackFreeze && priorityRank > 5 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'constitutional unsupported — fallback freeze';
    } else if (constitutionalOverrideFreeze && priorityRank > 7 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'constitutional — global override freeze';
    } else if (constitutionalEmergency && priorityRank > 4 && id !== 'governance' && id !== 'stability' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'constitutional emergency — lockdown';
    } else if (constitutionalPrecedenceArbitration && id === 'arbitration' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'constitutional — precedence-only arbitration';
    } else if (constitutionalHierarchyRebuild && id === 'arbitration' && willRun) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'constitutional fragmented — hierarchy rebuild suggestion';
    } else if ((metaTrustUnstable || metaExplanationDivergence) && priorityRank > 12) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = metaExplanationDivergence
        ? 'meta explanation divergence — retain trusted snapshot'
        : 'meta trust unstable — suppress adaptive layers';
    } else if (hardConflict && priorityRank > 10) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'consensus hard conflict — heavy layers sleep';
    } else if (govPriority && priorityRank > 5 && id !== 'governance' && id !== 'stability') {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = metaGovPriority
        ? 'meta trust governance priority'
        : consensusGovPriority
          ? 'consensus governance priority'
          : 'regime governance priority';
    } else if (input.emergencyOverride && priorityRank <= 5) {
      state = 'critical';
      detail = 'emergency override';
    } else if (!input.appForeground && priorityRank > 6) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'background pause';
    } else if (input.batterySaver && priorityRank > 10) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'battery saver';
    } else if (input.offlineMode && priorityRank > 8) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'offline defer';
      if (id === 'macro') {
        explanations.push('端末負荷を抑えるため Macro 詳細分析は遅延実行中');
      }
    } else if (!reactiveAllows(id)) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'reactive skip';
    } else if (!resourceAllows(id, input.resourceCtx)) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'resource budget';
    } else if (selective && isReactiveLayer(id) && !pending.has(id)) {
      state = 'sleeping';
      willRun = false;
      retainPrevious = true;
      detail = 'selective recompute';
    } else if (staleOk && !input.governanceVeto && !input.dataReliabilityLow) {
      state = 'stale';
      willRun = false;
      retainPrevious = true;
      detail = 'stale reuse';
    } else if (budgetUsed + cost > budgetMax && priorityRank > 3) {
      state = 'deferred';
      willRun = false;
      retainPrevious = true;
      detail = 'mobile budget';
      if (DASHBOARD_LAYER_IDS.includes(id)) {
        explanations.push(
          `端末負荷を抑えるため ${id} 詳細は遅延実行中`,
        );
      }
    } else {
      budgetUsed += cost;
      if (willRun) void persistLayerCache(id, input.stateFingerprintJa);
    }

    if (input.governanceVeto && id === 'strategy') {
      willRun = true;
      state = 'active';
      retainPrevious = false;
      budgetUsed += cost;
    }
    if (input.dataReliabilityLow && (id === 'data_reliability' || id === 'governance')) {
      willRun = true;
      state = 'critical';
      retainPrevious = false;
    }

    runFlags[id] = willRun;
    retainFlags[id] = retainPrevious;
    const hydrationFull =
      input.progressiveHydrationFull === true ||
      (!input.mobileOptimizationMode && !input.batterySaver);
    hydrateFlags[id] =
      willRun ||
      (DASHBOARD_LAYER_IDS.includes(id) && hydrationFull && priorityRank <= 12);

    if (!willRun) skipped.push(id);

    schedule.push({
      id,
      state,
      priorityRank,
      computeCost: cost,
      willRun,
      retainPrevious,
      hydrateDashboard: hydrateFlags[id] ?? false,
      detailJa: detail,
    });
  }

  currentPlan = {
    schedule,
    runFlags,
    retainFlags,
    hydrateFlags,
    budgetUsed,
    budgetMax,
    skipped,
    explanations,
  };
  return currentPlan;
}

export function shouldRunOrchestratedLayer(id: OrchestratedLayerId): boolean {
  return currentPlan?.runFlags[id] ?? true;
}

export function shouldRetainOrchestratedLayer(id: OrchestratedLayerId): boolean {
  return currentPlan?.retainFlags[id] ?? false;
}

export function shouldHydrateOrchestrationDashboard(id: OrchestratedLayerId): boolean {
  return currentPlan?.hydrateFlags[id] ?? true;
}

export function getOrchestrationCyclePlan(): LayerPlan | null {
  return currentPlan;
}

export function getOrchestrationUserExplanationsJa(): string {
  return currentPlan?.explanations.join(' · ') ?? '';
}

export function getOrchestrationRefreshLatencyMs(): number {
  if (!cycleStartedAt) return 0;
  return Date.now() - cycleStartedAt;
}

export type RegimeOrchestrationOverride = {
  budgetMax: number;
  panicOnlyLayers: boolean;
  governancePriority: boolean;
};

/** Post-regime handoff — adjusts current cycle plan without bypassing safety */
export function applyRegimeOrchestrationOverrides(override: RegimeOrchestrationOverride): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (!override.panicOnlyLayers && !override.governancePriority) return;
  for (const entry of currentPlan.schedule) {
    const rank = entry.priorityRank;
    if (override.panicOnlyLayers && rank > 5) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'blocked';
      entry.detailJa = 'regime panic override';
    } else if (
      override.governancePriority &&
      rank > 5 &&
      entry.id !== 'governance' &&
      entry.id !== 'stability'
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'governance priority override';
    }
  }
}

export type ConsensusOrchestrationOverride = {
  budgetMax: number;
  hardConflict: boolean;
  panicConsensus: boolean;
  governancePriority: boolean;
};

/** Post-consensus handoff — merges with regime overrides */
export function applyConsensusOrchestrationOverrides(
  override: ConsensusOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  applyRegimeOrchestrationOverrides({
    budgetMax: override.budgetMax,
    panicOnlyLayers: override.panicConsensus,
    governancePriority: override.governancePriority,
  });
  if (!override.hardConflict) return;
  for (const entry of currentPlan.schedule) {
    if (entry.priorityRank > 10 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'consensus hard conflict';
    }
  }
}

export type MetaReliabilityOrchestrationOverride = {
  budgetMax: number;
  trustCritical: boolean;
  trustUnstable: boolean;
  explanationDivergence: boolean;
  longitudinalUnsupported: boolean;
  freezeAdaptive: boolean;
  governancePriorityOnly: boolean;
};

/** Post-meta-reliability handoff — merges with consensus/regime overrides */
export function applyMetaReliabilityOrchestrationOverrides(
  override: MetaReliabilityOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  applyConsensusOrchestrationOverrides({
    budgetMax: override.budgetMax,
    hardConflict: false,
    panicConsensus:
      override.trustCritical ||
      override.longitudinalUnsupported ||
      override.governancePriorityOnly,
    governancePriority: override.governancePriorityOnly,
  });
  if (!override.trustUnstable && !override.explanationDivergence && !override.freezeAdaptive) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    const adaptive =
      entry.id === 'macro' ||
      entry.id === 'arbitration' ||
      entry.id === 'reflection' ||
      entry.id === 'compression';
    if (!adaptive || !entry.willRun) continue;
    if (override.freezeAdaptive || override.longitudinalUnsupported) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'meta longitudinal unsupported — adaptive freeze';
    } else if (override.explanationDivergence && entry.priorityRank > 8) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'stale';
      entry.detailJa = 'meta explanation divergence — retain snapshot';
    } else if (override.trustUnstable && entry.priorityRank > 12) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'meta trust unstable — adaptive suppressed';
    }
  }
}

export type SelfArchitectureOrchestrationReview = {
  budgetMax: number;
  recursiveRisk: boolean;
  mobilePressure: boolean;
  unsupportedStructure: boolean;
  overexpanded: boolean;
  proposalOnly: true;
};

/** Post self-architecture audit — proposal-only orchestration review hints */
export function applySelfArchitectureOrchestrationReview(
  review: SelfArchitectureOrchestrationReview,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, review.budgetMax);
  if (!review.recursiveRisk && !review.mobilePressure && !review.unsupportedStructure && !review.overexpanded) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (review.recursiveRisk && entry.id === 'reflection' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'self-arch recursive risk — reflection freeze proposal';
    } else if (review.mobilePressure && entry.priorityRank > 14 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'self-arch mobile pressure — sleep proposal';
    } else if (
      review.unsupportedStructure &&
      entry.priorityRank > 5 &&
      entry.id !== 'governance' &&
      entry.id !== 'stability' &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'self-arch unsupported — minimal orchestration proposal';
    } else if (review.overexpanded && entry.priorityRank > 11 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'self-arch overexpanded — freeze proposal';
    }
  }
}

export type EpistemicIntegrityOrchestrationOverride = {
  budgetMax: number;
  hallucinationRisk: boolean;
  unsupported: boolean;
  speculative: boolean;
  contradicted: boolean;
  explanationOnly: boolean;
  predictionFreeze: boolean;
};

/** Post epistemic integrity audit — integrity-priority orchestration hints */
export function applyEpistemicIntegrityOrchestrationOverrides(
  override: EpistemicIntegrityOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.hallucinationRisk &&
    !override.unsupported &&
    !override.speculative &&
    !override.contradicted &&
    !override.explanationOnly &&
    !override.predictionFreeze
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.predictionFreeze && (entry.id === 'macro' || entry.id === 'arbitration') && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'epistemic prediction freeze';
    } else if (override.hallucinationRisk && entry.id === 'epistemic' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'epistemic hallucination suppression';
    } else if (
      override.unsupported &&
      entry.priorityRank > 8 &&
      entry.id !== 'governance' &&
      entry.id !== 'stability' &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'epistemic unsupported — explanation-only';
    } else if (override.contradicted && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'epistemic contradicted — revalidate consensus';
    } else if (override.speculative && entry.priorityRank > 12 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'epistemic speculative throttle';
    }
  }
}

export type StrategicMemoryGraphOrchestrationOverride = {
  budgetMax: number;
  causalUncertain: boolean;
  contradicted: boolean;
  overconnected: boolean;
  temporallyDrifting: boolean;
  causalFreeze: boolean;
  edgePruning: boolean;
};

/** Post strategic memory graph audit — causality-priority orchestration hints */
export function applyStrategicMemoryGraphOrchestrationOverrides(
  override: StrategicMemoryGraphOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.causalUncertain &&
    !override.contradicted &&
    !override.overconnected &&
    !override.temporallyDrifting &&
    !override.causalFreeze &&
    !override.edgePruning
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.causalFreeze && (entry.id === 'reflection' || entry.id === 'epistemic') && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'causal graph freeze — hypothesis-only';
    } else if (override.contradicted && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'graph contradicted — consensus rebuild';
    } else if (
      override.edgePruning &&
      (entry.id === 'reflection' || entry.id === 'compression') &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'graph overconnected — recursive edge suppression';
    } else if (override.temporallyDrifting && entry.id === 'temporal' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'graph temporally drifting — timeline reconstruction';
    } else if (
      override.causalUncertain &&
      entry.priorityRank > 9 &&
      entry.id !== 'governance' &&
      entry.id !== 'stability' &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'graph causality uncertain — causal downgrade';
    }
  }
}

export type CognitiveResourceEconomyOrchestrationOverride = {
  budgetMax: number;
  overloaded: boolean;
  recursivePressure: boolean;
  wasteful: boolean;
  fragmented: boolean;
  stressed: boolean;
  deepReflectionFreeze: boolean;
  recursiveThrottle: boolean;
  speculativeFreeze: boolean;
  mobileHardClamp: boolean;
  attentionNarrowing: boolean;
};

/** Post cognitive resource economy audit — attention/compute budget orchestration hints */
export function applyCognitiveResourceEconomyOrchestrationOverrides(
  override: CognitiveResourceEconomyOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.overloaded &&
    !override.recursivePressure &&
    !override.wasteful &&
    !override.fragmented &&
    !override.stressed &&
    !override.deepReflectionFreeze &&
    !override.recursiveThrottle &&
    !override.speculativeFreeze &&
    !override.mobileHardClamp &&
    !override.attentionNarrowing
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.deepReflectionFreeze && entry.id === 'reflection' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'resource overloaded — deep reflection freeze';
    } else if (override.recursiveThrottle && entry.id === 'reflection' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'resource recursive pressure — recursive suppression';
    } else if (
      override.speculativeFreeze &&
      (entry.id === 'macro' || entry.id === 'epistemic') &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'resource wasteful — speculative compute freeze';
    } else if (
      override.fragmented &&
      entry.priorityRank > 11 &&
      entry.id !== 'governance' &&
      entry.id !== 'stability' &&
      entry.willRun
    ) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'resource fragmented — priority rebuild';
    } else if (override.attentionNarrowing && entry.priorityRank > 13 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'resource stressed — attention narrowing';
    } else if (override.mobileHardClamp && entry.priorityRank > 10 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'mobile hard clamp — lightweight orchestration';
    }
  }
}

export type UnifiedCognitiveStateOrchestrationOverride = {
  budgetMax: number;
  strained: boolean;
  fragmented: boolean;
  uncertain: boolean;
  recursiveRisk: boolean;
  emergency: boolean;
  deepReasoningFreeze: boolean;
  recursiveSuppression: boolean;
  explanationOnly: boolean;
  predictionThrottle: boolean;
  coherenceRebuild: boolean;
  reduceDepth: boolean;
};

/** Post unified cognitive state audit — executive coherence orchestration hints */
export function applyUnifiedCognitiveStateOrchestrationOverrides(
  override: UnifiedCognitiveStateOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.strained &&
    !override.fragmented &&
    !override.uncertain &&
    !override.recursiveRisk &&
    !override.emergency &&
    !override.deepReasoningFreeze &&
    !override.recursiveSuppression &&
    !override.explanationOnly &&
    !override.predictionThrottle &&
    !override.coherenceRebuild &&
    !override.reduceDepth
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.emergency && entry.priorityRank > 4 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'executive emergency — explanation-only';
    } else if (override.deepReasoningFreeze && entry.id === 'reflection' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'executive — deep reasoning freeze';
    } else if (override.recursiveSuppression && entry.id === 'reflection' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'executive — recursive shutdown';
    } else if (override.predictionThrottle && (entry.id === 'macro' || entry.id === 'arbitration') && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'executive — prediction throttle';
    } else if (override.coherenceRebuild && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'executive — coherence rebuild';
    } else if (override.reduceDepth && entry.priorityRank > 12 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'executive — reduce reasoning depth';
    }
  }
}

export type HumanIntentContinuityOrchestrationOverride = {
  budgetMax: number;
  drifting: boolean;
  fragmented: boolean;
  reinterpreting: boolean;
  uncertain: boolean;
  unsupported: boolean;
  instructionReinforcement: boolean;
  contextRebuild: boolean;
  reinterpretationSuppression: boolean;
  clarificationDowngrade: boolean;
  semanticFreeze: boolean;
  explanationOnly: boolean;
  orchestrationDeviationClamp: boolean;
};

/** Post human intent continuity audit — alignment preservation orchestration hints */
export function applyHumanIntentContinuityOrchestrationOverrides(
  override: HumanIntentContinuityOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.drifting &&
    !override.fragmented &&
    !override.reinterpreting &&
    !override.uncertain &&
    !override.unsupported &&
    !override.instructionReinforcement &&
    !override.contextRebuild &&
    !override.reinterpretationSuppression &&
    !override.clarificationDowngrade &&
    !override.semanticFreeze &&
    !override.explanationOnly &&
    !override.orchestrationDeviationClamp
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.explanationOnly && entry.priorityRank > 5 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — explanation-only fallback';
    } else if (override.semanticFreeze && entry.id === 'semantic' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — semantic freeze';
    } else if (override.reinterpretationSuppression && (entry.id === 'semantic' || entry.id === 'arbitration') && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — reinterpretation suppression';
    } else if (override.contextRebuild && entry.id === 'temporal' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — context rebuild';
    } else if (override.clarificationDowngrade && (entry.id === 'macro' || entry.id === 'arbitration') && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — clarification downgrade';
    } else if (override.instructionReinforcement && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'intent — instruction reinforcement';
    } else if (override.orchestrationDeviationClamp && entry.priorityRank > 11 && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'sleeping';
      entry.detailJa = 'intent — orchestration deviation clamp';
    }
  }
}

export type AdaptiveExplorationOrchestrationOverride = {
  budgetMax: number;
  rigid: boolean;
  stagnant: boolean;
  overclamped: boolean;
  uncertain: boolean;
  unsupported: boolean;
  perspectiveWidening: boolean;
  safeAlternativeGeneration: boolean;
  clampRelaxationSuggestion: boolean;
  uncertaintyAcknowledgment: boolean;
  explanationOnly: boolean;
  fallbackFreeze: boolean;
};

/** Post adaptive exploration audit — anti-dogma orchestration hints (no strategy mutation) */
export function applyAdaptiveExplorationOrchestrationOverrides(
  override: AdaptiveExplorationOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.rigid &&
    !override.stagnant &&
    !override.overclamped &&
    !override.uncertain &&
    !override.unsupported &&
    !override.perspectiveWidening &&
    !override.safeAlternativeGeneration &&
    !override.clampRelaxationSuggestion &&
    !override.uncertaintyAcknowledgment &&
    !override.explanationOnly &&
    !override.fallbackFreeze
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.fallbackFreeze && entry.priorityRank > 6 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'exploration — fallback freeze';
    } else if (override.clampRelaxationSuggestion && entry.priorityRank > 13 && !entry.willRun && entry.retainPrevious) {
      currentPlan.runFlags[entry.id] = true;
      currentPlan.retainFlags[entry.id] = false;
      entry.willRun = true;
      entry.retainPrevious = false;
      entry.state = 'active';
      entry.detailJa = 'exploration — clamp relaxation hint';
    } else if (override.perspectiveWidening && entry.id === 'macro' && !entry.willRun && entry.retainPrevious) {
      currentPlan.runFlags[entry.id] = true;
      entry.willRun = true;
      entry.retainPrevious = false;
      entry.state = 'active';
      entry.detailJa = 'exploration — perspective widening';
    } else if (override.safeAlternativeGeneration && entry.id === 'arbitration' && !entry.willRun && entry.retainPrevious) {
      currentPlan.runFlags[entry.id] = true;
      entry.willRun = true;
      entry.retainPrevious = false;
      entry.state = 'active';
      entry.detailJa = 'exploration — safe alternative only';
    } else if (override.uncertaintyAcknowledgment && entry.id === 'macro' && entry.willRun) {
      entry.detailJa = 'exploration — uncertainty-first mode';
    } else if (override.explanationOnly && entry.priorityRank > 8 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'exploration — explanation-only';
    }
  }
}

export type ConstitutionalGovernanceOrchestrationOverride = {
  budgetMax: number;
  conflict: boolean;
  collision: boolean;
  fragmented: boolean;
  emergency: boolean;
  unsupported: boolean;
  precedenceArbitration: boolean;
  overrideFreeze: boolean;
  hierarchyRebuild: boolean;
  explanationOnly: boolean;
  fallbackFreeze: boolean;
};

/** Post constitutional governance audit — supreme orchestration coherence (no layer bypass) */
export function applyConstitutionalGovernanceOrchestrationOverrides(
  override: ConstitutionalGovernanceOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.conflict &&
    !override.collision &&
    !override.fragmented &&
    !override.emergency &&
    !override.unsupported &&
    !override.precedenceArbitration &&
    !override.overrideFreeze &&
    !override.hierarchyRebuild &&
    !override.explanationOnly &&
    !override.fallbackFreeze
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.fallbackFreeze && entry.priorityRank > 5 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — fallback freeze';
    } else if (override.overrideFreeze && entry.priorityRank > 7 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — override freeze';
    } else if (override.emergency && entry.priorityRank > 4 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — emergency lockdown';
    } else if (override.precedenceArbitration && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — precedence arbitration';
    } else if (override.hierarchyRebuild && entry.id === 'arbitration' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — hierarchy rebuild';
    } else if (override.explanationOnly && entry.priorityRank > 8 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'constitutional — explanation-only';
    }
  }
}

export type ExplainableGovernanceOrchestrationOverride = {
  budgetMax: number;
  partial: boolean;
  opaque: boolean;
  risk: boolean;
  unsupported: boolean;
  contradicted: boolean;
  safeSimplification: boolean;
  fallbackExplanation: boolean;
  explanationSuppression: boolean;
  consistencyRebuild: boolean;
  explanationOnly: boolean;
};

/** Post explainable governance audit — safe rationale orchestration (no raw CoT) */
export function applyExplainableGovernanceOrchestrationOverrides(
  override: ExplainableGovernanceOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.partial &&
    !override.opaque &&
    !override.risk &&
    !override.unsupported &&
    !override.contradicted &&
    !override.safeSimplification &&
    !override.fallbackExplanation &&
    !override.explanationSuppression &&
    !override.consistencyRebuild &&
    !override.explanationOnly
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.explanationOnly && entry.priorityRank > 6 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'explainable — fallback explanation only';
    } else if (override.explanationSuppression && entry.priorityRank > 9 && entry.id !== 'governance' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'explainable — summary suppression';
    } else if (override.consistencyRebuild && entry.id === 'semantic' && entry.willRun) {
      entry.detailJa = 'explainable — consistency repair';
    } else if (override.fallbackExplanation && entry.priorityRank > 11 && entry.willRun) {
      entry.detailJa = 'explainable — minimal governance summary';
    } else if (override.safeSimplification && entry.priorityRank > 12 && entry.willRun) {
      entry.detailJa = 'explainable — safe simplification';
    }
  }
}

export type RuntimeSurvivalOrchestrationOverride = {
  budgetMax: number;
  stressed: boolean;
  degraded: boolean;
  fragmented: boolean;
  offline: boolean;
  critical: boolean;
  survivalMode: boolean;
  lightweightMode: boolean;
  deepOrchestrationSuppression: boolean;
  runtimeRebuild: boolean;
  offlineFallback: boolean;
  websocketPause: boolean;
  cacheFirst: boolean;
  dashboardLowRefresh: boolean;
  speculativeStop: boolean;
  deepReflectionStop: boolean;
};

/** Post runtime survival audit — mobile survivability orchestration (no stealth background) */
export function applyRuntimeSurvivalOrchestrationOverrides(
  override: RuntimeSurvivalOrchestrationOverride,
): void {
  if (!currentPlan) return;
  currentPlan.budgetMax = Math.min(currentPlan.budgetMax, override.budgetMax);
  if (
    !override.stressed &&
    !override.degraded &&
    !override.fragmented &&
    !override.offline &&
    !override.critical &&
    !override.survivalMode &&
    !override.lightweightMode &&
    !override.deepOrchestrationSuppression &&
    !override.runtimeRebuild &&
    !override.offlineFallback &&
    !override.websocketPause &&
    !override.cacheFirst &&
    !override.dashboardLowRefresh &&
    !override.speculativeStop &&
    !override.deepReflectionStop
  ) {
    return;
  }
  for (const entry of currentPlan.schedule) {
    if (override.survivalMode || override.critical) {
      if (entry.priorityRank > 4 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
        currentPlan.runFlags[entry.id] = false;
        currentPlan.retainFlags[entry.id] = true;
        entry.willRun = false;
        entry.retainPrevious = true;
        entry.state = 'deferred';
        entry.detailJa = 'runtime — survival mode minimal';
      }
    } else if (override.deepOrchestrationSuppression && entry.priorityRank > 8 && entry.id !== 'governance' && entry.id !== 'stability' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'runtime — deep orchestration suppressed';
    } else if (override.offlineFallback && entry.priorityRank > 6 && entry.id !== 'governance' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      currentPlan.retainFlags[entry.id] = true;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'runtime — offline cache-first';
    } else if (override.websocketPause && entry.id === 'macro' && entry.willRun) {
      currentPlan.runFlags[entry.id] = false;
      entry.willRun = false;
      entry.retainPrevious = true;
      entry.state = 'deferred';
      entry.detailJa = 'runtime — websocket pause';
    } else if (override.runtimeRebuild && entry.id === 'orchestration' && entry.willRun) {
      entry.detailJa = 'runtime — rebuild suggestion';
    } else if (override.lightweightMode && entry.priorityRank > 12 && entry.willRun) {
      entry.detailJa = 'runtime — lightweight mode';
    } else if (override.cacheFirst && !entry.retainPrevious && entry.priorityRank > 10) {
      entry.retainPrevious = true;
      entry.detailJa = 'runtime — cache-first retain';
    }
  }
}
