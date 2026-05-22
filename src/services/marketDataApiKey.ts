import { isUsableApiKey } from './apiKeyValidation';
import { getSecret, setSecret } from './secretStorage';

const ENV_KEY_NAMES = [
  'EXPO_PUBLIC_TWELVE_DATA_API_KEY',
  'TWELVE_DATA_API_KEY',
] as const;

export type TwelveDataKeySource = 'secure_store' | 'env' | 'none';

function readTwelveDataKeyFromEnv(): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of ENV_KEY_NAMES) {
    const v = process.env[name];
    if (typeof v === 'string' && isUsableApiKey(v)) {
      return v.trim();
    }
  }
  return '';
}

/** モック値は使用しない。SecureStore 優先、未設定時のみ .env を参照 */
export async function resolveTwelveDataApiKey(): Promise<{
  key: string;
  source: TwelveDataKeySource;
}> {
  const stored = await getSecret('twelveDataApiKey');
  if (isUsableApiKey(stored)) {
    return { key: stored.trim(), source: 'secure_store' };
  }

  const fromEnv = readTwelveDataKeyFromEnv();
  if (fromEnv) {
    await setSecret('twelveDataApiKey', fromEnv);
    return { key: fromEnv, source: 'env' };
  }

  return { key: '', source: 'none' };
}

export async function loadTwelveDataApiKey(): Promise<string> {
  const { key } = await resolveTwelveDataApiKey();
  return key;
}

/** 起動時: .env の TWELVE_DATA_API_KEY が読み込まれたか（値は出さない） */
export function logTwelveDataEnvKeyAtStartup(resolved: {
  key: string;
  source: TwelveDataKeySource;
}): void {
  const envOnly = readTwelveDataKeyFromEnv();
  const hasEnv = Boolean(envOnly);
  const hasKey = Boolean(resolved.key.trim());
  console.log('[TwelveData] ENV_KEY_AT_STARTUP', {
    envVarNames: ENV_KEY_NAMES,
    envKeyPresent: hasEnv,
    envKeyLength: envOnly.length,
    resolvedSource: resolved.source,
    resolvedKeyPresent: hasKey,
    resolvedKeyLength: resolved.key.trim().length,
    first4: hasKey ? resolved.key.trim().slice(0, 4) : '(n/a)',
    last4: hasKey ? resolved.key.trim().slice(-4) : '(n/a)',
  });
}

export async function saveTwelveDataApiKey(apiKey: string): Promise<void> {
  await setSecret('twelveDataApiKey', apiKey);
}
