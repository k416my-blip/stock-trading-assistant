import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../constants/aiExplanationLevel';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AiPreferences } from '../types/aiStrategy';
import { normalizeAiExplanationLevel } from './aiExplanationLevel';
import { normalizeAiAnalysisMode } from './aiAnalysisMode';

export const DEFAULT_AI_PREFERENCES: AiPreferences = {
  aiEnabled: true,
  mockOnly: false,
  aiExplanationLevel: DEFAULT_AI_EXPLANATION_LEVEL,
  voiceEnabled: true,
  voiceAutoRead: false,
  voiceSpeechRate: 1,
  urgentVibrationEnabled: true,
  urgentSoundEnabled: true,
  proactiveBriefingsEnabled: true,
  proactiveVoiceOnResume: true,
  aiAnalysisMode: 'balanced',
  aiConciergeDebugMode: false,
  batterySaverEnabled: false,
  conciergeUxMode: 'beginner',
  autonomousMonitoringEnabled: true,
  autonomousNotificationsPaused: false,
  autonomousAggressiveness: 'balanced',
  autonomousExcludedSymbols: [],
  metaDecisionEnabled: true,
  strategyExecutionEnabled: true,
  strategyTacticalMode: 'balanced',
  realityValidationEnabled: true,
  paperBrokerEnabled: true,
  selfEvaluationEnabled: true,
  macroIntelligenceEnabled: true,
  dataReliabilityEnabled: true,
  portfolioRiskExposureEnabled: true,
  capitalAllocationEnabled: true,
  systemStabilityIntegrityEnabled: true,
  aiGovernanceDecisionEnabled: true,
  reactiveEventOrchestrationEnabled: true,
  explainableCognitiveTraceEnabled: true,
  adaptiveResourceComputeBudgetEnabled: true,
  stateIntegrityTemporalConsistencyEnabled: true,
  semanticConsistencyDecisionCoherenceEnabled: true,
  epistemicReliabilityEvidenceWeightEnabled: true,
  cognitiveGoalArbitrationIntentPriorityEnabled: true,
  metaCognitiveRiskReflectionSelfCritiqueEnabled: true,
  recursiveMemoryCompressionStrategicAbstractionEnabled: true,
  systemicStabilityRecursiveGovernanceEnabled: true,
  executionRecoveryAdaptiveConfidenceEnabled: true,
  dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled: true,
  autonomousMarketRegimeDetectionEnabled: true,
  cognitiveArbitrationConsensusEnabled: true,
  metaReliabilityLongitudinalTrustEnabled: true,
  selfEvolvingArchitectureReflectiveRefactorEnabled: true,
  epistemicIntegrityTruthCalibrationEnabled: true,
  strategicMemoryGraphTemporalCausalityEnabled: true,
  cognitiveResourceEconomyAttentionAllocationEnabled: true,
  unifiedCognitiveStateExecutiveAwarenessEnabled: true,
  humanIntentContinuityAlignmentPreservationEnabled: true,
  adaptiveExplorationAntiDogmaEnabled: true,
  constitutionalGovernanceSystemCoherenceEnabled: true,
  explainableGovernanceTransparentReasoningEnabled: true,
  runtimeSurvivalMobileResilienceEnabled: true,
};

