/**
 * OpenAI 送信前のコンテキスト圧縮 — トークン・コスト削減
 */
import {
  AI_CONTEXT_MAX_HOLDINGS,
  AI_CONTEXT_MAX_JOURNAL_SYMBOLS,
  AI_CONTEXT_MAX_SIMILAR_CASES,
} from '../constants/performanceCost';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import { recordOpenAiTokenEstimate } from './apiCostTracker';

function estimateTokens(json: string): number {
  return Math.ceil(json.length / 4);
}

export function compressAiStrategyContextForApi(
  context: AiStrategyContextPayload,
): AiStrategyContextPayload {
  const holdings = context.holdings.slice(0, AI_CONTEXT_MAX_HOLDINGS);
  const watchlist = context.watchlist.slice(0, AI_CONTEXT_MAX_HOLDINGS);
  const recentRecommendations = context.recentRecommendations.slice(0, 5);

  const journalSummary = {
    ...context.journalSummary,
    recentSymbols: context.journalSummary.recentSymbols.slice(0, AI_CONTEXT_MAX_JOURNAL_SYMBOLS),
  };

  const portfolioIntelligence = context.portfolioIntelligence
    ? {
        ...context.portfolioIntelligence,
        journalRecent: context.portfolioIntelligence.journalRecent.slice(0, 4),
        predictionsPending: context.portfolioIntelligence.predictionsPending.slice(0, 6),
        similarCasesJa: context.portfolioIntelligence.similarCasesJa.slice(
          0,
          AI_CONTEXT_MAX_SIMILAR_CASES,
        ),
        lossPatterns: context.portfolioIntelligence.lossPatterns.slice(0, 3),
        successPatterns: context.portfolioIntelligence.successPatterns.slice(0, 3),
      }
    : context.portfolioIntelligence;

  const evidenceData = {
    ...context.evidenceData,
    symbols: context.evidenceData.symbols.slice(0, 3),
    cacheNotesJa: context.evidenceData.cacheNotesJa.slice(0, 2),
  };

  const sessionMemory = {
    ...context.sessionMemory,
    entities: {
      ...context.sessionMemory.entities,
      tickers: context.sessionMemory.entities.tickers.slice(0, 6),
      companyNames: context.sessionMemory.entities.companyNames.slice(0, 6),
    },
    recentQuestions: context.sessionMemory.recentQuestions.slice(0, 4),
    discussedSymbols: context.sessionMemory.discussedSymbols.slice(0, 6),
  };

  const systemStabilityIntegrity = context.systemStabilityIntegrity
    ? {
        generatedAt: context.systemStabilityIntegrity.generatedAt,
        safetyBannerJa: context.systemStabilityIntegrity.safetyBannerJa,
        systemHealthScore: context.systemStabilityIntegrity.systemHealthScore,
        healthLabelJa: context.systemStabilityIntegrity.healthLabelJa,
        emergencyReadOnlyActive: context.systemStabilityIntegrity.emergencyReadOnlyActive,
        safeFallbackActive: context.systemStabilityIntegrity.safeFallbackActive,
        freezePreventionJa: context.systemStabilityIntegrity.freezePreventionJa,
        racePreventionJa: context.systemStabilityIntegrity.racePreventionJa,
        integritySummaryJa: context.systemStabilityIntegrity.integritySummaryJa,
        explainRuleBasisJa: context.systemStabilityIntegrity.explainRuleBasisJa,
        featureStatuses: context.systemStabilityIntegrity.featureStatuses
          .filter((f) => f.statusJa !== 'ok')
          .slice(0, 10),
        layerRows: context.systemStabilityIntegrity.layerRows.filter((r) => r.enabled && !r.loaded),
        stateFlowJa: context.systemStabilityIntegrity.stateFlowJa.slice(0, 3),
        persistenceFlowJa: context.systemStabilityIntegrity.persistenceFlowJa.slice(0, 3),
        dependencyGraph: context.systemStabilityIntegrity.dependencyGraph.slice(0, 6),
        productionSnapshot: {
          generatedAt: context.systemStabilityIntegrity.productionSnapshot.generatedAt,
          emergencyLevel: context.systemStabilityIntegrity.productionSnapshot.emergencyLevel,
          emergencyReasonJa:
            context.systemStabilityIntegrity.productionSnapshot.emergencyReasonJa,
          backgroundAiPaused:
            context.systemStabilityIntegrity.productionSnapshot.backgroundAiPaused,
          staleAsyncResponsesBlocked:
            context.systemStabilityIntegrity.productionSnapshot.staleAsyncResponsesBlocked,
          renderBudgetBlocked:
            context.systemStabilityIntegrity.productionSnapshot.renderBudgetBlocked,
          proactiveQueueSize:
            context.systemStabilityIntegrity.productionSnapshot.proactiveQueueSize,
        },
      }
    : undefined;

  const aiGovernanceDecision = context.aiGovernanceDecision
    ? {
        generatedAt: context.aiGovernanceDecision.generatedAt,
        safetyBannerJa: context.aiGovernanceDecision.safetyBannerJa,
        finalDecision: context.aiGovernanceDecision.finalDecision,
        finalDecisionLabelJa: context.aiGovernanceDecision.finalDecisionLabelJa,
        vetoLayer: context.aiGovernanceDecision.vetoLayer,
        vetoLayerLabelJa: context.aiGovernanceDecision.vetoLayerLabelJa,
        vetoReasonJa: context.aiGovernanceDecision.vetoReasonJa,
        consensusScore: context.aiGovernanceDecision.consensusScore,
        contradictionDetected: context.aiGovernanceDecision.contradictionDetected,
        contradictionDetailJa: context.aiGovernanceDecision.contradictionDetailJa,
        unifiedAiSummaryJa: context.aiGovernanceDecision.unifiedAiSummaryJa,
        blockedDecisions: context.aiGovernanceDecision.blockedDecisions.slice(0, 5),
        activeHierarchy: context.aiGovernanceDecision.activeHierarchy.slice(0, 7),
        downgradedRecommendations: context.aiGovernanceDecision.downgradedRecommendations.slice(0, 5),
        explainTree: context.aiGovernanceDecision.explainTree.slice(0, 1),
        featureStatuses: context.aiGovernanceDecision.featureStatuses
          .filter((f) => f.statusJa !== 'ok')
          .slice(0, 8),
      }
    : undefined;

  const reactiveEventOrchestration = context.reactiveEventOrchestration
    ? {
        generatedAt: context.reactiveEventOrchestration.generatedAt,
        reactiveHealthScore: context.reactiveEventOrchestration.reactiveHealthScore,
        healthLabelJa: context.reactiveEventOrchestration.healthLabelJa,
        orchestrationSummaryJa: context.reactiveEventOrchestration.orchestrationSummaryJa,
        rerenderPerSec: context.reactiveEventOrchestration.rerenderPerSec,
        recomputePerSec: context.reactiveEventOrchestration.recomputePerSec,
        queuedEvents: context.reactiveEventOrchestration.queuedEvents.slice(0, 4),
        droppedEvents: context.reactiveEventOrchestration.droppedEvents.slice(0, 4),
        pendingLayers: context.reactiveEventOrchestration.pendingLayers,
      }
    : undefined;

  const explainableCognitiveTrace = context.explainableCognitiveTrace
    ? {
        generatedAt: context.explainableCognitiveTrace.generatedAt,
        safetyBannerJa: context.explainableCognitiveTrace.safetyBannerJa,
        finalDecision: context.explainableCognitiveTrace.finalDecision,
        finalDecisionLabelJa: context.explainableCognitiveTrace.finalDecisionLabelJa,
        explainableScore: context.explainableCognitiveTrace.explainableScore,
        explainableSummaryJa: context.explainableCognitiveTrace.explainableSummaryJa,
        reasoningChainJa: context.explainableCognitiveTrace.reasoningChainJa.slice(0, 8),
        causalChainJa: context.explainableCognitiveTrace.causalChainJa.slice(0, 8),
        vetoExplanationJa: context.explainableCognitiveTrace.vetoExplanationJa,
        conflictExplanationJa: context.explainableCognitiveTrace.conflictExplanationJa,
        downgradeReasonChain: context.explainableCognitiveTrace.downgradeReasonChain.slice(0, 5),
        confidenceEvolution: context.explainableCognitiveTrace.confidenceEvolution.slice(-6),
        aiSelfReflectionJa: context.explainableCognitiveTrace.aiSelfReflectionJa,
        missingEvidenceJa: context.explainableCognitiveTrace.missingEvidenceJa.slice(0, 4),
        explainRuleBasisJa: context.explainableCognitiveTrace.explainRuleBasisJa,
      }
    : undefined;

  const adaptiveResourceComputeBudget = context.adaptiveResourceComputeBudget
    ? {
        generatedAt: context.adaptiveResourceComputeBudget.generatedAt,
        resourceHealthScore: context.adaptiveResourceComputeBudget.resourceHealthScore,
        healthLabelJa: context.adaptiveResourceComputeBudget.healthLabelJa,
        resourceSummaryJa: context.adaptiveResourceComputeBudget.resourceSummaryJa,
        renderBudgetInFlight: context.adaptiveResourceComputeBudget.renderBudgetInFlight,
        renderBudgetMax: context.adaptiveResourceComputeBudget.renderBudgetMax,
        aiLoadPct: context.adaptiveResourceComputeBudget.aiLoadPct,
        memoryPressureLevel: context.adaptiveResourceComputeBudget.memoryPressureLevel,
        batteryModeJa: context.adaptiveResourceComputeBudget.batteryModeJa,
        thermalStateJa: context.adaptiveResourceComputeBudget.thermalStateJa,
        activeLayers: context.adaptiveResourceComputeBudget.activeLayers.slice(0, 8),
        sleepingLayers: context.adaptiveResourceComputeBudget.sleepingLayers.slice(0, 6),
        eventPressureScore: context.adaptiveResourceComputeBudget.eventPressureScore,
        aiSleepMode: context.adaptiveResourceComputeBudget.aiSleepMode,
        emergencyComputeCut: context.adaptiveResourceComputeBudget.emergencyComputeCut,
        explainRuleBasisJa: context.adaptiveResourceComputeBudget.explainRuleBasisJa,
      }
    : undefined;

  const stateIntegrityTemporalConsistency = context.stateIntegrityTemporalConsistency
    ? {
        generatedAt: context.stateIntegrityTemporalConsistency.generatedAt,
        realTradingEnabled: context.stateIntegrityTemporalConsistency.realTradingEnabled,
        stateVersion: context.stateIntegrityTemporalConsistency.stateVersion,
        stateHealthScore: context.stateIntegrityTemporalConsistency.stateHealthScore,
        consistencyScore: context.stateIntegrityTemporalConsistency.consistencyScore,
        traceConsistencyScore: context.stateIntegrityTemporalConsistency.traceConsistencyScore,
        driftScore: context.stateIntegrityTemporalConsistency.driftScore,
        governanceFresh: context.stateIntegrityTemporalConsistency.governanceFresh,
        replayIntegrityOk: context.stateIntegrityTemporalConsistency.replayIntegrityOk,
        rollbackApplied: context.stateIntegrityTemporalConsistency.rollbackApplied,
        emergencyStateFreeze: context.stateIntegrityTemporalConsistency.emergencyStateFreeze,
        integritySummaryJa: context.stateIntegrityTemporalConsistency.integritySummaryJa,
        explainRuleBasisJa: context.stateIntegrityTemporalConsistency.explainRuleBasisJa,
      }
    : undefined;

  const semanticConsistencyDecisionCoherence = context.semanticConsistencyDecisionCoherence
    ? {
        generatedAt: context.semanticConsistencyDecisionCoherence.generatedAt,
        finalDecisionCoherenceScore:
          context.semanticConsistencyDecisionCoherence.finalDecisionCoherenceScore,
        naturalLanguageIntegrityScore:
          context.semanticConsistencyDecisionCoherence.naturalLanguageIntegrityScore,
        semanticSummaryJa: context.semanticConsistencyDecisionCoherence.semanticSummaryJa,
        semanticFreeze: context.semanticConsistencyDecisionCoherence.semanticFreeze,
        emergencyNarrativeFallbackJa:
          context.semanticConsistencyDecisionCoherence.emergencyNarrativeFallbackJa,
        contradictionLanguageJa:
          context.semanticConsistencyDecisionCoherence.contradictionLanguageJa.slice(0, 4),
        unsupportedClaimsJa:
          context.semanticConsistencyDecisionCoherence.unsupportedClaimsJa.slice(0, 4),
        vetoNarrativeJa: context.semanticConsistencyDecisionCoherence.vetoNarrativeJa,
        downgradeNarrativeJa: context.semanticConsistencyDecisionCoherence.downgradeNarrativeJa,
        traceToNarrativeJa:
          context.semanticConsistencyDecisionCoherence.traceToNarrativeJa.slice(0, 5),
        explainRuleBasisJa: context.semanticConsistencyDecisionCoherence.explainRuleBasisJa,
      }
    : undefined;

  const epistemicReliabilityEvidenceWeight = context.epistemicReliabilityEvidenceWeight
    ? {
        generatedAt: context.epistemicReliabilityEvidenceWeight.generatedAt,
        realTradingEnabled: context.epistemicReliabilityEvidenceWeight.realTradingEnabled,
        reliabilityHealthScore: context.epistemicReliabilityEvidenceWeight.reliabilityHealthScore,
        reliabilityConsensusPct: context.epistemicReliabilityEvidenceWeight.reliabilityConsensusPct,
        governanceAuthorityPct: context.epistemicReliabilityEvidenceWeight.governanceAuthorityPct,
        replayTrustPct: context.epistemicReliabilityEvidenceWeight.replayTrustPct,
        reliabilityFreeze: context.epistemicReliabilityEvidenceWeight.reliabilityFreeze,
        emergencyFallbackApplied:
          context.epistemicReliabilityEvidenceWeight.emergencyFallbackApplied,
        unsupportedClaimsJa:
          context.epistemicReliabilityEvidenceWeight.unsupportedClaimsJa.slice(0, 4),
        staleEvidenceJa: context.epistemicReliabilityEvidenceWeight.staleEvidenceJa.slice(0, 4),
        reliabilitySummaryJa: context.epistemicReliabilityEvidenceWeight.reliabilitySummaryJa,
        explainRuleBasisJa: context.epistemicReliabilityEvidenceWeight.explainRuleBasisJa,
      }
    : undefined;

  const cognitiveGoalArbitrationIntentPriority = context.cognitiveGoalArbitrationIntentPriority
    ? {
        generatedAt: context.cognitiveGoalArbitrationIntentPriority.generatedAt,
        realTradingEnabled: context.cognitiveGoalArbitrationIntentPriority.realTradingEnabled,
        arbitrationHealthScore: context.cognitiveGoalArbitrationIntentPriority.arbitrationHealthScore,
        emergencySafeMode: context.cognitiveGoalArbitrationIntentPriority.emergencySafeMode,
        intentFreeze: context.cognitiveGoalArbitrationIntentPriority.intentFreeze,
        deadlockDetected: context.cognitiveGoalArbitrationIntentPriority.deadlockDetected,
        priorityNarrativeJa: context.cognitiveGoalArbitrationIntentPriority.priorityNarrativeJa,
        governanceAuthorityJa: context.cognitiveGoalArbitrationIntentPriority.governanceAuthorityJa,
        semanticVetoJa: context.cognitiveGoalArbitrationIntentPriority.semanticVetoJa,
        downgradeReasonJa: context.cognitiveGoalArbitrationIntentPriority.downgradeReasonJa,
        arbitrationSummaryJa: context.cognitiveGoalArbitrationIntentPriority.arbitrationSummaryJa,
        explainRuleBasisJa: context.cognitiveGoalArbitrationIntentPriority.explainRuleBasisJa,
      }
    : undefined;

  const metaCognitiveRiskReflectionSelfCritique = context.metaCognitiveRiskReflectionSelfCritique
    ? {
        generatedAt: context.metaCognitiveRiskReflectionSelfCritique.generatedAt,
        realTradingEnabled: context.metaCognitiveRiskReflectionSelfCritique.realTradingEnabled,
        selfCritiqueScore: context.metaCognitiveRiskReflectionSelfCritique.selfCritiqueScore,
        metaConfidencePct: context.metaCognitiveRiskReflectionSelfCritique.metaConfidencePct,
        fatigueScore: context.metaCognitiveRiskReflectionSelfCritique.fatigueScore,
        confidenceDriftPct: context.metaCognitiveRiskReflectionSelfCritique.confidenceDriftPct,
        reflectionSafeMode: context.metaCognitiveRiskReflectionSelfCritique.reflectionSafeMode,
        reflectionFreeze: context.metaCognitiveRiskReflectionSelfCritique.reflectionFreeze,
        metaWarningJa: context.metaCognitiveRiskReflectionSelfCritique.metaWarningJa,
        selfCritiqueSummaryJa: context.metaCognitiveRiskReflectionSelfCritique.selfCritiqueSummaryJa,
        explainRuleBasisJa: context.metaCognitiveRiskReflectionSelfCritique.explainRuleBasisJa,
      }
    : undefined;

  const recursiveMemoryCompressionStrategicAbstraction =
    context.recursiveMemoryCompressionStrategicAbstraction
      ? {
          generatedAt: context.recursiveMemoryCompressionStrategicAbstraction.generatedAt,
          realTradingEnabled:
            context.recursiveMemoryCompressionStrategicAbstraction.realTradingEnabled,
          memorySaturationPct:
            context.recursiveMemoryCompressionStrategicAbstraction.memorySaturationPct,
          compressionRatioPct:
            context.recursiveMemoryCompressionStrategicAbstraction.compressionRatioPct,
          cognitiveStabilityFreeze:
            context.recursiveMemoryCompressionStrategicAbstraction.cognitiveStabilityFreeze,
          abstractedNarrativeJa:
            context.recursiveMemoryCompressionStrategicAbstraction.abstractedNarrativeJa.slice(
              0,
              300,
            ),
          compressionSummaryJa:
            context.recursiveMemoryCompressionStrategicAbstraction.compressionSummaryJa,
          explainRuleBasisJa:
            context.recursiveMemoryCompressionStrategicAbstraction.explainRuleBasisJa,
        }
      : undefined;

  const systemicStabilityRecursiveGovernance = context.systemicStabilityRecursiveGovernance
    ? {
        generatedAt: context.systemicStabilityRecursiveGovernance.generatedAt,
        realTradingEnabled: context.systemicStabilityRecursiveGovernance.realTradingEnabled,
        stabilityHealthScore: context.systemicStabilityRecursiveGovernance.stabilityHealthScore,
        recursiveLoopRiskPct: context.systemicStabilityRecursiveGovernance.recursiveLoopRiskPct,
        cascadeRiskPct: context.systemicStabilityRecursiveGovernance.cascadeRiskPct,
        oscillationRiskPct: context.systemicStabilityRecursiveGovernance.oscillationRiskPct,
        systemicEmergencySafeMode:
          context.systemicStabilityRecursiveGovernance.systemicEmergencySafeMode,
        arbitrationHalted: context.systemicStabilityRecursiveGovernance.arbitrationHalted,
        stabilitySummaryJa: context.systemicStabilityRecursiveGovernance.stabilitySummaryJa.slice(
          0,
          280,
        ),
        explainRuleBasisJa: context.systemicStabilityRecursiveGovernance.explainRuleBasisJa,
      }
    : undefined;

  const executionRecoveryAdaptiveConfidence = context.executionRecoveryAdaptiveConfidence
    ? {
        generatedAt: context.executionRecoveryAdaptiveConfidence.generatedAt,
        realTradingEnabled: context.executionRecoveryAdaptiveConfidence.realTradingEnabled,
        recoveryHealthPct: context.executionRecoveryAdaptiveConfidence.recoveryHealthPct,
        adaptiveConfidencePct: context.executionRecoveryAdaptiveConfidence.adaptiveConfidencePct,
        thawLevelPct: context.executionRecoveryAdaptiveConfidence.thawLevelPct,
        recoveryConsensusPct: context.executionRecoveryAdaptiveConfidence.recoveryConsensusPct,
        recoveryStage: context.executionRecoveryAdaptiveConfidence.recoveryStage,
        thawState: context.executionRecoveryAdaptiveConfidence.thawState,
        recoveryBlocked: context.executionRecoveryAdaptiveConfidence.recoveryBlocked,
        safeRecovery: context.executionRecoveryAdaptiveConfidence.safeRecovery,
        recoverySummaryJa: context.executionRecoveryAdaptiveConfidence.recoverySummaryJa.slice(
          0,
          280,
        ),
        explainRuleBasisJa: context.executionRecoveryAdaptiveConfidence.explainRuleBasisJa,
      }
    : undefined;

  const compressed: AiStrategyContextPayload = {
    ...context,
    holdings,
    watchlist,
    recentRecommendations,
    journalSummary,
    portfolioIntelligence,
    evidenceData,
    sessionMemory,
    systemStabilityIntegrity: systemStabilityIntegrity as AiStrategyContextPayload['systemStabilityIntegrity'],
    aiGovernanceDecision: aiGovernanceDecision as AiStrategyContextPayload['aiGovernanceDecision'],
    reactiveEventOrchestration:
      reactiveEventOrchestration as AiStrategyContextPayload['reactiveEventOrchestration'],
    explainableCognitiveTrace:
      explainableCognitiveTrace as AiStrategyContextPayload['explainableCognitiveTrace'],
    adaptiveResourceComputeBudget:
      adaptiveResourceComputeBudget as AiStrategyContextPayload['adaptiveResourceComputeBudget'],
    stateIntegrityTemporalConsistency:
      stateIntegrityTemporalConsistency as AiStrategyContextPayload['stateIntegrityTemporalConsistency'],
    semanticConsistencyDecisionCoherence:
      semanticConsistencyDecisionCoherence as AiStrategyContextPayload['semanticConsistencyDecisionCoherence'],
    epistemicReliabilityEvidenceWeight:
      epistemicReliabilityEvidenceWeight as AiStrategyContextPayload['epistemicReliabilityEvidenceWeight'],
    cognitiveGoalArbitrationIntentPriority:
      cognitiveGoalArbitrationIntentPriority as AiStrategyContextPayload['cognitiveGoalArbitrationIntentPriority'],
    metaCognitiveRiskReflectionSelfCritique:
      metaCognitiveRiskReflectionSelfCritique as AiStrategyContextPayload['metaCognitiveRiskReflectionSelfCritique'],
    recursiveMemoryCompressionStrategicAbstraction:
      recursiveMemoryCompressionStrategicAbstraction as AiStrategyContextPayload['recursiveMemoryCompressionStrategicAbstraction'],
    systemicStabilityRecursiveGovernance:
      systemicStabilityRecursiveGovernance as AiStrategyContextPayload['systemicStabilityRecursiveGovernance'],
    executionRecoveryAdaptiveConfidence:
      executionRecoveryAdaptiveConfidence as AiStrategyContextPayload['executionRecoveryAdaptiveConfidence'],
    autonomousMarketRegimeDetection: context.autonomousMarketRegimeDetection
      ? ({
          ...context.autonomousMarketRegimeDetection,
          regimeSummaryJa: context.autonomousMarketRegimeDetection.regimeSummaryJa.slice(0, 280),
          featureStatuses: context.autonomousMarketRegimeDetection.featureStatuses.slice(0, 12),
          regimeTimeline: context.autonomousMarketRegimeDetection.regimeTimeline.slice(-4),
        } as AiStrategyContextPayload['autonomousMarketRegimeDetection'])
      : undefined,
    cognitiveArbitrationConsensus: context.cognitiveArbitrationConsensus
      ? ({
          ...context.cognitiveArbitrationConsensus,
          consensusSummaryJa: context.cognitiveArbitrationConsensus.consensusSummaryJa.slice(0, 280),
          participantSignals: context.cognitiveArbitrationConsensus.participantSignals.slice(0, 9),
          consensusTimeline: context.cognitiveArbitrationConsensus.consensusTimeline.slice(-4),
          featureStatuses: context.cognitiveArbitrationConsensus.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['cognitiveArbitrationConsensus'])
      : undefined,
    metaReliabilityLongitudinalTrust: context.metaReliabilityLongitudinalTrust
      ? ({
          ...context.metaReliabilityLongitudinalTrust,
          trustSummaryJa: context.metaReliabilityLongitudinalTrust.trustSummaryJa.slice(0, 280),
          longitudinalTimeline:
            context.metaReliabilityLongitudinalTrust.longitudinalTimeline.slice(-4),
          auditTargets: context.metaReliabilityLongitudinalTrust.auditTargets.slice(0, 8),
          featureStatuses: context.metaReliabilityLongitudinalTrust.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['metaReliabilityLongitudinalTrust'])
      : undefined,
    selfEvolvingArchitectureReflectiveRefactor:
      context.selfEvolvingArchitectureReflectiveRefactor
        ? ({
            ...context.selfEvolvingArchitectureReflectiveRefactor,
            architectureSummaryJa:
              context.selfEvolvingArchitectureReflectiveRefactor.architectureSummaryJa.slice(
                0,
                280,
              ),
            optimizationProposals:
              context.selfEvolvingArchitectureReflectiveRefactor.optimizationProposals.slice(0, 6),
            architectureTimeline:
              context.selfEvolvingArchitectureReflectiveRefactor.architectureTimeline.slice(-4),
            featureStatuses:
              context.selfEvolvingArchitectureReflectiveRefactor.featureStatuses.slice(0, 12),
          } as AiStrategyContextPayload['selfEvolvingArchitectureReflectiveRefactor'])
        : undefined,
    epistemicIntegrityTruthCalibration: context.epistemicIntegrityTruthCalibration
      ? ({
          ...context.epistemicIntegrityTruthCalibration,
          epistemicSummaryJa: context.epistemicIntegrityTruthCalibration.epistemicSummaryJa.slice(
            0,
            280,
          ),
          epistemicTimeline:
            context.epistemicIntegrityTruthCalibration.epistemicTimeline.slice(-4),
          auditTargets: context.epistemicIntegrityTruthCalibration.auditTargets.slice(0, 8),
          featureStatuses:
            context.epistemicIntegrityTruthCalibration.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['epistemicIntegrityTruthCalibration'])
      : undefined,
    strategicMemoryGraphTemporalCausality: context.strategicMemoryGraphTemporalCausality
      ? ({
          ...context.strategicMemoryGraphTemporalCausality,
          graphSummaryJa: context.strategicMemoryGraphTemporalCausality.graphSummaryJa.slice(
            0,
            280,
          ),
          graphTimeline:
            context.strategicMemoryGraphTemporalCausality.graphTimeline.slice(-4),
          causalEdges: context.strategicMemoryGraphTemporalCausality.causalEdges.slice(0, 12),
          causalNodes: context.strategicMemoryGraphTemporalCausality.causalNodes.slice(0, 14),
          featureStatuses:
            context.strategicMemoryGraphTemporalCausality.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['strategicMemoryGraphTemporalCausality'])
      : undefined,
    cognitiveResourceEconomyAttentionAllocation: context.cognitiveResourceEconomyAttentionAllocation
      ? ({
          ...context.cognitiveResourceEconomyAttentionAllocation,
          economySummaryJa:
            context.cognitiveResourceEconomyAttentionAllocation.economySummaryJa.slice(0, 280),
          economyTimeline:
            context.cognitiveResourceEconomyAttentionAllocation.economyTimeline.slice(-4),
          auditTargets:
            context.cognitiveResourceEconomyAttentionAllocation.auditTargets.slice(0, 12),
          layerUtilityRanking:
            context.cognitiveResourceEconomyAttentionAllocation.layerUtilityRanking.slice(0, 6),
          featureStatuses:
            context.cognitiveResourceEconomyAttentionAllocation.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['cognitiveResourceEconomyAttentionAllocation'])
      : undefined,
    unifiedCognitiveStateExecutiveAwareness: context.unifiedCognitiveStateExecutiveAwareness
      ? ({
          ...context.unifiedCognitiveStateExecutiveAwareness,
          executiveSummaryJa:
            context.unifiedCognitiveStateExecutiveAwareness.executiveSummaryJa.slice(0, 280),
          executiveTimeline:
            context.unifiedCognitiveStateExecutiveAwareness.executiveTimeline.slice(-4),
          layerStates: context.unifiedCognitiveStateExecutiveAwareness.layerStates.slice(0, 16),
          featureStatuses:
            context.unifiedCognitiveStateExecutiveAwareness.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['unifiedCognitiveStateExecutiveAwareness'])
      : undefined,
    humanIntentContinuityAlignmentPreservation: context.humanIntentContinuityAlignmentPreservation
      ? ({
          ...context.humanIntentContinuityAlignmentPreservation,
          alignmentSummaryJa:
            context.humanIntentContinuityAlignmentPreservation.alignmentSummaryJa.slice(0, 280),
          intentTimeline:
            context.humanIntentContinuityAlignmentPreservation.intentTimeline.slice(-4),
          auditTargets:
            context.humanIntentContinuityAlignmentPreservation.auditTargets.slice(0, 14),
          featureStatuses:
            context.humanIntentContinuityAlignmentPreservation.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['humanIntentContinuityAlignmentPreservation'])
      : undefined,
    adaptiveExplorationAntiDogma: context.adaptiveExplorationAntiDogma
      ? ({
          ...context.adaptiveExplorationAntiDogma,
          explorationSummaryJa: context.adaptiveExplorationAntiDogma.explorationSummaryJa.slice(
            0,
            280,
          ),
          explorationTimeline: context.adaptiveExplorationAntiDogma.explorationTimeline.slice(-4),
          auditTargets: context.adaptiveExplorationAntiDogma.auditTargets.slice(0, 12),
          featureStatuses: context.adaptiveExplorationAntiDogma.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['adaptiveExplorationAntiDogma'])
      : undefined,
    constitutionalGovernanceSystemCoherence: context.constitutionalGovernanceSystemCoherence
      ? ({
          ...context.constitutionalGovernanceSystemCoherence,
          constitutionalSummaryJa:
            context.constitutionalGovernanceSystemCoherence.constitutionalSummaryJa.slice(0, 280),
          constitutionalTimeline:
            context.constitutionalGovernanceSystemCoherence.constitutionalTimeline.slice(-4),
          auditTargets:
            context.constitutionalGovernanceSystemCoherence.auditTargets.slice(0, 12),
          featureStatuses:
            context.constitutionalGovernanceSystemCoherence.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['constitutionalGovernanceSystemCoherence'])
      : undefined,
    explainableGovernanceTransparentReasoning: context.explainableGovernanceTransparentReasoning
      ? ({
          ...context.explainableGovernanceTransparentReasoning,
          explainableSummaryJa:
            context.explainableGovernanceTransparentReasoning.explainableSummaryJa.slice(0, 280),
          explainableTimeline:
            context.explainableGovernanceTransparentReasoning.explainableTimeline.slice(-4),
          downgradeReasonsJa:
            context.explainableGovernanceTransparentReasoning.downgradeReasonsJa.slice(0, 6),
          freezeReasonsJa:
            context.explainableGovernanceTransparentReasoning.freezeReasonsJa.slice(0, 6),
          safeRationales:
            context.explainableGovernanceTransparentReasoning.safeRationales.slice(0, 8),
          auditTargets:
            context.explainableGovernanceTransparentReasoning.auditTargets.slice(0, 12),
          featureStatuses:
            context.explainableGovernanceTransparentReasoning.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['explainableGovernanceTransparentReasoning'])
      : undefined,
    runtimeSurvivalMobileResilience: context.runtimeSurvivalMobileResilience
      ? ({
          ...context.runtimeSurvivalMobileResilience,
          runtimeSummaryJa: context.runtimeSurvivalMobileResilience.runtimeSummaryJa.slice(0, 280),
          runtimeTimeline: context.runtimeSurvivalMobileResilience.runtimeTimeline.slice(-4),
          auditTargets: context.runtimeSurvivalMobileResilience.auditTargets.slice(0, 12),
          featureStatuses: context.runtimeSurvivalMobileResilience.featureStatuses.slice(0, 12),
        } as AiStrategyContextPayload['runtimeSurvivalMobileResilience'])
      : undefined,
    dynamicLayerOrchestrationMobileRuntimeOptimization:
      context.dynamicLayerOrchestrationMobileRuntimeOptimization
        ? ({
            ...context.dynamicLayerOrchestrationMobileRuntimeOptimization,
            userExplanationJa:
              context.dynamicLayerOrchestrationMobileRuntimeOptimization.userExplanationJa.slice(
                0,
                200,
              ),
            layerSchedule:
              context.dynamicLayerOrchestrationMobileRuntimeOptimization.layerSchedule.slice(0, 8),
            orchestrationTimeline:
              context.dynamicLayerOrchestrationMobileRuntimeOptimization.orchestrationTimeline.slice(
                -4,
              ),
          } as AiStrategyContextPayload['dynamicLayerOrchestrationMobileRuntimeOptimization'])
        : undefined,
    runtimeHealthSummary: context.runtimeHealthSummary?.slice(0, 720),
    concierge: {
      ...context.concierge,
      relevanceControl: {
        ...context.concierge.relevanceControl,
        heldTickers: context.concierge.relevanceControl.heldTickers.slice(0, 6),
        filteredOutTickers: context.concierge.relevanceControl.filteredOutTickers.slice(0, 4),
      },
    },
  };

  const est = estimateTokens(JSON.stringify(compressed));
  recordOpenAiTokenEstimate(est);
  return compressed;
}
