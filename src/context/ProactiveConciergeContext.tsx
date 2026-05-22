import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getActivePortfolio } from '../services/portfolioPriceUpdate';
import { useApp } from './AppContext';
import { useCentralIntelligence } from '../hooks/useCentralIntelligence';
import { useUrgencySignals } from './UrgencySignalContext';
import { useAppResume } from '../hooks/useAppForeground';
import {
  evaluateProactiveAdvice,
  buildProactiveFingerprint,
} from '../services/advisor-engine';
import {
  enqueueProactiveCandidates,
  sortProactiveForDisplay,
  updateProactiveStatus,
} from '../services/proactiveSuggestionQueue';
import {
  loadProactiveSuggestionsState,
  saveProactiveSuggestionsState,
} from '../services/proactiveSuggestionStorage';
import { buildProactiveResumeSummaryJa } from '../services/proactiveResumeSummary';
import { deliverProactiveLocalPush } from '../services/proactiveNotificationDelivery';
import { speakVoiceOutput } from '../services/aiVoiceOutputService';
import { areNotificationsSupported } from '../utils/runtimeEnvironment';
import { getMockAiTradeQueue } from '../data/mockAiStrategyBriefing';
import {
  recordProactiveAdvisorEvent,
  statusToAdvisorEventKind,
} from '../services/proactiveAdvisorHistory';
import type {
  ProactiveSuggestion,
  ProactiveStateFingerprint,
  ProactiveSuggestionStatus,
} from '../types/proactiveSuggestion';
import { countUnhandledProactive } from '../types/proactiveSuggestion';
import { emitChatAuditNotice } from '../services/chatMessageFactory';
import type { AutonomousMonitoringBundle } from '../types/autonomousMonitoring';
import type { BuildMetaDecisionInput, MetaDecisionBundle } from '../types/metaDecision';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { RealityValidationBundle } from '../types/portfolioRealityValidation';
import type { ExecutionDashboardBundle } from '../types/paperBroker';
import type { SelfEvaluationBundle } from '../types/selfEvaluation';
import type { MacroIntelligenceBundle } from '../types/macroIntelligence';
import type { DataReliabilityBundle } from '../types/dataReliability';
import type { PortfolioRiskExposureBundle } from '../types/portfolioRiskExposure';
import type { CapitalAllocationBundle } from '../types/capitalAllocation';
import type { SystemStabilityIntegrityBundle } from '../types/systemStabilityIntegrity';
import type { AiGovernanceDecisionBundle } from '../types/aiGovernanceDecision';
import type { ReactiveEventOrchestrationBundle } from '../types/reactiveEventOrchestration';
import type { ExplainableCognitiveTraceBundle } from '../types/explainableCognitiveTrace';
import type { AdaptiveResourceComputeBudgetBundle } from '../types/adaptiveResourceComputeBudget';
import type { StateIntegrityTemporalConsistencyBundle } from '../types/stateIntegrityTemporalConsistency';
import type { SemanticConsistencyDecisionCoherenceBundle } from '../types/semanticConsistencyDecisionCoherence';
import type { EpistemicReliabilityEvidenceWeightBundle } from '../types/epistemicReliabilityEvidenceWeight';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from '../types/cognitiveGoalArbitrationIntentPriority';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from '../types/metaCognitiveRiskReflectionSelfCritique';
import type { RecursiveMemoryCompressionStrategicAbstractionBundle } from '../types/recursiveMemoryCompressionStrategicAbstraction';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../types/systemicStabilityRecursiveGovernance';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from '../types/executionRecoveryAdaptiveConfidence';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { AutonomousMarketRegimeDetectionBundle } from '../types/autonomousMarketRegimeDetection';
import type { CognitiveArbitrationConsensusBundle } from '../types/cognitiveArbitrationConsensus';
import type { MetaReliabilityLongitudinalTrustBundle } from '../types/metaReliabilityLongitudinalTrust';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from '../types/selfEvolvingArchitectureReflectiveRefactor';
import type { EpistemicIntegrityTruthCalibrationBundle } from '../types/epistemicIntegrityTruthCalibration';
import type { StrategicMemoryGraphTemporalCausalityBundle } from '../types/strategicMemoryGraphTemporalCausality';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from '../types/cognitiveResourceEconomyAttentionAllocation';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from '../types/unifiedCognitiveStateExecutiveAwareness';
import type { HumanIntentContinuityAlignmentPreservationBundle } from '../types/humanIntentContinuityAlignmentPreservation';
import type { AdaptiveExplorationAntiDogmaBundle } from '../types/adaptiveExplorationAntiDogma';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from '../types/constitutionalGovernanceSystemCoherence';
import type { ExplainableGovernanceTransparentReasoningBundle } from '../types/explainableGovernanceTransparentReasoning';
import type { RuntimeSurvivalMobileResilienceBundle } from '../types/runtimeSurvivalMobileResilience';
import type { LayerRuntimeSchedulePlan, ResolveLayerRuntimeScheduleInput } from '../types/layerRuntimeScheduler';
import type { CrossLayerCascadeEvaluation } from '../types/crossLayerCascade';
import type { AsyncRuntimeEvaluation } from '../types/asyncRuntimeCoordinator';
import type {
  RuntimeTelemetryDashboardBundle,
  RuntimeTelemetryEvaluation,
} from '../types/runtimeTelemetry';
import type { RuntimeOrchestratorEvaluation } from '../types/runtimeOrchestrator';
import type { OrchestratedLayerId } from '../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { LayerRecomputeId } from '../types/reactiveEventOrchestration';
import { isAppForeground, shouldPauseApiRequests } from '../services/performanceCostRuntime';
import {
  resolveLayerRuntimeSchedule,
  resolveDeepLayerActivation,
} from '../services/layerRuntimeScheduler';
import { noteProactiveRefreshForMetrics } from '../services/mobileRuntimeMetrics';
import {
  evaluateCrossLayerCascade,
  mergeCascadeIntoLayerPlan,
  noteCascadeConfidenceRecalibration,
  noteCascadeContradictionRepair,
  noteCascadeFreezeRecovery,
  noteCascadeOrchestrationRebuild,
  shouldSkipDeepLayerForCascade,
} from '../services/crossLayerCascadeEngine';
import { resolveTriggerBudgetDecision } from '../services/crossLayerTriggerBudget';
import { markSessionStart } from '../services/longSessionStability';
import { noteThermalPressureForRunaway } from '../services/mobileRedmiRuntime';
import {
  cooperativeYield,
  buildAsyncMetricsProbe,
  evaluateAsyncRuntime,
  runCoordinatedTask,
  shouldDeferAsyncWork,
} from '../services/asyncRuntimeCoordinator';
import { isOrchestrationPausedForHydration } from '../services/hydrationCollisionGuard';
import { getSessionMinutes } from '../services/longSessionStability';

type ProactiveConciergeContextValue = {
  suggestions: ProactiveSuggestion[];
  autonomousBundle: AutonomousMonitoringBundle | null;
  metaBundle: MetaDecisionBundle | null;
  strategyBundle: StrategyExecutionBundle | null;
  realityBundle: RealityValidationBundle | null;
  executionBundle: ExecutionDashboardBundle | null;
  selfEvaluationBundle: SelfEvaluationBundle | null;
  macroIntelligenceBundle: MacroIntelligenceBundle | null;
  dataReliabilityBundle: DataReliabilityBundle | null;
  portfolioRiskExposureBundle: PortfolioRiskExposureBundle | null;
  capitalAllocationBundle: CapitalAllocationBundle | null;
  systemStabilityIntegrityBundle: SystemStabilityIntegrityBundle | null;
  aiGovernanceDecisionBundle: AiGovernanceDecisionBundle | null;
  reactiveEventOrchestrationBundle: ReactiveEventOrchestrationBundle | null;
  explainableCognitiveTraceBundle: ExplainableCognitiveTraceBundle | null;
  adaptiveResourceComputeBudgetBundle: AdaptiveResourceComputeBudgetBundle | null;
  stateIntegrityTemporalConsistencyBundle: StateIntegrityTemporalConsistencyBundle | null;
  semanticConsistencyDecisionCoherenceBundle: SemanticConsistencyDecisionCoherenceBundle | null;
  epistemicReliabilityEvidenceWeightBundle: EpistemicReliabilityEvidenceWeightBundle | null;
  cognitiveGoalArbitrationIntentPriorityBundle: CognitiveGoalArbitrationIntentPriorityBundle | null;
  metaCognitiveRiskReflectionSelfCritiqueBundle: MetaCognitiveRiskReflectionSelfCritiqueBundle | null;
  recursiveMemoryCompressionStrategicAbstractionBundle: RecursiveMemoryCompressionStrategicAbstractionBundle | null;
  systemicStabilityRecursiveGovernanceBundle: SystemicStabilityRecursiveGovernanceBundle | null;
  executionRecoveryAdaptiveConfidenceBundle: ExecutionRecoveryAdaptiveConfidenceBundle | null;
  dynamicLayerOrchestrationMobileRuntimeOptimizationBundle: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null;
  autonomousMarketRegimeDetectionBundle: AutonomousMarketRegimeDetectionBundle | null;
  cognitiveArbitrationConsensusBundle: CognitiveArbitrationConsensusBundle | null;
  metaReliabilityLongitudinalTrustBundle: MetaReliabilityLongitudinalTrustBundle | null;
  selfEvolvingArchitectureReflectiveRefactorBundle: SelfEvolvingArchitectureReflectiveRefactorBundle | null;
  epistemicIntegrityTruthCalibrationBundle: EpistemicIntegrityTruthCalibrationBundle | null;
  strategicMemoryGraphTemporalCausalityBundle: StrategicMemoryGraphTemporalCausalityBundle | null;
  cognitiveResourceEconomyAttentionAllocationBundle: CognitiveResourceEconomyAttentionAllocationBundle | null;
  unifiedCognitiveStateExecutiveAwarenessBundle: UnifiedCognitiveStateExecutiveAwarenessBundle | null;
  humanIntentContinuityAlignmentPreservationBundle: HumanIntentContinuityAlignmentPreservationBundle | null;
  adaptiveExplorationAntiDogmaBundle: AdaptiveExplorationAntiDogmaBundle | null;
  constitutionalGovernanceSystemCoherenceBundle: ConstitutionalGovernanceSystemCoherenceBundle | null;
  explainableGovernanceTransparentReasoningBundle: ExplainableGovernanceTransparentReasoningBundle | null;
  runtimeSurvivalMobileResilienceBundle: RuntimeSurvivalMobileResilienceBundle | null;
  layerRuntimeSchedulePlan: LayerRuntimeSchedulePlan | null;
  crossLayerCascadeEvaluation: CrossLayerCascadeEvaluation | null;
  asyncRuntimeEvaluation: AsyncRuntimeEvaluation | null;
  runtimeTelemetryEvaluation: RuntimeTelemetryEvaluation | null;
  runtimeTelemetryDashboardBundle: RuntimeTelemetryDashboardBundle | null;
  runtimeOrchestratorEvaluation: RuntimeOrchestratorEvaluation | null;
  unreadCount: number;
  resumeSummaryJa: string | null;
  showResumeBanner: boolean;
  dismissResumeBanner: () => void;
  refreshProactive: () => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  seeLater: (id: string) => Promise<void>;
  openDetail: (id: string) => Promise<void>;
  voiceResumePromptVisible: boolean;
  acceptVoiceResume: () => void;
  dismissVoiceResume: () => void;
};

const ProactiveConciergeContext = createContext<ProactiveConciergeContextValue | null>(null);

