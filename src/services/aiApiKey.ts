import { getSecret, setSecret } from './secretStorage';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';

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
  const raw = await getSecret('aiApiKey');
  if (isUsableApiKey(raw)) return normalizeStoredApiKey(raw);

  const fromEnv = readAiKeyFromEnv();
  if (fromEnv) {
    await setSecret('aiApiKey', fromEnv);
    return fromEnv;
  }

  return '';
}

export async function saveAiApiKey(apiKey: string): Promise<void> {
  if (!isUsableApiKey(apiKey)) {
    await setSecret('aiApiKey', '');
    return;
  }
  await setSecret('aiApiKey', normalizeStoredApiKey(apiKey));
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
