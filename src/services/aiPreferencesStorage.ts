import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_AI_EXPLANATION_LEVEL } from '../constants/aiExplanationLevel';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AiPreferences } from '../types/aiStrategy';
import { normalizeAiExplanationLevel } from './aiExplanationLevel';

const DEFAULT: AiPreferences = {
  aiEnabled: true,
  mockOnly: false,
  aiExplanationLevel: DEFAULT_AI_EXPLANATION_LEVEL,
  voiceEnabled: true,
  voiceAutoRead: false,
  voiceSpeechRate: 1,
  urgentVibrationEnabled: true,
  urgentSoundEnabled: true,
};

export async function loadAiPreferences(): Promise<AiPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.aiPreferences);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<AiPreferences> & {
      aiExplanationLevel?: unknown;
    };
    const rate =
      typeof parsed.voiceSpeechRate === 'number' && Number.isFinite(parsed.voiceSpeechRate)
        ? Math.min(2, Math.max(0.5, parsed.voiceSpeechRate))
        : DEFAULT.voiceSpeechRate;
    return {
      aiEnabled: parsed.aiEnabled !== false,
      mockOnly: parsed.mockOnly === true,
      aiExplanationLevel: normalizeAiExplanationLevel(parsed.aiExplanationLevel),
      voiceEnabled: parsed.voiceEnabled !== false,
      voiceAutoRead: parsed.voiceAutoRead === true,
      voiceSpeechRate: rate,
      urgentVibrationEnabled: parsed.urgentVibrationEnabled !== false,
      urgentSoundEnabled: parsed.urgentSoundEnabled !== false,
    };
  } catch {
    return { ...DEFAULT };
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
  };
  await AsyncStorage.setItem(STORAGE_KEYS.aiPreferences, JSON.stringify(next));
  return next;
}

export function resetAiPreferencesForTest(): void {
  /* vitest: in-memory only via load mock if needed */
}
