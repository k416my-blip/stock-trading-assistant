import type { TFunction } from 'i18next';
import type { AiRequestStatus } from '../types/aiStrategy';

const STATUS_KEY: Record<AiRequestStatus, string> = {
  idle: 'requestStatus.idle',
  checking_api_key: 'requestStatus.checkingApiKey',
  api_key_missing: 'requestStatus.apiKeyMissing',
  connecting: 'requestStatus.connecting',
  thinking: 'requestStatus.thinking',
  waiting_response: 'requestStatus.waitingResponse',
  retrying: 'requestStatus.retrying',
  reconnecting: 'requestStatus.reconnecting',
  degraded: 'requestStatus.degraded',
  streaming: 'requestStatus.streaming',
  success: 'requestStatus.success',
  fallback_mock: 'requestStatus.fallbackMock',
  timeout: 'requestStatus.timeout',
  error: 'requestStatus.error',
};

export function requestStatusLabelForLocale(
  status: AiRequestStatus,
  t: TFunction<'settings'>,
): string {
  const key = STATUS_KEY[status];
  return key ? t(key) : status;
}

export function resolveIdleStatusLabels(t: TFunction<'settings'>): {
  aiDisabled: string;
  mockOnly: string;
  apiKeyMissing: string;
} {
  return {
    aiDisabled: t('requestStatus.aiDisabled'),
    mockOnly: t('requestStatus.mockOnly'),
    apiKeyMissing: t('requestStatus.apiKeyMissing'),
  };
}
