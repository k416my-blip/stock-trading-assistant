import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  X_CREDITS_PER_SEARCH,
  X_CREDITS_PER_VERIFY,
  X_DAILY_SOFT_LIMIT_REQUESTS,
  X_MONTHLY_CREDIT_BUDGET,
} from '../constants/xApiConservation';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { XApiDailyUsage, XApiUsageDashboard, XApiUsageKind } from '../types/xApi';

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function emptyUsage(dateKey: string): XApiDailyUsage {
  return {
    version: 1,
    dateKey,
    searchCalls: 0,
    verifyCalls: 0,
    creditsUsed: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function loadXApiDailyUsage(): Promise<XApiDailyUsage> {
  const dateKey = todayKey();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.xApiDailyUsage);
    if (!raw) return emptyUsage(dateKey);
    const parsed = JSON.parse(raw) as Partial<XApiDailyUsage>;
    if (parsed.dateKey !== dateKey) {
      return emptyUsage(dateKey);
    }
    return {
      version: 1,
      dateKey,
      searchCalls: Number(parsed.searchCalls) || 0,
      verifyCalls: Number(parsed.verifyCalls) || 0,
      creditsUsed: Number(parsed.creditsUsed) || 0,
      lastUpdatedAt: parsed.lastUpdatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyUsage(dateKey);
  }
}

async function saveXApiDailyUsage(usage: XApiDailyUsage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.xApiDailyUsage, JSON.stringify(usage));
}

export async function recordXApiUsage(kind: XApiUsageKind): Promise<XApiDailyUsage> {
  const usage = await loadXApiDailyUsage();
  const credits = kind === 'search' ? X_CREDITS_PER_SEARCH : X_CREDITS_PER_VERIFY;
  const next: XApiDailyUsage = {
    ...usage,
    searchCalls: usage.searchCalls + (kind === 'search' ? 1 : 0),
    verifyCalls: usage.verifyCalls + (kind === 'verify' ? 1 : 0),
    creditsUsed: usage.creditsUsed + credits,
    lastUpdatedAt: new Date().toISOString(),
  };
  await saveXApiDailyUsage(next);
  return next;
}

export function buildXApiUsageDashboard(usage: XApiDailyUsage): XApiUsageDashboard {
  const remainingToday = Math.max(0, X_DAILY_SOFT_LIMIT_REQUESTS - usage.creditsUsed);
  const dayOfMonth = new Date().getDate();
  const projectedMonthCredits = Math.round((usage.creditsUsed / Math.max(1, dayOfMonth)) * 30);
  const forecastJa =
    `本日 ${usage.creditsUsed} クレジット使用（検索 ${usage.searchCalls} / 検証 ${usage.verifyCalls}）` +
    ` · 本日残り目安 ${remainingToday} · 月末予測 約${projectedMonthCredits} / 上限${X_MONTHLY_CREDIT_BUDGET}`;

  return {
    dateKey: usage.dateKey,
    searchCalls: usage.searchCalls,
    verifyCalls: usage.verifyCalls,
    creditsUsed: usage.creditsUsed,
    dailySoftLimit: X_DAILY_SOFT_LIMIT_REQUESTS,
    remainingToday,
    monthlyBudget: X_MONTHLY_CREDIT_BUDGET,
    projectedMonthCredits,
    forecastJa,
    conservationEnabled: true,
  };
}

export async function getXApiUsageDashboard(): Promise<XApiUsageDashboard> {
  const usage = await loadXApiDailyUsage();
  return buildXApiUsageDashboard(usage);
}
