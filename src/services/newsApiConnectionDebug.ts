/**
 * NewsAPI 接続テスト — 2段階 endpoint + dual auth 診断
 */
import { parseNewsApiErrorBody, isNewsApiTempRateLimit, NEWSAPI_TEMP_RATE_LIMIT } from '../constants/newsApiRateLimit';
import { buildNewsApiPath, type NewsApiEndpoint } from './newsApiClient';

export type NewsApiAuthMode = 'x-api-key' | 'authorization-bearer';

export type NewsApiFailureKind =
  | 'success'
  | 'invalid_key'
  | 'plan_or_rate_limit'
  | 'bad_request'
  | 'network_error'
  | 'other';

export type NewsApiConnectionStage = 'A' | 'B';

export type NewsApiStageProbe = {
  stage: NewsApiConnectionStage;
  endpoint: NewsApiEndpoint;
  requestUrl: string;
  authMode: NewsApiAuthMode;
  httpStatus: number;
  failureKind: NewsApiFailureKind;
  responseBodyMasked: string;
  responseBodySummary: string;
  articleCount: number;
  titles: string[];
  ok: boolean;
};

export type NewsApiConnectionTestResult = {
  ok: boolean;
  httpStatus: number;
  adoptedEndpoint: string | null;
  adoptedStage: NewsApiConnectionStage | null;
  adoptedAuthMode: NewsApiAuthMode | null;
  failureKind: NewsApiFailureKind;
  errorReasonJa: string | null;
  responseBodyMasked: string;
  responseBodySummary: string;
  /** @deprecated use responseBodyMasked */
  responseBody: string;
  /** @deprecated use errorReasonJa */
  errorReason: string | null;
  articleCount: number;
  titles: string[];
  testedAt: string;
  tempRateLimit?: boolean;
  probes: NewsApiStageProbe[];
};

const NEWS_API_TEST_TIMEOUT_MS = 12_000;

let adoptedAuthMode: NewsApiAuthMode = 'x-api-key';

export function getAdoptedNewsApiAuthMode(): NewsApiAuthMode {
  return adoptedAuthMode;
}

export function buildNewsApiAuthHeaders(apiKey: string, mode: NewsApiAuthMode): Record<string, string> {
  const key = apiKey.trim();
  if (mode === 'authorization-bearer') {
    return { Authorization: `Bearer ${key}` };
  }
  return { 'X-Api-Key': key };
}

