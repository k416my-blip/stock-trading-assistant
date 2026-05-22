import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CHAT_HISTORY_MAX_UI_MESSAGES } from '../constants/aiPersonalityGuardrails';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AiChatMessage } from '../types/aiChat';
import { getInitialAiChatMessages } from '../data/mockAiChat';
import { normalizeChatHistory } from '../utils/chatTimestamp';
import { getChatHistoryScopeNotice } from './aiPersonalityGuard';

/**
 * Local chat history is UI-only ephemeral continuity.
 * NOT sent to OpenAI, NOT used for training, personality mutation, or long-term memory.
 * @see docs/AI_PERSONALITY_GUARDRAILS.md
 */
export function getAiChatHistoryStoragePurpose(): string {
  return getChatHistoryScopeNotice();
}

export async function loadAiChatHistory(): Promise<AiChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiChatHistory);
    if (!raw) return getInitialAiChatMessages();
    const parsed = JSON.parse(raw) as AiChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getInitialAiChatMessages();
    }
    return normalizeChatHistory(parsed);
  } catch {
    return getInitialAiChatMessages();
  }
}

export async function saveAiChatHistory(messages: AiChatMessage[]): Promise<void> {
  const trimmed = normalizeChatHistory(messages).slice(-AI_CHAT_HISTORY_MAX_UI_MESSAGES);
  await AsyncStorage.setItem(STORAGE_KEYS.aiChatHistory, JSON.stringify(trimmed));
}

export async function clearAiChatHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.aiChatHistory);
}
