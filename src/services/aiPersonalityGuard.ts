import {
  AI_ALLOWED_CONTEXT_SCOPE_JA,
  AI_CHAT_HISTORY_UI_ONLY_NOTICE,
  AI_FIXED_PHILOSOPHY_TRAITS_JA,
  AI_FORBIDDEN_MEMORY_FIELD_NAMES,
  AI_HYPE_CERTAINTY_PATTERNS,
  AI_NO_USER_LEARNING_POLICY,
  AI_PERSONALITY_PHILOSOPHY_VERSION,
  AI_PROHIBITED_MEMORY_CATEGORIES_JA,
} from '../constants/aiPersonalityGuardrails';
import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../constants/aiExplanationLevel';
import { AI_PERSONALITY_TONE_GUIDELINES_JA } from '../constants/aiPersonality';
import { AI_CONCIERGE_RELEVANCE_PROMPT_JA } from '../constants/aiConciergeRelevance';
import { AI_SPECIFICITY_PROMPT_BLOCK_JA } from '../constants/aiConciergeSpecificity';
import { AI_ACTION_GUIDE_PROMPT_JA } from '../constants/aiActionGuide';
import { MARKET_REGIME_AI_PROMPT_JA } from '../constants/globalMarket';
import { AI_RISK_CONTROL_PROMPT_JA } from '../constants/aiRiskControl';
import { PORTFOLIO_INTEL_AI_PROMPT_JA } from '../constants/portfolioIntelligence';
import { CONCIERGE_UX_AI_PROMPT_JA } from '../constants/conciergeUx';
import { AUTONOMOUS_AI_PROMPT_JA } from '../constants/autonomousMonitoring';
import { META_AI_PROMPT_JA } from '../constants/metaDecision';
import { STRATEGY_AI_PROMPT_JA } from '../constants/strategyExecution';
import { REALITY_AI_PROMPT_JA } from '../constants/portfolioRealityValidation';
import { PRODUCTION_AI_PROMPT_JA } from '../constants/productionStability';
import { PAPER_AI_PROMPT_JA } from '../constants/paperBroker';
import { SELF_EVAL_AI_PROMPT_JA } from '../constants/selfEvaluation';
import { MACRO_INTEL_AI_PROMPT_JA } from '../constants/macroIntelligence';
import { DATA_RELIABILITY_AI_PROMPT_JA } from '../constants/dataReliability';
import { PORTFOLIO_RISK_AI_PROMPT_JA } from '../constants/portfolioRiskExposure';
import { CAPITAL_ALLOCATION_AI_PROMPT_JA } from '../constants/capitalAllocation';
import { INTEGRITY_AI_PROMPT_JA } from '../constants/systemStabilityIntegrity';
import { GOVERNANCE_AI_PROMPT_JA } from '../constants/aiGovernanceDecision';
import { REACTIVE_AI_PROMPT_JA } from '../constants/reactiveEventOrchestration';
import { TRACE_AI_PROMPT_JA } from '../constants/explainableCognitiveTrace';
import { RESOURCE_AI_PROMPT_JA } from '../constants/adaptiveResourceComputeBudget';
import { TEMPORAL_AI_PROMPT_JA } from '../constants/stateIntegrityTemporalConsistency';
import { SEMANTIC_AI_PROMPT_JA } from '../constants/semanticConsistencyDecisionCoherence';
import { EPISTEMIC_AI_PROMPT_JA } from '../constants/epistemicReliabilityEvidenceWeight';
import { ARBITRATION_AI_PROMPT_JA } from '../constants/cognitiveGoalArbitrationIntentPriority';
import { REFLECTION_AI_PROMPT_JA } from '../constants/metaCognitiveRiskReflectionSelfCritique';
import { MEMORY_COMPRESSION_AI_PROMPT_JA } from '../constants/recursiveMemoryCompressionStrategicAbstraction';
import { SYSTEMIC_STABILITY_AI_PROMPT_JA } from '../constants/systemicStabilityRecursiveGovernance';
import { RECOVERY_AI_PROMPT_JA } from '../constants/executionRecoveryAdaptiveConfidence';
import { ORCHESTRATION_AI_PROMPT_JA } from '../constants/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { REGIME_AI_PROMPT_JA } from '../constants/autonomousMarketRegimeDetection';
import { CONSENSUS_AI_PROMPT_JA } from '../constants/cognitiveArbitrationConsensus';
import { META_RELIABILITY_AI_PROMPT_JA } from '../constants/metaReliabilityLongitudinalTrust';
import { SELF_ARCHITECTURE_AI_PROMPT_JA } from '../constants/selfEvolvingArchitectureReflectiveRefactor';
import { EPISTEMIC_INTEGRITY_AI_PROMPT_JA } from '../constants/epistemicIntegrityTruthCalibration';
import { STRATEGIC_MEMORY_GRAPH_AI_PROMPT_JA } from '../constants/strategicMemoryGraphTemporalCausality';
import { COGNITIVE_RESOURCE_ECONOMY_AI_PROMPT_JA } from '../constants/cognitiveResourceEconomyAttentionAllocation';
import { UNIFIED_COGNITIVE_STATE_AI_PROMPT_JA } from '../constants/unifiedCognitiveStateExecutiveAwareness';
import { HUMAN_INTENT_CONTINUITY_AI_PROMPT_JA } from '../constants/humanIntentContinuityAlignmentPreservation';
import { ADAPTIVE_EXPLORATION_AI_PROMPT_JA } from '../constants/adaptiveExplorationAntiDogma';
import { CONSTITUTIONAL_GOVERNANCE_AI_PROMPT_JA } from '../constants/constitutionalGovernanceSystemCoherence';
import { EXPLAINABLE_GOVERNANCE_AI_PROMPT_JA } from '../constants/explainableGovernanceTransparentReasoning';
import { RUNTIME_SURVIVAL_AI_PROMPT_JA } from '../constants/runtimeSurvivalMobileResilience';
import { AI_DATA_DRIVEN_PROMPT_JA, type AiAnalysisMode } from '../constants/aiDataDriven';
import { AI_FORBIDDEN_EXPRESSIONS, AI_SYSTEM_PROMPT, AI_CONCIERGE_CHAT_SYSTEM_PROMPT } from '../constants/aiStrategy';
import { buildAnalysisModeInstructions, normalizeAiAnalysisMode } from './aiAnalysisMode';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ParsedAiApiJson } from './aiResponseSanitizer';
import { buildExplanationLevelInstructions, normalizeAiExplanationLevel } from './aiExplanationLevel';
import { getCurrentAppLanguage } from '../i18n';
import type { AppLanguage } from '../types/appLanguage';

