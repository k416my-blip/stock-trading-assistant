/** Unified external API connection status (English internal values). */

export type ApiConnectionStatus =
  | 'not_configured'
  | 'key_saved_unverified'
  | 'checking'
  | 'connected'
  | 'auth_error'
  | 'rate_limited'
  | 'timeout'
  | 'network_error'
  | 'parse_error'
  | 'mock_fallback'
  | 'disabled'
  | 'test_not_implemented';

export type ApiRegistryId =
  | 'openai'
  | 'twelve_data'
  | 'news'
  | 'earnings'
  | 'reddit'
  | 'x';

export type ApiConnectionCategory = 'ai' | 'market_data' | 'news' | 'financial' | 'social';

export type ApiConnectionErrorType =
  | 'none'
  | 'auth'
  | 'rate_limit'
  | 'timeout'
  | 'network'
  | 'parse'
  | 'model_invalid'
  | 'disclosure'
  | 'forbidden'
  | 'unknown';

export type ApiRegistryEntry = {
  id: ApiRegistryId;
  displayName: string;
  secureStoreKey: string;
  provider: string;
  category: ApiConnectionCategory;
  isRequired: boolean;
  status: ApiConnectionStatus;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorType: ApiConnectionErrorType;
  lastErrorMessage: string;
  quotaStatus: string | null;
  usesMockFallback: boolean;
  diagnosticsSummary: string;
  testImplemented: boolean;
  hasKeyConfigured: boolean;
};

export type ApiConnectionTestResult = {
  apiId: ApiRegistryId;
  status: ApiConnectionStatus;
  errorType: ApiConnectionErrorType;
  messageJa: string;
  quotaStatus: string | null;
  pingSummaryJa: string | null;
  checkedAt: string;
  successAt: string | null;
};
