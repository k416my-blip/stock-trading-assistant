import AsyncStorage from '@react-native-async-storage/async-storage';
import { FORWARD_INITIAL_CAPITAL_USD } from '../../constants/forwardValidation';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { ForwardValidationPersisted } from '../../types/forwardValidation';

export function defaultForwardValidationState(): ForwardValidationPersisted {
  const now = new Date().toISOString();
  return {
    version: 1,
    startedAt: now,
    lastRunDate: null,
    lastRunAt: null,
    lastFetchAt: null,
    yahooLatestDate: null,
    yahooFetchLog: null,
    initialCapitalUsd: FORWARD_INITIAL_CAPITAL_USD,
    signals: [],
    openPositions: [],
    closedTrades: [],
    dailyReturns: [],
    equityUsd: FORWARD_INITIAL_CAPITAL_USD,
    peakEquityUsd: FORWARD_INITIAL_CAPITAL_USD,
    report: null,
    reports: [],
    reportGeneratedAt: null,
  };
}

function migratePersisted(parsed: Partial<ForwardValidationPersisted>): ForwardValidationPersisted {
  const base = defaultForwardValidationState();
  const reports = Array.isArray(parsed.reports)
    ? parsed.reports
    : parsed.report
      ? [parsed.report]
      : [];
  return {
    ...base,
    ...parsed,
    version: 1,
    signals: Array.isArray(parsed.signals) ? parsed.signals : [],
    openPositions: Array.isArray(parsed.openPositions) ? parsed.openPositions : [],
    closedTrades: Array.isArray(parsed.closedTrades) ? parsed.closedTrades : [],
    dailyReturns: Array.isArray(parsed.dailyReturns) ? parsed.dailyReturns : [],
    reports,
    report: reports.length > 0 ? reports[reports.length - 1]! : (parsed.report ?? null),
  };
}

export async function loadForwardValidationState(): Promise<ForwardValidationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.forwardValidation);
    if (!raw) return defaultForwardValidationState();
    return migratePersisted(JSON.parse(raw) as Partial<ForwardValidationPersisted>);
  } catch {
    return defaultForwardValidationState();
  }
}

export async function saveForwardValidationState(state: ForwardValidationPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.forwardValidation, JSON.stringify(state));
}

export async function resetForwardValidationState(): Promise<ForwardValidationPersisted> {
  const fresh = defaultForwardValidationState();
  await saveForwardValidationState(fresh);
  return fresh;
}

export async function readForwardValidationStorageRaw(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.forwardValidation);
}
