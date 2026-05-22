import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export type ConciergePromptDebugSnapshot = {
  savedAt: string;
  instructionsFull: string;
  userPayloadJson: string;
};

let memorySnapshot: ConciergePromptDebugSnapshot | null = null;

export async function saveConciergePromptDebug(
  instructionsFull: string,
  userPayloadJson: string,
): Promise<void> {
  const snapshot: ConciergePromptDebugSnapshot = {
    savedAt: new Date().toISOString(),
    instructionsFull,
    userPayloadJson,
  };
  memorySnapshot = snapshot;
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.conciergePromptDebug, JSON.stringify(snapshot));
  } catch {
    /* non-fatal */
  }
}

export async function loadConciergePromptDebug(): Promise<ConciergePromptDebugSnapshot | null> {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.conciergePromptDebug);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConciergePromptDebugSnapshot;
    if (!parsed.instructionsFull || !parsed.userPayloadJson) return null;
    memorySnapshot = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function resetConciergePromptDebugForTest(): void {
  memorySnapshot = null;
}
