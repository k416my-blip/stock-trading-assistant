import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../constants/notifications';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  isPersistedAppStateCorrupt,
  isPersistedAppStateEnvelope,
  verifyPersistedAppStateChecksum,
  wrapAppStateForPersistence,
} from './appStatePersistence';
import { migratePersistedAppStateRaw } from './persistenceMigration';
import { deleteAllSecrets } from './secretStorage';
import { secureWarn } from './secureLogger';
import { createDefaultPracticeState } from './practice';
import { normalizePortfolioPosition } from './portfolio';
import { DEFAULT_PRICE_REFRESH_MINUTES, isPriceRefreshMinutes } from '../constants/marketData';
import type { AppMode, AppState, NotificationSettings, UserSettings } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  totalCapitalMYR: 0,
  riskPerTradePct: 1,
  selectedMarket: 'bursa',
  accountType: 'cash_upfront',
  priceRefreshMinutes: DEFAULT_PRICE_REFRESH_MINUTES,
};

const DEFAULT_STATE: AppState = {
  appMode: 'manual',
  settings: DEFAULT_SETTINGS,
  practice: createDefaultPracticeState(),
  deposits: [],
  portfolio: [],
  trades: [],
  dividends: [],
  performanceHistory: [],
  manualOrderList: [],
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  notificationHistory: [],
  notificationCooldowns: {},
};

function migrateNotificationSettings(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const n = raw as Record<string, unknown>;
  const sound =
    n.sound === 'bell' || n.sound === 'chime' || n.sound === 'warning' || n.sound === 'silent'
      ? n.sound
      : 'default';
  return {
    notifyBuyCandidate: n.notifyBuyCandidate !== false,
    notifySellCandidate: n.notifySellCandidate !== false,
    notifyStopLoss: n.notifyStopLoss !== false,
    notifyTakeProfit: n.notifyTakeProfit !== false,
    notifyMarketOpenBefore: n.notifyMarketOpenBefore !== false,
    notifyMarketCloseBefore: n.notifyMarketCloseBefore === true,
    sound,
    vibrationEnabled: n.vibrationEnabled !== false,
  };
}

function migrateSettings(raw: Record<string, unknown>): UserSettings {
  const totalCapitalMYR =
    typeof raw.totalCapitalMYR === 'number'
      ? raw.totalCapitalMYR
      : typeof raw.totalCapital === 'number'
        ? raw.totalCapital
        : 0;

  return {
    totalCapitalMYR,
    riskPerTradePct: typeof raw.riskPerTradePct === 'number' ? raw.riskPerTradePct : 1,
    selectedMarket:
      raw.selectedMarket === 'bursa' || raw.selectedMarket === 'us' || raw.selectedMarket === 'hk'
        ? raw.selectedMarket
        : 'bursa',
    accountType:
      raw.accountType === 'contra' || raw.accountType === 'raku_margin'
        ? raw.accountType
        : 'cash_upfront',
    priceRefreshMinutes: isPriceRefreshMinutes(raw.priceRefreshMinutes)
      ? raw.priceRefreshMinutes
      : DEFAULT_PRICE_REFRESH_MINUTES,
  };
}

function migratePractice(raw: unknown): AppState['practice'] {
  const base = createDefaultPracticeState();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  return {
    virtualCapitalMYR:
      typeof p.virtualCapitalMYR === 'number' ? p.virtualCapitalMYR : base.virtualCapitalMYR,
    cashBalanceMYR: typeof p.cashBalanceMYR === 'number' ? p.cashBalanceMYR : base.cashBalanceMYR,
    portfolio: Array.isArray(p.portfolio)
      ? (p.portfolio as AppState['practice']['portfolio']).map((pos) => normalizePortfolioPosition(pos))
      : [],
    trades: Array.isArray(p.trades) ? (p.trades as AppState['practice']['trades']) : [],
    performanceHistory: Array.isArray(p.performanceHistory)
      ? (p.performanceHistory as AppState['practice']['performanceHistory'])
      : [],
  };
}

