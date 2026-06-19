import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_APP_UX_MODE } from '../constants/appUxMode';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { AppUxMode } from '../types/appUxMode';
import { isAppUxMode } from '../types/appUxMode';
import type { AiPreferences } from '../types/aiStrategy';
import { loadAiPreferences } from './aiPreferencesStorage';

type LegacyUxPrefs = Pick<AiPreferences, 'conciergeUxMode' | 'investmentDisplayMode'>;

/** UX1.1 — derive unified mode from legacy concierge + investment display prefs. */
export function migrateAppUxModeFromLegacy(prefs: LegacyUxPrefs): AppUxMode {
  if (prefs.investmentDisplayMode === 'pro' || prefs.conciergeUxMode === 'advanced') {
    return 'pro';
  }
  if (
    (prefs.investmentDisplayMode === 'trust' || prefs.investmentDisplayMode === 'beginner') &&
    prefs.conciergeUxMode === 'beginner'
  ) {
    return 'beginner';
  }
  return 'standard';
}

/** Keep legacy aiPreferences in sync when user changes app-wide UX mode. */
export function appUxModeToLegacyPrefs(mode: AppUxMode): Partial<AiPreferences> {
  switch (mode) {
    case 'beginner':
      return {
        conciergeUxMode: 'beginner',
        investmentDisplayMode: 'beginner',
        investmentBeginnerMode: true,
      };
    case 'standard':
      return {
        conciergeUxMode: 'beginner',
        investmentDisplayMode: 'trust',
        investmentBeginnerMode: true,
      };
    case 'pro':
      return {
        conciergeUxMode: 'advanced',
        investmentDisplayMode: 'pro',
        investmentBeginnerMode: false,
      };
  }
}

export async function loadAppUxMode(): Promise<AppUxMode> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.appUxMode);
    if (isAppUxMode(stored)) {
      return stored;
    }

    const rawPrefs = await AsyncStorage.getItem(STORAGE_KEYS.aiPreferences);
    if (!rawPrefs) {
      await AsyncStorage.setItem(STORAGE_KEYS.appUxMode, DEFAULT_APP_UX_MODE);
      return DEFAULT_APP_UX_MODE;
    }

    const prefs = await loadAiPreferences();
    const migrated = migrateAppUxModeFromLegacy(prefs);
    await AsyncStorage.setItem(STORAGE_KEYS.appUxMode, migrated);
    return migrated;
  } catch {
    return DEFAULT_APP_UX_MODE;
  }
}

export async function saveAppUxMode(mode: AppUxMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.appUxMode, mode);
}
