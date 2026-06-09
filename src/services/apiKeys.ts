import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import { canPersistApiKeyValue, canPersistTwelveDataApiKey } from './apiKeyValidation';
import {
  apiKeyExistsInStorage,
  safeDeleteApiKey,
  safeGetApiKey,
  safeSaveApiKey,
} from './safeApiKey';

export function maskApiKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '未保存';
  if (normalized.length <= 8) return '********';
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

export async function loadApiKey(providerId: SupportedApiProviderId): Promise<string> {
  return safeGetApiKey(providerId);
}

export async function saveApiKey(
  providerId: SupportedApiProviderId,
  value: string,
): Promise<{ saved: boolean; reason: string }> {
  return safeSaveApiKey(providerId, value);
}

export async function deleteApiKey(
  providerId: SupportedApiProviderId,
  userConfirmed = true,
): Promise<void> {
  return safeDeleteApiKey(providerId, userConfirmed);
}

export async function loadAllApiKeys(): Promise<Record<SupportedApiProviderId, string>> {
  const entries = await Promise.all(
    API_PROVIDERS.map(async (provider) => [provider.id, await safeGetApiKey(provider.id)] as const),
  );
  return Object.fromEntries(entries) as Record<SupportedApiProviderId, string>;
}

export function hasUsableKey(value: string): boolean {
  return canPersistApiKeyValue(value);
}

export function hasSavedKey(providerId: SupportedApiProviderId, value: string): boolean {
  if (providerId === 'twelve_data') return canPersistTwelveDataApiKey(value);
  return canPersistApiKeyValue(value);
}
