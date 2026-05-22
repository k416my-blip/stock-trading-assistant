import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export type SystemStabilityCheckpoint = {
  version: 1;
  savedAt: string;
  lastHealthScore: number;
  lastEmergencyLevel: number;
  proactiveQueueSize: number;
  sessionNoteJa: string;
};

export function defaultCheckpoint(): SystemStabilityCheckpoint {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    lastHealthScore: 100,
    lastEmergencyLevel: 0,
    proactiveQueueSize: 0,
    sessionNoteJa: '初期',
  };
}

export async function loadSystemStabilityCheckpoint(): Promise<SystemStabilityCheckpoint> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.systemStabilityIntegrity);
    if (!raw) return defaultCheckpoint();
    const parsed = JSON.parse(raw) as Partial<SystemStabilityCheckpoint>;
    return {
      version: 1,
      savedAt: parsed.savedAt ?? new Date().toISOString(),
      lastHealthScore: typeof parsed.lastHealthScore === 'number' ? parsed.lastHealthScore : 100,
      lastEmergencyLevel:
        typeof parsed.lastEmergencyLevel === 'number' ? parsed.lastEmergencyLevel : 0,
      proactiveQueueSize: parsed.proactiveQueueSize ?? 0,
      sessionNoteJa: parsed.sessionNoteJa ?? '復元',
    };
  } catch {
    return defaultCheckpoint();
  }
}

export async function saveSystemStabilityCheckpoint(
  patch: Partial<SystemStabilityCheckpoint>,
): Promise<SystemStabilityCheckpoint> {
  const prev = await loadSystemStabilityCheckpoint();
  const next: SystemStabilityCheckpoint = {
    ...prev,
    ...patch,
    savedAt: new Date().toISOString(),
    version: 1,
  };
  await AsyncStorage.setItem(STORAGE_KEYS.systemStabilityIntegrity, JSON.stringify(next));
  return next;
}
