/**
 * 実機/ローカル AI_EVAL プローブ用 — .env / .env.local からシークレットを注入
 */
import fs from 'node:fs';
import path from 'node:path';
import { saveAnalysisApiKeys, type AnalysisApiKeys } from '../../src/services/analysisApiKeys';
import { saveAiApiKey } from '../../src/services/aiApiKey';
import { isUsableApiKey } from '../../src/services/apiKeyValidation';
import { saveTwelveDataApiKey, validateTwelveDataApiKey } from '../../src/services/marketDataApiKey';

const ENV_FILES = ['.env.local', '.env'] as const;

const TWELVE_ENV = ['EXPO_PUBLIC_TWELVE_DATA_API_KEY', 'TWELVE_DATA_API_KEY'] as const;
const NEWS_ENV = ['EXPO_PUBLIC_NEWS_API_KEY', 'NEWS_API_KEY'] as const;
const X_ENV = ['EXPO_PUBLIC_X_BEARER_TOKEN', 'X_BEARER_TOKEN'] as const;
const OPENAI_ENV = ['EXPO_PUBLIC_OPENAI_API_KEY', 'OPENAI_API_KEY'] as const;

function readEnvValue(names: readonly string[]): string {
  if (typeof process === 'undefined' || !process.env) return '';
  for (const name of names) {
    const v = process.env[name]?.trim();
    if (v && isUsableApiKey(v)) return v;
  }
  return '';
}

export function loadProbeEnvFiles(cwd = process.cwd()): void {
  for (const file of ENV_FILES) {
    const envPath = path.resolve(cwd, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

export type AiEvalProbeKeyStatus = {
  twelveData: { configured: boolean; valid: boolean; httpStatus: number; source: string };
  newsApi: { configured: boolean; length: number };
  xBearer: { configured: boolean; length: number };
  openAi: { configured: boolean; length: number };
};

export async function bootstrapSecretsForAiEvalProbe(cwd = process.cwd()): Promise<AiEvalProbeKeyStatus> {
  loadProbeEnvFiles(cwd);

  const twelveRaw = readEnvValue(TWELVE_ENV);
  const twelveCheck = twelveRaw ? await validateTwelveDataApiKey(twelveRaw) : { ok: false, httpStatus: 0, barCount: 0 };
  if (twelveRaw && twelveCheck.ok) {
    await saveTwelveDataApiKey(twelveRaw);
  }

  const newsKey = readEnvValue(NEWS_ENV);
  const xToken = readEnvValue(X_ENV);
  const openAiKey = readEnvValue(OPENAI_ENV);

  const analysis: AnalysisApiKeys = {
    newsApiKey: newsKey,
    snsApiKey: xToken,
    earningsApiKey: '',
    redditApiKey: '',
    xApiKey: xToken,
  };
  await saveAnalysisApiKeys(analysis);

  if (openAiKey) {
    await saveAiApiKey(openAiKey);
  }

  const status: AiEvalProbeKeyStatus = {
    twelveData: {
      configured: Boolean(twelveRaw),
      valid: twelveCheck.ok,
      httpStatus: twelveCheck.httpStatus,
      source: twelveCheck.ok ? 'env_validated' : twelveRaw ? 'env_invalid' : 'none',
    },
    newsApi: { configured: Boolean(newsKey), length: newsKey.length },
    xBearer: { configured: Boolean(xToken), length: xToken.length },
    openAi: { configured: Boolean(openAiKey), length: openAiKey.length },
  };

  console.log('[AI_EVAL_PROBE_KEYS]', status);
  if (twelveRaw && !twelveCheck.ok) {
    console.log(
      '[AI_EVAL_PROBE_KEYS] twelveData invalid — set valid EXPO_PUBLIC_TWELVE_DATA_API_KEY in .env.local (http',
      twelveCheck.httpStatus,
      ')',
    );
  }
  if (!newsKey) {
    console.log('[AI_EVAL_PROBE_KEYS] newsApi missing — set EXPO_PUBLIC_NEWS_API_KEY in .env.local');
  }
  if (!xToken) {
    console.log('[AI_EVAL_PROBE_KEYS] xBearer missing — set EXPO_PUBLIC_X_BEARER_TOKEN in .env.local');
  }

  return status;
}