export function maskNewsApiResponseBody(body: string, apiKey?: string): string {
  let masked = body;
  if (apiKey && apiKey.length >= 8) {
    masked = masked.split(apiKey).join('***');
  }
  masked = masked
    .replace(/apiKey=[^&\s"']+/gi, 'apiKey=***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"***"');
  return masked.slice(0, 600);
}

export function summarizeNewsApiResponseBody(body: string): string {
  const parsed = parseNewsApiErrorBody(body);
  if (parsed?.code && parsed.message) {
    return `${parsed.code}: ${parsed.message.slice(0, 160)}`;
  }
  try {
    const json = JSON.parse(body) as {
      status?: string;
      message?: string;
      articles?: unknown[];
    };
    if (json.status === 'ok') {
      return `ok · ${json.articles?.length ?? 0} articles`;
    }
    if (json.message) return String(json.message).slice(0, 160);
  } catch {
    /* fall through */
  }
  return body.replace(/\s+/g, ' ').slice(0, 160);
}

export function classifyNewsApiFailureKind(input: {
  httpStatus: number;
  responseBody?: string;
  errorCode?: string | null;
  networkError?: boolean;
}): NewsApiFailureKind {
  if (input.networkError || input.httpStatus === 0) return 'network_error';
  const body = input.responseBody ? parseNewsApiErrorBody(input.responseBody) : null;
  const code = input.errorCode ?? body?.code ?? null;

  if (code === 'apiKeyInvalid' || input.httpStatus === 401) return 'invalid_key';
  if (
    code === 'rateLimited' ||
    code === 'upgradeRequired' ||
    input.httpStatus === 426 ||
    input.httpStatus === 429
  ) {
    return 'plan_or_rate_limit';
  }
  if (input.httpStatus === 400 || code === 'parameterInvalid') return 'bad_request';
  if (input.httpStatus >= 200 && input.httpStatus < 300 && body?.status !== 'error') return 'success';
  return 'other';
}

export function failureKindLabelJa(kind: NewsApiFailureKind): string {
  switch (kind) {
    case 'success':
      return '接続成功';
    case 'invalid_key':
      return '401 · APIキー無効';
    case 'plan_or_rate_limit':
      return '426/429 · プラン制限またはレート制限';
    case 'bad_request':
      return '400 · パラメータ不正';
    case 'network_error':
      return 'network error · 通信失敗';
    default:
      return 'その他のエラー';
  }
}

export function logNewsApiConnectionTest(payload: Record<string, unknown>): void {
  console.warn('[NEWSAPI_CONNECTION_TEST]', JSON.stringify(payload));
}

const STAGES: Array<{
  stage: NewsApiConnectionStage;
  endpoint: NewsApiEndpoint;
  params: Record<string, string>;
}> = [
  {
    stage: 'A',
    endpoint: 'top-headlines',
    params: { country: 'us', pageSize: '5' },
  },
  {
    stage: 'B',
    endpoint: 'everything',
    params: { q: 'Maybank', pageSize: '5', language: 'en' },
  },
];

const AUTH_MODES: NewsApiAuthMode[] = ['x-api-key', 'authorization-bearer'];

async function probeNewsApiStage(input: {
  stage: NewsApiConnectionStage;
  endpoint: NewsApiEndpoint;
  params: Record<string, string>;
  authMode: NewsApiAuthMode;
  apiKey: string;
}): Promise<NewsApiStageProbe> {
  const requestUrl = buildNewsApiPath(input.endpoint, input.params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NEWS_API_TEST_TIMEOUT_MS);
  try {
    const res = await fetch(requestUrl, {
      signal: controller.signal,
      headers: buildNewsApiAuthHeaders(input.apiKey, input.authMode),
    });
    const bodyText = await res.text();
    const masked = maskNewsApiResponseBody(bodyText, input.apiKey);
    const summary = summarizeNewsApiResponseBody(bodyText);
    const parsed = parseNewsApiErrorBody(bodyText);
    const failureKind = classifyNewsApiFailureKind({
      httpStatus: res.status,
      responseBody: bodyText,
      errorCode: parsed?.code ?? null,
    });

    let json: { articles?: Array<{ title?: string }>; status?: string } = {};
    try {
      json = JSON.parse(bodyText) as typeof json;
    } catch {
      json = {};
    }

    const titles = (json.articles ?? [])
      .map((a) => a.title?.trim())
      .filter((t): t is string => Boolean(t));
    const apiOk = res.ok && json.status !== 'error';
    const tempRateLimit = isNewsApiTempRateLimit({
      httpStatus: res.status,
      responseBody: bodyText,
      errorCode: parsed?.code ?? null,
    });
    const ok = (apiOk && titles.length > 0) || tempRateLimit;

    const probe: NewsApiStageProbe = {
      stage: input.stage,
      endpoint: input.endpoint,
      requestUrl,
      authMode: input.authMode,
      httpStatus: res.status,
      failureKind: tempRateLimit ? 'plan_or_rate_limit' : failureKind,
      responseBodyMasked: masked,
      responseBodySummary: tempRateLimit ? NEWSAPI_TEMP_RATE_LIMIT : summary,
      articleCount: titles.length,
      titles,
      ok,
    };

    logNewsApiConnectionTest({
      phase: 'probe',
      stage: probe.stage,
      endpoint: probe.requestUrl,
      authMode: probe.authMode,
      httpStatus: probe.httpStatus,
      failureKind: probe.failureKind,
      failureKindJa: failureKindLabelJa(probe.failureKind),
      responseBodySummary: probe.responseBodySummary,
      articleCount: probe.articleCount,
      ok: probe.ok,
    });

    return probe;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = e instanceof Error && e.name === 'AbortError';
    const probe: NewsApiStageProbe = {
      stage: input.stage,
      endpoint: input.endpoint,
      requestUrl,
      authMode: input.authMode,
      httpStatus: 0,
      failureKind: 'network_error',
      responseBodyMasked: maskNewsApiResponseBody(msg),
      responseBodySummary: isAbort ? 'タイムアウト' : msg.slice(0, 160),
      articleCount: 0,
      titles: [],
      ok: false,
    };
    logNewsApiConnectionTest({
      phase: 'probe_exception',
      stage: probe.stage,
      endpoint: probe.requestUrl,
      authMode: probe.authMode,
      httpStatus: 0,
      failureKind: 'network_error',
      failureKindJa: failureKindLabelJa('network_error'),
      error: probe.responseBodySummary,
    });
    return probe;
  } finally {
    clearTimeout(timer);
  }
}

function pickBestProbe(probes: NewsApiStageProbe[]): NewsApiStageProbe | null {
  const successWithArticles = probes.find((p) => p.ok && p.articleCount > 0);
  if (successWithArticles) return successWithArticles;

  const tempLimit = probes.find(
    (p) =>
      p.ok &&
      p.failureKind === 'plan_or_rate_limit' &&
      isNewsApiTempRateLimit({ httpStatus: p.httpStatus, responseBody: p.responseBodySummary }),
  );
  if (tempLimit) return tempLimit;

  const stageAOk = probes.find((p) => p.stage === 'A' && p.httpStatus === 200 && p.failureKind === 'success');
  if (stageAOk) return stageAOk;

  return probes[0] ?? null;
}

export async function runNewsApiConnectionTest(apiKey: string): Promise<NewsApiConnectionTestResult> {
  const testedAt = new Date().toISOString();
  const probes: NewsApiStageProbe[] = [];

  for (const stageDef of STAGES) {
    for (const authMode of AUTH_MODES) {
      probes.push(
        await probeNewsApiStage({
          ...stageDef,
          authMode,
          apiKey,
        }),
      );
    }
  }

  const winner =
    probes.find((p) => p.ok && p.articleCount > 0) ??
    probes.find((p) => p.ok) ??
    pickBestProbe(probes);

  if (winner?.ok && winner.authMode) {
    adoptedAuthMode = winner.authMode;
  }

  const tempRateLimit = Boolean(
    winner?.ok &&
      winner.failureKind === 'plan_or_rate_limit' &&
      winner.articleCount === 0,
  );

  const ok = Boolean(winner?.ok);
  const failureKind = winner?.failureKind ?? 'other';
  const errorReasonJa = ok
    ? tempRateLimit
      ? NEWSAPI_TEMP_RATE_LIMIT
      : null
    : failureKindLabelJa(failureKind);

  const result: NewsApiConnectionTestResult = {
    ok,
    httpStatus: winner?.httpStatus ?? 0,
    adoptedEndpoint: winner?.requestUrl ?? null,
    adoptedStage: winner?.stage ?? null,
    adoptedAuthMode: winner?.authMode ?? null,
    failureKind: ok ? 'success' : failureKind,
    errorReasonJa,
    responseBodyMasked: winner?.responseBodyMasked ?? '',
    responseBodySummary: winner?.responseBodySummary ?? '',
    responseBody: winner?.responseBodyMasked ?? '',
    errorReason: errorReasonJa,
    articleCount: winner?.articleCount ?? 0,
    titles: winner?.titles ?? [],
    testedAt,
    tempRateLimit,
    probes,
  };

  logNewsApiConnectionTest({
    phase: 'summary',
    ok: result.ok,
    httpStatus: result.httpStatus,
    adoptedEndpoint: result.adoptedEndpoint,
    adoptedStage: result.adoptedStage,
    adoptedAuthMode: result.adoptedAuthMode,
    failureKind: result.failureKind,
    failureKindJa: failureKindLabelJa(result.failureKind),
    responseBodySummary: result.responseBodySummary,
    tempRateLimit: result.tempRateLimit,
    probeCount: probes.length,
  });

  return result;
}