const RESPONSE_LANGUAGE_RULE: Record<AppLanguage, string> = {
  ja: 'すべての回答は日本語で記述すること。UI言語は日本語。',
  en: 'Write all responses in English. UI language is English.',
  'zh-Hans': '所有回答必须使用简体中文。UI语言为简体中文。',
};

export function buildFixedPersonalityGuardrailsBlock(): {
  philosophyVersion: string;
  fixedPersonality: true;
  noUserLearning: true;
  noPersonalityMutation: true;
  ephemeralTurnOnly: true;
  allowedContextScopeJa: readonly string[];
  prohibitedMemoryCategoriesJa: readonly string[];
  fixedTraitsJa: readonly string[];
} {
  return {
    philosophyVersion: AI_PERSONALITY_PHILOSOPHY_VERSION,
    fixedPersonality: true,
    noUserLearning: true,
    noPersonalityMutation: true,
    ephemeralTurnOnly: true,
    allowedContextScopeJa: AI_ALLOWED_CONTEXT_SCOPE_JA,
    prohibitedMemoryCategoriesJa: AI_PROHIBITED_MEMORY_CATEGORIES_JA,
    fixedTraitsJa: AI_FIXED_PHILOSOPHY_TRAITS_JA,
  };
}

export function buildConciergeChatInstructions(
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
  analysisMode?: AiAnalysisMode,
): string {
  const level = normalizeAiExplanationLevel(explanationLevel);
  const mode = normalizeAiAnalysisMode(analysisMode);
  const locale = getCurrentAppLanguage();
  return [
    AI_CONCIERGE_CHAT_SYSTEM_PROMPT,
    buildAnalysisModeInstructions(mode),
    RESPONSE_LANGUAGE_RULE[locale],
    AI_SPECIFICITY_PROMPT_BLOCK_JA,
    AI_NO_USER_LEARNING_POLICY,
    buildExplanationLevelInstructions(level),
  ].join('\n\n');
}

