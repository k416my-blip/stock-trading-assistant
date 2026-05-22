/**
 * X API Bearer 認証デバッグ — search/recent で接続テスト
 */
import { X_FETCH_TIMEOUT_MS } from '../constants/xApiConservation';
import {
  buildXAuthorizationHeader,
  buildXBearerEnvSnapshot,
  logXBearerEnvAtStartup,
  normalizeBearerToken,
  readXBearerFromEnv,
  resolveXBearerToken,
  validateAuthorizationHeaderFormat,
  type XBearerEnvSnapshot,
} from './xBearerToken';
import { recordXApiPaymentRequired } from './xApiOptionalModeStorage';
import { xHttpStatusDiagnosisJa, xHttpStatusUserMessageJa } from './xHttpStatus';

export const X_API_DEBUG_SEARCH_URL =
  'https://api.x.com/2/tweets/search/recent?query=Apple&max_results=10';

export type XApiDebugTestResult = {
  ok: boolean;
  configured: boolean;
  messageJa: string;
  status: number | null;
  responseBody: string;
  diagnosisJa: string;
  env: XBearerEnvSnapshot;
  requestUrl: string;
  authHeaderPreview: string;
};

function authHeaderPreview(token: string): string {
  const n = normalizeBearerToken(token);
  if (!n) return 'Authorization: (未設定)';
  return `Authorization: Bearer ${n.slice(0, 5)}…`;
}

/**
 * Apple 検索で Bearer 認証をテスト。失敗しても例外は投げない。
 */
export async function runXApiBearerFetchTest(
  tokenOverride?: string,
): Promise<XApiDebugTestResult> {
  logXBearerEnvAtStartup();
  const env = buildXBearerEnvSnapshot();
  console.log('[x-api] DEBUG_ENV', env);

  const resolved =
    tokenOverride !== undefined && tokenOverride !== ''
      ? normalizeBearerToken(tokenOverride)
      : resolveXBearerToken(tokenOverride ?? '');

  if (!resolved) {
    const envOnly = readXBearerFromEnv();
    console.log('[x-api] DEBUG_TEST_SKIP', {
      reason: 'no_token',
      envTokenPresent: Boolean(envOnly),
    });
    return {
      ok: false,
      configured: false,
      messageJa: 'X API未設定',
      status: null,
      responseBody: '',
      diagnosisJa: 'Bearer Token が未設定です。.env の EXPO_PUBLIC_X_BEARER_TOKEN またはアプリ内の X APIキーを設定してください。',
      env,
      requestUrl: X_API_DEBUG_SEARCH_URL,
      authHeaderPreview: authHeaderPreview(''),
    };
  }

  const headers = buildXAuthorizationHeader(resolved);
  const authPreview = authHeaderPreview(resolved);
  const authCheck = validateAuthorizationHeaderFormat(headers.Authorization);

  console.log('[x-api] AUTH_HEADER_CHECK', {
    expectedFormat: 'Authorization: Bearer ${token}',
    ...authCheck,
  });
  console.log('[x-api] DEBUG_FETCH_BEFORE', {
    url: X_API_DEBUG_SEARCH_URL,
    authHeaderPreview: authPreview,
    tokenLength: resolved.length,
    tokenFirst5: resolved.slice(0, 5),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), X_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(X_API_DEBUG_SEARCH_URL, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    const bodyText = await res.text();

    console.log('[x-api] DEBUG_FETCH_AFTER', {
      status: res.status,
      responseBody: bodyText,
    });

    if (res.status === 402) {
      await recordXApiPaymentRequired();
    }
    const diagnosisJa = xHttpStatusDiagnosisJa(res.status);
    const userMsg = xHttpStatusUserMessageJa(res.status);
    const ok = res.ok;

    return {
      ok,
      configured: true,
      messageJa: ok ? '接続成功（search/recent）' : userMsg,
      status: res.status,
      responseBody: bodyText,
      diagnosisJa,
      env,
      requestUrl: X_API_DEBUG_SEARCH_URL,
      authHeaderPreview: authPreview,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.log('[x-api] DEBUG_FETCH_ERROR', { message: msg, isTimeout });
    return {
      ok: false,
      configured: true,
      messageJa: isTimeout ? 'タイムアウト' : `ネットワークエラー: ${msg}`,
      status: null,
      responseBody: '',
      diagnosisJa: isTimeout ? 'リクエストがタイムアウトしました' : msg,
      env,
      requestUrl: X_API_DEBUG_SEARCH_URL,
      authHeaderPreview: authPreview,
    };
  } finally {
    clearTimeout(timer);
  }
}
