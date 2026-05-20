/** API Setup Wizard — provider identifiers (English, persisted) */

export type ApiProviderId = 'openai' | 'news' | 'earnings' | 'reddit' | 'x';

export type ApiHealthStatus =
  | 'unconfigured'
  | 'connecting'
  | 'ok'
  | 'rate_limited'
  | 'error';

export type ApiVerificationOutcome =
  | 'unconfigured'
  | 'success'
  | 'invalid_key'
  | 'rate_limited'
  | 'timeout'
  | 'connection_error'
  | 'parse_error';

export type ApiProviderHealth = {
  providerId: ApiProviderId;
  status: ApiHealthStatus;
  outcome: ApiVerificationOutcome;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorType: string | null;
  usesMockFallback: boolean;
  quotaNoteJa: string | null;
  staleNoteJa: string | null;
  messageJa: string;
  pingSummaryJa: string | null;
};

export type ApiHealthDashboard = {
  updatedAt: string;
  providers: Record<ApiProviderId, ApiProviderHealth>;
  summaryJa: string;
  openAiLabelJa: string;
  newsLabelJa: string;
  anyQuotaLimited: boolean;
  anyStaleWarning: boolean;
  degradedByApis: boolean;
};
