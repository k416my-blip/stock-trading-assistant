/**
 * APIキー安全保存 — 明示削除以外でキーを消さない
 */
import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import type { SecretKeyId } from '../constants/secretStorage';
import {
  canPersistApiKeyValue,
  canPersistTwelveDataApiKey,
  normalizeStoredApiKey,
  normalizeTwelveDataApiKey,
} from './apiKeyValidation';
import { deleteSecret, getSecret, setSecret } from './secretStorage';

export type SafeSaveApiKeyResult = {
  saved: boolean;
  reason: string;
};

function providerDef(providerId: SupportedApiProviderId) {
  const p = API_PROVIDERS.find((item) => item.id === providerId);
  if (!p) throw new Error(`Unknown API provider: ${providerId}`);
  return p;
}

function normalizeForProvider(providerId: SupportedApiProviderId, raw: string): string {
  return providerId === 'twelve_data'
    ? normalizeTwelveDataApiKey(raw)
    : normalizeStoredApiKey(raw);
}

function evaluateSave(
  providerId: SupportedApiProviderId,
  value: string | null | undefined,
): { allowed: boolean; reason: string; normalized: string } {
  if (value == null || value === undefined) {
    return { allowed: false, reason: 'undefined', normalized: '' };
  }
  const normalized = normalizeForProvider(providerId, String(value));
  if (!normalized) {
    return { allowed: false, reason: 'empty', normalized: '' };
  }
  const allowed =
    providerId === 'twelve_data'
      ? canPersistTwelveDataApiKey(normalized)
      : canPersistApiKeyValue(normalized);
  if (!allowed) {
    if (normalized.includes('****') || /^\*+$/.test(normalized)) {
      return { allowed: false, reason: 'masked', normalized: '' };
    }
    if (normalized.length < 10) {
      return { allowed: false, reason: 'too_short', normalized: '' };
    }
    return { allowed: false, reason: 'invalid', normalized: '' };
  }
  return { allowed: true, reason: 'valid', normalized };
}

function logSafeSave(provider: string, action: 'saved' | 'skipped', reason: string): void {
  console.warn('[API_KEY_SAFE_SAVE]', JSON.stringify({ provider, action, reason }));
}

function logLoad(provider: string, exists: boolean, length: number): void {
  console.warn('[API_KEY_LOAD]', JSON.stringify({ provider, exists, length }));
}

function logDelete(provider: string, userConfirmed: boolean): void {
  console.warn(
    '[API_KEY_DELETE]',
    JSON.stringify({ provider, action: 'deleted', userConfirmed }),
  );
}

export async function safeGetApiKey(providerId: SupportedApiProviderId): Promise<string> {
  const { secretKeyId } = providerDef(providerId);
  const raw = await getSecret(secretKeyId);
  const normalized = normalizeForProvider(providerId, raw);
  const exists =
    providerId === 'twelve_data'
      ? canPersistTwelveDataApiKey(normalized)
      : canPersistApiKeyValue(normalized);
  logLoad(providerId, exists, exists ? normalized.length : 0);
  return exists ? normalized : '';
}

export async function safeSaveApiKey(
  providerId: SupportedApiProviderId,
  value: string | null | undefined,
): Promise<SafeSaveApiKeyResult> {
  const { secretKeyId } = providerDef(providerId);
  const ev = evaluateSave(providerId, value);
  if (!ev.allowed) {
    logSafeSave(providerId, 'skipped', ev.reason);
    return { saved: false, reason: ev.reason };
  }
  await setSecret(secretKeyId, ev.normalized);
  logSafeSave(providerId, 'saved', ev.reason);
  return { saved: true, reason: ev.reason };
}

export async function safeDeleteApiKey(
  providerId: SupportedApiProviderId,
  userConfirmed: boolean,
): Promise<void> {
  if (!userConfirmed) {
    console.warn(
      '[API_KEY_DELETE]',
      JSON.stringify({ provider: providerId, action: 'rejected', userConfirmed: false }),
    );
    return;
  }
  const { secretKeyId } = providerDef(providerId);
  await deleteSecret(secretKeyId);
  logDelete(providerId, true);
}

/** 接続テスト用 — 有効な入力のみ使い、それ以外は保存済みキーを読む */
export async function resolveApiKeyForConnectionTest(
  providerId: SupportedApiProviderId,
  inputValue: string | null | undefined,
): Promise<string> {
  const ev = evaluateSave(providerId, inputValue);
  if (ev.allowed) return ev.normalized;
  return safeGetApiKey(providerId);
}

export async function safeGetSecretById(secretKeyId: SecretKeyId): Promise<string> {
  const raw = await getSecret(secretKeyId);
  const normalized = normalizeStoredApiKey(raw);
  const exists = canPersistApiKeyValue(normalized);
  logLoad(secretKeyId, exists, exists ? normalized.length : 0);
  return exists ? normalized : '';
}

export async function safeSaveSecretById(
  secretKeyId: SecretKeyId,
  value: string | null | undefined,
): Promise<SafeSaveApiKeyResult> {
  const ev = evaluateSave('openai', value);
  if (!ev.allowed) {
    logSafeSave(secretKeyId, 'skipped', ev.reason);
    return { saved: false, reason: ev.reason };
  }
  await setSecret(secretKeyId, ev.normalized);
  logSafeSave(secretKeyId, 'saved', ev.reason);
  return { saved: true, reason: ev.reason };
}

export async function safeDeleteSecretById(
  secretKeyId: SecretKeyId,
  userConfirmed: boolean,
): Promise<void> {
  if (!userConfirmed) return;
  await deleteSecret(secretKeyId);
  logDelete(secretKeyId, true);
}

export function apiKeyExistsInStorage(normalized: string, providerId?: SupportedApiProviderId): boolean {
  if (providerId === 'twelve_data') return canPersistTwelveDataApiKey(normalized);
  return canPersistApiKeyValue(normalized);
}
