import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { PerformancePoint } from '../types';
import { loadTrustMonthlyReports } from './trustMonthlyReportStorage';
import {
  buildTrustOperatingPerformanceRecord,
  type TrustOperatingPerformanceRecord,
} from './trustOperatingPerformance';

type StoredOperatingPerformance = {
  operationStartedAt: string | null;
  latestRecord: TrustOperatingPerformanceRecord | null;
};

export async function loadTrustOperatingPerformanceState(): Promise<StoredOperatingPerformance> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.trustOperatingPerformance);
    if (!raw) return { operationStartedAt: null, latestRecord: null };
    const parsed = JSON.parse(raw) as StoredOperatingPerformance;
    return {
      operationStartedAt:
        typeof parsed.operationStartedAt === 'string' ? parsed.operationStartedAt : null,
      latestRecord: parsed.latestRecord ?? null,
    };
  } catch {
    return { operationStartedAt: null, latestRecord: null };
  }
}

export async function recordTrustOperationStartIfNeeded(startDate?: string): Promise<string> {
  const state = await loadTrustOperatingPerformanceState();
  if (state.operationStartedAt) return state.operationStartedAt;

  const iso = (startDate ?? new Date().toISOString()).slice(0, 10);
  await AsyncStorage.setItem(
    STORAGE_KEYS.trustOperatingPerformance,
    JSON.stringify({
      operationStartedAt: iso,
      latestRecord: state.latestRecord,
    }),
  );
  return iso;
}

export async function saveTrustOperatingPerformanceRecord(
  record: TrustOperatingPerformanceRecord,
): Promise<void> {
  const state = await loadTrustOperatingPerformanceState();
  await AsyncStorage.setItem(
    STORAGE_KEYS.trustOperatingPerformance,
    JSON.stringify({
      operationStartedAt: record.operationStartedAt,
      latestRecord: record,
    }),
  );
}

export async function ensureTrustOperatingPerformanceSaved(input: {
  performanceHistory: PerformancePoint[];
  operationStartedAt?: string | null;
}): Promise<TrustOperatingPerformanceRecord | null> {
  const state = await loadTrustOperatingPerformanceState();
  const operationStartedAt =
    input.operationStartedAt ?? state.operationStartedAt ?? (await recordTrustOperationStartIfNeeded());

  const monthlyReports = await loadTrustMonthlyReports();
  const record = buildTrustOperatingPerformanceRecord({
    operationStartedAt,
    performanceHistory: input.performanceHistory,
    monthlyReports,
  });
  if (!record) return state.latestRecord;

  await saveTrustOperatingPerformanceRecord(record);
  return record;
}

export async function clearTrustOperatingPerformanceForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.trustOperatingPerformance);
}
