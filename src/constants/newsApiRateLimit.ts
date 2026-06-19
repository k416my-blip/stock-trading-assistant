/** NewsAPI 一時レート制限 — Developer 日次上限等（429 / code=rateLimited） */

export const NEWSAPI_TEMP_RATE_LIMIT = 'NEWSAPI_TEMP_RATE_LIMIT' as const;

export type NewsApiRateLimitClassification =
  | typeof NEWSAPI_TEMP_RATE_LIMIT
  | 'NEWSAPI_ERROR'
  | 'NEWSAPI_KEY_MISSING';

export type NewsApiErrorBody = {
  status?: string;
  code?: string;
  message?: string;
};

export function parseNewsApiErrorBody(bodyText: string): NewsApiErrorBody | null {
  try {
    const json = JSON.parse(bodyText) as NewsApiErrorBody;
    return typeof json === 'object' && json ? json : null;
  } catch {
    return null;
  }
}

export function isNewsApiTempRateLimit(input: {
  httpStatus: number;
  responseBody?: string | null;
  errorCode?: string | null;
}): boolean {
  if (input.httpStatus !== 429) return false;
  const body = input.responseBody ? parseNewsApiErrorBody(input.responseBody) : null;
  const code = input.errorCode ?? body?.code ?? null;
  return code === 'rateLimited' || input.httpStatus === 429;
}

/** Developer プラン — 実機/本番からの直接呼び出し不可（426 / upgradeRequired） */
export const NEWSAPI_DEVELOPER_PRODUCTION_BLOCKED = 'NEWSAPI_DEVELOPER_PRODUCTION_BLOCKED' as const;

export function isNewsApiDeveloperProductionBlocked(input: {
  httpStatus: number;
  responseBody?: string | null;
  errorCode?: string | null;
}): boolean {
  if (input.httpStatus === 426) return true;
  const body = input.responseBody ? parseNewsApiErrorBody(input.responseBody) : null;
  const code = input.errorCode ?? body?.code ?? null;
  const msg = body?.message ?? input.responseBody ?? '';
  if (code === 'upgradeRequired') return true;
  if (/developer plan|development environment|localhost|production environment|staging environment/i.test(msg)) {
    return true;
  }
  return false;
}

export function classifyNewsApiFailure(input: {
  httpStatus: number;
  responseBody?: string | null;
  hasApiKey: boolean;
}): NewsApiRateLimitClassification {
  if (!input.hasApiKey) return 'NEWSAPI_KEY_MISSING';
  if (isNewsApiTempRateLimit(input)) return NEWSAPI_TEMP_RATE_LIMIT;
  return 'NEWSAPI_ERROR';
}

/** Developer プラン既定上限（API error message より） */
export const NEWSAPI_DEVELOPER_DAILY_LIMIT = 100;
export const NEWSAPI_DEVELOPER_HALF_DAY_BURST = 50;