export async function loadAiPreferences(): Promise<AiPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiPreferences);
    if (!raw) return { ...DEFAULT_AI_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<AiPreferences> & {
      aiExplanationLevel?: unknown;
    };
    const rate =
      typeof parsed.voiceSpeechRate === 'number' && Number.isFinite(parsed.voiceSpeechRate)
        ? Math.min(2, Math.max(0.5, parsed.voiceSpeechRate))
        : DEFAULT_AI_PREFERENCES.voiceSpeechRate;
    return {
      aiEnabled: parsed.aiEnabled !== false,
      mockOnly: parsed.mockOnly === true,
      aiExplanationLevel: normalizeAiExplanationLevel(parsed.aiExplanationLevel),
      voiceEnabled: parsed.voiceEnabled !== false,
      voiceAutoRead: parsed.voiceAutoRead === true,
      voiceSpeechRate: rate,
      urgentVibrationEnabled: parsed.urgentVibrationEnabled !== false,
      urgentSoundEnabled: parsed.urgentSoundEnabled !== false,
      proactiveBriefingsEnabled: parsed.proactiveBriefingsEnabled !== false,
      proactiveVoiceOnResume:
        parsed.proactiveVoiceOnResume === undefined ? true : parsed.proactiveVoiceOnResume === true,
      aiAnalysisMode: normalizeAiAnalysisMode(parsed.aiAnalysisMode),
      aiConciergeDebugMode: parsed.aiConciergeDebugMode === true,
      batterySaverEnabled: parsed.batterySaverEnabled === true,
      conciergeUxMode:
        parsed.conciergeUxMode === 'advanced' ? 'advanced' : DEFAULT_AI_PREFERENCES.conciergeUxMode,
      autonomousMonitoringEnabled: parsed.autonomousMonitoringEnabled !== false,
      autonomousNotificationsPaused: parsed.autonomousNotificationsPaused === true,
      autonomousAggressiveness:
        parsed.autonomousAggressiveness === 'conservative' ||
        parsed.autonomousAggressiveness === 'aggressive'
          ? parsed.autonomousAggressiveness
          : 'balanced',
      autonomousExcludedSymbols: Array.isArray(parsed.autonomousExcludedSymbols)
        ? parsed.autonomousExcludedSymbols.map((s) => String(s).toUpperCase()).slice(0, 20)
        : [],
      metaDecisionEnabled: parsed.metaDecisionEnabled !== false,
      strategyExecutionEnabled: parsed.strategyExecutionEnabled !== false,
      strategyTacticalMode:
        parsed.strategyTacticalMode === 'defensive' ||
        parsed.strategyTacticalMode === 'aggressive'
          ? parsed.strategyTacticalMode
          : 'balanced',
      realityValidationEnabled: parsed.realityValidationEnabled !== false,
      paperBrokerEnabled: parsed.paperBrokerEnabled !== false,
      selfEvaluationEnabled: parsed.selfEvaluationEnabled !== false,
      macroIntelligenceEnabled: parsed.macroIntelligenceEnabled !== false,
      dataReliabilityEnabled: parsed.dataReliabilityEnabled !== false,
      portfolioRiskExposureEnabled: parsed.portfolioRiskExposureEnabled !== false,
      capitalAllocationEnabled: parsed.capitalAllocationEnabled !== false,
      systemStabilityIntegrityEnabled: parsed.systemStabilityIntegrityEnabled !== false,
      aiGovernanceDecisionEnabled: parsed.aiGovernanceDecisionEnabled !== false,
      reactiveEventOrchestrationEnabled: parsed.reactiveEventOrchestrationEnabled !== false,
      explainableCognitiveTraceEnabled: parsed.explainableCognitiveTraceEnabled !== false,
      adaptiveResourceComputeBudgetEnabled: parsed.adaptiveResourceComputeBudgetEnabled !== false,
      stateIntegrityTemporalConsistencyEnabled:
        parsed.stateIntegrityTemporalConsistencyEnabled !== false,
      semanticConsistencyDecisionCoherenceEnabled:
        parsed.semanticConsistencyDecisionCoherenceEnabled !== false,
      epistemicReliabilityEvidenceWeightEnabled:
        parsed.epistemicReliabilityEvidenceWeightEnabled !== false,
      cognitiveGoalArbitrationIntentPriorityEnabled:
        parsed.cognitiveGoalArbitrationIntentPriorityEnabled !== false,
      metaCognitiveRiskReflectionSelfCritiqueEnabled:
        parsed.metaCognitiveRiskReflectionSelfCritiqueEnabled !== false,
      recursiveMemoryCompressionStrategicAbstractionEnabled:
        parsed.recursiveMemoryCompressionStrategicAbstractionEnabled !== false,
      systemicStabilityRecursiveGovernanceEnabled:
        parsed.systemicStabilityRecursiveGovernanceEnabled !== false,
      executionRecoveryAdaptiveConfidenceEnabled:
        parsed.executionRecoveryAdaptiveConfidenceEnabled !== false,
      dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled:
        parsed.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled !== false,
      autonomousMarketRegimeDetectionEnabled:
        parsed.autonomousMarketRegimeDetectionEnabled !== false,
      cognitiveArbitrationConsensusEnabled:
        parsed.cognitiveArbitrationConsensusEnabled !== false,
      metaReliabilityLongitudinalTrustEnabled:
        parsed.metaReliabilityLongitudinalTrustEnabled !== false,
      selfEvolvingArchitectureReflectiveRefactorEnabled:
        parsed.selfEvolvingArchitectureReflectiveRefactorEnabled !== false,
      epistemicIntegrityTruthCalibrationEnabled:
        parsed.epistemicIntegrityTruthCalibrationEnabled !== false,
      strategicMemoryGraphTemporalCausalityEnabled:
        parsed.strategicMemoryGraphTemporalCausalityEnabled !== false,
      cognitiveResourceEconomyAttentionAllocationEnabled:
        parsed.cognitiveResourceEconomyAttentionAllocationEnabled !== false,
      unifiedCognitiveStateExecutiveAwarenessEnabled:
        parsed.unifiedCognitiveStateExecutiveAwarenessEnabled !== false,
      humanIntentContinuityAlignmentPreservationEnabled:
        parsed.humanIntentContinuityAlignmentPreservationEnabled !== false,
      adaptiveExplorationAntiDogmaEnabled:
        parsed.adaptiveExplorationAntiDogmaEnabled !== false,
      constitutionalGovernanceSystemCoherenceEnabled:
        parsed.constitutionalGovernanceSystemCoherenceEnabled !== false,
      explainableGovernanceTransparentReasoningEnabled:
        parsed.explainableGovernanceTransparentReasoningEnabled !== false,
      runtimeSurvivalMobileResilienceEnabled:
        parsed.runtimeSurvivalMobileResilienceEnabled !== false,
    };
  } catch {
    return { ...DEFAULT_AI_PREFERENCES };
  }
}

