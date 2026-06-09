import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AllocationPlan, PerformancePoint } from '../types';
import {
  buildTrustMonthlyPerformanceRecord,
  getPreviousYearMonth,
} from './trustMonthlyPerformanceReport';
import type { TrustMonthlyPerformanceOutcome } from './trustMonthlyPerformanceReport';

export type TrustMonthlyReportRecord = {
  yearMonth: string;
  portfolioReturnPct: number;
  marketAverageReturnPct: number;
  outcome: TrustMonthlyPerformanceOutcome;
  reasonJa: string;
  savedAt: string;
};

type StoredReports = {
  reports: TrustMonthlyReportRecord[];
};

const MAX_REPORTS = 24;

export async function loadTrustMonthlyReports(): Promise<TrustMonthlyReportRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.trustMonthlyReport);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReports;
    if (!parsed?.reports || !Array.isArray(parsed.reports)) return [];
    return parsed.reports;
  } catch {
    return [];
  }
}

export async function saveTrustMonthlyReport(record: TrustMonthlyReportRecord): Promise<void> {
  const existing = await loadTrustMonthlyReports();
  const without = existing.filter((r) => r.yearMonth !== record.yearMonth);
  const reports = [record, ...without]
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    .slice(0, MAX_REPORTS);
  await AsyncStorage.setItem(STORAGE_KEYS.trustMonthlyReport, JSON.stringify({ reports }));
}

export async function loadTrustMonthlyReportForMonth(
  yearMonth: string,
): Promise<TrustMonthlyReportRecord | null> {
  const reports = await loadTrustMonthlyReports();
  return reports.find((r) => r.yearMonth === yearMonth) ?? null;
}

export async function ensureTrustMonthlyReportSaved(input: {
  performanceHistory: PerformancePoint[];
  plan?: AllocationPlan | null;
  yearMonth?: string;
}): Promise<TrustMonthlyReportRecord | null> {
  const yearMonth = input.yearMonth ?? getPreviousYearMonth();
  const existing = await loadTrustMonthlyReportForMonth(yearMonth);
  if (existing) return existing;

  const record = buildTrustMonthlyPerformanceRecord({
    yearMonth,
    performanceHistory: input.performanceHistory,
    plan: input.plan,
  });
  if (!record) return null;

  await saveTrustMonthlyReport(record);
  return record;
}

export async function clearTrustMonthlyReportsForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.trustMonthlyReport);
}
