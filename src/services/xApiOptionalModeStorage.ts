import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { X_HTTP_402_USER_MESSAGE_JA } from '../constants/xApiOptional';

export type XApiOptionalState = {
  version: 1;
  /** ユーザーが X 有料APIを使わないモードを選択 */
  optionalModeEnabled: boolean;
  /** 402 等で recent search を自動無効化 */
  paidSearchDisabled: boolean;
  paidSearchDisabledReasonJa: string | null;
  lastPaymentRequiredAt: string | null;
};

const DEFAULT_STATE: XApiOptionalState = {
  version: 1,
  optionalModeEnabled: false,
  paidSearchDisabled: false,
  paidSearchDisabledReasonJa: null,
  lastPaymentRequiredAt: null,
};

export async function loadXApiOptionalState(): Promise<XApiOptionalState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.xApiOptionalMode);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<XApiOptionalState>;
    return {
      version: 1,
      optionalModeEnabled: Boolean(parsed.optionalModeEnabled),
      paidSearchDisabled: Boolean(parsed.paidSearchDisabled),
      paidSearchDisabledReasonJa:
        typeof parsed.paidSearchDisabledReasonJa === 'string'
          ? parsed.paidSearchDisabledReasonJa
          : null,
      lastPaymentRequiredAt:
        typeof parsed.lastPaymentRequiredAt === 'string' ? parsed.lastPaymentRequiredAt : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function saveXApiOptionalState(state: XApiOptionalState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.xApiOptionalMode, JSON.stringify(state));
}

export async function setXApiOptionalModeEnabled(enabled: boolean): Promise<XApiOptionalState> {
  const current = await loadXApiOptionalState();
  const next: XApiOptionalState = {
    ...current,
    optionalModeEnabled: enabled,
  };
  await saveXApiOptionalState(next);
  return next;
}

/** HTTP 402 検知時 — 有料検索を無効化し optional モードを推奨 */
export async function recordXApiPaymentRequired(): Promise<XApiOptionalState> {
  const current = await loadXApiOptionalState();
  const next: XApiOptionalState = {
    ...current,
    optionalModeEnabled: true,
    paidSearchDisabled: true,
    paidSearchDisabledReasonJa: X_HTTP_402_USER_MESSAGE_JA,
    lastPaymentRequiredAt: new Date().toISOString(),
  };
  await saveXApiOptionalState(next);
  console.log('[x-api] PAID_FEATURES_DISABLED', {
    reason: X_HTTP_402_USER_MESSAGE_JA,
    optionalModeEnabled: true,
  });
  return next;
}

export async function isXPaidSearchAllowed(): Promise<{
  allowed: boolean;
  reasonJa: string | null;
}> {
  const state = await loadXApiOptionalState();
  if (state.optionalModeEnabled) {
    return {
      allowed: false,
      reasonJa: 'X API optional モードが有効です（有料APIは使用しません）',
    };
  }
  if (state.paidSearchDisabled) {
    return {
      allowed: false,
      reasonJa: state.paidSearchDisabledReasonJa ?? X_HTTP_402_USER_MESSAGE_JA,
    };
  }
  return { allowed: true, reasonJa: null };
}
