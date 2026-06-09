import type { SecretKeyId } from '../constants/secretStorage';
import { API_WIZARD_PROVIDERS, type ApiWizardProviderConfig } from '../constants/apiSetupWizard';
import type { ApiProviderId, ApiProviderHealth } from '../types/apiSetup';
import { buildApiHealthDashboard } from './apiHealthDashboard';
import { loadApiHealthSnapshot, updateProviderHealth } from './apiHealthStorage';
import { safeSaveSecretById } from './safeApiKey';
import { getSecret } from './secretStorage';
import { verifyApiProvider } from './apiVerificationService';

export function getWizardProviderConfig(providerId: ApiProviderId): ApiWizardProviderConfig {
  const found = API_WIZARD_PROVIDERS.find((p) => p.id === providerId);
  if (!found) throw new Error(`Unknown API provider: ${providerId}`);
  return found;
}

export async function loadWizardApiKey(secretKeyId: SecretKeyId): Promise<string> {
  return getSecret(secretKeyId);
}

export async function saveWizardApiKey(
  secretKeyId: SecretKeyId,
  apiKey: string,
): Promise<{ saved: boolean; reason: string }> {
  return safeSaveSecretById(secretKeyId, apiKey);
}

export async function verifyAndPersistProvider(
  providerId: ApiProviderId,
  apiKey: string,
): Promise<ApiProviderHealth> {
  const health = await verifyApiProvider(providerId, apiKey);
  await updateProviderHealth(providerId, health);
  return health;
}

export async function refreshApiHealthDashboard() {
  const snapshot = await loadApiHealthSnapshot();
  return buildApiHealthDashboard(snapshot);
}

export async function loadAllWizardKeys(): Promise<Record<ApiProviderId, string>> {
  const entries = await Promise.all(
    API_WIZARD_PROVIDERS.map(async (p) => [p.id, await getSecret(p.secretKeyId)] as const),
  );
  return Object.fromEntries(entries) as Record<ApiProviderId, string>;
}
