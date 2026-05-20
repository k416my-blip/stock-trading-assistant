import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SHADOW_CAPITAL_MYR,
  DEFAULT_SHADOW_EXECUTION_CONFIG,
} from '../constants/shadowTrading';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { ShadowPortfolioState } from '../types/shadowTrading';

export function createDefaultShadowPortfolio(): ShadowPortfolioState {
  const now = new Date().toISOString();
  return {
    initialCapitalMYR: DEFAULT_SHADOW_CAPITAL_MYR,
    cashBalanceMYR: DEFAULT_SHADOW_CAPITAL_MYR,
    positions: [],
    orders: [],
    fills: [],
    ledger: [
      {
        id: `led_${Date.now()}`,
        timestamp: now,
        type: 'deposit',
        amountMYR: DEFAULT_SHADOW_CAPITAL_MYR,
        balanceAfterMYR: DEFAULT_SHADOW_CAPITAL_MYR,
        noteJa: 'シャドー口座初期資金',
      },
    ],
    equityCurve: [{ date: now.slice(0, 10), portfolioValueMYR: DEFAULT_SHADOW_CAPITAL_MYR }],
    config: { ...DEFAULT_SHADOW_EXECUTION_CONFIG },
    capitalPreservationActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadShadowPortfolio(): Promise<ShadowPortfolioState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.shadowPortfolio);
    if (!raw) return createDefaultShadowPortfolio();
    const parsed = JSON.parse(raw) as ShadowPortfolioState;
    return {
      ...createDefaultShadowPortfolio(),
      ...parsed,
      config: { ...DEFAULT_SHADOW_EXECUTION_CONFIG, ...parsed.config },
    };
  } catch {
    return createDefaultShadowPortfolio();
  }
}

export async function saveShadowPortfolio(state: ShadowPortfolioState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.shadowPortfolio, JSON.stringify(state));
}

export async function resetShadowPortfolio(): Promise<ShadowPortfolioState> {
  const fresh = createDefaultShadowPortfolio();
  await saveShadowPortfolio(fresh);
  return fresh;
}
