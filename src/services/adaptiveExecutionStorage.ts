import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AdaptiveLearningState } from '../types/adaptiveExecution';
import { createDefaultLearningState } from './adaptiveExecutionEngine';

export async function loadAdaptiveLearningState(): Promise<AdaptiveLearningState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.adaptiveLearning);
    if (!raw) return createDefaultLearningState();
    const parsed = JSON.parse(raw) as AdaptiveLearningState;
    if (parsed.version !== 1) return createDefaultLearningState();
    return parsed;
  } catch {
    return createDefaultLearningState();
  }
}

export async function saveAdaptiveLearningState(state: AdaptiveLearningState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.adaptiveLearning, JSON.stringify(state));
}

export async function clearAdaptiveLearningState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.adaptiveLearning);
}
