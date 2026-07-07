import AsyncStorage from '@react-native-async-storage/async-storage';
import { E2E_MANUAL_ORDER_FORM_SEED_KEY } from '../constants/deviceVerifyTestIds';
import type { ManualOrderFlowMode } from './manualOrderFlow';
import type { Market } from '../types';

export type E2eManualOrderFormSeed = {
  mode: ManualOrderFlowMode;
  symbol?: string;
  shares?: string | number;
  deposit?: string | number;
  inputMode?: 'amount' | 'shares';
  market?: Market;
  side?: 'buy';
};

export async function consumeE2eManualOrderFormSeed(
  mode: ManualOrderFlowMode,
): Promise<E2eManualOrderFormSeed | null> {
  const raw = await AsyncStorage.getItem(E2E_MANUAL_ORDER_FORM_SEED_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as E2eManualOrderFormSeed;
    if (parsed.mode !== mode) return null;
    await AsyncStorage.removeItem(E2E_MANUAL_ORDER_FORM_SEED_KEY);
    return parsed;
  } catch {
    await AsyncStorage.removeItem(E2E_MANUAL_ORDER_FORM_SEED_KEY);
    return null;
  }
}
