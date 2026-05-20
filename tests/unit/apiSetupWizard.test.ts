import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApiHealthDashboard } from '../../src/services/apiHealthDashboard';
import {
  createEmptyHealthSnapshot,
  loadApiHealthSnapshot,
  saveApiHealthSnapshot,
} from '../../src/services/apiHealthStorage';
import { verifyApiProvider } from '../../src/services/apiVerificationService';
import { setSecret, getSecret } from '../../src/services/secretStorage';
import { maskSecret, redactSecretsInString } from '../../src/utils/secretMask';
import { exportPersonalBackupJson } from '../../src/services/personalBackupService';
import { createDefaultAppState } from '../../src/services/storage';
import { exportDiagnosticsReport } from '../../src/services/structuredDiagnostics';
import {
  DUMMY_API_KEY_EXPORT,
  DUMMY_API_KEY_MASK,
  DUMMY_API_KEY_STORAGE,
} from '../helpers/dummyCredentials';

const memoryStore = new Map<string, string>();

vi.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(memoryStore.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    memoryStore.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    memoryStore.delete(key);
    return Promise.resolve();
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: (key: string) => Promise.resolve(memoryStore.get(`async:${key}`) ?? null),
    setItem: (key: string, value: string) => {
      memoryStore.set(`async:${key}`, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      memoryStore.delete(`async:${key}`);
      return Promise.resolve();
    },
  },
}));

describe('apiSetupWizard', () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it('saves API keys to SecureStore', async () => {
    await setSecret('aiApiKey', DUMMY_API_KEY_STORAGE);
    const loaded = await getSecret('aiApiKey');
    expect(loaded).toBe(DUMMY_API_KEY_STORAGE);
  });

  it('masks keys for display', () => {
    expect(maskSecret(DUMMY_API_KEY_MASK)).toContain('****');
    expect(maskSecret(DUMMY_API_KEY_MASK)).not.toContain('MASK_TEST_VALUE');
  });

  it('returns unconfigured when key is empty', async () => {
    const health = await verifyApiProvider('openai', '');
    expect(health.status).toBe('unconfigured');
    expect(health.outcome).toBe('unconfigured');
  });

  it('maps HTTP 401 to invalid key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => null },
        json: async () => ({}),
      }),
    );
    const health = await verifyApiProvider('news', 'bad-key-newsapi-test');
    expect(health.outcome).toBe('invalid_key');
    expect(health.messageJa).toBe('APIキー無効');
    vi.unstubAllGlobals();
  });

  it('maps HTTP 429 to quota limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => '0' },
        json: async () => ({}),
      }),
    );
    const health = await verifyApiProvider('earnings', 'finnhub-token-test');
    expect(health.outcome).toBe('rate_limited');
    expect(health.status).toBe('rate_limited');
    vi.unstubAllGlobals();
  });

  it('maps abort to timeout', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));
    const health = await verifyApiProvider('x', 'bearer-x-token-test');
    expect(health.outcome).toBe('timeout');
    expect(health.messageJa).toBe('timeout');
    vi.unstubAllGlobals();
  });

  it('persists health snapshot without raw keys', async () => {
    const snap = createEmptyHealthSnapshot();
    snap.providers.openai = {
      ...snap.providers.openai,
      status: 'ok',
      outcome: 'success',
      messageJa: '接続成功',
      lastCheckedAt: new Date().toISOString(),
    };
    await saveApiHealthSnapshot(snap);
    const loaded = await loadApiHealthSnapshot();
    const json = JSON.stringify(loaded);
    expect(json).not.toContain(DUMMY_API_KEY_STORAGE);
    expect(loaded.providers.openai.status).toBe('ok');
  });

  it('flags stale health when last check is old', () => {
    const snap = createEmptyHealthSnapshot();
    const old = new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString();
    snap.providers.news = {
      ...snap.providers.news,
      status: 'ok',
      outcome: 'success',
      messageJa: '接続成功',
      lastCheckedAt: old,
    };
    const dash = buildApiHealthDashboard(snap);
    expect(dash.providers.news.staleNoteJa).toContain('再検証');
    expect(dash.anyStaleWarning).toBe(true);
  });

  it('redacts secrets in diagnostics export', () => {
    const report = exportDiagnosticsReport(20);
    const redacted = redactSecretsInString(`${report.summary} sk_live_secretvalue123456`);
    expect(redacted).not.toContain('secretvalue123456');
  });

  it('does not export API keys in personal backup', async () => {
    await setSecret('aiApiKey', DUMMY_API_KEY_EXPORT);
    const json = exportPersonalBackupJson(createDefaultAppState(), []);
    expect(json).not.toContain(DUMMY_API_KEY_EXPORT);
  });

  it('builds concierge api health summary', () => {
    const dash = buildApiHealthDashboard(createEmptyHealthSnapshot());
    expect(dash.summaryJa).toContain('openai');
    expect(dash.degradedByApis).toBe(true);
  });
});
