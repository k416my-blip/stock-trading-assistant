/**
 * APIキー読込の診断（実キーはログに出さない）。
 * 株価は Twelve Data のみ。分析系は別プロバイダ（Alpha Vantage 等は未接続）。
 */
import { loadAnalysisApiKeys } from './analysisApiKeys';
import { loadTwelveDataApiKey } from './marketDataApiKey';
import { isUsingSecureStoreBackend } from './secretStorage';
import { secureLog, secureWarn } from './secureLogger';
import { isUsableApiKey } from './apiKeyValidation';

export type QuoteProviderKeyStatus = {
  id: 'twelve_data';
  label: string;
  configured: boolean;
  charLength: number;
};

export type AnalysisKeyStatus = {
  id: string;
  label: string;
  configured: boolean;
};

export type ApiKeyLoadAudit = {
  secureStoreBackend: boolean;
  quoteProvider: QuoteProviderKeyStatus;
  analysisKeys: AnalysisKeyStatus[];
  processEnvOpenAi: boolean;
  processEnvTwelveData: boolean;
};

function envHasKey(name: string): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
}

export async function auditApiKeyLoad(): Promise<ApiKeyLoadAudit> {
  const [twelve, analysis] = await Promise.all([loadTwelveDataApiKey(), loadAnalysisApiKeys()]);

  const quoteProvider: QuoteProviderKeyStatus = {
    id: 'twelve_data',
    label: 'Twelve Data（株価）',
    configured: isUsableApiKey(twelve),
    charLength: twelve.trim().length,
  };

  const analysisKeys: AnalysisKeyStatus[] = [
    { id: 'news', label: 'News API', configured: isUsableApiKey(analysis.newsApiKey) },
    { id: 'sns', label: 'SNS API', configured: isUsableApiKey(analysis.snsApiKey) },
    { id: 'earnings', label: 'Earnings / Finnhub', configured: isUsableApiKey(analysis.earningsApiKey) },
    { id: 'reddit', label: 'Reddit', configured: isUsableApiKey(analysis.redditApiKey) },
    { id: 'x', label: 'X / Twitter', configured: isUsableApiKey(analysis.xApiKey) },
  ];

  const audit: ApiKeyLoadAudit = {
    secureStoreBackend: isUsingSecureStoreBackend(),
    quoteProvider,
    analysisKeys,
    processEnvOpenAi: envHasKey('OPENAI_API_KEY'),
    processEnvTwelveData: envHasKey('TWELVE_DATA_API_KEY'),
  };

  return audit;
}

export async function logApiKeyLoadAudit(context: string): Promise<ApiKeyLoadAudit> {
  const audit = await auditApiKeyLoad();

  if (!audit.quoteProvider.configured) {
    secureWarn(`[api-keys] ${context}: live quote key missing`, {
      secureStore: audit.secureStoreBackend,
      twelveDataConfigured: false,
      hint: 'Set Twelve Data key in APIキー設定 (SecureStore). Alpha Vantage/Polygon are not wired for quotes.',
      processEnvTwelveData: audit.processEnvTwelveData,
      note: 'App does not use process.env for quote keys in Expo Go — use in-app settings.',
    });
  } else {
    secureLog(`[api-keys] ${context}: quote provider ready`, {
      secureStore: audit.secureStoreBackend,
      twelveDataConfigured: true,
      keyLength: audit.quoteProvider.charLength,
    });
  }

  const analysisConfigured = audit.analysisKeys.filter((k) => k.configured).map((k) => k.id);
  secureLog(`[api-keys] ${context}: analysis keys`, {
    configured: analysisConfigured,
    secureStore: audit.secureStoreBackend,
  });

  if (audit.processEnvOpenAi || audit.processEnvTwelveData) {
    secureLog(`[api-keys] ${context}: process.env keys present (ignored for RN runtime)`, {
      OPENAI_API_KEY: audit.processEnvOpenAi,
      TWELVE_DATA_API_KEY: audit.processEnvTwelveData,
    });
  }

  return audit;
}
