import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as secretStorage from '../../src/services/secretStorage';
import {
  resolveApiKeyForConnectionTest,
  safeDeleteApiKey,
  safeGetApiKey,
  safeSaveApiKey,
} from '../../src/services/safeApiKey';

const STORE = new Map<string, string>();

vi.mock('../../src/services/secretStorage', () => ({
  getSecret: vi.fn(async (keyId: string) => STORE.get(keyId) ?? ''),
  setSecret: vi.fn(async (keyId: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    STORE.set(keyId, trimmed);
  }),
  deleteSecret: vi.fn(async (keyId: string) => {
    STORE.delete(keyId);
  }),
}));

describe('safeApiKey', () => {
  beforeEach(() => {
    STORE.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    STORE.clear();
  });

  it('saves valid key and reloads', async () => {
    const key = 'sk-test-openai-key-12345';
    const res = await safeSaveApiKey('openai', key);
    expect(res.saved).toBe(true);
    const loaded = await safeGetApiKey('openai');
    expect(loaded).toBe(key);
  });

  it('skips empty overwrite and keeps existing key', async () => {
    const key = 'sk-test-openai-key-12345';
    await safeSaveApiKey('openai', key);
    const empty = await safeSaveApiKey('openai', '');
    expect(empty.saved).toBe(false);
    expect(await safeGetApiKey('openai')).toBe(key);
  });

  it('skips masked value overwrite', async () => {
    const key = 'sk-test-openai-key-12345';
    await safeSaveApiKey('openai', key);
    const masked = await safeSaveApiKey('openai', 'sk-t****2345');
    expect(masked.saved).toBe(false);
    expect(await safeGetApiKey('openai')).toBe(key);
  });

  it('connection test uses stored key when input empty', async () => {
    const key = 'sk-test-openai-key-12345';
    await safeSaveApiKey('openai', key);
    const resolved = await resolveApiKeyForConnectionTest('openai', '');
    expect(resolved).toBe(key);
  });

  it('deletes only with userConfirmed', async () => {
    const key = 'sk-test-openai-key-12345';
    await safeSaveApiKey('openai', key);
    await safeDeleteApiKey('openai', false);
    expect(await safeGetApiKey('openai')).toBe(key);
    await safeDeleteApiKey('openai', true);
    expect(await safeGetApiKey('openai')).toBe('');
  });

  it('newsapi and twelve_data follow same rules', async () => {
    const twelve = 'abcd1234567890abcd1234567890ab';
    const news = 'newsapi-key-abcdefghij';
    await safeSaveApiKey('twelve_data', twelve);
    await safeSaveApiKey('newsapi', news);
    expect(await safeGetApiKey('twelve_data')).toBe(twelve);
    expect(await safeGetApiKey('newsapi')).toBe(news);
    const badTwelve = await safeSaveApiKey('twelve_data', '****');
    expect(badTwelve.saved).toBe(false);
    expect(await safeGetApiKey('twelve_data')).toBe(twelve);
  });
});
