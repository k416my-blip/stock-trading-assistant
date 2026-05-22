/**
 * X API Bearer Token — .env / SecureStore 共通の正規化と診断ログ
 * トークン全文はログ・UIに出さない（先頭5文字まで）
 */
import { isUsableApiKey } from './apiKeyValidation';

/** Expo クライアントでは EXPO_PUBLIC_ が必要。Node/verify 用に X_BEARER_TOKEN も参照 */
export const X_BEARER_ENV_NAMES = [
  'EXPO_PUBLIC_X_BEARER_TOKEN',
  'X_BEARER_TOKEN',
] as const;

export type XBearerEnvSnapshot = {
  envVarNames: readonly string[];
  /** process.env.X_BEARER_TOKEN が undefined でないか */
  xBearerTokenEnvDefined: boolean;
  /** いずれかの env から非空トークンが読めたか */
  tokenPresent: boolean;
  tokenLength: number;
  first5: string;
};

/** 改行・Bearer 接頭辞を除去してトークン本体のみ返す */
export function normalizeBearerToken(raw: string): string {
  let t = raw.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
  if (/^bearer/i.test(t)) {
    t = t.replace(/^bearer\s*/i, '').trim();
  }
  return t.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
}

/** Authorization: Bearer ${token} — Bearer の直後は半角スペース1つ */
export function buildXAuthorizationHeader(token: string): { Authorization: string } {
  const normalized = normalizeBearerToken(token);
  return { Authorization: `Bearer ${normalized}` };
}

/** Bearer + 半角スペース1つの形式か（トークン全文はログしない） */
export function validateAuthorizationHeaderFormat(header: string): {
  valid: boolean;
  hasBearerPrefix: boolean;
  hasSpaceAfterBearer: boolean;
  preview: string;
} {
  const hasBearerPrefix = header.startsWith('Bearer');
  const hasSpaceAfterBearer = header.startsWith('Bearer ') && header.length > 7;
  const tokenPart = hasSpaceAfterBearer ? header.slice(7) : '';
  const preview = hasSpaceAfterBearer
    ? `Bearer ${tokenPart.slice(0, 5)}…`
    : hasBearerPrefix
      ? 'Bearer（スペース不足）'
      : 'Bearer 接頭辞なし';
  return {
    valid: hasSpaceAfterBearer && tokenPart.length > 0,
    hasBearerPrefix,
    hasSpaceAfterBearer,
    preview,
  };
}

function envVarDebug(name: string): {
  isUndefined: boolean;
  length: number;
  first5: string;
} {
  if (typeof process === 'undefined' || !process.env) {
    return { isUndefined: true, length: 0, first5: '(n/a)' };
  }
  const raw = process.env[name];
  const isUndefined = raw === undefined;
  const normalized = typeof raw === 'string' ? normalizeBearerToken(raw) : '';
  return {
    isUndefined,
    length: normalized.length,
    first5: normalized ? normalized.slice(0, 5) : '(n/a)',
  };
}

function readEnvValue(name: string): string {
  if (typeof process === 'undefined' || !process.env) return '';
  const v = process.env[name];
  return typeof v === 'string' ? v : '';
}

export function readXBearerFromEnv(): string {
  for (const name of X_BEARER_ENV_NAMES) {
    const v = readEnvValue(name);
    const normalized = normalizeBearerToken(v);
    if (isUsableApiKey(normalized)) {
      return normalized;
    }
  }
  return '';
}

export function buildXBearerEnvSnapshot(): XBearerEnvSnapshot {
  const fromEnv = readXBearerFromEnv();
  const rawX = readEnvValue('X_BEARER_TOKEN');
  const rawPublic = readEnvValue('EXPO_PUBLIC_X_BEARER_TOKEN');
  return {
    envVarNames: X_BEARER_ENV_NAMES,
    xBearerTokenEnvDefined: typeof process !== 'undefined' && process.env != null && rawX !== undefined,
    tokenPresent: Boolean(fromEnv),
    tokenLength: fromEnv.length,
    first5: fromEnv ? fromEnv.slice(0, 5) : '(n/a)',
  };
}

/** 起動時: .env 読み込み確認（先頭5文字のみ・全文禁止） */
export function logXBearerEnvAtStartup(): void {
  const snap = buildXBearerEnvSnapshot();
  const xBearer = envVarDebug('X_BEARER_TOKEN');
  const expoPublic = envVarDebug('EXPO_PUBLIC_X_BEARER_TOKEN');
  console.log('[x-api] ENV_KEY_AT_STARTUP', {
    envVarNames: snap.envVarNames,
    processEnv_X_BEARER_TOKEN: {
      exists: !xBearer.isUndefined && xBearer.length > 0,
      isUndefined: xBearer.isUndefined,
      length: xBearer.length,
      first5: xBearer.first5,
    },
    processEnv_EXPO_PUBLIC_X_BEARER_TOKEN: {
      exists: !expoPublic.isUndefined && expoPublic.length > 0,
      isUndefined: expoPublic.isUndefined,
      length: expoPublic.length,
      first5: expoPublic.first5,
    },
    resolvedTokenPresent: snap.tokenPresent,
    resolvedTokenLength: snap.tokenLength,
    resolvedFirst5: snap.first5,
  });
}

/** SecureStore / ウィザード優先、未設定時は .env */
export function resolveXBearerToken(storedRaw: string): string {
  const stored = normalizeBearerToken(storedRaw);
  if (isUsableApiKey(stored)) return stored;
  return readXBearerFromEnv();
}

export {
  classifyXHttpStatus,
  isXHttpTerminalError,
  xHttpStatusDiagnosisJa,
  xHttpStatusUserMessageJa,
} from './xHttpStatus';
export type { XHttpErrorKind } from './xHttpStatus';