function migrateState(parsed: Record<string, unknown>): AppState {
  const settings = migrateSettings((parsed.settings as Record<string, unknown>) ?? {});
  const appMode: AppMode = parsed.appMode === 'practice' ? 'practice' : 'manual';

  return {
    appMode,
    settings,
    practice: migratePractice(parsed.practice),
    deposits: Array.isArray(parsed.deposits) ? (parsed.deposits as AppState['deposits']) : [],
    portfolio: Array.isArray(parsed.portfolio)
      ? (parsed.portfolio as AppState['portfolio']).map((p) =>
          normalizePortfolioPosition({
            ...p,
            market: p.market ?? 'bursa',
            currency: p.currency ?? 'MYR',
          }),
        )
      : [],
    trades: Array.isArray(parsed.trades)
      ? (parsed.trades as AppState['trades']).map((t) => ({
          ...t,
          market: t.market ?? 'us',
          currency: t.currency ?? 'USD',
          brokerageFee: t.brokerageFee ?? 0,
        }))
      : [],
    dividends: Array.isArray(parsed.dividends) ? (parsed.dividends as AppState['dividends']) : [],
    performanceHistory: Array.isArray(parsed.performanceHistory)
      ? (parsed.performanceHistory as { date: string; portfolioValueMYR?: number; portfolioValue?: number }[]).map(
          (pt) => ({
            date: pt.date,
            portfolioValueMYR: pt.portfolioValueMYR ?? pt.portfolioValue ?? 0,
          }),
        )
      : [],
    manualOrderList: Array.isArray(parsed.manualOrderList)
      ? (parsed.manualOrderList as AppState['manualOrderList'])
      : [],
    notificationSettings: migrateNotificationSettings(parsed.notificationSettings),
    notificationHistory: Array.isArray(parsed.notificationHistory)
      ? (parsed.notificationHistory as AppState['notificationHistory'])
      : [],
    notificationCooldowns:
      parsed.notificationCooldowns && typeof parsed.notificationCooldowns === 'object'
        ? (parsed.notificationCooldowns as AppState['notificationCooldowns'])
        : {},
  };
}

export type LoadAppStateResult = {
  state: AppState;
  trusted: boolean;
  warnings: string[];
};

export async function loadAppStateTrusted(): Promise<LoadAppStateResult> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.appState);
  if (!raw) return { state: { ...DEFAULT_STATE }, trusted: true, warnings: [] };

  try {
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migratePersistedAppStateRaw(
      parsed,
      (p) => migrateState(p),
      DEFAULT_STATE,
    );
    const warnings = [...migrated.warnings];

    if (isPersistedAppStateEnvelope(parsed)) {
      const checksumOk = verifyPersistedAppStateChecksum(parsed);
      if (!checksumOk) {
        secureWarn('[storage] app state checksum mismatch — refusing corrupted state');
        return {
          state: { ...DEFAULT_STATE },
          trusted: false,
          warnings: [...warnings, 'checksum_mismatch'],
        };
      }
      if (isPersistedAppStateCorrupt(migrated.state)) {
        secureWarn('[storage] structurally corrupt portfolio in persisted state');
        return {
          state: { ...DEFAULT_STATE },
          trusted: false,
          warnings: [...warnings, 'structural_corrupt'],
        };
      }
      return { state: migrated.state, trusted: true, warnings };
    }

    if (isPersistedAppStateCorrupt(migrated.state)) {
      return {
        state: { ...DEFAULT_STATE },
        trusted: false,
        warnings: [...warnings, 'legacy_structural_corrupt'],
      };
    }
    return { state: migrated.state, trusted: true, warnings };
  } catch {
    return { state: { ...DEFAULT_STATE }, trusted: false, warnings: ['parse_error'] };
  }
}

export async function loadAppState(): Promise<AppState> {
  const result = await loadAppStateTrusted();
  return result.state;
}

export async function saveAppState(state: AppState): Promise<void> {
  const envelope = wrapAppStateForPersistence(state);
  await AsyncStorage.setItem(STORAGE_KEYS.appState, JSON.stringify(envelope));
}

export function createDefaultAppState(): AppState {
  return {
    ...DEFAULT_STATE,
    practice: createDefaultPracticeState(),
    settings: { ...DEFAULT_SETTINGS },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
  };
}

/** アプリデータを初期化（APIキーはオプションで削除） */
export async function clearAllPersistedAppData(clearApiKeys: boolean): Promise<void> {
  const fresh = createDefaultAppState();
  await saveAppState(fresh);
  await AsyncStorage.removeItem(STORAGE_KEYS.aiLearning);
  await AsyncStorage.removeItem(STORAGE_KEYS.aiPreferences);
  await AsyncStorage.removeItem(STORAGE_KEYS.aiChatHistory);

  if (clearApiKeys) {
    await deleteAllSecrets();
  }
}
