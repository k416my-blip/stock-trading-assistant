/**
 * シークレット保存抽象層 — expo-secure-store 優先、未利用時はメモリ+レガシー移行のみ
 * 平文 AsyncStorage への新規書き込みは行わない
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { LEGACY_PLAIN_SECRET_KEYS, SECRET_KEYS, type SecretKeyId } from '../constants/secretStorage';
import { secureWarn } from './secureLogger';

type SecureStoreModule = typeof import('expo-secure-store');

let secureStoreModule: SecureStoreModule | null | undefined;
const memorySecrets = new Map<string, string>();

/** Expo Go / dev client on iOS & Android must use SecureStore — not `window` (web-only). */
export function canUseNativeSecureStore(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function isSecureStoreCorruptionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /corrupt|journal|decrypt|invalid|malformed|could not be read/i.test(msg);
}

async function loadSecureStore(): Promise<SecureStoreModule | null> {
  if (secureStoreModule !== undefined) return secureStoreModule;
  if (!canUseNativeSecureStore()) {
    secureStoreModule = null;
    return null;
  }
  try {
    secureStoreModule = await import('expo-secure-store');
    return secureStoreModule;
  } catch (err) {
    secureWarn(
      '[secret-storage] expo-secure-store unavailable',
      err instanceof Error ? err.message : String(err),
    );
    secureStoreModule = null;
    return null;
  }
}

async function purgeCorruptedSecureKey(
  store: SecureStoreModule,
  key: string,
): Promise<void> {
  try {
    await store.deleteItemAsync(key);
  } catch {
    /* ignore purge failure */
  }
}

async function safeGetSecureItem(store: SecureStoreModule, key: string): Promise<string | null> {
  try {
    return await store.getItemAsync(key);
  } catch (err) {
    if (isSecureStoreCorruptionError(err)) {
      await purgeCorruptedSecureKey(store, key);
    }
    return null;
  }
}

async function safeSetSecureItem(
  store: SecureStoreModule,
  key: string,
  value: string,
): Promise<void> {
  try {
    if (value) {
      await store.setItemAsync(key, value);
    } else {
      await store.deleteItemAsync(key);
    }
  } catch (err) {
    if (isSecureStoreCorruptionError(err)) {
      await purgeCorruptedSecureKey(store, key);
      if (value) {
        try {
          await store.setItemAsync(key, value);
        } catch {
          /* fall back to memory only */
        }
      }
    }
  }
}

export async function getSecret(keyId: SecretKeyId): Promise<string> {
  const key = SECRET_KEYS[keyId];
  if (memorySecrets.has(key)) {
    return memorySecrets.get(key) ?? '';
  }

  const store = await loadSecureStore();
  if (store) {
    const value = await safeGetSecureItem(store, key);
    if (value != null) {
      memorySecrets.set(key, value);
      return value;
    }
  }

  const legacy = await readLegacyPlainSecret(keyId);
  if (legacy) {
    await setSecret(keyId, legacy);
    await removeLegacyPlainSecret(keyId);
    return legacy;
  }

  return '';
}

export async function setSecret(keyId: SecretKeyId, value: string): Promise<void> {
  const key = SECRET_KEYS[keyId];
  const trimmed = value.trim();
  memorySecrets.set(key, trimmed);

  const store = await loadSecureStore();
  if (store) {
    await safeSetSecureItem(store, key, trimmed);
    return;
  }

  if (trimmed) {
    memorySecrets.set(key, trimmed);
  } else {
    memorySecrets.delete(key);
  }
}

export async function deleteSecret(keyId: SecretKeyId): Promise<void> {
  const key = SECRET_KEYS[keyId];
  memorySecrets.delete(key);
  const store = await loadSecureStore();
  if (store) {
    try {
      await store.deleteItemAsync(key);
    } catch (err) {
      if (isSecureStoreCorruptionError(err)) {
        await purgeCorruptedSecureKey(store, key);
      }
    }
  }
  await removeLegacyPlainSecret(keyId);
}

export async function deleteAllSecrets(): Promise<void> {
  const ids = Object.keys(SECRET_KEYS) as SecretKeyId[];
  await Promise.all(ids.map((id) => deleteSecret(id)));
  memorySecrets.clear();
}

async function readLegacyPlainSecret(keyId: SecretKeyId): Promise<string> {
  try {
    const legacyKey = LEGACY_PLAIN_SECRET_KEYS[keyId];
    const raw = await AsyncStorage.getItem(legacyKey);
    return raw?.trim() ?? '';
  } catch {
    return '';
  }
}

async function removeLegacyPlainSecret(keyId: SecretKeyId): Promise<void> {
  if (!canUseNativeSecureStore()) return;
  try {
    await AsyncStorage.removeItem(LEGACY_PLAIN_SECRET_KEYS[keyId]);
  } catch {
    /* ignore */
  }
}

export function isUsingSecureStoreBackend(): boolean {
  return secureStoreModule != null;
}
