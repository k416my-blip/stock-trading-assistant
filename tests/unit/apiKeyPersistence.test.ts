import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as secretStorage from '../../src/services/secretStorage';
import { safeSaveApiKey, safeGetApiKey } from '../../src/services/safeApiKey';
import { clearAllPersistedAppData } from '../../src/services/storage';
import { deleteAllApiKeysUserConfirmed } from '../../src/services/apiKeys';
import { formatConfiguredStatusLine, loadApiKeyConfiguredStatus } from '../../src/services/apiKeyUiState';

const SECURE = new Map<string, string>();
const ASYNC = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => ASYNC.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      ASYNC.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      ASYNC.delete(key);
    }),
    getAllKeys: vi.fn(async () => [...ASYNC.keys()]),
  },
}));

vi.mock('../../src/services/secretStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof secretStorage>();
  return {
    ...actual,
    getSecret: vi.fn(async (keyId: keyof typeof import('../../src/constants/secretStorage').SECRET_KEYS) => {
      const key = (await import('../../src/constants/secretStorage')).SECRET_KEYS[keyId];
      return SECURE.get(key) ?? '';
    }),
    setSecret: vi.fn(async (keyId: keyof typeof import('../../src/constants/secretStorage').SECRET_KEYS, value: string) => {
      const key = (await import('../../src/constants/secretStorage')).SECRET_KEYS[keyId];
      const trimmed = value.trim();
      if (!trimmed) {
        if (SECURE.get(key)?.trim()) return;
        return;
      }
      SECURE.set(key, trimmed);
    }),
    deleteSecret: vi.fn(async (keyId: keyof typeof import('../../src/constants/secretStorage').SECRET_KEYS) => {
      const key = (await import('../../src/constants/secretStorage')).SECRET_KEYS[keyId];
      SECURE.delete(key);
    }),
    deleteAllSecretsWithReport: vi.fn(async () => {
      const keys = [...SECURE.keys()];
      SECURE.clear();
      return { deletedKeys: keys, failedKeys: [] };
    }),
  };
});

describe('apiKeyPersistence', () => {
  beforeEach(() => {
    SECURE.clear();
    ASYNC.clear();
    ASYNC.set('@sta/app_state', '{}');
    vi.clearAllMocks();
  });

  afterEach(() => {
    SECURE.clear();
    ASYNC.clear();
  });

  it('keeps existing key when empty draft is saved', async () => {
    const key = 'sk-test-openai-key-12345';
    await safeSaveApiKey('openai', key);
    const empty = await safeSaveApiKey('openai', '');
    expect(empty.saved).toBe(false);
    expect(await safeGetApiKey('openai')).toBe(key);
  });

  it('deletes keys only via explicit userConfirmed deleteAll', async () => {
    await safeSaveApiKey('openai', 'sk-test-openai-key-12345');
    const rejected = await deleteAllApiKeysUserConfirmed(false);
    expect(rejected.deletedKeys).toEqual([]);
    expect(await safeGetApiKey('openai')).toContain('sk-test');

    const accepted = await deleteAllApiKeysUserConfirmed(true);
    expect(accepted.deletedKeys.length).toBeGreaterThan(0);
    expect(await safeGetApiKey('openai')).toBe('');
  });

  it('clearAllPersistedAppData(false) does not delete SecureStore secrets', async () => {
    await safeSaveApiKey('newsapi', 'newsapi-key-abcdefghij');
    ASYNC.set('@sta/news_api_key', 'legacy-should-remain');
    const result = await clearAllPersistedAppData(false);
    expect(result.failedKeys).toEqual([]);
    expect(await safeGetApiKey('newsapi')).toBe('newsapi-key-abcdefghij');
    expect(ASYNC.has('@sta/news_api_key')).toBe(true);
  });

  it('clearAllPersistedAppData(true) deletes secrets', async () => {
    await safeSaveApiKey('twelve_data', 'abcd1234567890abcd1234567890ab');
    await clearAllPersistedAppData(true);
    expect(await safeGetApiKey('twelve_data')).toBe('');
  });

  it('loadApiKeyConfiguredStatus never returns raw key in display fields', async () => {
    await safeSaveApiKey('x', 'BearerToken1234567890abcd');
    const status = await loadApiKeyConfiguredStatus('x');
    expect(status.configured).toBe(true);
    const line = formatConfiguredStatusLine(status);
    expect(line).not.toContain('BearerToken1234567890abcd');
    expect(line).toContain('設定済み');
  });
});
