import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { RecommendationAuditEntry, RecommendationAuditLog } from '../types/investmentCharter';

const MAX_ENTRIES = 500;

function emptyLog(): RecommendationAuditLog {
  return { entries: [], updatedAt: new Date().toISOString() };
}

export async function loadRecommendationAuditLog(): Promise<RecommendationAuditLog> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recommendationAuditLog);
    if (!raw) return emptyLog();
    const parsed = JSON.parse(raw) as RecommendationAuditLog;
    if (!Array.isArray(parsed.entries)) return emptyLog();
    return parsed;
  } catch {
    return emptyLog();
  }
}

export async function appendRecommendationAuditEntry(
  entry: Omit<RecommendationAuditEntry, 'id' | 'timestamp'>,
): Promise<RecommendationAuditEntry> {
  const log = await loadRecommendationAuditLog();
  const full: RecommendationAuditEntry = {
    ...entry,
    id: `rec-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const entries = [full, ...log.entries].slice(0, MAX_ENTRIES);
  const next: RecommendationAuditLog = {
    entries,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.recommendationAuditLog, JSON.stringify(next));
  return full;
}

export async function appendRecommendationAuditEntries(
  items: Omit<RecommendationAuditEntry, 'id' | 'timestamp'>[],
): Promise<void> {
  for (const item of items) {
    await appendRecommendationAuditEntry(item);
  }
}

/** テスト用 */
export async function clearRecommendationAuditLogForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.recommendationAuditLog);
}