export async function saveAiPreferences(prefs: Partial<AiPreferences>): Promise<AiPreferences> {
  const current = await loadAiPreferences();
  const nextRate =
    prefs.voiceSpeechRate !== undefined
      ? Math.min(2, Math.max(0.5, prefs.voiceSpeechRate))
      : current.voiceSpeechRate;
  const next: AiPreferences = {
    aiEnabled: prefs.aiEnabled ?? current.aiEnabled,
    mockOnly: prefs.mockOnly ?? current.mockOnly,
    aiExplanationLevel: normalizeAiExplanationLevel(
      prefs.aiExplanationLevel ?? current.aiExplanationLevel,
    ),
    voiceEnabled: prefs.voiceEnabled ?? current.voiceEnabled,
    voiceAutoRead: prefs.voiceAutoRead ?? current.voiceAutoRead,
    voiceSpeechRate: nextRate,
    urgentVibrationEnabled: prefs.urgentVibrationEnabled ?? current.urgentVibrationEnabled,
    urgentSoundEnabled: prefs.urgentSoundEnabled ?? current.urgentSoundEnabled,
    proactiveBriefingsEnabled: prefs.proactiveBriefingsEnabled ?? current.proactiveBriefingsEnabled,
    proactiveVoiceOnResume: prefs.proactiveVoiceOnResume ?? current.proactiveVoiceOnResume,
    aiAnalysisMode: normalizeAiAnalysisMode(prefs.aiAnalysisMode ?? current.aiAnalysisMode),
    aiConciergeDebugMode: prefs.aiConciergeDebugMode ?? current.aiConciergeDebugMode,
    batterySaverEnabled: prefs.batterySaverEnabled ?? current.batterySaverEnabled,
    conciergeUxMode:
      prefs.conciergeUxMode === 'advanced' || prefs.conciergeUxMode === 'beginner'
        ? prefs.conciergeUxMode
        : current.conciergeUxMode,
    autonomousMonitoringEnabled:
      prefs.autonomousMonitoringEnabled ?? current.autonomousMonitoringEnabled,
    autonomousNotificationsPaused:
      prefs.autonomousNotificationsPaused ?? current.autonomousNotificationsPaused,
    autonomousAggressiveness:
      prefs.autonomousAggressiveness === 'conservative' ||
      prefs.autonomousAggressiveness === 'aggressive' ||
      prefs.autonomousAggressiveness === 'balanced'
        ? prefs.autonomousAggressiveness
        : current.autonomousAggressiveness,
    autonomousExcludedSymbols:
      prefs.autonomousExcludedSymbols ?? current.autonomousExcludedSymbols,
    metaDecisionEnabled: prefs.metaDecisionEnabled ?? current.metaDecisionEnabled,
    strategyExecutionEnabled: prefs.strategyExecutionEnabled ?? current.strategyExecutionEnabled,
    strategyTacticalMode:
      prefs.strategyTacticalMode === 'defensive' ||
      prefs.strategyTacticalMode === 'aggressive' ||
      prefs.strategyTacticalMode === 'balanced'
        ? prefs.strategyTacticalMode
        : current.strategyTacticalMode,
    realityValidationEnabled:
      prefs.realityValidationEnabled ?? current.realityValidationEnabled,
    paperBrokerEnabled: prefs.paperBrokerEnabled ?? current.paperBrokerEnabled,
    selfEvaluationEnabled: prefs.selfEvaluationEnabled ?? current.selfEvaluationEnabled,
    macroIntelligenceEnabled:
      prefs.macroIntelligenceEnabled ?? current.macroIntelligenceEnabled,
    dataReliabilityEnabled: prefs.dataReliabilityEnabled ?? current.dataReliabilityEnabled,
    portfolioRiskExposureEnabled:
      prefs.portfolioRiskExposureEnabled ?? current.portfolioRiskExposureEnabled,
    capitalAllocationEnabled: prefs.capitalAllocationEnabled ?? current.capitalAllocationEnabled,
    systemStabilityIntegrityEnabled:
      prefs.systemStabilityIntegrityEnabled ?? current.systemStabilityIntegrityEnabled,
    aiGovernanceDecisionEnabled:
      prefs.aiGovernanceDecisionEnabled ?? current.aiGovernanceDecisionEnabled,
    reactiveEventOrchestrationEnabled:
      prefs.reactiveEventOrchestrationEnabled ?? current.reactiveEventOrchestrationEnabled,
    explainableCognitiveTraceEnabled:
      prefs.explainableCognitiveTraceEnabled ?? current.explainableCognitiveTraceEnabled,
    adaptiveResourceComputeBudgetEnabled:
      prefs.adaptiveResourceComputeBudgetEnabled ?? current.adaptiveResourceComputeBudgetEnabled,
    stateIntegrityTemporalConsistencyEnabled:
      prefs.stateIntegrityTemporalConsistencyEnabled ??
      current.stateIntegrityTemporalConsistencyEnabled,
    semanticConsistencyDecisionCoherenceEnabled:
      prefs.semanticConsistencyDecisionCoherenceEnabled ??
      current.semanticConsistencyDecisionCoherenceEnabled,
    epistemicReliabilityEvidenceWeightEnabled:
      prefs.epistemicReliabilityEvidenceWeightEnabled ??
      current.epistemicReliabilityEvidenceWeightEnabled,
    cognitiveGoalArbitrationIntentPriorityEnabled:
      prefs.cognitiveGoalArbitrationIntentPriorityEnabled ??
      current.cognitiveGoalArbitrationIntentPriorityEnabled,
    metaCognitiveRiskReflectionSelfCritiqueEnabled:
      prefs.metaCognitiveRiskReflectionSelfCritiqueEnabled ??
      current.metaCognitiveRiskReflectionSelfCritiqueEnabled,
    recursiveMemoryCompressionStrategicAbstractionEnabled:
      prefs.recursiveMemoryCompressionStrategicAbstractionEnabled ??
      current.recursiveMemoryCompressionStrategicAbstractionEnabled,
    systemicStabilityRecursiveGovernanceEnabled:
      prefs.systemicStabilityRecursiveGovernanceEnabled ??
      current.systemicStabilityRecursiveGovernanceEnabled,
    executionRecoveryAdaptiveConfidenceEnabled:
      prefs.executionRecoveryAdaptiveConfidenceEnabled ??
      current.executionRecoveryAdaptiveConfidenceEnabled,
    dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled:
      prefs.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled ??
      current.dynamicLayerOrchestrationMobileRuntimeOptimizationEnabled,
    autonomousMarketRegimeDetectionEnabled:
      prefs.autonomousMarketRegimeDetectionEnabled ??
      current.autonomousMarketRegimeDetectionEnabled,
    cognitiveArbitrationConsensusEnabled:
      prefs.cognitiveArbitrationConsensusEnabled ??
      current.cognitiveArbitrationConsensusEnabled,
    metaReliabilityLongitudinalTrustEnabled:
      prefs.metaReliabilityLongitudinalTrustEnabled ??
      current.metaReliabilityLongitudinalTrustEnabled,
    selfEvolvingArchitectureReflectiveRefactorEnabled:
      prefs.selfEvolvingArchitectureReflectiveRefactorEnabled ??
      current.selfEvolvingArchitectureReflectiveRefactorEnabled,
    epistemicIntegrityTruthCalibrationEnabled:
      prefs.epistemicIntegrityTruthCalibrationEnabled ??
      current.epistemicIntegrityTruthCalibrationEnabled,
    strategicMemoryGraphTemporalCausalityEnabled:
      prefs.strategicMemoryGraphTemporalCausalityEnabled ??
      current.strategicMemoryGraphTemporalCausalityEnabled,
    cognitiveResourceEconomyAttentionAllocationEnabled:
      prefs.cognitiveResourceEconomyAttentionAllocationEnabled ??
      current.cognitiveResourceEconomyAttentionAllocationEnabled,
    unifiedCognitiveStateExecutiveAwarenessEnabled:
      prefs.unifiedCognitiveStateExecutiveAwarenessEnabled ??
      current.unifiedCognitiveStateExecutiveAwarenessEnabled,
    humanIntentContinuityAlignmentPreservationEnabled:
      prefs.humanIntentContinuityAlignmentPreservationEnabled ??
      current.humanIntentContinuityAlignmentPreservationEnabled,
    adaptiveExplorationAntiDogmaEnabled:
      prefs.adaptiveExplorationAntiDogmaEnabled ?? current.adaptiveExplorationAntiDogmaEnabled,
    constitutionalGovernanceSystemCoherenceEnabled:
      prefs.constitutionalGovernanceSystemCoherenceEnabled ??
      current.constitutionalGovernanceSystemCoherenceEnabled,
    explainableGovernanceTransparentReasoningEnabled:
      prefs.explainableGovernanceTransparentReasoningEnabled ??
      current.explainableGovernanceTransparentReasoningEnabled,
    runtimeSurvivalMobileResilienceEnabled:
      prefs.runtimeSurvivalMobileResilienceEnabled ??
      current.runtimeSurvivalMobileResilienceEnabled,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.aiPreferences, JSON.stringify(next));
  return next;
}

export function resetAiPreferencesForTest(): void {
  /* vitest: in-memory only via load mock if needed */
}
