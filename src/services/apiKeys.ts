import { API_PROVIDERS, type SupportedApiProviderId } from '../config/apiProviders';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { deleteSecret, getSecret, setSecret } from './secretStorage';

export function maskApiKey(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '未保存';
  if (normalized.length <= 8) return '********';
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

export async function loadApiKey(providerId: SupportedApiProviderId): Promise<string> {
  const provider = API_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) return '';
  return getSecret(provider.secretKeyId);
}

export async function saveApiKey(providerId: SupportedApiProviderId, value: string): Promise<void> {
  const provider = API_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) return;
  const normalized = normalizeStoredApiKey(value);
  await setSecret(provider.secretKeyId, normalized);
}

export async function deleteApiKey(providerId: SupportedApiProviderId): Promise<void> {
  const provider = API_PROVIDERS.find((item) => item.id === providerId);
  if (!provider) return;
  await deleteSecret(provider.secretKeyId);
}

export async function loadAllApiKeys(): Promise<Record<SupportedApiProviderId, string>> {
  const entries = await Promise.all(
    API_PROVIDERS.map(async (provider) => [provider.id, await getSecret(provider.secretKeyId)] as const),
  );
  return Object.fromEntries(entries) as Record<SupportedApiProviderId, string>;
}

export function hasUsableKey(value: string): boolean {
  return isUsableApiKey(value);
}
