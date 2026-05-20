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
import { AI_SPECIFICITY_PROMPT_BLOCK_JA } from '../constants/aiConciergeSpecificity';
import { AI_FORBIDDEN_EXPRESSIONS, AI_SYSTEM_PROMPT } from '../constants/aiStrategy';
import type { AiStrategyContextPayload } from '../types/aiStrategy';
import type { ParsedAiApiJson } from './aiResponseSanitizer';
import { buildExplanationLevelInstructions, normalizeAiExplanationLevel } from './aiExplanationLevel';

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

export function buildFixedAiInstructions(
  explanationLevel: AiExplanationLevel = DEFAULT_AI_EXPLANATION_LEVEL,
): string {
  const level = normalizeAiExplanationLevel(explanationLevel);
  return [
    AI_SYSTEM_PROMPT,
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
