import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { InvestmentQualityAuditEntry } from './investmentRecommendationQuality';

const MAX = 200;

export type InvestmentQualityAuditLog = {
  entries: InvestmentQualityAuditEntry[];
  updatedAt: string;
};

function empty(): InvestmentQualityAuditLog {
  return { entries: [], updatedAt: new Date().toISOString() };
}

export async function loadInvestmentQualityAuditLog(): Promise<InvestmentQualityAuditLog> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.investmentQualityAuditLog);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as InvestmentQualityAuditLog;
    return Array.isArray(parsed.entries) ? parsed : empty();
  } catch {
    return empty();
  }
}

export async function appendInvestmentQualityAudit(
  entry: Omit<InvestmentQualityAuditEntry, 'id' | 'timestamp'>,
): Promise<InvestmentQualityAuditEntry> {
  const log = await loadInvestmentQualityAuditLog();
  const full: InvestmentQualityAuditEntry = {
    ...entry,
    id: `iq-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const entries = [full, ...log.entries].slice(0, MAX);
  await AsyncStorage.setItem(
    STORAGE_KEYS.investmentQualityAuditLog,
    JSON.stringify({ entries, updatedAt: new Date().toISOString() }),
  );
  console.warn(
    '[QUALITY-AUDIT]',
    JSON.stringify({
      investableMYR: full.investableMYR,
      selectedCount: full.selected.length,
      estimatedTotalMYR: full.estimatedTotalMYR,
      cashRemainderMYR: full.cashRemainderMYR,
      manualOrderCreatable: full.manualOrderCreatable,
      apiStatus: full.apiStatus,
    }),
  );
  return full;
}

export async function clearInvestmentQualityAuditForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.investmentQualityAuditLog);
}
