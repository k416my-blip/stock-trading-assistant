import AsyncStorage from '@react-native-async-storage/async-storage';
import { marketDataRequestQueue } from './marketDataRequestQueue';
import { recordDiagnosticEvent } from './structuredDiagnostics';

const STORAGE_KEY = '@sta/personal_kill_switches_v1';

export type PersonalKillSwitches = {
  version: 1;
  readOnlyMode: boolean;
  disableMarketRefresh: boolean;
  disableTradeSubmission: boolean;
};

const DEFAULT: PersonalKillSwitches = {
  version: 1,
  readOnlyMode: false,
  disableMarketRefresh: false,
  disableTradeSubmission: false,
};

let memoryCache: PersonalKillSwitches = { ...DEFAULT };

export async function loadPersonalKillSwitches(): Promise<PersonalKillSwitches> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as PersonalKillSwitches;
    if (parsed.version !== 1) return { ...DEFAULT };
    memoryCache = {
      version: 1,
      readOnlyMode: Boolean(parsed.readOnlyMode),
      disableMarketRefresh: Boolean(parsed.disableMarketRefresh),
      disableTradeSubmission: Boolean(parsed.disableTradeSubmission),
    };
    return memoryCache;
  } catch {
    return { ...DEFAULT };
  }
}

export async function savePersonalKillSwitches(
  partial: Partial<Omit<PersonalKillSwitches, 'version'>>,
): Promise<PersonalKillSwitches> {
  const next: PersonalKillSwitches = {
    ...memoryCache,
    ...partial,
    version: 1,
  };
  memoryCache = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function getPersonalKillSwitchesSnapshot(): PersonalKillSwitches {
  return { ...memoryCache };
}

/** 市場データ要求キューのバックオフ・クールダウンをリセット */
export function resetMarketDataRequestQueue(): void {
  marketDataRequestQueue.resetCooldownsForTest();
  recordDiagnosticEvent({
    type: 'kill_switch',
    severity: 'info',
    module: 'personalKillSwitches',
    message: 'Market data request queue reset',
    recoveryAction: 'Retry price refresh after a few seconds',
  });
}

export function resetPersonalKillSwitchesForTest(): void {
  memoryCache = { ...DEFAULT };
}
