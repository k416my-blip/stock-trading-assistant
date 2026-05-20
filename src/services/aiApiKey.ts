import { getSecret, setSecret } from './secretStorage';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';

export async function loadAiApiKey(): Promise<string> {
  const raw = await getSecret('aiApiKey');
  return isUsableApiKey(raw) ? normalizeStoredApiKey(raw) : '';
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
      getSecret('aiApiKey'),
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
