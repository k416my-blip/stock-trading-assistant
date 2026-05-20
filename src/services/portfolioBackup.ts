import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { countActiveHoldings } from './portfolioPersistenceGuard';
import {
  computePortfolioChecksum,
  isHealthyPortfolio,
  verifyPortfolioChecksum,
} from './portfolioSnapshot';
import type { AppState } from '../types';

type PortfolioBackupPayload = {
  version: 2;
  savedAt: string;
  appMode: AppState['appMode'];
  manualChecksum: string;
  practiceChecksum: string;
  portfolio: AppState['portfolio'];
  practicePortfolio: AppState['practice']['portfolio'];
};

export async function backupPortfolioIfNonEmpty(state: AppState): Promise<void> {
  const manualOk = isHealthyPortfolio(state.portfolio);
  const practiceOk = isHealthyPortfolio(state.practice.portfolio);
  if (!manualOk && !practiceOk) return;

  const payload: PortfolioBackupPayload = {
    version: 2,
    savedAt: new Date().toISOString(),
    appMode: state.appMode,
    manualChecksum: manualOk ? computePortfolioChecksum(state.portfolio) : '',
    practiceChecksum: practiceOk ? computePortfolioChecksum(state.practice.portfolio) : '',
    portfolio: manualOk ? state.portfolio : [],
    practicePortfolio: practiceOk ? state.practice.portfolio : [],
  };
  await AsyncStorage.setItem(STORAGE_KEYS.portfolioBackup, JSON.stringify(payload));
}

function parseBackup(raw: string): PortfolioBackupPayload | null {
  try {
    const backup = JSON.parse(raw) as PortfolioBackupPayload & { version?: number };
    if (backup.version === 2) {
      return backup;
    }
    if (backup.version === 1 && Array.isArray(backup.portfolio)) {
      const manualOk = isHealthyPortfolio(backup.portfolio);
      const practiceOk = isHealthyPortfolio(backup.practicePortfolio ?? []);
      return {
        version: 2,
        savedAt: backup.savedAt ?? new Date().toISOString(),
        appMode: backup.appMode ?? 'manual',
        manualChecksum: manualOk ? computePortfolioChecksum(backup.portfolio) : '',
        practiceChecksum: practiceOk
          ? computePortfolioChecksum(backup.practicePortfolio ?? [])
          : '',
        portfolio: backup.portfolio,
        practicePortfolio: backup.practicePortfolio ?? [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 起動時 — 破損・空配列時にチェックサム検証済みバックアップから復元 */
export async function restorePortfolioFromBackup(state: AppState): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.portfolioBackup);
    if (!raw) return state;

    const backup = parseBackup(raw);
    if (!backup) return state;

    let next = state;

    if (
      countActiveHoldings(state.portfolio) === 0 &&
      countActiveHoldings(backup.portfolio) > 0 &&
      verifyPortfolioChecksum(backup.portfolio, backup.manualChecksum)
    ) {
      next = { ...next, portfolio: backup.portfolio };
    }

    if (
      countActiveHoldings(state.practice.portfolio) === 0 &&
      countActiveHoldings(backup.practicePortfolio) > 0 &&
      verifyPortfolioChecksum(backup.practicePortfolio, backup.practiceChecksum)
    ) {
      next = {
        ...next,
        practice: { ...next.practice, portfolio: backup.practicePortfolio },
      };
    }
    return next;
  } catch {
    return state;
  }
}
