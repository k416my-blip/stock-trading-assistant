import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_ACTIVE_BROKER,
  DEFAULT_DEPLOYMENT_ENV,
  PAPER_DEFAULT_ACCOUNT_ID,
  PAPER_INITIAL_CAPITAL_MYR,
  PAPER_MAX_JOURNAL,
  PAPER_MAX_ORDERS_STORED,
  REAL_TRADING_ENABLED_DEFAULT,
} from '../../constants/paperBroker';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import type { PaperBrokerPersisted } from '../../types/paperBroker';
import {
  PAPER_COOLDOWN_MS,
  PAPER_MAX_DRAWDOWN_PCT,
  PAPER_MAX_SECTOR_EXPOSURE_PCT,
  PAPER_MAX_SYMBOL_EXPOSURE_PCT,
} from '../../constants/paperBroker';

export function defaultPaperBrokerState(): PaperBrokerPersisted {
  return {
    version: 1,
    config: {
      realTradingEnabled: REAL_TRADING_ENABLED_DEFAULT,
      deploymentEnv: DEFAULT_DEPLOYMENT_ENV,
      activeBrokerId: DEFAULT_ACTIVE_BROKER,
      killSwitch: false,
      pinEnabled: false,
      humanConfirmRequired: true,
      maxDrawdownPct: PAPER_MAX_DRAWDOWN_PCT,
      maxSymbolExposurePct: PAPER_MAX_SYMBOL_EXPOSURE_PCT,
      maxSectorExposurePct: PAPER_MAX_SECTOR_EXPOSURE_PCT,
      cooldownMs: PAPER_COOLDOWN_MS,
    },
    accounts: [
      {
        id: PAPER_DEFAULT_ACCOUNT_ID,
        labelJa: '紙上メイン口座',
        initialCapitalMYR: PAPER_INITIAL_CAPITAL_MYR,
        cashMYR: PAPER_INITIAL_CAPITAL_MYR,
        positions: [],
      },
    ],
    orders: [],
    journal: [],
    equityTimeline: [
      {
        at: new Date().toISOString(),
        equityMYR: PAPER_INITIAL_CAPITAL_MYR,
        drawdownPct: 0,
      },
    ],
    cooldownUntilBySymbol: {},
    lastRevengeTradeAt: null,
  };
}

export async function loadPaperBrokerState(): Promise<PaperBrokerPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.paperBroker);
    if (!raw) return defaultPaperBrokerState();
    const parsed = JSON.parse(raw) as Partial<PaperBrokerPersisted>;
    const base = defaultPaperBrokerState();
    return {
      version: 1,
      config: {
        ...base.config,
        ...parsed.config,
        realTradingEnabled: false,
      },
      accounts: Array.isArray(parsed.accounts) && parsed.accounts.length > 0
        ? parsed.accounts
        : base.accounts,
      orders: Array.isArray(parsed.orders)
        ? parsed.orders.slice(-PAPER_MAX_ORDERS_STORED)
        : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal.slice(-PAPER_MAX_JOURNAL) : [],
      equityTimeline: Array.isArray(parsed.equityTimeline)
        ? parsed.equityTimeline.slice(-200)
        : base.equityTimeline,
      cooldownUntilBySymbol: parsed.cooldownUntilBySymbol ?? {},
      lastRevengeTradeAt: parsed.lastRevengeTradeAt ?? null,
    };
  } catch {
    return defaultPaperBrokerState();
  }
}

export async function savePaperBrokerState(state: PaperBrokerPersisted): Promise<void> {
  state.config.realTradingEnabled = false;
  await AsyncStorage.setItem(STORAGE_KEYS.paperBroker, JSON.stringify(state));
}

export function getDefaultAccount(state: PaperBrokerPersisted) {
  return state.accounts[0] ?? defaultPaperBrokerState().accounts[0];
}
