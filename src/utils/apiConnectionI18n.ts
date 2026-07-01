import type { TFunction } from 'i18next';
import type { ApiConnectionStatus } from '../types/apiConnection';

const STATUS_KEY: Record<ApiConnectionStatus, string> = {
  not_configured: 'apiConnectionStatus.notConfigured',
  key_saved_unverified: 'apiConnectionStatus.keySavedUnverified',
  checking: 'apiConnectionStatus.checking',
  connected: 'apiConnectionStatus.connected',
  auth_error: 'apiConnectionStatus.authError',
  rate_limited: 'apiConnectionStatus.rateLimited',
  timeout: 'apiConnectionStatus.timeout',
  network_error: 'apiConnectionStatus.networkError',
  parse_error: 'apiConnectionStatus.parseError',
  mock_fallback: 'apiConnectionStatus.mockFallback',
  disabled: 'apiConnectionStatus.disabled',
  test_not_implemented: 'apiConnectionStatus.testNotImplemented',
};

export function statusLabelForLocale(
  status: ApiConnectionStatus,
  t: TFunction<'settings'>,
): string {
  const key = STATUS_KEY[status];
  return key ? t(key) : status;
}
