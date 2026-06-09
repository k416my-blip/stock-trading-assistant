import { API_CONNECTION_STATUS_LABELS_JA } from '../constants/apiConnection';
import type { ApiConnectionErrorType, ApiConnectionStatus } from '../types/apiConnection';
import type { ApiVerificationOutcome } from '../types/apiSetup';

export function statusLabelJa(status: ApiConnectionStatus): string {
  return API_CONNECTION_STATUS_LABELS_JA[status];
}

export function connectionStatusFromVerification(input: {
  hasKey: boolean;
  outcome: ApiVerificationOutcome;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
}): ApiConnectionStatus {
  if (!input.hasKey) return 'not_configured';
  if (!input.lastCheckedAt && input.outcome === 'unconfigured') {
    return 'key_saved_unverified';
  }
  switch (input.outcome) {
    case 'success':
      return 'connected';
    case 'invalid_key':
      return 'auth_error';
    case 'rate_limited':
      return 'rate_limited';
    case 'timeout':
      return 'timeout';
    case 'connection_error':
      return input.lastCheckedAt ? 'network_error' : 'key_saved_unverified';
    case 'unconfigured':
      return input.hasKey ? 'key_saved_unverified' : 'not_configured';
    default:
      return 'network_error';
  }
}

export function errorTypeFromVerificationOutcome(
  outcome: ApiVerificationOutcome,
): ApiConnectionErrorType {
  switch (outcome) {
    case 'success':
      return 'none';
    case 'invalid_key':
      return 'auth';
    case 'rate_limited':
      return 'rate_limit';
    case 'timeout':
      return 'timeout';
    case 'connection_error':
      return 'network';
    case 'unconfigured':
      return 'none';
    default:
      return 'unknown';
  }
}

export function errorTypeFromAiApiErrorCode(code: string): ApiConnectionErrorType {
  if (code === 'http_401') return 'auth';
  if (code === 'http_429') return 'rate_limit';
  if (code === 'timeout') return 'timeout';
  if (code === 'network') return 'network';
  if (code === 'empty response' || code === 'invalid json' || code === 'response_failed') {
    return 'parse';
  }
  if (code === 'http_400') return 'model_invalid';
  if (code.startsWith('disclosure_missing')) return 'disclosure';
  if (code === 'forbidden expression') return 'forbidden';
  return 'unknown';
}

/** Temporary OpenAI / transport failures eligible for one automatic retry. */
export function isRetryableAiApiError(code: string): boolean {
  if (code === 'timeout') return false;
  if (code === 'network' || code === 'http_429') return true;
  if (code === 'response_failed' || code === 'empty response') return true;
  if (code.startsWith('HTTP 5')) return true;
  return false;
}

export function fallbackReasonJaAfterRetry(firstError: string, finalError: string): string {
  const first = fallbackReasonJaFromAiApiError(firstError);
  const final = fallbackReasonJaFromAiApiError(finalError);
  if (first === final) {
    return `${final}（1回再試行後も失敗）`;
  }
  return `${first} → 再試行後: ${final}`;
}

export function fallbackReasonJaFromAiApiError(code: string): string {
  switch (code) {
    case 'http_401':
      return '認証エラー（APIキーが無効）';
    case 'http_429':
      return '429 利用制限';
    case 'http_400':
      return 'モデル名またはリクエスト形式が無効';
    case 'timeout':
      return '通信がタイムアウトしました';
    case 'network':
      return 'ネットワーク接続に失敗しました';
    case 'empty response':
      return 'response output_text が取得できません';
    case 'invalid json':
      return '応答形式の解析に失敗しました';
    case 'response_failed':
      return 'API応答が failed / cancelled です';
    case 'forbidden expression':
      return '禁止表現が含まれています';
    case 'masked_key':
      return 'マスク済みまたは無効なAPIキー';
    case 'aborted':
      return 'リクエストが中断されました';
    default:
      if (code.startsWith('disclosure_missing')) {
        return `開示不足（${code.replace('disclosure_missing:', '')}）`;
      }
      return code;
  }
}
