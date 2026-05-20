import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUDIT_LOG_MAX_ENTRIES } from '../constants/governance';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { GovernanceAuditEntry } from '../types/governance';

export async function appendGovernanceAuditEntry(entry: GovernanceAuditEntry): Promise<void> {
  const log = await loadGovernanceAuditLog();
  log.unshift(entry);
  if (log.length > AUDIT_LOG_MAX_ENTRIES) {
    log.length = AUDIT_LOG_MAX_ENTRIES;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.governanceAuditLog, JSON.stringify(log));
}

export async function loadGovernanceAuditLog(): Promise<GovernanceAuditEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.governanceAuditLog);
    if (!raw) return [];
    return JSON.parse(raw) as GovernanceAuditEntry[];
  } catch {
    return [];
  }
}

export async function clearGovernanceAuditLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.governanceAuditLog);
}