export function ProactiveConciergeProvider({ children }: { children: ReactNode }) {
  const { state, priceSync, aiPreferences, marketRegime } = useApp();
  const { worldModel } = useCentralIntelligence();
  const { allSignals } = useUrgencySignals();
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [suppressUntil, setSuppressUntil] = useState<Record<string, number>>({});
  const [fingerprint, setFingerprint] = useState<ProactiveStateFingerprint | null>(null);
  const [resumeSummaryJa, setResumeSummaryJa] = useState<string | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [voiceResumePromptVisible, setVoiceResumePromptVisible] = useState(false);
  const [autonomousBundle, setAutonomousBundle] = useState<AutonomousMonitoringBundle | null>(
    null,
  );
  const [metaBundle, setMetaBundle] = useState<MetaDecisionBundle | null>(null);
  const [strategyBundle, setStrategyBundle] = useState<StrategyExecutionBundle | null>(null);
  const [realityBundle, setRealityBundle] = useState<RealityValidationBundle | null>(null);
  const [executionBundle, setExecutionBundle] = useState<ExecutionDashboardBundle | null>(null);
  const [selfEvaluationBundle, setSelfEvaluationBundle] = useState<SelfEvaluationBundle | null>(
    null,
  );
  const [macroIntelligenceBundle, setMacroIntelligenceBundle] =
    useState<MacroIntelligenceBundle | null>(null);
  const [dataReliabilityBundle, setDataReliabilityBundle] = useState<DataReliabilityBundle | null>(
    null,
  );
  const [portfolioRiskExposureBundle, setPortfolioRiskExposureBundle] =
    useState<PortfolioRiskExposureBundle | null>(null);
  const [capitalAllocationBundle, setCapitalAllocationBundle] =
    useState<CapitalAllocationBundle | null>(null);
  const [systemStabilityIntegrityBundle, setSystemStabilityIntegrityBundle] =
    useState<SystemStabilityIntegrityBundle | null>(null);
  const [aiGovernanceDecisionBundle, setAiGovernanceDecisionBundle] =
    useState<AiGovernanceDecisionBundle | null>(null);
  const [reactiveEventOrchestrationBundle, setReactiveEventOrchestrationBundle] =
    useState<ReactiveEventOrchestrationBundle | null>(null);
  const [explainableCognitiveTraceBundle, setExplainableCognitiveTraceBundle] =
    useState<ExplainableCognitiveTraceBundle | null>(null);
  const [adaptiveResourceComputeBudgetBundle, setAdaptiveResourceComputeBudgetBundle] =
    useState<AdaptiveResourceComputeBudgetBundle | null>(null);
  const [stateIntegrityTemporalConsistencyBundle, setStateIntegrityTemporalConsistencyBundle] =
    useState<StateIntegrityTemporalConsistencyBundle | null>(null);
  const [semanticConsistencyDecisionCoherenceBundle, setSemanticConsistencyDecisionCoherenceBundle] =
    useState<SemanticConsistencyDecisionCoherenceBundle | null>(null);
  const [epistemicReliabilityEvidenceWeightBundle, setEpistemicReliabilityEvidenceWeightBundle] =
    useState<EpistemicReliabilityEvidenceWeightBundle | null>(null);
  const [cognitiveGoalArbitrationIntentPriorityBundle, setCognitiveGoalArbitrationIntentPriorityBundle] =
    useState<CognitiveGoalArbitrationIntentPriorityBundle | null>(null);
  const [metaCognitiveRiskReflectionSelfCritiqueBundle, setMetaCognitiveRiskReflectionSelfCritiqueBundle] =
    useState<MetaCognitiveRiskReflectionSelfCritiqueBundle | null>(null);
  const [
    recursiveMemoryCompressionStrategicAbstractionBundle,
    setRecursiveMemoryCompressionStrategicAbstractionBundle,
  ] = useState<RecursiveMemoryCompressionStrategicAbstractionBundle | null>(null);
  const [
    systemicStabilityRecursiveGovernanceBundle,
    setSystemicStabilityRecursiveGovernanceBundle,
  ] = useState<SystemicStabilityRecursiveGovernanceBundle | null>(null);
  const [
    executionRecoveryAdaptiveConfidenceBundle,
    setExecutionRecoveryAdaptiveConfidenceBundle,
  ] = useState<ExecutionRecoveryAdaptiveConfidenceBundle | null>(null);
  const [
    dynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
    setDynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
  ] = useState<DynamicLayerOrchestrationMobileRuntimeOptimizationBundle | null>(null);
  const [
    autonomousMarketRegimeDetectionBundle,
    setAutonomousMarketRegimeDetectionBundle,
  ] = useState<AutonomousMarketRegimeDetectionBundle | null>(null);
  const [
    cognitiveArbitrationConsensusBundle,
    setCognitiveArbitrationConsensusBundle,
  ] = useState<CognitiveArbitrationConsensusBundle | null>(null);
  const [
    metaReliabilityLongitudinalTrustBundle,
    setMetaReliabilityLongitudinalTrustBundle,
  ] = useState<MetaReliabilityLongitudinalTrustBundle | null>(null);
  const [
    selfEvolvingArchitectureReflectiveRefactorBundle,
    setSelfEvolvingArchitectureReflectiveRefactorBundle,
  ] = useState<SelfEvolvingArchitectureReflectiveRefactorBundle | null>(null);
  const [
    epistemicIntegrityTruthCalibrationBundle,
    setEpistemicIntegrityTruthCalibrationBundle,
  ] = useState<EpistemicIntegrityTruthCalibrationBundle | null>(null);
  const [
    strategicMemoryGraphTemporalCausalityBundle,
    setStrategicMemoryGraphTemporalCausalityBundle,
  ] = useState<StrategicMemoryGraphTemporalCausalityBundle | null>(null);
  const [
    cognitiveResourceEconomyAttentionAllocationBundle,
    setCognitiveResourceEconomyAttentionAllocationBundle,
  ] = useState<CognitiveResourceEconomyAttentionAllocationBundle | null>(null);
  const [
    unifiedCognitiveStateExecutiveAwarenessBundle,
    setUnifiedCognitiveStateExecutiveAwarenessBundle,
  ] = useState<UnifiedCognitiveStateExecutiveAwarenessBundle | null>(null);
  const [
    humanIntentContinuityAlignmentPreservationBundle,
    setHumanIntentContinuityAlignmentPreservationBundle,
  ] = useState<HumanIntentContinuityAlignmentPreservationBundle | null>(null);
  const [adaptiveExplorationAntiDogmaBundle, setAdaptiveExplorationAntiDogmaBundle] =
    useState<AdaptiveExplorationAntiDogmaBundle | null>(null);
  const [
    constitutionalGovernanceSystemCoherenceBundle,
    setConstitutionalGovernanceSystemCoherenceBundle,
  ] = useState<ConstitutionalGovernanceSystemCoherenceBundle | null>(null);
  const [
    explainableGovernanceTransparentReasoningBundle,
    setExplainableGovernanceTransparentReasoningBundle,
  ] = useState<ExplainableGovernanceTransparentReasoningBundle | null>(null);
  const [runtimeSurvivalMobileResilienceBundle, setRuntimeSurvivalMobileResilienceBundle] =
    useState<RuntimeSurvivalMobileResilienceBundle | null>(null);
  const [layerRuntimeSchedulePlan, setLayerRuntimeSchedulePlan] =
    useState<LayerRuntimeSchedulePlan | null>(null);
  const [crossLayerCascadeEvaluation, setCrossLayerCascadeEvaluation] =
    useState<CrossLayerCascadeEvaluation | null>(null);
  const [asyncRuntimeEvaluation, setAsyncRuntimeEvaluation] =
    useState<AsyncRuntimeEvaluation | null>(null);
  const [runtimeTelemetryEvaluation, setRuntimeTelemetryEvaluation] =
    useState<RuntimeTelemetryEvaluation | null>(null);
  const [runtimeTelemetryDashboardBundle, setRuntimeTelemetryDashboardBundle] =
    useState<RuntimeTelemetryDashboardBundle | null>(null);
  const [runtimeOrchestratorEvaluation, setRuntimeOrchestratorEvaluation] =
    useState<RuntimeOrchestratorEvaluation | null>(null);
  const loadedRef = useRef(false);
  const lastDuplicateRefreshBlockedRef = useRef(false);
  const lastPushRef = useRef<Record<string, number>>({});
  const suggestionsRef = useRef<ProactiveSuggestion[]>([]);
  const suppressRef = useRef<Record<string, number>>({});
  const fingerprintRef = useRef<ProactiveStateFingerprint | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  suggestionsRef.current = suggestions;
  suppressRef.current = suppressUntil;
  fingerprintRef.current = fingerprint;

  const persist = useCallback(
    async (
      nextSuggestions: ProactiveSuggestion[],
      nextSuppress: Record<string, number>,
      fp: ProactiveStateFingerprint | null,
    ) => {
      await saveProactiveSuggestionsState({
        version: 1,
        suggestions: nextSuggestions,
        suppressUntil: nextSuppress,
        fingerprint: fp,
        unreadCount: countUnhandledProactive(nextSuggestions),
      });
    },
    [],
  );

  useEffect(() => {
    void loadProactiveSuggestionsState().then((stored) => {
      loadedRef.current = true;
      setSuggestions(stored.suggestions);
      setSuppressUntil(stored.suppressUntil);
      setFingerprint(stored.fingerprint);
      const summary = buildProactiveResumeSummaryJa(stored.suggestions);
      if (summary) {
        setResumeSummaryJa(summary);
        setShowResumeBanner(true);
      }
    });
  }, []);

  const refreshProactiveRef = useRef<() => Promise<void>>(async () => {});
  const refreshProactiveCoreRef = useRef<() => Promise<void>>(async () => {});

  const refreshProactiveCore = useCallback(async () => {
    const { shouldPauseConciergeAi, noteProactiveRefresh, buildSnapshot } = await import(
      '../services/productionStability/productionStabilityRuntime'
    );
    const { acquireRenderBudget, releaseRenderBudget } = await import(
      '../services/productionStability/renderBudget'
    );
    const { nextAsyncGeneration, isStaleAsyncGeneration } = await import(
      '../services/productionStability/asyncRaceGuard'
    );
    if (shouldPauseConciergeAi()) return;
    const { shouldOrchestratorBlockBackgroundRefresh, getLastRuntimeOrchestratorSnapshot } =
      await import('../runtime/orchestrator/runtimeOrchestratorIntegration');
    if (shouldOrchestratorBlockBackgroundRefresh() && !isAppForeground()) return;
    void getLastRuntimeOrchestratorSnapshot;
    if (shouldDeferAsyncWork('orchestration')) return;
    if (!acquireRenderBudget()) return;
    if (isOrchestrationPausedForHydration()) {
      releaseRenderBudget();
      return;
    }
    noteProactiveRefresh();
    const refreshGen = nextAsyncGeneration('proactive-refresh');
    const {
      shouldRecomputeLayer: reactiveLayerOn,
      noteOrchestratorRerender,
      setOrchestrationRuntimeContext,
    } = await import('../services/reactiveEventOrchestrationRuntime');
    const {
      startResourceComputeCycle,
      buildResourceScheduleContext,
      shouldRecomputeLayerWithBudget,
    } = await import('../services/adaptiveResourceComputeBudgetIntegration');
    const { setResourceVisibilityPaused } = await import(
      '../services/adaptiveResourceComputeBudgetRuntime'
    );
    const { getPerformanceCostSnapshot } = await import('../services/performanceCostRuntime');
    const { getRenderBudgetInFlight, getRenderBudgetBlockedCount } = await import(
      '../services/productionStability/renderBudget'
    );
    startResourceComputeCycle();
    const perfSnap = getPerformanceCostSnapshot();
    const queueSize = suggestionsRef.current.length;
    const resourceScheduleCtx = buildResourceScheduleContext(null, {
      batterySaver: aiPreferences.batterySaverEnabled,
      appForeground: isAppForeground(),
      memoryPressure: queueSize > 60,
      offlineMode: perfSnap.offlineMode,
      proactiveQueueSize: queueSize,
      emergencyComputeCut: queueSize > 80 || (!isAppForeground() && queueSize > 50),
      aiSleepMode: aiPreferences.batterySaverEnabled || !isAppForeground(),
    });
    setResourceVisibilityPaused(!isAppForeground());
    const refreshStartedAt = Date.now();
    const { loadMarketRegimeState } = await import(
      '../services/autonomousMarketRegimeDetectionStorage'
    );
    const cachedRegime = await loadMarketRegimeState();
    const regimePanicCached =
      cachedRegime.lastRegime === 'PANIC' || cachedRegime.lastRegime === 'UNSUPPORTED_ENVIRONMENT';
    const { loadCognitiveArbitrationState } = await import(
      '../services/cognitiveArbitrationConsensusStorage'
    );
    const cachedConsensus = await loadCognitiveArbitrationState();
    const consensusHardCached = cachedConsensus.lastConsensusState === 'HARD_CONFLICT';
    const consensusPanicCached =
      cachedConsensus.lastConsensusState === 'PANIC_CONSENSUS' ||
      cachedConsensus.lastConsensusState === 'GOVERNANCE_OVERRIDE';
    const { loadMetaReliabilityState } = await import(
      '../services/metaReliabilityLongitudinalTrustStorage'
    );
    const cachedMeta = await loadMetaReliabilityState();
    const metaTrustCriticalCached =
      cachedMeta.lastTrustState === 'TRUST_CRITICAL' ||
      cachedMeta.lastTrustState === 'LONGITUDINAL_UNSUPPORTED';
    const metaTrustUnstableCached =
      cachedMeta.lastTrustState === 'TRUST_UNSTABLE' ||
      cachedMeta.lastTrustState === 'TRUST_DECAYING';
    const metaDivergenceCached = cachedMeta.lastTrustState === 'EXPLANATION_DIVERGENCE';
    const metaUnsupportedCached = cachedMeta.lastTrustState === 'LONGITUDINAL_UNSUPPORTED';
    const { loadSelfArchitectureState } = await import('../services/selfArchitectureAuditStorage');
    const cachedArch = await loadSelfArchitectureState();
    const selfArchRecursiveCached = cachedArch.lastStructureState === 'ARCH_RECURSIVE_RISK';
    const selfArchMobileCached = cachedArch.lastStructureState === 'ARCH_MOBILE_PRESSURE';
    const selfArchUnsupportedCached =
      cachedArch.lastStructureState === 'ARCH_UNSUPPORTED_STRUCTURE';
    const selfArchOverexpandedCached = cachedArch.lastStructureState === 'ARCH_OVEREXPANDED';
    const { loadEpistemicIntegrityState } = await import('../services/epistemicIntegrityStorage');
    const cachedEpistemic = await loadEpistemicIntegrityState();
    const epistemicHallucinationCached =
      cachedEpistemic.lastEpistemicState === 'EPISTEMIC_HALLUCINATION_RISK';
    const epistemicUnsupportedCached =
      cachedEpistemic.lastEpistemicState === 'EPISTEMIC_UNSUPPORTED';
    const epistemicSpeculativeCached =
      cachedEpistemic.lastEpistemicState === 'EPISTEMIC_SPECULATIVE';
    const epistemicContradictedCached =
      cachedEpistemic.lastEpistemicState === 'EPISTEMIC_CONTRADICTED';
    const { loadStrategicMemoryGraphState } = await import(
      '../services/strategicMemoryGraphStorage'
    );
    const cachedGraph = await loadStrategicMemoryGraphState();
    const graphCausalUncertainCached =
      cachedGraph.lastGraphState === 'GRAPH_CAUSALITY_UNCERTAIN';
    const graphContradictedCached = cachedGraph.lastGraphState === 'GRAPH_CONTRADICTED';
    const graphOverconnectedCached = cachedGraph.lastGraphState === 'GRAPH_OVERCONNECTED';
    const graphTemporallyDriftingCached =
      cachedGraph.lastGraphState === 'GRAPH_TEMPORALLY_DRIFTING';
    const graphFragmentedCached = cachedGraph.lastGraphState === 'GRAPH_FRAGMENTED';
    const { loadCognitiveResourceEconomyState } = await import(
      '../services/cognitiveResourceEconomyStorage'
    );
    const cachedEconomy = await loadCognitiveResourceEconomyState();
    const resourceOverloadedCached =
      cachedEconomy.lastResourceState === 'RESOURCE_OVERLOADED';
    const resourceRecursiveCached =
      cachedEconomy.lastResourceState === 'RESOURCE_RECURSIVE_PRESSURE';
    const resourceWastefulCached = cachedEconomy.lastResourceState === 'RESOURCE_WASTEFUL';
    const resourceFragmentedCached =
      cachedEconomy.lastResourceState === 'RESOURCE_FRAGMENTED';
    const resourceStressedCached = cachedEconomy.lastResourceState === 'RESOURCE_STRESSED';
    const { loadUnifiedCognitiveState } = await import('../services/unifiedCognitiveStateStorage');
    const cachedExecutive = await loadUnifiedCognitiveState();
    const executiveEmergencyCached =
      cachedExecutive.lastExecutiveState === 'EXECUTIVE_EMERGENCY';
    const executiveRecursiveCached =
      cachedExecutive.lastExecutiveState === 'EXECUTIVE_RECURSIVE_RISK';
    const executiveFragmentedCached =
      cachedExecutive.lastExecutiveState === 'EXECUTIVE_FRAGMENTED';
    const executiveUncertainCached =
      cachedExecutive.lastExecutiveState === 'EXECUTIVE_UNCERTAIN';
    const executiveStrainedCached =
      cachedExecutive.lastExecutiveState === 'EXECUTIVE_STRAINED';
    const { loadHumanIntentContinuityState } = await import('../services/humanIntentContinuityStorage');
    const cachedIntent = await loadHumanIntentContinuityState();
    const intentUnsupportedCached =
      cachedIntent.lastAlignmentState === 'INTENT_UNSUPPORTED';
    const intentReinterpretingCached =
      cachedIntent.lastAlignmentState === 'INTENT_REINTERPRETING';
    const intentFragmentedCached =
      cachedIntent.lastAlignmentState === 'INTENT_FRAGMENTED';
    const intentUncertainCached = cachedIntent.lastAlignmentState === 'INTENT_UNCERTAIN';
    const intentDriftingCached = cachedIntent.lastAlignmentState === 'INTENT_DRIFTING';
    const { loadAdaptiveExplorationState } = await import('../services/adaptiveExplorationStorage');
    const cachedExploration = await loadAdaptiveExplorationState();
    const explorationUnsupportedCached =
      cachedExploration.lastExplorationState === 'EXPLORATION_UNSUPPORTED';
    const explorationStagnantCached =
      cachedExploration.lastExplorationState === 'EXPLORATION_STAGNANT';
    const explorationRigidCached =
      cachedExploration.lastExplorationState === 'EXPLORATION_RIGID';
    const explorationOverclampedCached =
      cachedExploration.lastExplorationState === 'EXPLORATION_OVERCLAMPED';
    const explorationUncertainCached =
      cachedExploration.lastExplorationState === 'EXPLORATION_UNCERTAIN';
    const { loadConstitutionalGovernanceState } = await import(
      '../services/constitutionalGovernanceStorage'
    );
    const cachedConstitutional = await loadConstitutionalGovernanceState();
    const constitutionalUnsupportedCached =
      cachedConstitutional.lastConstitutionalState === 'CONSTITUTIONAL_UNSUPPORTED';
    const constitutionalCollisionCached =
      cachedConstitutional.lastConstitutionalState === 'CONSTITUTIONAL_COLLISION';
    const constitutionalConflictCached =
      cachedConstitutional.lastConstitutionalState === 'CONSTITUTIONAL_CONFLICT' ||
      constitutionalCollisionCached;
    const constitutionalFragmentedCached =
      cachedConstitutional.lastConstitutionalState === 'CONSTITUTIONAL_FRAGMENTED';
    const constitutionalEmergencyCached =
      cachedConstitutional.lastConstitutionalState === 'CONSTITUTIONAL_EMERGENCY';
    const { loadExplainableGovernanceState } = await import(
      '../services/explainableGovernanceStorage'
    );
    const cachedExplainable = await loadExplainableGovernanceState();
    const explainableUnsupportedCached =
      cachedExplainable.lastExplainableState === 'EXPLAINABLE_UNSUPPORTED';
    const explainableRiskCached = cachedExplainable.lastExplainableState === 'EXPLAINABLE_RISK';
    const explainableOpaqueCached = cachedExplainable.lastExplainableState === 'EXPLAINABLE_OPAQUE';
    const explainablePartialCached =
      cachedExplainable.lastExplainableState === 'EXPLAINABLE_PARTIAL';
    const explainableContradictedCached =
      cachedExplainable.lastExplainableState === 'EXPLAINABLE_CONTRADICTED';
    const { loadRuntimeSurvivalState } = await import('../services/runtimeSurvivalStorage');
    const cachedRuntime = await loadRuntimeSurvivalState();
    const runtimeCriticalCached = cachedRuntime.lastRuntimeState === 'RUNTIME_CRITICAL';
    const runtimeOfflineCached = cachedRuntime.lastRuntimeState === 'RUNTIME_OFFLINE';
    const runtimeDegradedCached = cachedRuntime.lastRuntimeState === 'RUNTIME_DEGRADED';
    const runtimeFragmentedCached = cachedRuntime.lastRuntimeState === 'RUNTIME_FRAGMENTED';
    const runtimeStressedCached = cachedRuntime.lastRuntimeState === 'RUNTIME_STRESSED';
    const memoryPressureActive = queueSize > 60;
    const scheduleInput: ResolveLayerRuntimeScheduleInput = {
      performance: perfSnap,
      memoryPressure: memoryPressureActive,
      queueSize,
      thermalPressurePct: Math.max(
        resourceOverloadedCached ? 78 : 0,
        resourceStressedCached ? 58 : 0,
        runtimeDegradedCached ? 72 : 0,
        runtimeCriticalCached ? 85 : 0,
      ),
      batteryLevelPct: perfSnap.batterySaverActive ? 15 : null,
      websocketUnstable: perfSnap.offlineMode || perfSnap.networkPaused,
      runtimeState: cachedRuntime.lastRuntimeState,
      analysisExplicit: false,
      confidenceCollapse: epistemicHallucinationCached || metaTrustCriticalCached,
      contradictionActive:
        consensusHardCached || epistemicContradictedCached || graphContradictedCached,
    };
    let layerPlan = resolveLayerRuntimeSchedule(scheduleInput);
    noteThermalPressureForRunaway(scheduleInput.thermalPressurePct);
    if (consensusHardCached || epistemicContradictedCached || graphContradictedCached) {
      noteCascadeContradictionRepair();
    }
    if (epistemicHallucinationCached || metaTrustCriticalCached) {
      noteCascadeConfidenceRecalibration();
    }
    if (epistemicHallucinationCached || epistemicSpeculativeCached) {
      noteCascadeFreezeRecovery();
    }
    const cascadeEval = evaluateCrossLayerCascade({
      renderBurstRate: layerPlan.mobileMetrics.renderBurstRate,
      queueSize,
      memoryPressure: memoryPressureActive,
      thermalPressurePct: scheduleInput.thermalPressurePct,
      websocketUnstable: scheduleInput.websocketUnstable,
      contradictionActive: scheduleInput.contradictionActive,
      confidenceCollapse: scheduleInput.confidenceCollapse,
    });
    layerPlan = mergeCascadeIntoLayerPlan(layerPlan, cascadeEval);
    setCrossLayerCascadeEvaluation(cascadeEval);
    const {
      evaluateRuntimeTelemetry,
      buildRuntimeTelemetryDashboardBundle,
    } = await import('../services/runtimeTelemetryEngine');
    const asyncProbe = buildAsyncMetricsProbe({
      queueSize,
      cascadePressure: cascadeEval.metrics.cascadePressure,
    });
    const telemetryEval = evaluateRuntimeTelemetry({
      performance: perfSnap,
      mobileMetrics: layerPlan.mobileMetrics,
      asyncMetrics: asyncProbe,
      queueSize,
      memoryPressure: memoryPressureActive,
      thermalPressurePct: scheduleInput.thermalPressurePct,
      sessionMinutes: getSessionMinutes(),
      cascadePressure: cascadeEval.metrics.cascadePressure,
    });
    setRuntimeTelemetryEvaluation(telemetryEval);
    const { evaluateAndApplyRuntimeOrchestrator } = await import(
      '../runtime/orchestrator/runtimeOrchestratorIntegration'
    );
    const orchEval = evaluateAndApplyRuntimeOrchestrator({
      telemetry: telemetryEval,
      performance: perfSnap,
      cascadePressure: cascadeEval.metrics.cascadePressure,
      sessionMinutes: getSessionMinutes(),
    });
    setRuntimeOrchestratorEvaluation(orchEval);
    setRuntimeTelemetryDashboardBundle(
      buildRuntimeTelemetryDashboardBundle(telemetryEval, orchEval.snapshot),
    );
    const asyncEval = evaluateAsyncRuntime({
      cascadePressure: cascadeEval.metrics.cascadePressure,
      renderBurstRate: layerPlan.mobileMetrics.renderBurstRate,
      queueSize,
      memoryPressure: memoryPressureActive,
      batterySaver: aiPreferences.batterySaverEnabled,
      appForeground: isAppForeground(),
      sessionMinutes: getSessionMinutes(),
    });
    setAsyncRuntimeEvaluation(asyncEval);
    setLayerRuntimeSchedulePlan(layerPlan);
    if (resolveTriggerBudgetDecision('orchestration_rebuild') === 'allow') {
      noteCascadeOrchestrationRebuild();
    }
    await cooperativeYield();
    const { beginDynamicOrchestrationCycle } = await import(
      '../services/dynamicLayerOrchestrationMobileRuntimeOptimizationRuntime'
    );
    const {
      orchestratedIntelligenceLayerOn,
      shouldRetainIntelligenceLayer,
      orchestratedCognitiveLayerOn,
      shouldRetainCognitiveLayer,
    } = await import('../services/dynamicLayerOrchestrationMobileRuntimeOptimizationIntegration');
    await beginDynamicOrchestrationCycle({
      stateFingerprintJa: `orch-${queueSize}-${marketRegime}`,
      batterySaver: aiPreferences.batterySaverEnabled,
      appForeground: isAppForeground(),
      memoryPressure: queueSize > 60,
      offlineMode: perfSnap.offlineMode,
      emergencyOverride: false,
      dataReliabilityLow: false,
      governanceVeto: false,
      mobileOptimizationMode: true,
      resourceCtx: resourceScheduleCtx,
      progressiveHydrationFull: aiPreferences.conciergeUxMode === 'advanced',
      regimeComputeBudgetMax: cachedRegime.lastOrchestrationBudgetMax,
      regimePanicOnly: regimePanicCached,
      regimeGovernancePriority: regimePanicCached,
      consensusBudgetMax: cachedConsensus.lastOrchestrationBudgetMax,
      consensusHardConflict: consensusHardCached,
      consensusPanicOnly: consensusPanicCached,
      consensusGovernancePriority:
        cachedConsensus.lastConsensusState === 'GOVERNANCE_OVERRIDE',
      metaReliabilityBudgetMax: cachedMeta.lastOrchestrationBudgetMax,
      metaTrustCritical: metaTrustCriticalCached,
      metaTrustUnstable: metaTrustUnstableCached,
      metaExplanationDivergence: metaDivergenceCached,
      metaLongitudinalUnsupported: metaUnsupportedCached,
      metaGovernancePriorityOnly: metaTrustCriticalCached,
      selfArchitectureBudgetMax: cachedArch.lastOrchestrationBudgetMax,
      selfArchRecursiveRisk: selfArchRecursiveCached,
      selfArchMobilePressure: selfArchMobileCached,
      selfArchUnsupported: selfArchUnsupportedCached,
      selfArchOverexpanded: selfArchOverexpandedCached,
      epistemicIntegrityBudgetMax: cachedEpistemic.lastOrchestrationBudgetMax,
      epistemicHallucinationRisk: epistemicHallucinationCached,
      epistemicUnsupported: epistemicUnsupportedCached,
      epistemicSpeculative: epistemicSpeculativeCached,
      epistemicContradicted: epistemicContradictedCached,
      epistemicExplanationOnly: epistemicUnsupportedCached,
      epistemicPredictionFreeze:
        epistemicHallucinationCached || epistemicSpeculativeCached,
      strategicMemoryGraphBudgetMax: cachedGraph.lastOrchestrationBudgetMax,
      graphCausalUncertain: graphCausalUncertainCached,
      graphContradicted: graphContradictedCached,
      graphOverconnected: graphOverconnectedCached,
      graphTemporallyDrifting: graphTemporallyDriftingCached,
      graphFragmented: graphFragmentedCached,
      graphCausalFreeze: graphCausalUncertainCached,
      graphEdgePruning: graphOverconnectedCached,
      cognitiveResourceEconomyBudgetMax: cachedEconomy.lastOrchestrationBudgetMax,
      resourceOverloaded: resourceOverloadedCached,
      resourceRecursivePressure: resourceRecursiveCached,
      resourceWasteful: resourceWastefulCached,
      resourceFragmented: resourceFragmentedCached,
      resourceStressed: resourceStressedCached,
      resourceDeepReflectionFreeze: resourceOverloadedCached || resourceRecursiveCached,
      resourceRecursiveThrottle: resourceRecursiveCached,
      resourceSpeculativeFreeze: resourceWastefulCached,
      resourceMobileHardClamp: aiPreferences.batterySaverEnabled || resourceOverloadedCached,
      resourceAttentionNarrowing: resourceStressedCached || resourceFragmentedCached,
      unifiedCognitiveStateBudgetMax: cachedExecutive.lastOrchestrationBudgetMax,
      executiveEmergency: executiveEmergencyCached,
      executiveRecursiveRisk: executiveRecursiveCached,
      executiveFragmented: executiveFragmentedCached,
      executiveUncertain: executiveUncertainCached,
      executiveStrained: executiveStrainedCached,
      executiveDeepReasoningFreeze:
        executiveEmergencyCached || executiveFragmentedCached || executiveRecursiveCached,
      executiveRecursiveSuppression: executiveRecursiveCached || executiveEmergencyCached,
      executiveExplanationOnly: executiveEmergencyCached,
      executivePredictionThrottle: executiveUncertainCached || executiveEmergencyCached,
      executiveCoherenceRebuild: executiveFragmentedCached,
      executiveReduceDepth: executiveStrainedCached || executiveFragmentedCached,
      humanIntentContinuityBudgetMax: cachedIntent.lastOrchestrationBudgetMax,
      intentUnsupported: intentUnsupportedCached,
      intentReinterpreting: intentReinterpretingCached,
      intentFragmented: intentFragmentedCached,
      intentUncertain: intentUncertainCached,
      intentDrifting: intentDriftingCached,
      intentExplanationOnly: intentUnsupportedCached,
      intentSemanticFreeze: intentReinterpretingCached || intentFragmentedCached,
      intentReinterpretationSuppression:
        intentReinterpretingCached || intentUnsupportedCached,
      intentContextRebuild: intentFragmentedCached,
      intentClarificationDowngrade: intentUncertainCached,
      intentInstructionReinforcement: intentDriftingCached || intentFragmentedCached,
      intentOrchestrationDeviationClamp: intentDriftingCached || intentFragmentedCached,
      adaptiveExplorationBudgetMax: cachedExploration.lastOrchestrationBudgetMax,
      explorationUnsupported: explorationUnsupportedCached,
      explorationStagnant: explorationStagnantCached,
      explorationRigid: explorationRigidCached,
      explorationOverclamped: explorationOverclampedCached,
      explorationUncertain: explorationUncertainCached,
      explorationFallbackFreeze: explorationUnsupportedCached,
      explorationPerspectiveWidening: explorationRigidCached || explorationStagnantCached,
      explorationSafeAlternative: explorationStagnantCached,
      explorationClampRelaxation: explorationOverclampedCached,
      explorationUncertaintyAck: explorationUncertainCached,
      constitutionalGovernanceBudgetMax: cachedConstitutional.lastOrchestrationBudgetMax,
      constitutionalConflict: constitutionalConflictCached,
      constitutionalCollision: constitutionalCollisionCached,
      constitutionalFragmented: constitutionalFragmentedCached,
      constitutionalEmergency: constitutionalEmergencyCached,
      constitutionalUnsupported: constitutionalUnsupportedCached,
      constitutionalPrecedenceArbitration:
        constitutionalConflictCached || constitutionalFragmentedCached,
      constitutionalOverrideFreeze:
        constitutionalCollisionCached || constitutionalEmergencyCached,
      constitutionalHierarchyRebuild: constitutionalFragmentedCached,
      constitutionalFallbackFreeze: constitutionalUnsupportedCached,
      explainableGovernanceBudgetMax: cachedExplainable.lastOrchestrationBudgetMax,
      explainablePartial: explainablePartialCached,
      explainableOpaque: explainableOpaqueCached || explainableRiskCached,
      explainableRisk: explainableRiskCached,
      explainableUnsupported: explainableUnsupportedCached,
      explainableContradicted: explainableContradictedCached,
      explainableSafeSimplification: explainablePartialCached || explainableContradictedCached,
      explainableFallbackExplanation:
        explainableOpaqueCached || explainableUnsupportedCached,
      explainableExplanationSuppression:
        explainableRiskCached || explainableUnsupportedCached,
      explainableConsistencyRebuild: explainableContradictedCached,
      explainableExplanationOnly: explainableUnsupportedCached,
      runtimeSurvivalBudgetMax: cachedRuntime.lastOrchestrationBudgetMax,
      runtimeStressed: runtimeStressedCached,
      runtimeDegraded: runtimeDegradedCached,
      runtimeFragmented: runtimeFragmentedCached,
      runtimeOffline: runtimeOfflineCached,
      runtimeCritical: runtimeCriticalCached,
      runtimeSurvivalMode: layerPlan.mode === 'SURVIVAL' || runtimeCriticalCached,
      runtimeLightweight:
        layerPlan.mode === 'LIGHTWEIGHT' ||
        layerPlan.mode === 'SURVIVAL' ||
        runtimeStressedCached ||
        runtimeDegradedCached,
      runtimeDeepOrchSuppression:
        layerPlan.actions.deepOrchestrationFreeze ||
        runtimeDegradedCached ||
        runtimeCriticalCached,
      runtimeRebuild: runtimeFragmentedCached,
      runtimeOfflineFallback: runtimeOfflineCached,
      runtimeWebsocketPause:
        (layerPlan.actions.websocketPollingSlowdown ? false : runtimeOfflineCached) ||
        runtimeCriticalCached,
      runtimeCacheFirst:
        layerPlan.actions.cacheFirstMode ||
        runtimeStressedCached ||
        runtimeOfflineCached ||
        runtimeDegradedCached,
      runtimeDashboardLowRefresh:
        layerPlan.actions.dashboardMinimalRender ||
        runtimeDegradedCached ||
        runtimeFragmentedCached ||
        runtimeOfflineCached,
      runtimeSpeculativeStop:
        layerPlan.actions.deepOrchestrationFreeze ||
        runtimeDegradedCached ||
        runtimeCriticalCached,
      runtimeDeepReflectionStop:
        layerPlan.actions.deepReasoningFreeze ||
        runtimeDegradedCached ||
        runtimeCriticalCached,
    });
    const COGNITIVE_ORCH_IDS: OrchestratedLayerId[] = [
      'temporal',
      'semantic',
      'epistemic',
      'arbitration',
      'reflection',
      'compression',
      'systemic',
      'recovery',
    ];
    const isCognitiveOrchId = (id: string): id is OrchestratedLayerId =>
      (COGNITIVE_ORCH_IDS as string[]).includes(id);
    const retainLayer = (id: LayerRecomputeId | OrchestratedLayerId): boolean =>
      isCognitiveOrchId(id)
        ? shouldRetainCognitiveLayer(id)
        : shouldRetainIntelligenceLayer(id as LayerRecomputeId);
    const layerOn = (id: LayerRecomputeId): boolean =>
      reactiveLayerOn(id) &&
      shouldRecomputeLayerWithBudget(id, reactiveLayerOn(id), resourceScheduleCtx) &&
      orchestratedIntelligenceLayerOn(id);
    const cognitiveOn = (id: OrchestratedLayerId): boolean => orchestratedCognitiveLayerOn(id);
    setOrchestrationRuntimeContext({
      appForeground: isAppForeground(),
      batterySaver: aiPreferences.batterySaverEnabled,
      memoryPressure: queueSize > 60,
    });
    noteOrchestratorRerender();
    try {
    const holdings = getActivePortfolio(stateRef.current);
    const { buildConciergeEvidenceForProactive } = await import(
      '../services/conciergeEvidenceBuilder'
    );
    const { loadAnalysisApiKeys } = await import('../services/analysisApiKeys');
    const apiKeys = await loadAnalysisApiKeys();
    const proactiveEvidence = await buildConciergeEvidenceForProactive(
      stateRef.current,
      apiKeys,
      aiPreferences.aiAnalysisMode,
    );

    let dataReliability: DataReliabilityBundle | null = null;
    if (aiPreferences.dataReliabilityEnabled && layerOn('data_reliability')) {
      const { refreshDataReliabilityBundle } = await import('../services/dataReliabilityEngine');
      const { loadApiHealthSnapshot } = await import('../services/apiHealthStorage');
      const { buildApiHealthDashboard } = await import('../services/apiHealthDashboard');
      const apiSnap = await loadApiHealthSnapshot();
      const apiDash = buildApiHealthDashboard(apiSnap);
      dataReliability = await refreshDataReliabilityBundle({
        symbols: proactiveEvidence.symbols,
        apiHealth: apiDash,
      });
      setDataReliabilityBundle(dataReliability);
    } else if (!retainLayer('data_reliability')) {
      setDataReliabilityBundle(null);
    }

    const { buildGlobalMarketAnalysis } = await import('../services/marketRegimeConciergeEngine');
    const globalMarketAnalysis = await buildGlobalMarketAnalysis();
    const queue = getMockAiTradeQueue();
    const buyCandidateTickers = queue
      .filter((q) => q.suggestedAction === 'suggested_buy')
      .map((q) => q.ticker);
    const sellCandidateTickers = queue
      .filter((q) => q.suggestedAction === 'suggested_reduce')
      .map((q) => q.ticker);

    const input = {
      holdings,
      priceSync,
      urgencySignals: allSignals,
      staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
      degradedMode: worldModel?.operations.degradedMode ?? false,
      buyCandidateTickers,
      sellCandidateTickers,
      marketRegime,
      previous: fingerprintRef.current,
      conciergeEvidenceSymbols: proactiveEvidence.symbols,
      globalMarketAnalysis,
    };

    const candidates = evaluateProactiveAdvice(input);
    const fp = buildProactiveFingerprint(input);
    const { loadPortfolioIntelligenceState } = await import(
      '../services/portfolioIntelligenceStorage'
    );
    const { shouldSuppressRepeatNotification } = await import(
      '../services/portfolioIntelligenceRecorder'
    );
    const { recordIntelligenceFromProactive } = await import(
      '../services/portfolioIntelligenceBuilder'
    );
    const intelState = await loadPortfolioIntelligenceState();
    const { shouldSuppressLowSignalProactive } = await import('../services/aiNoiseFilter');
    const changeBySymbol = new Map(
      proactiveEvidence.symbols.map((s) => [s.symbol, s.intradayChangePct] as const),
    );
    const filteredCandidates = candidates
      .filter((c) => !shouldSuppressRepeatNotification(intelState, c.dedupeKey))
      .filter(
        (c) =>
          !shouldSuppressLowSignalProactive(
            c,
            c.symbol ? (changeBySymbol.get(c.symbol) ?? null) : null,
          ),
      )
      .filter(
        (c) =>
          !(
            aiPreferences.autonomousMonitoringEnabled && c.category === 'periodic_check'
          ),
      );
    let allRawCandidates = [...filteredCandidates];
    let autoBundle: AutonomousMonitoringBundle | null = null;
    const { buildPortfolioIntelligenceBundle } = await import(
      '../services/portfolioIntelligenceBuilder'
    );
    const portfolioIntel = await buildPortfolioIntelligenceBundle({
      state: stateRef.current,
      currentAnalysisMode: aiPreferences.aiAnalysisMode,
    });

    if (aiPreferences.autonomousMonitoringEnabled && !shouldPauseApiRequests()) {
      const { loadAutonomousMonitoringState, appendSilentMonitoringEvent } = await import(
        '../services/autonomousMonitoringStorage'
      );
      const { buildAutonomousMonitoringBundle } = await import(
        '../services/autonomousMonitoringBundle'
      );
      const { evaluateAutonomousAlertForSymbol } = await import('../services/autonomousAlertTrigger');
      const stored = await loadAutonomousMonitoringState();
      const leaderSymbols = globalMarketAnalysis.indices
        .filter((i) => i.changePct != null && Math.abs(i.changePct) >= 1.5)
        .map((i) => i.yahooSymbol.split('.')[0])
        .slice(0, 4);
      autoBundle = buildAutonomousMonitoringBundle({
        holdings: holdings.map((p) => ({
          symbol: p.symbol,
          market: p.market,
          shares: p.shares ?? 0,
        })),
        evidenceSymbols: proactiveEvidence.symbols,
        globalMarket: globalMarketAnalysis,
        portfolioIntel,
        recentViewedSymbols: stored.recentViewedSymbols,
        marketLeaderSymbols: leaderSymbols,
        aggressiveness: aiPreferences.autonomousAggressiveness,
        notificationsPaused: aiPreferences.autonomousNotificationsPaused,
        excludedSymbols: aiPreferences.autonomousExcludedSymbols,
        adaptiveMultiplier: stored.adaptive.multiplier,
        degradedMode: worldModel?.operations.degradedMode ?? false,
        batterySaver: aiPreferences.batterySaverEnabled,
        appForeground: isAppForeground(),
      });
      setAutonomousBundle(autoBundle);

      const excluded = new Set(aiPreferences.autonomousExcludedSymbols.map((s) => s.toUpperCase()));
      for (const sym of proactiveEvidence.symbols) {
        const e = evaluateAutonomousAlertForSymbol(
          sym,
          globalMarketAnalysis,
          aiPreferences.autonomousAggressiveness,
          excluded.has(sym.symbol.toUpperCase()),
        );
        if (e.silentOnly) {
          await appendSilentMonitoringEvent({
            at: new Date().toISOString(),
            symbol: sym.symbol,
            summaryJa: e.notificationWhyJa,
            score: e.compositeScore,
          });
        }
      }

      allRawCandidates.push(...autoBundle.notifyCandidates);
    } else {
      setAutonomousBundle(null);
    }

    let candidatesToEnqueue = allRawCandidates;

    let macroBundle: MacroIntelligenceBundle | null = null;
    if (aiPreferences.macroIntelligenceEnabled && layerOn('macro')) {
      const { refreshMacroIntelligenceBundle } = await import('../services/macroIntelligenceEngine');
      macroBundle = await refreshMacroIntelligenceBundle({ globalMarket: globalMarketAnalysis });
      setMacroIntelligenceBundle(macroBundle);
      const { filterCandidatesByMacro } = await import('../services/macroIntelligenceIntegration');
      candidatesToEnqueue = filterCandidatesByMacro(candidatesToEnqueue, macroBundle);
      allRawCandidates = filterCandidatesByMacro(allRawCandidates, macroBundle);
    } else {
      setMacroIntelligenceBundle(null);
    }

    if (aiPreferences.metaDecisionEnabled && layerOn('meta')) {
      const { loadMetaDecisionState } = await import('../services/metaDecisionStorage');
      const { buildMetaDecisionBundle } = await import('../services/metaDecisionEngine');
      const { buildSymbolWeightPctMap } = await import('../services/metaDecisionPortfolioWeights');
      const metaState = await loadMetaDecisionState();
      const symbolWeightPct = buildSymbolWeightPctMap(holdings);
      const evidenceBySymbol: BuildMetaDecisionInput['evidenceBySymbol'] = {};
      for (const s of proactiveEvidence.symbols) {
        evidenceBySymbol[s.symbol.toUpperCase()] = {
          intradayChangePct: s.intradayChangePct,
          bearishPct: s.xSentiment?.bearishPct ?? null,
          bullishPct: s.xSentiment?.bullishPct ?? null,
        };
      }
      const { enhanceMetaDecisionInput } = await import('../services/macroIntelligenceIntegration');
      const metaInput = enhanceMetaDecisionInput(
        {
          candidates: allRawCandidates,
          regimeId: globalMarketAnalysis.regimeId,
          marketRiskScore: globalMarketAnalysis.marketScores.marketRiskScore,
          fearScore: globalMarketAnalysis.marketScores.fearScore,
          emergencyMode: autoBundle?.emergencyMode ?? false,
          symbolWeightPct,
          userStyleId: portfolioIntel.behavior.primaryStyle,
          evidenceBySymbol,
        },
        macroBundle,
      );
      const meta = buildMetaDecisionBundle(metaInput, metaState);
      setMetaBundle(meta);
      const whyByKey = new Map(
        meta.decisionQueue.map((q) => [q.event.candidate.dedupeKey, q.event.whyImportantJa]),
      );
      candidatesToEnqueue = meta.approvedCandidates.map((c) => ({
        ...c,
        notificationWhyJa: whyByKey.get(c.dedupeKey) ?? c.notificationWhyJa,
      }));
    } else {
      setMetaBundle(null);
    }

    let strategy: StrategyExecutionBundle | null = null;
    let strategyTacticalMode: import('../types/strategyExecution').TacticalMode | undefined;
    if (aiPreferences.strategyExecutionEnabled && layerOn('strategy')) {
      const { loadStrategyExecutionState, appendStrategyJournalEntry, recordStrategyCooldownProposal } =
        await import('../services/strategyExecutionStorage');
      const { buildStrategyExecutionBundle } = await import('../services/strategyExecutionEngine');
      const { buildSymbolWeightPctMap } = await import('../services/metaDecisionPortfolioWeights');
      const stratState = await loadStrategyExecutionState();
      const symbolWeightPct = buildSymbolWeightPctMap(holdings);
      const { resolveStrategyTacticalMode } = await import(
        '../services/macroIntelligenceIntegration'
      );
      const tacticalMode = resolveStrategyTacticalMode(
        aiPreferences.strategyTacticalMode,
        macroBundle,
      );
      strategyTacticalMode = tacticalMode;
      const regimeForStrategy =
        macroBundle?.integration.mappedConciergeRegimeId ?? globalMarketAnalysis.regimeId;
      strategy = buildStrategyExecutionBundle(
        {
          evidenceSymbols: proactiveEvidence.symbols,
          globalMarket: globalMarketAnalysis,
          portfolioIntel,
          symbolWeightPct,
          tacticalMode,
          regimeId: regimeForStrategy,
          cashRatioPctEstimate:
            regimeForStrategy === 'panic' || macroBundle?.integration.forceDefensiveStrategy
              ? 28
              : 15,
        },
        stratState,
      );
      setStrategyBundle(strategy);
      if (!strategy.cooldownActive) {
        for (const r of strategy.todayRecommendations.filter((x) => x.intent === 'action')) {
          await appendStrategyJournalEntry({
            at: new Date().toISOString(),
            symbol: r.symbol,
            action: r.action,
            whyProposedJa: r.whyProposedJa,
            outcomeNoteJa: null,
          });
          await recordStrategyCooldownProposal(r.symbol, r.action);
        }
      }
    } else {
      setStrategyBundle(null);
    }

    const priceBySymbol: Record<string, number> = {};
    for (const s of proactiveEvidence.symbols) {
      if (s.currentPrice != null && s.currentPrice > 0) {
        priceBySymbol[s.symbol] = s.currentPrice;
      }
    }

    let realityResult: RealityValidationBundle | null = null;
    let executionResult: ExecutionDashboardBundle | null = null;

    if (aiPreferences.realityValidationEnabled) {
      const { refreshPortfolioRealityValidation } = await import(
        '../services/portfolioRealityEngine'
      );
      realityResult = await refreshPortfolioRealityValidation({
        strategyBundle: strategy,
        regimeId: globalMarketAnalysis.regimeId,
        globalMarket: globalMarketAnalysis,
        priceBySymbol,
      });
      setRealityBundle(realityResult);
    } else {
      setRealityBundle(null);
    }

    if (aiPreferences.paperBrokerEnabled && layerOn('execution')) {
      const { buildExecutionDashboardBundle } = await import(
        '../services/paperBroker/paperBrokerBundleBuilder'
      );
      executionResult = await buildExecutionDashboardBundle({
        regimeId: globalMarketAnalysis.regimeId,
        trustScore: realityResult?.trustScore ?? null,
        aiWinRatePct: realityResult?.dashboard.winRatePct ?? null,
        priceBySymbol,
        strategyRecommendations: strategy?.todayRecommendations,
      });
      setExecutionBundle(executionResult);
    } else {
      setExecutionBundle(null);
    }

    let selfEvalResult: SelfEvaluationBundle | null = null;
    if (aiPreferences.selfEvaluationEnabled && layerOn('self_eval')) {
      const { refreshSelfEvaluationBundle } = await import('../services/selfEvaluationEngine');
      let recs: import('../types/portfolioRealityValidation').TrackedAiRecommendation[] = [];
      if (aiPreferences.realityValidationEnabled) {
        const { loadPortfolioRealityState } = await import('../services/portfolioRealityStorage');
        recs = (await loadPortfolioRealityState()).recommendations;
      }
      const scores = globalMarketAnalysis.marketScores;
      selfEvalResult = await refreshSelfEvaluationBundle({
        regimeId: globalMarketAnalysis.regimeId,
        marketRiskScore: scores.marketRiskScore,
        fearScore: scores.fearScore,
        momentumScore: scores.momentumScore,
        volatilityPctEstimate:
          Math.abs(realityResult?.virtualReturnPct ?? 0) +
          (realityResult?.dashboard.maxDrawdownPct ?? 8),
        globalFactorsJa: globalMarketAnalysis.marketWideFactorsJa,
        macroBulletsJa: globalMarketAnalysis.macroContextBulletsJa,
        realityBundle: realityResult,
        strategyBundle: strategy,
        executionTrustScore: executionResult?.trustScore ?? null,
        recommendations: recs,
      });
      setSelfEvaluationBundle(selfEvalResult);
    } else {
      setSelfEvaluationBundle(null);
    }

    const { portfolioMarketValueMYR } = await import('../services/portfolio');
    const { calculatePracticeStats } = await import('../services/practice');
    const totalValueMYR = portfolioMarketValueMYR(stateRef.current);
    const practiceStats =
      stateRef.current.appMode === 'practice'
        ? calculatePracticeStats(stateRef.current.practice)
        : null;

    let portfolioRiskBundle: PortfolioRiskExposureBundle | null = null;
    if (aiPreferences.portfolioRiskExposureEnabled && layerOn('portfolio_risk')) {
      const { refreshPortfolioRiskExposureBundle } = await import(
        '../services/portfolioRiskExposureEngine'
      );
      const symbolDataQuality: Record<string, number> = {};
      const evidenceThinSymbols: string[] = [];
      if (dataReliability) {
        for (const s of dataReliability.symbols) {
          symbolDataQuality[s.symbol.toUpperCase()] = s.dataQualityScore;
          if (s.dataQualityScore < 50) evidenceThinSymbols.push(s.symbol);
        }
      }
      portfolioRiskBundle = await refreshPortfolioRiskExposureBundle({
        holdings,
        totalValueMYR,
        cashMYR: practiceStats?.cashBalanceMYR ?? executionResult?.balance.cashMYR ?? 0,
        priceBySymbol,
        macroBundle,
        selfEvalBundle: selfEvalResult,
        dataReliabilityBundle: dataReliability,
        realityBundle: realityResult,
        executionBundle: executionResult,
        evidenceThinSymbols,
        symbolDataQuality,
        portfolioIntelConcentration: portfolioIntel.portfolioRisk.concentrationScore,
        strategyTacticalMode,
      });
      setPortfolioRiskExposureBundle(portfolioRiskBundle);
    } else {
      setPortfolioRiskExposureBundle(null);
    }

    let capitalAllocationResult: CapitalAllocationBundle | null = null;
    if (aiPreferences.capitalAllocationEnabled && layerOn('capital')) {
      const { refreshCapitalAllocationBundle } = await import('../services/capitalAllocationEngine');
      const { enrichExecutionWithCapital } = await import('../services/capitalAllocationIntegration');
      const { calculateBuyingPower } = await import('../services/buyingPower');
      let availableCashMYR =
        executionResult?.balance.cashMYR ?? practiceStats?.cashBalanceMYR ?? 0;
      if (!executionResult && stateRef.current.appMode !== 'practice') {
        availableCashMYR = calculateBuyingPower(stateRef.current).buyingPowerMYR;
      }
      const cashMYR =
        practiceStats?.cashBalanceMYR ?? executionResult?.balance.cashMYR ?? availableCashMYR;
      capitalAllocationResult = await refreshCapitalAllocationBundle({
        regimeId: globalMarketAnalysis.regimeId,
        tacticalMode: strategyTacticalMode ?? strategy?.tacticalMode ?? 'balanced',
        beginnerMode: aiPreferences.conciergeUxMode === 'beginner',
        availableCashMYR,
        totalEquityMYR: totalValueMYR + cashMYR,
        priceBySymbol,
        strategyBundle: strategy,
        executionBundle: executionResult,
        portfolioRiskBundle,
        macroBundle,
        drawdownPct: executionResult?.maxDrawdownPct,
      });
      setCapitalAllocationBundle(capitalAllocationResult);
      if (executionResult) {
        setExecutionBundle(enrichExecutionWithCapital(executionResult, capitalAllocationResult));
      }
    } else {
      setCapitalAllocationBundle(null);
    }

    if (isStaleAsyncGeneration('proactive-refresh', refreshGen)) {
      return;
    }

    let integrityResult: SystemStabilityIntegrityBundle | null = null;
    if (aiPreferences.systemStabilityIntegrityEnabled !== false && layerOn('stability')) {
      const { buildSystemStabilityIntegrityBundle, countZombiePaperOrders } = await import(
        '../services/systemStabilityIntegrityEngine'
      );
      const { isProactiveRefreshInFlight, getDuplicateRefreshBlockedCount } = await import(
        '../services/systemStabilityIntegrityIntegration'
      );
      const { getPersonalKillSwitchesSnapshot } = await import('../services/personalKillSwitches');
      const { runStorageIntegrityCheck } = await import(
        '../services/productionStability/storageIntegrity'
      );
      const storageOk = (await runStorageIntegrityCheck()).ok;
      const zombieOrders = await countZombiePaperOrders();
      const ks = getPersonalKillSwitchesSnapshot();
      const priceStale =
        priceSync.displayStatus === 'cached' ||
        priceSync.displayStatus === 'partial_failure' ||
        priceSync.displayStatus === 'connection_failed' ||
        priceSync.lastError != null ||
        (worldModel?.portfolioRisk.staleHoldingsCount ?? 0) > 0;
      integrityResult = buildSystemStabilityIntegrityBundle({
        productionSnapshot: buildSnapshot(),
        layerEnabled: {
          macro: aiPreferences.macroIntelligenceEnabled,
          data_reliability: aiPreferences.dataReliabilityEnabled,
          strategy: aiPreferences.strategyExecutionEnabled,
          reality: aiPreferences.realityValidationEnabled,
          execution: aiPreferences.paperBrokerEnabled,
          self_eval: aiPreferences.selfEvaluationEnabled,
          portfolio_risk: aiPreferences.portfolioRiskExposureEnabled,
          capital: aiPreferences.capitalAllocationEnabled,
        },
        layers: {
          macro: macroBundle,
          dataReliability: dataReliability,
          capitalAllocation: capitalAllocationResult,
          execution: executionResult,
          portfolioRisk: portfolioRiskBundle,
          strategy,
          reality: realityResult,
          selfEvaluation: selfEvalResult,
        },
        proactiveRefreshInFlight: isProactiveRefreshInFlight(),
        duplicateRefreshBlocked:
          lastDuplicateRefreshBlockedRef.current || getDuplicateRefreshBlockedCount() > 0,
        staleHoldingsCount: worldModel?.portfolioRisk.staleHoldingsCount ?? 0,
        priceSyncStale: priceStale,
        readOnlyMode: ks.readOnlyMode,
        degradedMode:
          (worldModel?.operations.degradedMode ?? false) || ks.readOnlyMode,
        storageIntegrityOk: storageOk,
        zombieOrderCount: zombieOrders,
        proactiveQueueSize: suggestionsRef.current.length,
      });
      setSystemStabilityIntegrityBundle(integrityResult);
    } else {
      setSystemStabilityIntegrityBundle(null);
    }

    let governanceResult: AiGovernanceDecisionBundle | null = null;
    let effectiveStrategy = strategy;
    if (aiPreferences.aiGovernanceDecisionEnabled !== false && layerOn('governance')) {
      const {
        buildAiGovernanceDecisionBundle,
        collectStaleGovernanceLayerIds,
      } = await import('../services/aiGovernanceDecisionEngine');
      const { loadAiGovernanceState, countRecentAuditFlips } = await import(
        '../services/aiGovernanceDecisionStorage'
      );
      const { applyGovernanceToStrategy } = await import(
        '../services/aiGovernanceDecisionIntegration'
      );
      const govPersisted = await loadAiGovernanceState();
      const govLayerInput = {
        systemStability: integrityResult,
        portfolioRisk: portfolioRiskBundle,
        dataReliability: dataReliability,
        macro: macroBundle,
        execution: executionResult,
        capitalAllocation: capitalAllocationResult,
        strategy,
      };
      governanceResult = await buildAiGovernanceDecisionBundle({
        ...govLayerInput,
        humanGovernanceOverride: govPersisted.humanOverride,
        portfolioHumanRiskOverride: portfolioRiskBundle?.humanOverride ?? null,
        staleLayerIds: collectStaleGovernanceLayerIds(govLayerInput),
        lastAudit: govPersisted.auditTrail[govPersisted.auditTrail.length - 1] ?? null,
        recentAuditFlipCount: countRecentAuditFlips(govPersisted.auditTrail, 10 * 60 * 1000),
      });
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) {
        const adjusted = applyGovernanceToStrategy(effectiveStrategy, governanceResult);
        if (adjusted) {
          effectiveStrategy = adjusted;
          setStrategyBundle(adjusted);
        }
      }
    } else {
      setAiGovernanceDecisionBundle(null);
    }

    let reactiveResult: ReactiveEventOrchestrationBundle | null = null;
    if (aiPreferences.reactiveEventOrchestrationEnabled !== false) {
      const { buildReactiveEventOrchestrationBundle } = await import(
        '../services/reactiveEventOrchestrationEngine'
      );
      const { RENDER_BUDGET_MAX_CONCURRENT } = await import('../constants/productionStability');
      reactiveResult = buildReactiveEventOrchestrationBundle({
        batterySaverEnabled: aiPreferences.batterySaverEnabled,
        appForeground: isAppForeground(),
        memoryPressure: suggestionsRef.current.length > 60,
        renderBudgetInFlight: getRenderBudgetInFlight(),
        renderBudgetBlocked: getRenderBudgetBlockedCount(),
        renderBudgetMax: RENDER_BUDGET_MAX_CONCURRENT,
      });
      setReactiveEventOrchestrationBundle(reactiveResult);
    } else {
      setReactiveEventOrchestrationBundle(null);
    }

    let explainableTraceResult: ExplainableCognitiveTraceBundle | null = null;
    const { shouldRunLayerWithComputeBudget } = await import(
      '../services/adaptiveResourceComputeBudgetRuntime'
    );
    if (
      aiPreferences.explainableCognitiveTraceEnabled !== false &&
      shouldRunLayerWithComputeBudget('cognitive_trace', resourceScheduleCtx) &&
      orchestratedCognitiveLayerOn('cognitive_trace')
    ) {
      const { buildExplainableCognitiveTraceBundle } = await import(
        '../services/explainableCognitiveTraceEngine'
      );
      const { loadCognitiveTraceState } = await import('../services/explainableCognitiveTraceStorage');
      const tracePersisted = await loadCognitiveTraceState();
      const priceSyncStatusJa =
        priceSync.displayStatus === 'complete'
          ? '取得完了'
          : priceSync.displayStatus === 'cached'
            ? 'キャッシュ'
            : priceSync.displayStatus === 'partial_failure'
              ? '一部失敗'
              : priceSync.displayStatus === 'connection_failed'
                ? '接続失敗'
                : priceSync.displayStatus === 'fetching'
                  ? '取得中'
                  : String(priceSync.displayStatus ?? 'idle');
      explainableTraceResult = await buildExplainableCognitiveTraceBundle({
        governance: governanceResult,
        stability: integrityResult,
        reactive: reactiveResult,
        dataReliability: dataReliability,
        macro: macroBundle,
        portfolioRisk: portfolioRiskBundle,
        capital: capitalAllocationResult,
        execution: executionResult,
        strategy: effectiveStrategy,
        marketContext: {
          priceSyncStatusJa,
          symbols: proactiveEvidence.symbols.slice(0, 12).map((s) => ({
            symbol: s.symbol,
            intradayChangePct: s.intradayChangePct,
            dataQualityScore: dataReliability?.globalDataQualityScore ?? null,
            stale: s.quoteIsStale,
          })),
          volatilityNoteJa:
            macroBundle?.integration.mappedConciergeRegimeId != null
              ? `レジーム ${macroBundle.integration.mappedConciergeRegimeId}`
              : globalMarketAnalysis.regimeId,
        },
        stateFingerprintJa: JSON.stringify({
          regime: globalMarketAnalysis.regimeId,
          holdings: fp.holdingsCount,
          stale: fp.staleCount,
          portfolioValue: fp.portfolioValueRounded,
        }),
        previousRecommendations: tracePersisted.lastRecommendations,
        previousExplainableScore: tracePersisted.lastExplainableScore,
      });
      const { noteTraceAndReplaySizes, dedupeSnapshotFingerprint } = await import(
        '../services/adaptiveResourceComputeBudgetStorage'
      );
      await noteTraceAndReplaySizes(
        JSON.stringify(explainableTraceResult).length,
        explainableTraceResult.replayTimeline.length,
        explainableTraceResult.generatedAt,
      );
      await dedupeSnapshotFingerprint(
        JSON.stringify({
          regime: globalMarketAnalysis.regimeId,
          holdings: fp.holdingsCount,
        }),
      );
      setExplainableCognitiveTraceBundle(explainableTraceResult);
    } else {
      setExplainableCognitiveTraceBundle(null);
    }

    let resourceBundle: AdaptiveResourceComputeBudgetBundle | null = null;
    if (aiPreferences.adaptiveResourceComputeBudgetEnabled !== false) {
      const { buildAdaptiveResourceComputeBudgetBundle } = await import(
        '../services/adaptiveResourceComputeBudgetEngine'
      );
      const { RENDER_BUDGET_MAX_CONCURRENT } = await import('../constants/productionStability');
      resourceBundle = await buildAdaptiveResourceComputeBudgetBundle({
        batterySaverEnabled: aiPreferences.batterySaverEnabled,
        appForeground: isAppForeground(),
        memoryPressure: queueSize > 60,
        offlineMode: perfSnap.offlineMode,
        renderBudgetInFlight: getRenderBudgetInFlight(),
        renderBudgetMax: RENDER_BUDGET_MAX_CONCURRENT,
        renderBudgetBlocked: getRenderBudgetBlockedCount(),
        proactiveQueueSize: queueSize,
        layerEnabled: {
          data_reliability: aiPreferences.dataReliabilityEnabled,
          macro: aiPreferences.macroIntelligenceEnabled,
          meta: aiPreferences.metaDecisionEnabled,
          strategy: aiPreferences.strategyExecutionEnabled,
          reality: aiPreferences.realityValidationEnabled,
          execution: aiPreferences.paperBrokerEnabled,
          self_eval: aiPreferences.selfEvaluationEnabled,
          portfolio_risk: aiPreferences.portfolioRiskExposureEnabled,
          capital: aiPreferences.capitalAllocationEnabled,
          stability: aiPreferences.systemStabilityIntegrityEnabled !== false,
          governance: aiPreferences.aiGovernanceDecisionEnabled !== false,
          reactive_orchestration: aiPreferences.reactiveEventOrchestrationEnabled !== false,
          cognitive_trace: aiPreferences.explainableCognitiveTraceEnabled !== false,
          proactive_queue: aiPreferences.proactiveBriefingsEnabled,
          autonomous: aiPreferences.autonomousMonitoringEnabled,
        },
        reactiveDroppedTotal: reactiveResult?.droppedTotal,
        reactiveRecomputePerSec: reactiveResult?.recomputePerSec,
        traceJsonLength: explainableTraceResult
          ? JSON.stringify(explainableTraceResult).length
          : 0,
        replayEntryCount: explainableTraceResult?.replayTimeline.length ?? 0,
        marketVolatilityHigh:
          globalMarketAnalysis.regimeId === 'panic' ||
          globalMarketAnalysis.regimeId === 'risk_off',
      });
      setAdaptiveResourceComputeBudgetBundle(resourceBundle);
    } else {
      setAdaptiveResourceComputeBudgetBundle(null);
    }

    let temporalIntegrityResult: StateIntegrityTemporalConsistencyBundle | null = null;
    if (aiPreferences.stateIntegrityTemporalConsistencyEnabled !== false && cognitiveOn('temporal')) {
      const { buildStateIntegrityTemporalConsistencyBundle } = await import(
        '../services/stateIntegrityTemporalConsistencyEngine'
      );
      const {
        applyGovernanceFreshnessDowngrade,
        applyTemporalRollbackDowngrades,
      } = await import('../services/stateIntegrityTemporalConsistencyIntegration');
      const { applyGovernanceToStrategy } = await import(
        '../services/aiGovernanceDecisionIntegration'
      );
      const refreshStale = isStaleAsyncGeneration('proactive-refresh', refreshGen);
      temporalIntegrityResult = await buildStateIntegrityTemporalConsistencyBundle({
        stateFingerprintJa: JSON.stringify({
          regime: globalMarketAnalysis.regimeId,
          holdings: fp.holdingsCount,
          stale: fp.staleCount,
          portfolioValue: fp.portfolioValueRounded,
        }),
        refreshGeneration: refreshGen,
        refreshGenerationStale: refreshStale,
        governance: governanceResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        trace: explainableTraceResult,
        stability: integrityResult,
        strategy: effectiveStrategy,
        partialRecomputeActive: reactiveResult?.selectiveRecomputeActive ?? false,
        duplicateRefreshBlocked:
          lastDuplicateRefreshBlockedRef.current ||
          (reactiveResult?.renderBudgetBlocked ?? 0) > 0,
      });
      governanceResult = applyGovernanceFreshnessDowngrade(
        governanceResult,
        temporalIntegrityResult,
      );
      effectiveStrategy = applyTemporalRollbackDowngrades(
        effectiveStrategy,
        temporalIntegrityResult,
      );
      if (effectiveStrategy && governanceResult) {
        const adjusted = applyGovernanceToStrategy(effectiveStrategy, governanceResult);
        if (adjusted) effectiveStrategy = adjusted;
      }
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setStateIntegrityTemporalConsistencyBundle(temporalIntegrityResult);
    } else if (!retainLayer('temporal')) {
      setStateIntegrityTemporalConsistencyBundle(null);
    }

    let semanticResult: SemanticConsistencyDecisionCoherenceBundle | null = null;
    if (aiPreferences.semanticConsistencyDecisionCoherenceEnabled !== false && cognitiveOn('semantic')) {
      const { buildSemanticConsistencyDecisionCoherenceBundle } = await import(
        '../services/semanticConsistencyDecisionCoherenceEngine'
      );
      const {
        applySemanticCoherenceToGovernance,
        applySemanticCoherenceToStrategy,
      } = await import('../services/semanticConsistencyDecisionCoherenceIntegration');
      const finalDecision =
        governanceResult?.finalDecision ??
        effectiveStrategy?.todayRecommendations[0]?.action ??
        'hold';
      semanticResult = await buildSemanticConsistencyDecisionCoherenceBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        temporal: temporalIntegrityResult,
        resource: resourceBundle,
        reactive: reactiveResult,
        finalDecision,
      });
      governanceResult = applySemanticCoherenceToGovernance(
        governanceResult,
        semanticResult,
      );
      effectiveStrategy = applySemanticCoherenceToStrategy(
        effectiveStrategy,
        semanticResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setSemanticConsistencyDecisionCoherenceBundle(semanticResult);
    } else if (!retainLayer('semantic')) {
      setSemanticConsistencyDecisionCoherenceBundle(null);
    }

    let epistemicResult: EpistemicReliabilityEvidenceWeightBundle | null = null;
    if (aiPreferences.epistemicReliabilityEvidenceWeightEnabled !== false && cognitiveOn('epistemic')) {
      const { buildEpistemicReliabilityEvidenceWeightBundle } = await import(
        '../services/epistemicReliabilityEvidenceWeightEngine'
      );
      const {
        applyEpistemicReliabilityToGovernance,
        applyEpistemicReliabilityToStrategy,
        applyReliabilityDowngradeOnRollback,
      } = await import('../services/epistemicReliabilityEvidenceWeightIntegration');
      epistemicResult = await buildEpistemicReliabilityEvidenceWeightBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyReliabilityDowngradeOnRollback(
        governanceResult,
        temporalIntegrityResult,
        epistemicResult,
      );
      governanceResult = applyEpistemicReliabilityToGovernance(
        governanceResult,
        epistemicResult,
      );
      effectiveStrategy = applyEpistemicReliabilityToStrategy(
        effectiveStrategy,
        epistemicResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setEpistemicReliabilityEvidenceWeightBundle(epistemicResult);
    } else if (!retainLayer('epistemic')) {
      setEpistemicReliabilityEvidenceWeightBundle(null);
    }

    let arbitrationResult: CognitiveGoalArbitrationIntentPriorityBundle | null = null;
    if (aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled !== false && cognitiveOn('arbitration')) {
      const { buildCognitiveGoalArbitrationIntentPriorityBundle } = await import(
        '../services/cognitiveGoalArbitrationIntentPriorityEngine'
      );
      const {
        applyCognitiveGoalArbitrationToGovernance,
        applyCognitiveGoalArbitrationToStrategy,
      } = await import('../services/cognitiveGoalArbitrationIntentPriorityIntegration');

      arbitrationResult = await buildCognitiveGoalArbitrationIntentPriorityBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        epistemic: epistemicResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyCognitiveGoalArbitrationToGovernance(
        governanceResult,
        arbitrationResult,
        semanticResult,
        temporalIntegrityResult,
      );
      effectiveStrategy = applyCognitiveGoalArbitrationToStrategy(
        effectiveStrategy,
        arbitrationResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setCognitiveGoalArbitrationIntentPriorityBundle(arbitrationResult);
    } else if (!retainLayer('arbitration')) {
      setCognitiveGoalArbitrationIntentPriorityBundle(null);
    }

    let reflectionResult: MetaCognitiveRiskReflectionSelfCritiqueBundle | null = null;
    if (aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false && cognitiveOn('reflection')) {
      const { buildMetaCognitiveRiskReflectionSelfCritiqueBundle } = await import(
        '../services/metaCognitiveRiskReflectionSelfCritiqueEngine'
      );
      const {
        applyMetaCognitiveReflectionToGovernance,
        applyMetaCognitiveReflectionToStrategy,
      } = await import('../services/metaCognitiveRiskReflectionSelfCritiqueIntegration');
      reflectionResult = await buildMetaCognitiveRiskReflectionSelfCritiqueBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        epistemic: epistemicResult,
        arbitration: arbitrationResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyMetaCognitiveReflectionToGovernance(
        governanceResult,
        reflectionResult,
      );
      effectiveStrategy = applyMetaCognitiveReflectionToStrategy(
        effectiveStrategy,
        reflectionResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setMetaCognitiveRiskReflectionSelfCritiqueBundle(reflectionResult);
    } else if (!retainLayer('reflection')) {
      setMetaCognitiveRiskReflectionSelfCritiqueBundle(null);
    }

    let compressionResult: RecursiveMemoryCompressionStrategicAbstractionBundle | null = null;
    if (aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled !== false && cognitiveOn('compression')) {
      const { buildRecursiveMemoryCompressionStrategicAbstractionBundle } = await import(
        '../services/recursiveMemoryCompressionStrategicAbstractionEngine'
      );
      const {
        applyMemoryCompressionToGovernance,
        applyMemoryCompressionToStrategy,
      } = await import('../services/recursiveMemoryCompressionStrategicAbstractionIntegration');
      compressionResult = await buildRecursiveMemoryCompressionStrategicAbstractionBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        epistemic: epistemicResult,
        arbitration: arbitrationResult,
        reflection: reflectionResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyMemoryCompressionToGovernance(
        governanceResult,
        compressionResult,
      );
      effectiveStrategy = applyMemoryCompressionToStrategy(
        effectiveStrategy,
        compressionResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setRecursiveMemoryCompressionStrategicAbstractionBundle(compressionResult);
    } else if (!retainLayer('compression')) {
      setRecursiveMemoryCompressionStrategicAbstractionBundle(null);
    }

    let systemicResult: SystemicStabilityRecursiveGovernanceBundle | null = null;
    if (aiPreferences.systemicStabilityRecursiveGovernanceEnabled !== false && cognitiveOn('systemic')) {
      const { buildSystemicStabilityRecursiveGovernanceBundle } = await import(
        '../services/systemicStabilityRecursiveGovernanceEngine'
      );
      const {
        applySystemicStabilityToGovernance,
        applySystemicStabilityToStrategy,
      } = await import('../services/systemicStabilityRecursiveGovernanceIntegration');
      systemicResult = await buildSystemicStabilityRecursiveGovernanceBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        epistemic: epistemicResult,
        arbitration: arbitrationResult,
        reflection: reflectionResult,
        compression: compressionResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applySystemicStabilityToGovernance(
        governanceResult,
        systemicResult,
        compressionResult,
      );
      effectiveStrategy = applySystemicStabilityToStrategy(effectiveStrategy, systemicResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setSystemicStabilityRecursiveGovernanceBundle(systemicResult);
    } else if (!retainLayer('systemic')) {
      setSystemicStabilityRecursiveGovernanceBundle(null);
    }

    let recoveryResult: ExecutionRecoveryAdaptiveConfidenceBundle | null = null;
    if (aiPreferences.executionRecoveryAdaptiveConfidenceEnabled !== false && cognitiveOn('recovery')) {
      const { buildExecutionRecoveryAdaptiveConfidenceBundle } = await import(
        '../services/executionRecoveryAdaptiveConfidenceEngine'
      );
      const {
        applyExecutionRecoveryToGovernance,
        applyExecutionRecoveryToStrategy,
      } = await import('../services/executionRecoveryAdaptiveConfidenceIntegration');
      recoveryResult = await buildExecutionRecoveryAdaptiveConfidenceBundle({
        governance: governanceResult,
        trace: explainableTraceResult,
        strategy: effectiveStrategy,
        stability: integrityResult,
        reactive: reactiveResult,
        resource: resourceBundle,
        temporal: temporalIntegrityResult,
        semantic: semanticResult,
        epistemic: epistemicResult,
        arbitration: arbitrationResult,
        reflection: reflectionResult,
        compression: compressionResult,
        systemic: systemicResult,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyExecutionRecoveryToGovernance(
        governanceResult,
        recoveryResult,
        systemicResult,
      );
      effectiveStrategy = applyExecutionRecoveryToStrategy(
        effectiveStrategy,
        recoveryResult,
        systemicResult,
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setExecutionRecoveryAdaptiveConfidenceBundle(recoveryResult);
    } else if (!retainLayer('recovery')) {
      setExecutionRecoveryAdaptiveConfidenceBundle(null);
    }

    let marketRegimeResult: AutonomousMarketRegimeDetectionBundle | null = null;
    if (aiPreferences.autonomousMarketRegimeDetectionEnabled !== false) {
      const { buildAutonomousMarketRegimeDetectionBundle } = await import(
        '../services/autonomousMarketRegimeDetectionEngine'
      );
      const {
        applyMarketRegimeToGovernance,
        applyMarketRegimeToStrategy,
        persistRegimeCycle,
      } = await import('../services/autonomousMarketRegimeIntegration');
      marketRegimeResult = await buildAutonomousMarketRegimeDetectionBundle({
        macro: globalMarketAnalysis,
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        orchestration: null,
        reflection: reflectionResult,
        epistemic: epistemicResult,
        strategy: effectiveStrategy,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
      });
      governanceResult = applyMarketRegimeToGovernance(
        governanceResult,
        marketRegimeResult,
        systemicResult,
      );
      effectiveStrategy = applyMarketRegimeToStrategy(
        effectiveStrategy,
        marketRegimeResult,
        systemicResult,
        recoveryResult,
      );
      await persistRegimeCycle(marketRegimeResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setAutonomousMarketRegimeDetectionBundle(marketRegimeResult);
    } else {
      setAutonomousMarketRegimeDetectionBundle(null);
    }

    let consensusResult: CognitiveArbitrationConsensusBundle | null = null;
    if (aiPreferences.cognitiveArbitrationConsensusEnabled !== false) {
      const { buildCognitiveArbitrationConsensusBundle } = await import(
        '../services/cognitiveArbitrationConsensusEngine'
      );
      const {
        applyCognitiveConsensusToGovernance,
        applyCognitiveConsensusToStrategy,
        persistConsensusCycle,
      } = await import('../services/cognitiveArbitrationIntegration');
      consensusResult = await buildCognitiveArbitrationConsensusBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        risk: portfolioRiskBundle,
        macro: macroBundle,
        memory: compressionResult,
        reflection: reflectionResult,
        semantic: semanticResult,
        orchestration: null,
        strategy: effectiveStrategy,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
        arbitrationStartedAt: refreshStartedAt,
      });
      governanceResult = applyCognitiveConsensusToGovernance(
        governanceResult,
        consensusResult,
        systemicResult,
      );
      effectiveStrategy = applyCognitiveConsensusToStrategy(
        effectiveStrategy,
        consensusResult,
        systemicResult,
      );
      await persistConsensusCycle(consensusResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setCognitiveArbitrationConsensusBundle(consensusResult);
    } else {
      setCognitiveArbitrationConsensusBundle(null);
    }

    let metaReliabilityResult: MetaReliabilityLongitudinalTrustBundle | null = null;
    if (aiPreferences.metaReliabilityLongitudinalTrustEnabled !== false) {
      const { buildMetaReliabilityLongitudinalTrustBundle } = await import(
        '../services/metaReliabilityEngine'
      );
      const {
        applyMetaReliabilityToGovernance,
        applyMetaReliabilityToStrategy,
        persistMetaReliabilityCycle,
      } = await import('../services/metaReliabilityIntegration');
      metaReliabilityResult = await buildMetaReliabilityLongitudinalTrustBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        consensus: consensusResult,
        reflection: reflectionResult,
        semantic: semanticResult,
        orchestration: null,
        strategy: effectiveStrategy,
        finalDecision:
          governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyMetaReliabilityToGovernance(
        governanceResult,
        metaReliabilityResult,
        systemicResult,
      );
      effectiveStrategy = applyMetaReliabilityToStrategy(
        effectiveStrategy,
        metaReliabilityResult,
        systemicResult,
      );
      await persistMetaReliabilityCycle(
        metaReliabilityResult,
        governanceResult?.finalDecision ??
          effectiveStrategy?.todayRecommendations[0]?.action ??
          'hold',
        marketRegimeResult?.currentRegime ?? 'neutral',
      );
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setMetaReliabilityLongitudinalTrustBundle(metaReliabilityResult);
    } else {
      setMetaReliabilityLongitudinalTrustBundle(null);
    }

    let selfArchitectureResult: SelfEvolvingArchitectureReflectiveRefactorBundle | null = null;
    if (aiPreferences.selfEvolvingArchitectureReflectiveRefactorEnabled !== false) {
      const { buildSelfEvolvingArchitectureReflectiveRefactorBundle } = await import(
        '../services/selfEvolvingArchitectureEngine'
      );
      const {
        applySelfArchitectureToGovernance,
        applySelfArchitectureToStrategy,
        persistSelfArchitectureCycle,
      } = await import('../services/selfArchitectureIntegration');
      selfArchitectureResult = await buildSelfEvolvingArchitectureReflectiveRefactorBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        consensus: consensusResult,
        metaReliability: metaReliabilityResult,
        reflection: reflectionResult,
        semantic: semanticResult,
        memory: compressionResult,
        orchestration: null,
        strategy: effectiveStrategy,
        memoryPressure: queueSize > 60,
        batterySaver: aiPreferences.batterySaverEnabled,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applySelfArchitectureToGovernance(
        governanceResult,
        selfArchitectureResult,
        systemicResult,
      );
      effectiveStrategy = applySelfArchitectureToStrategy(
        effectiveStrategy,
        selfArchitectureResult,
      );
      await persistSelfArchitectureCycle(selfArchitectureResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setSelfEvolvingArchitectureReflectiveRefactorBundle(selfArchitectureResult);
    } else {
      setSelfEvolvingArchitectureReflectiveRefactorBundle(null);
    }

    let epistemicIntegrityResult: EpistemicIntegrityTruthCalibrationBundle | null = null;
    if (
      aiPreferences.epistemicIntegrityTruthCalibrationEnabled !== false &&
      resolveDeepLayerActivation('epistemicIntegrity', layerPlan, scheduleInput) &&
      !shouldSkipDeepLayerForCascade('epistemicIntegrity', cascadeEval)
    ) {
      const { buildEpistemicIntegrityTruthCalibrationBundle } = await import(
        '../services/epistemicIntegrityEngine'
      );
      const {
        applyEpistemicIntegrityToGovernance,
        applyEpistemicIntegrityToStrategy,
        persistEpistemicIntegrityCycle,
      } = await import('../services/epistemicIntegrityIntegration');
      epistemicIntegrityResult = await buildEpistemicIntegrityTruthCalibrationBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        consensus: consensusResult,
        metaReliability: metaReliabilityResult,
        selfArchitecture: selfArchitectureResult,
        reflection: reflectionResult,
        semantic: semanticResult,
        temporal: temporalIntegrityResult,
        epistemicWeight: epistemicResult,
        trace: explainableTraceResult,
        memory: compressionResult,
        orchestration: null,
        strategy: effectiveStrategy,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyEpistemicIntegrityToGovernance(
        governanceResult,
        epistemicIntegrityResult,
        systemicResult,
      );
      effectiveStrategy = applyEpistemicIntegrityToStrategy(
        effectiveStrategy,
        epistemicIntegrityResult,
        systemicResult,
      );
      await persistEpistemicIntegrityCycle(epistemicIntegrityResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setEpistemicIntegrityTruthCalibrationBundle(epistemicIntegrityResult);
    } else {
      setEpistemicIntegrityTruthCalibrationBundle(null);
    }

    let strategicMemoryGraphResult: StrategicMemoryGraphTemporalCausalityBundle | null = null;
    if (
      aiPreferences.strategicMemoryGraphTemporalCausalityEnabled !== false &&
      resolveDeepLayerActivation('strategicMemoryGraph', layerPlan, scheduleInput) &&
      !shouldSkipDeepLayerForCascade('strategicMemoryGraph', cascadeEval)
    ) {
      const { buildStrategicMemoryGraphTemporalCausalityBundle } = await import(
        '../services/strategicMemoryGraphEngine'
      );
      const {
        applyStrategicMemoryGraphToGovernance,
        applyStrategicMemoryGraphToStrategy,
        persistStrategicMemoryGraphCycle,
      } = await import('../services/strategicMemoryGraphIntegration');
      strategicMemoryGraphResult = await buildStrategicMemoryGraphTemporalCausalityBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        consensus: consensusResult,
        metaReliability: metaReliabilityResult,
        selfArchitecture: selfArchitectureResult,
        epistemic: epistemicIntegrityResult,
        reflection: reflectionResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyStrategicMemoryGraphToGovernance(
        governanceResult,
        strategicMemoryGraphResult,
        systemicResult,
      );
      effectiveStrategy = applyStrategicMemoryGraphToStrategy(
        effectiveStrategy,
        strategicMemoryGraphResult,
        systemicResult,
      );
      await persistStrategicMemoryGraphCycle(strategicMemoryGraphResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setStrategicMemoryGraphTemporalCausalityBundle(strategicMemoryGraphResult);
    } else {
      setStrategicMemoryGraphTemporalCausalityBundle(null);
    }

    let cognitiveResourceEconomyResult: CognitiveResourceEconomyAttentionAllocationBundle | null =
      null;
    if (aiPreferences.cognitiveResourceEconomyAttentionAllocationEnabled !== false) {
      const { buildCognitiveResourceEconomyAttentionAllocationBundle } = await import(
        '../services/cognitiveResourceEconomyEngine'
      );
      const {
        applyCognitiveResourceEconomyToGovernance,
        applyCognitiveResourceEconomyToStrategy,
        persistCognitiveResourceEconomyCycle,
      } = await import('../services/cognitiveResourceEconomyIntegration');
      cognitiveResourceEconomyResult =
        await buildCognitiveResourceEconomyAttentionAllocationBundle({
          governance: governanceResult,
          stability: integrityResult,
          systemic: systemicResult,
          recovery: recoveryResult,
          regime: marketRegimeResult,
          consensus: consensusResult,
          metaReliability: metaReliabilityResult,
          epistemic: epistemicIntegrityResult,
          strategicMemoryGraph: strategicMemoryGraphResult,
          reflection: reflectionResult,
          resource: resourceBundle,
          orchestration: null,
          strategy: effectiveStrategy,
          batterySaver: aiPreferences.batterySaverEnabled,
          memoryPressure: queueSize > 60,
          appForeground: isAppForeground(),
          refreshCount: suggestionsRef.current.length,
          auditStartedAt: refreshStartedAt,
        });
      governanceResult = applyCognitiveResourceEconomyToGovernance(
        governanceResult,
        cognitiveResourceEconomyResult,
        systemicResult,
      );
      effectiveStrategy = applyCognitiveResourceEconomyToStrategy(
        effectiveStrategy,
        cognitiveResourceEconomyResult,
        systemicResult,
      );
      await persistCognitiveResourceEconomyCycle(cognitiveResourceEconomyResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setCognitiveResourceEconomyAttentionAllocationBundle(cognitiveResourceEconomyResult);
    } else {
      setCognitiveResourceEconomyAttentionAllocationBundle(null);
    }

    let unifiedCognitiveStateResult: UnifiedCognitiveStateExecutiveAwarenessBundle | null = null;
    if (aiPreferences.unifiedCognitiveStateExecutiveAwarenessEnabled !== false) {
      const { buildUnifiedCognitiveStateExecutiveAwarenessBundle } = await import(
        '../services/unifiedCognitiveStateEngine'
      );
      const {
        applyUnifiedCognitiveStateToGovernance,
        applyUnifiedCognitiveStateToStrategy,
        persistUnifiedCognitiveStateCycle,
      } = await import('../services/unifiedCognitiveStateIntegration');
      unifiedCognitiveStateResult = await buildUnifiedCognitiveStateExecutiveAwarenessBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        recovery: recoveryResult,
        regime: marketRegimeResult,
        consensus: consensusResult,
        metaReliability: metaReliabilityResult,
        selfArchitecture: selfArchitectureResult,
        epistemic: epistemicIntegrityResult,
        strategicMemoryGraph: strategicMemoryGraphResult,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        orchestration: null,
        strategy: effectiveStrategy,
        batterySaver: aiPreferences.batterySaverEnabled,
        memoryPressure: queueSize > 60,
        appForeground: isAppForeground(),
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyUnifiedCognitiveStateToGovernance(
        governanceResult,
        unifiedCognitiveStateResult,
        systemicResult,
      );
      effectiveStrategy = applyUnifiedCognitiveStateToStrategy(
        effectiveStrategy,
        unifiedCognitiveStateResult,
        systemicResult,
      );
      await persistUnifiedCognitiveStateCycle(unifiedCognitiveStateResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setUnifiedCognitiveStateExecutiveAwarenessBundle(unifiedCognitiveStateResult);
    } else {
      setUnifiedCognitiveStateExecutiveAwarenessBundle(null);
    }

    let humanIntentContinuityResult: HumanIntentContinuityAlignmentPreservationBundle | null = null;
    if (aiPreferences.humanIntentContinuityAlignmentPreservationEnabled !== false) {
      const { buildHumanIntentContinuityAlignmentPreservationBundle } = await import(
        '../services/humanIntentContinuityEngine'
      );
      const {
        applyHumanIntentContinuityToGovernance,
        applyHumanIntentContinuityToStrategy,
        persistHumanIntentContinuityCycle,
      } = await import('../services/humanIntentContinuityIntegration');
      humanIntentContinuityResult = await buildHumanIntentContinuityAlignmentPreservationBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        consensus: consensusResult,
        epistemic: epistemicIntegrityResult,
        strategicMemoryGraph: strategicMemoryGraphResult,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        unifiedCognitiveState: unifiedCognitiveStateResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyHumanIntentContinuityToGovernance(
        governanceResult,
        humanIntentContinuityResult,
        systemicResult,
      );
      effectiveStrategy = applyHumanIntentContinuityToStrategy(
        effectiveStrategy,
        humanIntentContinuityResult,
        systemicResult,
      );
      await persistHumanIntentContinuityCycle(humanIntentContinuityResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setHumanIntentContinuityAlignmentPreservationBundle(humanIntentContinuityResult);
    } else {
      setHumanIntentContinuityAlignmentPreservationBundle(null);
    }

    let adaptiveExplorationResult: AdaptiveExplorationAntiDogmaBundle | null = null;
    if (
      aiPreferences.adaptiveExplorationAntiDogmaEnabled !== false &&
      resolveDeepLayerActivation('adaptiveExploration', layerPlan, scheduleInput) &&
      !shouldSkipDeepLayerForCascade('adaptiveExploration', cascadeEval)
    ) {
      const { buildAdaptiveExplorationAntiDogmaBundle } = await import(
        '../services/adaptiveExplorationEngine'
      );
      const {
        applyAdaptiveExplorationToGovernance,
        applyAdaptiveExplorationToStrategy,
        persistAdaptiveExplorationCycle,
      } = await import('../services/adaptiveExplorationIntegration');
      adaptiveExplorationResult = await buildAdaptiveExplorationAntiDogmaBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        consensus: consensusResult,
        epistemic: epistemicIntegrityResult,
        strategicMemoryGraph: strategicMemoryGraphResult,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        unifiedCognitiveState: unifiedCognitiveStateResult,
        humanIntentContinuity: humanIntentContinuityResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyAdaptiveExplorationToGovernance(
        governanceResult,
        adaptiveExplorationResult,
        systemicResult,
      );
      effectiveStrategy = applyAdaptiveExplorationToStrategy(
        effectiveStrategy,
        adaptiveExplorationResult,
        systemicResult,
      );
      await persistAdaptiveExplorationCycle(adaptiveExplorationResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setAdaptiveExplorationAntiDogmaBundle(adaptiveExplorationResult);
    } else {
      setAdaptiveExplorationAntiDogmaBundle(null);
    }

    let constitutionalGovernanceResult: ConstitutionalGovernanceSystemCoherenceBundle | null = null;
    if (aiPreferences.constitutionalGovernanceSystemCoherenceEnabled !== false) {
      const { buildConstitutionalGovernanceSystemCoherenceBundle } = await import(
        '../services/constitutionalGovernanceEngine'
      );
      const {
        applyConstitutionalGovernanceToGovernance,
        applyConstitutionalGovernanceToStrategy,
        persistConstitutionalGovernanceCycle,
      } = await import('../services/constitutionalGovernanceIntegration');
      constitutionalGovernanceResult = await buildConstitutionalGovernanceSystemCoherenceBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        consensus: consensusResult,
        epistemic: epistemicIntegrityResult,
        strategicMemoryGraph: strategicMemoryGraphResult,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        unifiedCognitiveState: unifiedCognitiveStateResult,
        humanIntentContinuity: humanIntentContinuityResult,
        adaptiveExploration: adaptiveExplorationResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyConstitutionalGovernanceToGovernance(
        governanceResult,
        constitutionalGovernanceResult,
        systemicResult,
      );
      effectiveStrategy = applyConstitutionalGovernanceToStrategy(
        effectiveStrategy,
        constitutionalGovernanceResult,
        systemicResult,
      );
      await persistConstitutionalGovernanceCycle(constitutionalGovernanceResult);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setConstitutionalGovernanceSystemCoherenceBundle(constitutionalGovernanceResult);
    } else {
      setConstitutionalGovernanceSystemCoherenceBundle(null);
    }

    let explainableGovernanceResult: ExplainableGovernanceTransparentReasoningBundle | null = null;
    if (aiPreferences.explainableGovernanceTransparentReasoningEnabled !== false) {
      const explainableStartedAt = Date.now();
      const { buildExplainableGovernanceTransparentReasoningBundle } = await import(
        '../services/explainableGovernanceEngine'
      );
      const {
        applyExplainableGovernanceToGovernance,
        applyExplainableGovernanceToStrategy,
        persistExplainableGovernanceCycle,
      } = await import('../services/explainableGovernanceIntegration');
      explainableGovernanceResult = await buildExplainableGovernanceTransparentReasoningBundle({
        governance: governanceResult,
        stability: integrityResult,
        systemic: systemicResult,
        consensus: consensusResult,
        metaReliability: metaReliabilityResult,
        epistemic: epistemicIntegrityResult,
        strategicMemoryGraph: strategicMemoryGraphResult,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        unifiedCognitiveState: unifiedCognitiveStateResult,
        humanIntentContinuity: humanIntentContinuityResult,
        adaptiveExploration: adaptiveExplorationResult,
        constitutionalGovernance: constitutionalGovernanceResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        auditStartedAt: refreshStartedAt,
      });
      governanceResult = applyExplainableGovernanceToGovernance(
        governanceResult,
        explainableGovernanceResult,
        systemicResult,
      );
      effectiveStrategy = applyExplainableGovernanceToStrategy(
        effectiveStrategy,
        explainableGovernanceResult,
        systemicResult,
      );
      await persistExplainableGovernanceCycle(explainableGovernanceResult);
      const { recordExplanationGenerationDurationMs } = await import(
        '../services/runtimeTelemetryEngine'
      );
      recordExplanationGenerationDurationMs(Date.now() - explainableStartedAt);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setExplainableGovernanceTransparentReasoningBundle(explainableGovernanceResult);
    } else {
      setExplainableGovernanceTransparentReasoningBundle(null);
    }

    const { recordOrchestrationDurationMs, evaluateRuntimeTelemetry: finalizeTelemetry } =
      await import('../services/runtimeTelemetryEngine');
    recordOrchestrationDurationMs(Date.now() - refreshStartedAt);
    const telemetryEvalFinal = finalizeTelemetry({
      performance: perfSnap,
      mobileMetrics: layerPlan.mobileMetrics,
      asyncMetrics: asyncEval.metrics,
      queueSize,
      memoryPressure: memoryPressureActive,
      thermalPressurePct: scheduleInput.thermalPressurePct,
      sessionMinutes: getSessionMinutes(),
      cascadePressure: cascadeEval.metrics.cascadePressure,
      refreshDurationMs: Date.now() - refreshStartedAt,
    });
    setRuntimeTelemetryEvaluation(telemetryEvalFinal);
    const { evaluateAndApplyRuntimeOrchestrator: finalizeOrchestrator } = await import(
      '../runtime/orchestrator/runtimeOrchestratorIntegration'
    );
    const orchEvalFinal = finalizeOrchestrator({
      telemetry: telemetryEvalFinal,
      performance: perfSnap,
      cascadePressure: cascadeEval.metrics.cascadePressure,
      sessionMinutes: getSessionMinutes(),
    });
    setRuntimeOrchestratorEvaluation(orchEvalFinal);
    setRuntimeTelemetryDashboardBundle(
      buildRuntimeTelemetryDashboardBundle(telemetryEvalFinal, orchEvalFinal.snapshot),
    );

    let runtimeSurvivalResult: RuntimeSurvivalMobileResilienceBundle | null = null;
    if (aiPreferences.runtimeSurvivalMobileResilienceEnabled !== false) {
      const { buildRuntimeSurvivalMobileResilienceBundle } = await import(
        '../services/runtimeSurvivalEngine'
      );
      const {
        applyRuntimeSurvivalToGovernance,
        applyRuntimeSurvivalToStrategy,
        persistRuntimeSurvivalCycle,
      } = await import('../services/runtimeSurvivalIntegration');
      const resumeAt = isAppForeground() ? new Date().toISOString() : null;
      runtimeSurvivalResult = await buildRuntimeSurvivalMobileResilienceBundle({
        governance: governanceResult,
        performance: perfSnap,
        memoryPressure: memoryPressureActive,
        queueSize,
        cognitiveResourceEconomy: cognitiveResourceEconomyResult,
        constitutionalGovernance: constitutionalGovernanceResult,
        explainableGovernance: explainableGovernanceResult,
        orchestration: null,
        strategy: effectiveStrategy,
        refreshCount: suggestionsRef.current.length,
        lastResumeAt: resumeAt,
        websocketConnected: !perfSnap.offlineMode && !perfSnap.networkPaused,
        auditStartedAt: refreshStartedAt,
        layerSchedulePlan: layerPlan,
        cascadeEvaluation: cascadeEval,
        asyncEvaluation: asyncEval,
        telemetryEvaluation: telemetryEvalFinal,
      });
      governanceResult = applyRuntimeSurvivalToGovernance(
        governanceResult,
        runtimeSurvivalResult,
        systemicResult,
      );
      effectiveStrategy = applyRuntimeSurvivalToStrategy(
        effectiveStrategy,
        runtimeSurvivalResult,
        systemicResult,
      );
      await persistRuntimeSurvivalCycle(runtimeSurvivalResult, resumeAt);
      setAiGovernanceDecisionBundle(governanceResult);
      if (effectiveStrategy) setStrategyBundle(effectiveStrategy);
      setRuntimeSurvivalMobileResilienceBundle(runtimeSurvivalResult);
    } else {
      setRuntimeSurvivalMobileResilienceBundle(null);
    }

    if (aiPreferences.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled !== false) {
      const { buildDynamicLayerOrchestrationMobileRuntimeOptimizationBundle } = await import(
        '../services/dynamicLayerOrchestrationMobileRuntimeOptimizationEngine'
      );
      const orchestrationResult = await buildDynamicLayerOrchestrationMobileRuntimeOptimizationBundle({
        reactive: reactiveResult,
        resource: resourceBundle,
        stability: integrityResult,
        systemic: systemicResult,
        stateFingerprintJa: JSON.stringify(fp),
        batterySaver: aiPreferences.batterySaverEnabled,
        appForeground: isAppForeground(),
        memoryPressure: queueSize > 60,
        offlineMode: perfSnap.offlineMode,
        emergencyOverride:
          systemicResult?.systemicEmergencySafeMode === true ||
          (integrityResult?.productionSnapshot.emergencyLevel ?? 0) > 0,
        dataReliabilityLow: (dataReliability?.globalDataQualityScore ?? 100) < 50,
        governanceVeto: governanceResult?.finalDecision === 'avoid',
        mobileOptimizationMode: true,
        refreshStartedAt,
      });
      setDynamicLayerOrchestrationMobileRuntimeOptimizationBundle(orchestrationResult);
      if (marketRegimeResult) {
        const { enrichRegimeBundleWithOrchestration } = await import(
          '../services/autonomousMarketRegimeIntegration'
        );
        setAutonomousMarketRegimeDetectionBundle(
          enrichRegimeBundleWithOrchestration(marketRegimeResult, orchestrationResult),
        );
      }
      if (consensusResult) {
        const { enrichConsensusBundleWithOrchestration } = await import(
          '../services/cognitiveArbitrationIntegration'
        );
        setCognitiveArbitrationConsensusBundle(
          enrichConsensusBundleWithOrchestration(consensusResult, orchestrationResult),
        );
      }
      if (metaReliabilityResult) {
        const { enrichMetaReliabilityBundleWithOrchestration } = await import(
          '../services/metaReliabilityIntegration'
        );
        setMetaReliabilityLongitudinalTrustBundle(
          enrichMetaReliabilityBundleWithOrchestration(
            metaReliabilityResult,
            orchestrationResult,
          ),
        );
      }
      if (selfArchitectureResult) {
        const { enrichSelfArchitectureBundleWithOrchestration } = await import(
          '../services/selfArchitectureIntegration'
        );
        setSelfEvolvingArchitectureReflectiveRefactorBundle(
          enrichSelfArchitectureBundleWithOrchestration(
            selfArchitectureResult,
            orchestrationResult,
          ),
        );
      }
      if (epistemicIntegrityResult) {
        const { enrichEpistemicIntegrityBundleWithOrchestration } = await import(
          '../services/epistemicIntegrityIntegration'
        );
        setEpistemicIntegrityTruthCalibrationBundle(
          enrichEpistemicIntegrityBundleWithOrchestration(
            epistemicIntegrityResult,
            orchestrationResult,
          ),
        );
      }
      if (strategicMemoryGraphResult) {
        const { enrichStrategicMemoryGraphBundleWithOrchestration } = await import(
          '../services/strategicMemoryGraphIntegration'
        );
        setStrategicMemoryGraphTemporalCausalityBundle(
          enrichStrategicMemoryGraphBundleWithOrchestration(
            strategicMemoryGraphResult,
            orchestrationResult,
          ),
        );
      }
      if (cognitiveResourceEconomyResult) {
        const { enrichCognitiveResourceEconomyBundleWithOrchestration } = await import(
          '../services/cognitiveResourceEconomyIntegration'
        );
        setCognitiveResourceEconomyAttentionAllocationBundle(
          enrichCognitiveResourceEconomyBundleWithOrchestration(
            cognitiveResourceEconomyResult,
            orchestrationResult,
          ),
        );
      }
      if (unifiedCognitiveStateResult) {
        const { enrichUnifiedCognitiveStateBundleWithOrchestration } = await import(
          '../services/unifiedCognitiveStateIntegration'
        );
        setUnifiedCognitiveStateExecutiveAwarenessBundle(
          enrichUnifiedCognitiveStateBundleWithOrchestration(
            unifiedCognitiveStateResult,
            orchestrationResult,
          ),
        );
      }
      if (humanIntentContinuityResult) {
        const { enrichHumanIntentContinuityBundleWithOrchestration } = await import(
          '../services/humanIntentContinuityIntegration'
        );
        setHumanIntentContinuityAlignmentPreservationBundle(
          enrichHumanIntentContinuityBundleWithOrchestration(
            humanIntentContinuityResult,
            orchestrationResult,
          ),
        );
      }
      if (adaptiveExplorationResult) {
        const { enrichAdaptiveExplorationBundleWithOrchestration } = await import(
          '../services/adaptiveExplorationIntegration'
        );
        setAdaptiveExplorationAntiDogmaBundle(
          enrichAdaptiveExplorationBundleWithOrchestration(
            adaptiveExplorationResult,
            orchestrationResult,
          ),
        );
      }
      if (constitutionalGovernanceResult) {
        const { enrichConstitutionalGovernanceBundleWithOrchestration } = await import(
          '../services/constitutionalGovernanceIntegration'
        );
        setConstitutionalGovernanceSystemCoherenceBundle(
          enrichConstitutionalGovernanceBundleWithOrchestration(
            constitutionalGovernanceResult,
            orchestrationResult,
          ),
        );
      }
      if (explainableGovernanceResult) {
        const { enrichExplainableGovernanceBundleWithOrchestration } = await import(
          '../services/explainableGovernanceIntegration'
        );
        setExplainableGovernanceTransparentReasoningBundle(
          enrichExplainableGovernanceBundleWithOrchestration(
            explainableGovernanceResult,
            orchestrationResult,
          ),
        );
      }
      if (runtimeSurvivalResult) {
        const { enrichRuntimeSurvivalBundleWithOrchestration } = await import(
          '../services/runtimeSurvivalIntegration'
        );
        setRuntimeSurvivalMobileResilienceBundle(
          enrichRuntimeSurvivalBundleWithOrchestration(
            runtimeSurvivalResult,
            orchestrationResult,
          ),
        );
      }
    } else {
      setDynamicLayerOrchestrationMobileRuntimeOptimizationBundle(null);
    }

    const allAdded: ProactiveSuggestion[] = [];
    const enqueueResult = enqueueProactiveCandidates(
      candidatesToEnqueue,
      suggestionsRef.current,
      suppressRef.current,
    );
    const { trimProactiveQueueOverflow } = await import(
      '../services/productionStability/queueGuards'
    );
    const { setProactiveQueueMetrics } = await import(
      '../services/productionStability/productionStabilityRuntime'
    );
    const trimmed = trimProactiveQueueOverflow(enqueueResult.suggestions);
    const next = trimmed;
    const nextSuppress = enqueueResult.suppressUntil;
    allAdded.push(...enqueueResult.added);
    setProactiveQueueMetrics(next.length);
    setSuggestions(next);
    setSuppressUntil(nextSuppress);
    setFingerprint(fp);

    if (loadedRef.current) {
      await persist(next, nextSuppress, fp);
    }

    const notificationsSupported = areNotificationsSupported();
    const metaStorage =
      aiPreferences.metaDecisionEnabled && allAdded.length > 0
        ? await import('../services/metaDecisionStorage')
        : null;
    for (const item of allAdded) {
      if (metaStorage) {
        if (item.priority === 'critical' || item.priority === 'high') {
          await metaStorage.incrementMetaDailyBudget(item.priority);
        }
        await metaStorage.recordMetaFatigueEntry(item.category, item.symbol ?? null);
      }
      void recordIntelligenceFromProactive({
        titleJa: item.titleJa,
        bodyJa: item.bodyJa,
        notificationWhyJa: item.notificationWhyJa,
        symbol: item.symbol ?? null,
        market: item.market ?? null,
        dedupeKey: item.dedupeKey,
      });
      if (item.priority === 'low') continue;
      await recordProactiveAdvisorEvent(item, 'delivered');
      const { canSendNotificationFloodGuard } = await import(
        '../services/productionStability/queueGuards'
      );
      const { canSendGlobalNotification, recordGlobalNotificationSent } = await import(
        '../services/performanceCostRuntime'
      );
      if (!canSendNotificationFloodGuard() || !canSendGlobalNotification()) continue;
      recordGlobalNotificationSent();
      const result = await deliverProactiveLocalPush(
        stateRef.current,
        item,
        lastPushRef.current,
        { notificationsSupported },
      );
      lastPushRef.current = result.nextLastPushByKey;
    }
    noteProactiveRefreshForMetrics(Date.now() - refreshStartedAt);
    } finally {
      releaseRenderBudget();
    }
  }, [
    aiPreferences.proactiveBriefingsEnabled,
    aiPreferences.aiAnalysisMode,
    aiPreferences.realityValidationEnabled,
    aiPreferences.paperBrokerEnabled,
    aiPreferences.strategyExecutionEnabled,
    aiPreferences.macroIntelligenceEnabled,
    aiPreferences.dataReliabilityEnabled,
    aiPreferences.selfEvaluationEnabled,
    aiPreferences.portfolioRiskExposureEnabled,
    aiPreferences.capitalAllocationEnabled,
    aiPreferences.systemStabilityIntegrityEnabled,
    aiPreferences.aiGovernanceDecisionEnabled,
    aiPreferences.reactiveEventOrchestrationEnabled,
    aiPreferences.explainableCognitiveTraceEnabled,
    aiPreferences.adaptiveResourceComputeBudgetEnabled,
    aiPreferences.stateIntegrityTemporalConsistencyEnabled,
    aiPreferences.semanticConsistencyDecisionCoherenceEnabled,
    aiPreferences.epistemicReliabilityEvidenceWeightEnabled,
    aiPreferences.cognitiveGoalArbitrationIntentPriorityEnabled,
    aiPreferences.metaCognitiveRiskReflectionSelfCritiqueEnabled,
    aiPreferences.recursiveMemoryCompressionStrategicAbstractionEnabled,
    aiPreferences.systemicStabilityRecursiveGovernanceEnabled,
    aiPreferences.executionRecoveryAdaptiveConfidenceEnabled,
    aiPreferences.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled,
    aiPreferences.autonomousMarketRegimeDetectionEnabled,
    aiPreferences.cognitiveArbitrationConsensusEnabled,
    aiPreferences.metaDecisionEnabled,
    aiPreferences.autonomousMonitoringEnabled,
    aiPreferences.conciergeUxMode,
    aiPreferences.strategyTacticalMode,
    allSignals,
    marketRegime,
    persist,
    priceSync,
    worldModel,
  ]);

  const refreshProactiveCoreWrapped = useCallback(async () => {
    await runCoordinatedTask('orchestration', 'HIGH', 'proactive-core', refreshProactiveCore);
  }, [refreshProactiveCore]);

  refreshProactiveCoreRef.current = refreshProactiveCoreWrapped;

  useEffect(() => {
    markSessionStart();
    void import('../services/runtimeTelemetryEngine').then(({ initRuntimeTelemetryEngine }) => {
      void initRuntimeTelemetryEngine();
    });
    void import('../native/runtime/nativeRuntimeIntegration').then(({ initNativeRuntimeLayer }) => {
      void initNativeRuntimeLayer();
    });
    void import('../services/mobileRedmiRuntime').then(({ initMobileRedmiRuntime }) => {
      initMobileRedmiRuntime(() => {
        void refreshProactiveCoreRef.current();
      });
    });
  }, []);

  const refreshProactive = useCallback(async () => {
    if (!aiPreferences.proactiveBriefingsEnabled) return;
    const { dispatchConciergeEvent } = await import(
      '../services/reactiveEventOrchestrationIntegration'
    );
    dispatchConciergeEvent({
      type: 'portfolio_change',
      priority: 'high',
      dedupeKey: 'manual-refresh',
    });
  }, [aiPreferences.proactiveBriefingsEnabled]);

  refreshProactiveRef.current = refreshProactive;

  useEffect(() => {
    let unregisterStability: (() => void) | undefined;
    let unregisterOrchestration: (() => void) | undefined;
    void import('../services/systemStabilityIntegrityIntegration').then((m) => {
      m.initSystemStabilityIntegrity();
      unregisterStability = m.registerProactiveRefreshForIntegrity(() => refreshProactiveRef.current());
    });
    void import('../services/reactiveEventOrchestrationIntegration').then((m) => {
      m.initReactiveEventOrchestration();
      unregisterOrchestration = m.registerOrchestratedRefresh(async () => {
        const { runProactiveRefreshSingleFlight } = await import(
          '../services/systemStabilityIntegrityIntegration'
        );
        const { duplicateBlocked } = await runProactiveRefreshSingleFlight(async () => {
          await refreshProactiveCoreRef.current();
        });
        lastDuplicateRefreshBlockedRef.current = duplicateBlocked;
      });
    });
    return () => {
      unregisterStability?.();
      unregisterOrchestration?.();
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void import('../services/reactiveEventOrchestrationIntegration').then((m) => {
      m.dispatchConciergeEvent({
        type: 'market_update',
        priority: 'normal',
        dedupeKey: `sync:${priceSync.lastSuccessAt ?? ''}:${allSignals.length}:${marketRegime?.regimeId ?? ''}`,
      });
    });
  }, [
    priceSync.lastResult,
    priceSync.lastError,
    priceSync.lastSuccessAt,
    allSignals.length,
    marketRegime?.regimeId,
    worldModel?.portfolioRisk.staleHoldingsCount,
    state.portfolio.length,
  ]);

  const onResume = useCallback(() => {
    void import('../services/reactiveEventOrchestrationIntegration').then(async (m) => {
      await m.orchestrateResumeReplay();
      m.dispatchConciergeEvent({
        type: 'portfolio_change',
        priority: 'high',
        dedupeKey: 'resume-replay',
      });
      await refreshProactiveCoreRef.current();
      const current = suggestionsRef.current;
      const summary = buildProactiveResumeSummaryJa(current);
      if (summary) {
        setResumeSummaryJa(summary);
        setShowResumeBanner(true);
      }
      const hasHigh = current.some(
        (s) =>
          (s.priority === 'critical' || s.priority === 'high') && s.status === 'pending',
      );
      if (hasHigh && aiPreferences.voiceEnabled && aiPreferences.proactiveVoiceOnResume) {
        setVoiceResumePromptVisible(true);
      }
    });
  }, [aiPreferences.proactiveVoiceOnResume, aiPreferences.voiceEnabled]);

  useAppResume(onResume);

  const updateStatus = useCallback(
    async (id: string, status: ProactiveSuggestionStatus) => {
      const prevItem = suggestionsRef.current.find((s) => s.id === id);
      const next = updateProactiveStatus(suggestionsRef.current, id, status);
      setSuggestions(next);
      await persist(next, suppressRef.current, fingerprintRef.current);
      if (prevItem) {
        const kind = statusToAdvisorEventKind(status);
        if (kind) void recordProactiveAdvisorEvent(prevItem, kind);
      }
    },
    [persist],
  );

  const acknowledge = useCallback(
    async (id: string) => {
      const item = suggestionsRef.current.find((s) => s.id === id);
      await updateStatus(id, 'acknowledged');
      const { updateAdaptiveFromUserAction } = await import(
        '../services/autonomousMonitoringStorage'
      );
      await updateAdaptiveFromUserAction('acknowledged');
      if (item) {
        emitChatAuditNotice(`提案確認: ${item.titleJa}`, 'audit');
      }
    },
    [updateStatus],
  );
  const seeLater = useCallback(async (id: string) => {
    await updateStatus(id, 'seen_later');
    const { updateAdaptiveFromUserAction } = await import(
      '../services/autonomousMonitoringStorage'
    );
    await updateAdaptiveFromUserAction('dismissed');
  }, [updateStatus]);
  const openDetail = useCallback((id: string) => updateStatus(id, 'opened_detail'), [updateStatus]);

  const unreadCount = useMemo(() => countUnhandledProactive(suggestions), [suggestions]);
  const sorted = useMemo(() => sortProactiveForDisplay(suggestions), [suggestions]);

  const acceptVoiceResume = useCallback(() => {
    setVoiceResumePromptVisible(false);
    const text = resumeSummaryJa ?? buildProactiveResumeSummaryJa(suggestionsRef.current);
    if (text && aiPreferences.voiceEnabled) {
      void speakVoiceOutput(text, { rate: aiPreferences.voiceSpeechRate });
    }
  }, [aiPreferences.voiceEnabled, aiPreferences.voiceSpeechRate, resumeSummaryJa]);

  const value = useMemo(
    (): ProactiveConciergeContextValue => ({
      suggestions: sorted,
      autonomousBundle,
      metaBundle,
      strategyBundle,
      realityBundle,
      executionBundle,
      selfEvaluationBundle,
      macroIntelligenceBundle,
      dataReliabilityBundle,
      portfolioRiskExposureBundle,
      capitalAllocationBundle,
      systemStabilityIntegrityBundle,
      aiGovernanceDecisionBundle,
      reactiveEventOrchestrationBundle,
      explainableCognitiveTraceBundle,
      adaptiveResourceComputeBudgetBundle,
      stateIntegrityTemporalConsistencyBundle,
      semanticConsistencyDecisionCoherenceBundle,
      epistemicReliabilityEvidenceWeightBundle,
      cognitiveGoalArbitrationIntentPriorityBundle,
      metaCognitiveRiskReflectionSelfCritiqueBundle,
      recursiveMemoryCompressionStrategicAbstractionBundle,
      systemicStabilityRecursiveGovernanceBundle,
      executionRecoveryAdaptiveConfidenceBundle,
      dynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
      autonomousMarketRegimeDetectionBundle,
      cognitiveArbitrationConsensusBundle,
      metaReliabilityLongitudinalTrustBundle,
      selfEvolvingArchitectureReflectiveRefactorBundle,
      epistemicIntegrityTruthCalibrationBundle,
      strategicMemoryGraphTemporalCausalityBundle,
      cognitiveResourceEconomyAttentionAllocationBundle,
      unifiedCognitiveStateExecutiveAwarenessBundle,
      humanIntentContinuityAlignmentPreservationBundle,
      adaptiveExplorationAntiDogmaBundle,
      constitutionalGovernanceSystemCoherenceBundle,
      explainableGovernanceTransparentReasoningBundle,
      runtimeSurvivalMobileResilienceBundle,
      layerRuntimeSchedulePlan,
      crossLayerCascadeEvaluation,
      asyncRuntimeEvaluation,
      runtimeTelemetryEvaluation,
      runtimeTelemetryDashboardBundle,
      runtimeOrchestratorEvaluation,
      unreadCount,
      resumeSummaryJa,
      showResumeBanner,
      dismissResumeBanner: () => setShowResumeBanner(false),
      refreshProactive,
      acknowledge,
      seeLater,
      openDetail,
      voiceResumePromptVisible,
      acceptVoiceResume,
      dismissVoiceResume: () => setVoiceResumePromptVisible(false),
    }),
    [
      sorted,
      autonomousBundle,
      metaBundle,
      strategyBundle,
      realityBundle,
      executionBundle,
      selfEvaluationBundle,
      macroIntelligenceBundle,
      dataReliabilityBundle,
      portfolioRiskExposureBundle,
      capitalAllocationBundle,
      systemStabilityIntegrityBundle,
      aiGovernanceDecisionBundle,
      reactiveEventOrchestrationBundle,
      explainableCognitiveTraceBundle,
      adaptiveResourceComputeBudgetBundle,
      stateIntegrityTemporalConsistencyBundle,
      semanticConsistencyDecisionCoherenceBundle,
      epistemicReliabilityEvidenceWeightBundle,
      cognitiveGoalArbitrationIntentPriorityBundle,
      metaCognitiveRiskReflectionSelfCritiqueBundle,
      recursiveMemoryCompressionStrategicAbstractionBundle,
      systemicStabilityRecursiveGovernanceBundle,
      executionRecoveryAdaptiveConfidenceBundle,
      dynamicLayerOrchestrationMobileRuntimeOptimizationBundle,
      autonomousMarketRegimeDetectionBundle,
      cognitiveArbitrationConsensusBundle,
      metaReliabilityLongitudinalTrustBundle,
      selfEvolvingArchitectureReflectiveRefactorBundle,
      epistemicIntegrityTruthCalibrationBundle,
      strategicMemoryGraphTemporalCausalityBundle,
      cognitiveResourceEconomyAttentionAllocationBundle,
      unifiedCognitiveStateExecutiveAwarenessBundle,
      humanIntentContinuityAlignmentPreservationBundle,
      adaptiveExplorationAntiDogmaBundle,
      constitutionalGovernanceSystemCoherenceBundle,
      explainableGovernanceTransparentReasoningBundle,
      runtimeSurvivalMobileResilienceBundle,
      layerRuntimeSchedulePlan,
      crossLayerCascadeEvaluation,
      asyncRuntimeEvaluation,
      runtimeTelemetryEvaluation,
      runtimeTelemetryDashboardBundle,
      runtimeOrchestratorEvaluation,
      unreadCount,
      resumeSummaryJa,
      showResumeBanner,
      refreshProactive,
      acknowledge,
      seeLater,
      openDetail,
      voiceResumePromptVisible,
      acceptVoiceResume,
    ],
  );

  return (
    <ProactiveConciergeContext.Provider value={value}>{children}</ProactiveConciergeContext.Provider>
  );
}

export function useProactiveConcierge(): ProactiveConciergeContextValue {
  const ctx = useContext(ProactiveConciergeContext);
  if (!ctx) throw new Error('useProactiveConcierge must be used within ProactiveConciergeProvider');
  return ctx;
}

export function useProactiveConciergeOptional(): ProactiveConciergeContextValue | null {
  return useContext(ProactiveConciergeContext);
}
