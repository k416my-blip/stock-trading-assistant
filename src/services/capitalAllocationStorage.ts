import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { CapitalAllocationPersisted, PortfolioMode, SizingTier } from '../types/capitalAllocation';

export function defaultCapitalAllocationState(): CapitalAllocationPersisted {
  return {
    version: 1,
    portfolioMode: 'balanced',
    beginnerMode: false,
    preferredSizingTier: 'standard',
  };
}

export async function loadCapitalAllocationState(): Promise<CapitalAllocationPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.capitalAllocation);
    if (!raw) return defaultCapitalAllocationState();
    const parsed = JSON.parse(raw) as Partial<CapitalAllocationPersisted>;
    const mode = parsed.portfolioMode;
    return {
      version: 1,
      portfolioMode:
        mode === 'dividend' || mode === 'growth' || mode === 'defensive' || mode === 'balanced'
          ? mode
          : 'balanced',
      beginnerMode: parsed.beginnerMode === true,
      preferredSizingTier:
        parsed.preferredSizingTier === 'conservative' || parsed.preferredSizingTier === 'aggressive'
          ? parsed.preferredSizingTier
          : 'standard',
    };
  } catch {
    return defaultCapitalAllocationState();
  }
}

export async function saveCapitalAllocationState(state: CapitalAllocationPersisted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.capitalAllocation, JSON.stringify(state));
}

export async function updateCapitalAllocationPrefs(
  patch: Partial<Pick<CapitalAllocationPersisted, 'portfolioMode' | 'beginnerMode' | 'preferredSizingTier'>>,
): Promise<CapitalAllocationPersisted> {
  const loaded = await loadCapitalAllocationState();
  const next = { ...loaded, ...patch };
  await saveCapitalAllocationState(next);
  return next;
}
