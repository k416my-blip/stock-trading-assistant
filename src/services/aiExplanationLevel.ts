import {
  AI_EXPLANATION_LEVEL_LABELS_JA,
  AI_EXPLANATION_LEVEL_PROMPT_JA,
  DEFAULT_AI_EXPLANATION_LEVEL,
  isAiExplanationLevel,
  type AiExplanationLevel,
} from '../constants/aiExplanationLevel';

export function normalizeAiExplanationLevel(value: unknown): AiExplanationLevel {
  return isAiExplanationLevel(value) ? value : DEFAULT_AI_EXPLANATION_LEVEL;
}

export function buildExplanationLevelContextBlock(level: AiExplanationLevel): {
  aiExplanationLevel: AiExplanationLevel;
  labelJa: string;
  promptHintJa: string;
} {
  const resolved = normalizeAiExplanationLevel(level);
  return {
    aiExplanationLevel: resolved,
    labelJa: AI_EXPLANATION_LEVEL_LABELS_JA[resolved],
    promptHintJa: AI_EXPLANATION_LEVEL_PROMPT_JA[resolved],
  };
}

export function buildExplanationLevelInstructions(level: AiExplanationLevel): string {
  return AI_EXPLANATION_LEVEL_PROMPT_JA[normalizeAiExplanationLevel(level)];
}