export function buildFixedAiInstructions(
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
  analysisMode?: AiAnalysisMode,
): string {
  const level = normalizeAiExplanationLevel(explanationLevel);
  const mode = normalizeAiAnalysisMode(analysisMode);
  return [
    AI_SYSTEM_PROMPT,
    AI_DATA_DRIVEN_PROMPT_JA,
    AI_ACTION_GUIDE_PROMPT_JA,
    MARKET_REGIME_AI_PROMPT_JA,
    AI_RISK_CONTROL_PROMPT_JA,
    PORTFOLIO_INTEL_AI_PROMPT_JA,
    CONCIERGE_UX_AI_PROMPT_JA,
    AUTONOMOUS_AI_PROMPT_JA,
    META_AI_PROMPT_JA,
    STRATEGY_AI_PROMPT_JA,
    REALITY_AI_PROMPT_JA,
    PRODUCTION_AI_PROMPT_JA,
    PAPER_AI_PROMPT_JA,
    SELF_EVAL_AI_PROMPT_JA,
    MACRO_INTEL_AI_PROMPT_JA,
    DATA_RELIABILITY_AI_PROMPT_JA,
    PORTFOLIO_RISK_AI_PROMPT_JA,
    CAPITAL_ALLOCATION_AI_PROMPT_JA,
    INTEGRITY_AI_PROMPT_JA,
    GOVERNANCE_AI_PROMPT_JA,
    REACTIVE_AI_PROMPT_JA,
    TRACE_AI_PROMPT_JA,
    RESOURCE_AI_PROMPT_JA,
    TEMPORAL_AI_PROMPT_JA,
    SEMANTIC_AI_PROMPT_JA,
    EPISTEMIC_AI_PROMPT_JA,
    ARBITRATION_AI_PROMPT_JA,
    REFLECTION_AI_PROMPT_JA,
    MEMORY_COMPRESSION_AI_PROMPT_JA,
    SYSTEMIC_STABILITY_AI_PROMPT_JA,
    RECOVERY_AI_PROMPT_JA,
    ORCHESTRATION_AI_PROMPT_JA,
    REGIME_AI_PROMPT_JA,
    CONSENSUS_AI_PROMPT_JA,
    META_RELIABILITY_AI_PROMPT_JA,
    SELF_ARCHITECTURE_AI_PROMPT_JA,
    EPISTEMIC_INTEGRITY_AI_PROMPT_JA,
    STRATEGIC_MEMORY_GRAPH_AI_PROMPT_JA,
    COGNITIVE_RESOURCE_ECONOMY_AI_PROMPT_JA,
    UNIFIED_COGNITIVE_STATE_AI_PROMPT_JA,
    HUMAN_INTENT_CONTINUITY_AI_PROMPT_JA,
    ADAPTIVE_EXPLORATION_AI_PROMPT_JA,
    CONSTITUTIONAL_GOVERNANCE_AI_PROMPT_JA,
    EXPLAINABLE_GOVERNANCE_AI_PROMPT_JA,
    RUNTIME_SURVIVAL_AI_PROMPT_JA,
    buildAnalysisModeInstructions(mode),
    AI_CONCIERGE_RELEVANCE_PROMPT_JA,
    AI_SPECIFICITY_PROMPT_BLOCK_JA,
    AI_NO_USER_LEARNING_POLICY,
    `固定人格特性: ${AI_FIXED_PHILOSOPHY_TRAITS_JA.join(' · ')}`,
    buildExplanationLevelInstructions(level),
  ].join('\n\n');
}

/** API payload must contain only current-turn question — never chat log. */
export function buildEphemeralApiUserPayload(
  userMessage: string,
  context: AiStrategyContextPayload,
): {
  question: string;
  context: AiStrategyContextPayload;
  sessionMemory: AiStrategyContextPayload['sessionMemory'];
  ephemeralNotice: string;
} {
  return {
    question: userMessage.trim(),
    context,
    sessionMemory: context.sessionMemory,
    ephemeralNotice:
      'このリクエストは単一ターンのみ。sessionMemory は現在セッションの要約（質問・銘柄・方針）であり、学習データではありません。人格・思想は固定です。',
  };
}

