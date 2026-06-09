import { AI_ERROR_API_KEY_MISSING } from '../constants/aiStrategy';
import { statusLabelJa } from '../services/apiConnectionStatusMapper';
import type { ApiConnectionStatus } from '../types/apiConnection';
import type { AiRequestStatus } from '../types/aiStrategy';

const IN_FLIGHT: AiRequestStatus[] = [
  'checking_api_key',
  'connecting',
  'thinking',
  'waiting_response',
  'retrying',
  'reconnecting',
  'degraded',
  'streaming',
];

export function isAiRequestInFlight(status: AiRequestStatus): boolean {
  return IN_FLIGHT.includes(status);
}

export function shouldShowApiSpinner(status: AiRequestStatus, isLoading: boolean): boolean {
  return isLoading && isAiRequestInFlight(status);
}

export function statusJaForRequestStatus(status: AiRequestStatus): string {
  switch (status) {
    case 'idle':
      return '待機中';
    case 'checking_api_key':
      return 'APIキー確認中…';
    case 'api_key_missing':
      return 'APIキー未設定';
    case 'connecting':
      return 'API接続中…';
    case 'thinking':
      return '考え中…';
    case 'waiting_response':
      return 'AI応答待ち…';
    case 'retrying':
      return '再試行中…';
    case 'reconnecting':
      return '再接続中…';
    case 'degraded':
      return '制限モード（劣化運転）';
    case 'streaming':
      return '回答を表示中…';
    case 'success':
      return '実API接続成功';
    case 'fallback_mock':
      return 'モック応答中';
    case 'timeout':
      return 'タイムアウトしました';
    case 'error':
      return 'エラー';
    default:
      return '待機中';
  }
}

export function resolveIdleConnectionStatus(input: {
  aiEnabled: boolean;
  mockOnly: boolean;
  hasApiKey: boolean;
  connectionStatus?: ApiConnectionStatus;
}): { requestStatus: AiRequestStatus; statusJa: string; errorJa: string | null } {
  if (!input.aiEnabled) {
    return { requestStatus: 'idle', statusJa: 'AI機能オフ — モック応答', errorJa: null };
  }
  if (input.mockOnly) {
    return { requestStatus: 'idle', statusJa: 'モックのみ — 外部API未使用', errorJa: null };
  }
  if (!input.hasApiKey) {
    return {
      requestStatus: 'api_key_missing',
      statusJa: 'APIキー未設定',
      errorJa: AI_ERROR_API_KEY_MISSING,
    };
  }
  const status = input.connectionStatus ?? 'key_saved_unverified';
  return {
    requestStatus: status === 'connected' ? 'success' : 'idle',
    statusJa: statusLabelJa(status),
    errorJa: null,
  };
}

export function formatMockFallbackBanner(fallbackReasonJa: string | null, errorJa: string | null): string {
  if (fallbackReasonJa) {
    return `AI API接続に失敗したため、モック応答に切り替えました。理由: ${fallbackReasonJa}`;
  }
  return errorJa ?? 'モック応答に切り替えました。';
}
