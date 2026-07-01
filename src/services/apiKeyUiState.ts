import type { TFunction } from 'i18next';
import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import { maskSecret } from '../utils/secretMask';
import { hasSavedKey } from './apiKeys';
import { safeGetApiKey } from './safeApiKey';

export type ApiKeyConfiguredStatus = {
  configured: boolean;
  statusLabelJa: '設定済み' | '未設定';
  maskedHint: string;
};

export async function loadApiKeyConfiguredStatus(
  providerId: SupportedApiProviderId,
): Promise<ApiKeyConfiguredStatus> {
  const raw = await safeGetApiKey(providerId);
  const configured = hasSavedKey(providerId, raw);
  return {
    configured,
    statusLabelJa: configured ? '設定済み' : '未設定',
    maskedHint: configured ? maskSecret(raw) : '(未設定)',
  };
}

export async function loadAllApiKeyConfiguredStatuses(): Promise<
  Record<SupportedApiProviderId, ApiKeyConfiguredStatus>
> {
  const entries = await Promise.all(
    API_PROVIDERS.map(async (p) => [p.id, await loadApiKeyConfiguredStatus(p.id)] as const),
  );
  return Object.fromEntries(entries) as Record<SupportedApiProviderId, ApiKeyConfiguredStatus>;
}

export function createEmptyApiKeyDrafts(): Record<SupportedApiProviderId, string> {
  return Object.fromEntries(API_PROVIDERS.map((p) => [p.id, ''])) as Record<
    SupportedApiProviderId,
    string
  >;
}

export function formatConfiguredStatusLine(status: ApiKeyConfiguredStatus): string {
  if (!status.configured) return '未設定';
  return `設定済み（${status.maskedHint}）`;
}

export function formatConfiguredStatusLineI18n(
  status: ApiKeyConfiguredStatus,
  t: TFunction<'settings'>,
): string {
  if (!status.configured) return t('common.notConfigured');
  return t('configuredWithMask', { mask: status.maskedHint });
}