export function assertFixedPersonalityImmutable(payload: AiStrategyContextPayload): void {
  const g = payload.personalityGuardrails;
  if (!g?.fixedPersonality || !g.noUserLearning || !g.noPersonalityMutation) {
    throw new Error('AI personality guardrails missing or tampered');
  }
  if (g.philosophyVersion !== AI_PERSONALITY_PHILOSOPHY_VERSION) {
    throw new Error('AI personality version mismatch — mutation blocked');
  }

  const expectedTone = JSON.stringify([...AI_PERSONALITY_TONE_GUIDELINES_JA]);
  const actualTone = JSON.stringify([...payload.personality.toneGuidelinesJa]);
  if (expectedTone !== actualTone) {
    throw new Error('AI personality tone guidelines mutation blocked');
  }
}

function collectPayloadKeys(value: unknown): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPayloadKeys(item));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => [
    key,
    ...collectPayloadKeys(nested),
  ]);
}

export function assertNoHiddenMemoryInjection(payload: AiStrategyContextPayload): void {
  const forbidden = new Set(AI_FORBIDDEN_MEMORY_FIELD_NAMES);
  for (const key of collectPayloadKeys(payload)) {
    const lower = key.toLowerCase();
    if (forbidden.has(lower as (typeof AI_FORBIDDEN_MEMORY_FIELD_NAMES)[number])) {
      throw new Error(`AI context contains forbidden memory field: ${key}`);
    }
  }
}

export function assertAiPayloadGuardrails(payload: AiStrategyContextPayload): void {
  assertFixedPersonalityImmutable(payload);
  assertNoHiddenMemoryInjection(payload);
}

export function containsHypeOrCertaintyLanguage(text: string): boolean {
  if (AI_FORBIDDEN_EXPRESSIONS.some((re) => re.test(text))) return true;
  return AI_HYPE_CERTAINTY_PATTERNS.some((re) => re.test(text));
}

export type DisclosureValidation = {
  ok: boolean;
  missing: string[];
};

export function validateDisclosureCompliance(
  parsed: ParsedAiApiJson,
  context: AiStrategyContextPayload,
): DisclosureValidation {
  const question = context.concierge.currentQuestion;
  const mode = context.concierge.conversationMode;

  if (mode === 'conversation' || mode === 'elaboration') {
    const asksStale = /古い|stale|鮮度|更新|遅延|株価/i.test(question);
    const asksDegraded = /劣化|制限|診断|quota|キュー|API|接続/i.test(question);
    if (!asksStale && !asksDegraded) {
      return { ok: true, missing: [] };
    }
  }

  const combined = JSON.stringify(parsed);
  const missing: string[] = [];

  const mentionsStale =
    /古い|stale|鮮度|経過|更新|遅延/i.test(combined) ||
    Boolean(parsed.dataFreshness && parsed.dataFreshness.length > 3);

  const mentionsDegraded =
    /劣化|制限|診断|quota|キュー|信頼度.*低下|composite/i.test(combined) ||
    Boolean(parsed.systemStateReason && parsed.systemStateReason.length > 3) ||
    Boolean(parsed.confidenceDegradationReason);

  if (context.staleHoldingsCount > 0 && !mentionsStale) {
    missing.push('stale_data');
  }

  if (context.operations.degradedMode && !mentionsDegraded) {
    missing.push('degraded_mode');
  }

  if (context.systemAwareness.compositeConfidence < 75 && !mentionsDegraded && !parsed.confidenceDegradationReason) {
    missing.push('confidence_limitation');
  }

  return { ok: missing.length === 0, missing };
}

/** User attempts to train or mutate AI — answer must not comply; flagged for prompt. */
export function detectsUserTrainingAttempt(userMessage: string): boolean {
  return /覚えて|記憶して|学習して|人格を変|思想を変|リスク許容を上げ|いつも私のように|ファインチューニング|fine.?tune|これからは.*(口調|話し方|トーン|スタイル|攻撃的)/i.test(
    userMessage,
  );
}

export function getChatHistoryScopeNotice(): string {
  return AI_CHAT_HISTORY_UI_ONLY_NOTICE;
}
