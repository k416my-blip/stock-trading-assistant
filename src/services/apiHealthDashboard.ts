import { API_HEALTH_STATUS_LABELS_JA, API_PROVIDER_IDS } from '../constants/apiSetupWizard';
import type {
  ApiHealthDashboard,
  ApiProviderHealth,
  ApiProviderId,
  ApiVerificationOutcome,
} from '../types/apiSetup';
import type { PersistedApiHealthSnapshot } from './apiHealthStorage';

export function createDefaultProviderHealth(providerId: ApiProviderId): ApiProviderHealth {
  return {
    providerId,
    status: 'unconfigured',
    outcome: 'unconfigured',
    lastCheckedAt: null,
    lastSuccessAt: null,
    lastErrorType: null,
    usesMockFallback: false,
    quotaNoteJa: null,
    staleNoteJa: null,
    messageJa: '未設定',
    pingSummaryJa: null,
  };
}

function isStaleCheck(iso: string | null, maxAgeHours = 168): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > maxAgeHours * 60 * 60 * 1000;
}

export function applyStaleWarnings(
  providers: Record<ApiProviderId, ApiProviderHealth>,
): Record<ApiProviderId, ApiProviderHealth> {
  const next = { ...providers };
  for (const id of API_PROVIDER_IDS) {
    const row = next[id];
    if (row.status === 'ok' && isStaleCheck(row.lastCheckedAt)) {
      next[id] = {
        ...row,
        staleNoteJa: '接続確認から時間が経過しています。再検証をおすすめします。',
      };
    }
  }
  return next;
}

export function buildApiHealthDashboard(snapshot: PersistedApiHealthSnapshot): ApiHealthDashboard {
  const providers = applyStaleWarnings(snapshot.providers);
  const openAi = providers.openai;
  const news = providers.news;

  const lines: string[] = [];
  for (const id of API_PROVIDER_IDS) {
    const row = providers[id];
    const label = API_HEALTH_STATUS_LABELS_JA[row.status];
    lines.push(`${row.providerId}: ${label}`);
    if (row.quotaNoteJa) lines.push(`  quota: ${row.quotaNoteJa}`);
    if (row.staleNoteJa) lines.push(`  stale: ${row.staleNoteJa}`);
  }

  const anyQuotaLimited = API_PROVIDER_IDS.some((id) => providers[id].status === 'rate_limited');
  const anyStaleWarning = API_PROVIDER_IDS.some((id) => Boolean(providers[id].staleNoteJa));
  const degradedByApis =
    openAi.status !== 'ok' ||
    anyQuotaLimited ||
    API_PROVIDER_IDS.some((id) => providers[id].status === 'error');

  return {
    updatedAt: snapshot.updatedAt,
    providers,
    summaryJa: lines.join('\n'),
    openAiLabelJa: `${API_HEALTH_STATUS_LABELS_JA[openAi.status]} — ${openAi.messageJa}`,
    newsLabelJa: `${API_HEALTH_STATUS_LABELS_JA[news.status]} — ${news.messageJa}`,
    anyQuotaLimited,
    anyStaleWarning,
    degradedByApis,
  };
}

export function shouldUseMockForProvider(
  health: ApiProviderHealth | undefined,
  keyConfigured: boolean,
): boolean {
  if (!keyConfigured) return true;
  if (!health) return false;
  const fallbackOutcomes: ApiVerificationOutcome[] = [
    'invalid_key',
    'rate_limited',
    'timeout',
    'connection_error',
  ];
  return fallbackOutcomes.includes(health.outcome);
}

export function apiHealthSummaryForConcierge(dashboard: ApiHealthDashboard): string {
  const parts = [
    `OpenAI: ${dashboard.openAiLabelJa}`,
    `News API: ${dashboard.newsLabelJa}`,
  ];
  if (dashboard.anyQuotaLimited) {
    parts.push('一部APIでquota制限が検出されています。');
  }
  if (dashboard.anyStaleWarning) {
    parts.push('API接続確認が古い項目があります。設定ウィザードで再検証してください。');
  }
  if (dashboard.degradedByApis) {
    parts.push('API不調時はモック応答・キャッシュ・stale警告を優先します。');
  }
  return parts.join(' ');
}
