/**
 * X API HTTP ステータス — 401/402/403/429 の個別表示
 */
import { X_HTTP_402_USER_MESSAGE_JA } from '../constants/xApiOptional';

export type XHttpErrorKind =
  | 'auth'
  | 'payment_required'
  | 'forbidden'
  | 'rate_limit'
  | 'server'
  | 'client'
  | 'ok';

export function classifyXHttpStatus(status: number): XHttpErrorKind {
  if (status === 401) return 'auth';
  if (status === 402) return 'payment_required';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'client';
  return 'ok';
}

/** UI・SNS要約向けの短いメッセージ */
export function xHttpStatusUserMessageJa(status: number): string {
  switch (status) {
    case 401:
      return '認証失敗';
    case 402:
      return X_HTTP_402_USER_MESSAGE_JA;
    case 403:
      return '権限不足';
    case 429:
      return 'Rate limit';
    default:
      if (status >= 500) return `サーバーエラー (${status})`;
      if (status >= 400) return `リクエストエラー (${status})`;
      return 'OK';
  }
}

/** デバッグ・ログ向けの詳細メッセージ */
export function xHttpStatusDiagnosisJa(status: number): string {
  const short = xHttpStatusUserMessageJa(status);
  switch (status) {
    case 401:
      return `401 — ${short}（Bearer Token を確認）`;
    case 402:
      return `402 — ${short}`;
    case 403:
      return `403 — ${short}（エンドポイント権限・プランを確認）`;
    case 429:
      return `429 — ${short}（しばらく待って再試行）`;
    default:
      return status >= 400 ? `${status} — ${short}` : `${status} — ${short}`;
  }
}

export function isXHttpTerminalError(status: number): boolean {
  return status === 401 || status === 402 || status === 403 || status === 429;
}
