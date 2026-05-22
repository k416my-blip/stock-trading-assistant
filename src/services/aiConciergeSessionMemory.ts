import type { AiExplanationLevel } from '../constants/aiExplanationLevel';
import { AI_EXPLANATION_LEVEL_LABELS_JA } from '../constants/aiExplanationLevel';
import type { AiChatMessage } from '../types/aiChat';
import type { ConciergeEntityMemory, ConciergeSessionMemory } from '../types/aiConciergeSession';
import {
  extractEntitiesFromText,
  mergeEntityMemory,
} from './aiConciergeEntityExtraction';
import { mergeRelevanceMemory } from './aiConciergeRelevance';

export const EMPTY_ENTITY_MEMORY: ConciergeEntityMemory = {
  tickers: [],
  companyNames: [],
  sectors: [],
  countries: [],
};

const MAX_RECENT_QUESTIONS = 6;
const MAX_SYMBOLS = 8;

export type { ConciergeSessionMemory };

export function createEmptyConciergeSessionMemory(
  explanationLevel: AiExplanationLevel,
): ConciergeSessionMemory {
  return {
    recentQuestions: [],
    discussedSymbols: [],
    strategyPreference: null,
    explanationLevelLabelJa: AI_EXPLANATION_LEVEL_LABELS_JA[explanationLevel],
    entities: { ...EMPTY_ENTITY_MEMORY },
    lastAssistantSnippet: null,
    ignoredTopics: [],
    dismissedSignals: [],
    userRejectedThemes: [],
    proactiveAdvisorSummaryJa: null,
  };
}

const SYMBOL_PATTERNS: RegExp[] = [
  /\b\d{4}\b/g,
  /\bAAPL\b/gi,
  /\bTSLA\b/gi,
  /\bNVDA\b/gi,
  /\bmaybank\b/gi,
  /\bマレー銀行\b/g,
];

const STRATEGY_PREFERENCE_PATTERNS: { test: RegExp; label: string }[] = [
  { test: /バリュー|割安|ファンダメンタル重視/, label: 'バリュー重視' },
  { test: /グロース|成長株|ハイテク寄り/, label: 'グロース重視' },
  { test: /ディフェンシブ|守り|防御/, label: 'ディフェンシブ' },
  { test: /長期|スイング|中長期/, label: '中長期ホールド' },
  { test: /短期|デイトレ|スキャ/, label: '短期トレード' },
  { test: /インカム|配当/, label: 'インカム重視' },
];

export function extractDiscussedSymbols(text: string): string[] {
  const found = new Set<string>();
  for (const re of SYMBOL_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const raw = match[0];
      if (/^\d{4}$/.test(raw)) {
        found.add(raw);
      } else {
        found.add(raw.toUpperCase());
      }
    }
  }
  return [...found];
}

export function detectStrategyPreference(text: string): string | null {
  for (const { test, label } of STRATEGY_PREFERENCE_PATTERNS) {
    if (test.test(text)) return label;
  }
  return null;
}

function pushUniqueTail(list: string[], value: string, max: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return list;
  const next = list.filter((item) => item !== trimmed);
  next.push(trimmed);
  return next.slice(-max);
}

export function updateConciergeSessionMemory(
  prev: ConciergeSessionMemory,
  userMessage: string,
  explanationLevel: AiExplanationLevel,
): ConciergeSessionMemory {
  const preference = detectStrategyPreference(userMessage) ?? prev.strategyPreference;
  const symbols = extractDiscussedSymbols(userMessage);
  let discussedSymbols = prev.discussedSymbols;
  for (const sym of symbols) {
    discussedSymbols = pushUniqueTail(discussedSymbols, sym, MAX_SYMBOLS);
  }
  const userEntities = extractEntitiesFromText(userMessage);
  for (const sym of userEntities.tickers) {
    discussedSymbols = pushUniqueTail(discussedSymbols, sym, MAX_SYMBOLS);
  }

  const base: ConciergeSessionMemory = {
    recentQuestions: pushUniqueTail(prev.recentQuestions, userMessage, MAX_RECENT_QUESTIONS),
    discussedSymbols,
    strategyPreference: preference,
    explanationLevelLabelJa: AI_EXPLANATION_LEVEL_LABELS_JA[explanationLevel],
    entities: mergeEntityMemory(prev.entities, userEntities),
    lastAssistantSnippet: prev.lastAssistantSnippet,
    ignoredTopics: prev.ignoredTopics,
    dismissedSignals: prev.dismissedSignals,
    userRejectedThemes: prev.userRejectedThemes,
    proactiveAdvisorSummaryJa: prev.proactiveAdvisorSummaryJa,
  };
  return mergeRelevanceMemory(base, userMessage);
}

export function withProactiveAdvisorSummary(
  memory: ConciergeSessionMemory,
  summaryJa: string | null,
): ConciergeSessionMemory {
  return { ...memory, proactiveAdvisorSummaryJa: summaryJa };
}

export function recordConciergeAssistantTurn(
  prev: ConciergeSessionMemory,
  assistantText: string,
): ConciergeSessionMemory {
  const trimmed = assistantText.trim();
  if (!trimmed) return prev;
  const fromAssistant = extractEntitiesFromText(trimmed);
  let discussedSymbols = prev.discussedSymbols;
  for (const sym of fromAssistant.tickers) {
    discussedSymbols = pushUniqueTail(discussedSymbols, sym, MAX_SYMBOLS);
  }
  return {
    ...prev,
    discussedSymbols,
    entities: mergeEntityMemory(prev.entities, fromAssistant),
    lastAssistantSnippet: trimmed.slice(0, 200),
  };
}

export function buildSessionMemoryFromMessages(
  messages: AiChatMessage[],
  explanationLevel: AiExplanationLevel,
): ConciergeSessionMemory {
  let memory = createEmptyConciergeSessionMemory(explanationLevel);
  for (const msg of messages) {
    if (msg.role === 'user') {
      memory = updateConciergeSessionMemory(memory, msg.text, explanationLevel);
    } else if (msg.role === 'assistant') {
      memory = recordConciergeAssistantTurn(memory, msg.text);
    }
  }
  return memory;
}
