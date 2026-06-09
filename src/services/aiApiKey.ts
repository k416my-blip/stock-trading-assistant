import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { safeGetApiKey, safeSaveApiKey } from './safeApiKey';
import { getSecret } from './secretStorage';

const AI_ENV_KEY_NAMES = [
  'EXPO_PUBLIC_OPENAI_API_KEY',
  'OPENAI_API_KEY',
] as const;

function readAiKeyFromEnv(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of AI_ENV_KEY_NAMES) {
    const value = process.env[name];
    if (typeof value === 'string' && isUsableApiKey(value)) {
      return normalizeStoredApiKey(value);
    }
  }
  return '';
}

export async function loadAiApiKey(): Promise<string> {
  const stored = await safeGetApiKey('openai');
  if (stored) return stored;
  const legacy = await getSecret('sta.secret.openai_api_key');
  if (legacy && isUsableApiKey(legacy)) return normalizeStoredApiKey(legacy);

  const fromEnv = readAiKeyFromEnv();
  if (fromEnv) {
    await safeSaveApiKey('openai', fromEnv);
    return fromEnv;
  }

  return '';
}

export async function saveAiApiKey(apiKey: string): Promise<{ saved: boolean; reason: string }> {
  return safeSaveApiKey('openai', apiKey);
}

export type LoadAiApiKeyResult = {
  key: string;
  timedOut: boolean;
  failed: boolean;
};

export async function loadAiApiKeyWithTimeout(timeoutMs: number): Promise<LoadAiApiKeyResult> {
  try {
    const key = await Promise.race([
      loadAiApiKey(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    if (!isUsableApiKey(key)) {
      return { key: '', timedOut: false, failed: false };
    }
    return { key: normalizeStoredApiKey(key), timedOut: false, failed: false };
  } catch {
    return { key: '', timedOut: true, failed: true };
  }
}
