import { AI_API_CHAT_URL, AI_API_MODEL, AI_API_TIMEOUT_MS } from '../constants/aiStrategy';
import type { ApiVerificationOutcome } from '../types/apiSetup';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { secureLog, secureWarn } from './secureLogger';

const DEFAULT_TIMEOUT_MS = AI_API_TIMEOUT_MS;

export type OpenAiConnectionTestResult = {
  outcome: ApiVerificationOutcome;
  messageJa: string;
  quotaNoteJa: string | null;
  pingSummaryJa: string | null;
  parseSuccess: boolean;
  httpStatus: number | null;
  timedOut: boolean;
};

type OpenAiErrorBody = {
  error?: { message?: string; type?: string; code?: string };
  status?: string;
};

function extractResponsesApiText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      const text = part.text?.trim();
      if (!text) continue;
      if (part.type === 'output_text' || part.type === 'text') {
        return text;
      }
    }
  }
  return null;
}

function mapHttpOutcome(status: number): ApiVerificationOutcome {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'connection_error';
  if (status >= 400) return 'invalid_key';
  return 'success';
}

function messageJaForOutcome(outcome: ApiVerificationOutcome, parseSuccess: boolean): string {
  if (outcome === 'success' && parseSuccess) return '実API接続成功';
  if (outcome === 'parse_error' || (outcome === 'success' && !parseSuccess)) {
    return '応答形式の解析に失敗しました';
  }
  if (outcome === 'invalid_key') return 'APIキーが無効です';
  if (outcome === 'rate_limited') return '利用上限または残高の問題です';
  if (outcome === 'timeout') return '通信がタイムアウトしました';
  if (outcome === 'connection_error') return 'ネットワーク接続に失敗しました';
  return '接続エラー';
}

/** Minimal POST to OpenAI Responses API — same endpoint as chat. */
export async function testOpenAiResponsesConnection(
  apiKeyRaw: string,
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<OpenAiConnectionTestResult> {
  const apiKey = normalizeStoredApiKey(apiKeyRaw);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;

  if (!isUsableApiKey(apiKey)) {
    return {
      outcome: 'unconfigured',
      messageJa: '未設定',
      quotaNoteJa: null,
      pingSummaryJa: null,
      parseSuccess: false,
      httpStatus: null,
      timedOut: false,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    secureLog('[openai-test] start', {
      endpoint: 'responses',
      model: AI_API_MODEL,
      timeoutMs,
    });

    const response = await fetchImpl(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        input: '接続テスト: ping',
        max_output_tokens: 32,
      }),
      signal: controller.signal,
    });

    const httpStatus = response.status;

    if (!response.ok) {
      let outcome = mapHttpOutcome(httpStatus);
      try {
        const errBody = (await response.json()) as OpenAiErrorBody;
        if (httpStatus === 401) outcome = 'invalid_key';
        else if (httpStatus === 429) outcome = 'rate_limited';
        else if (httpStatus === 400) {
          const msg = (errBody.error?.message ?? '').toLowerCase();
          outcome = msg.includes('model') ? 'invalid_key' : 'invalid_key';
        }
      } catch {
        /* ignore */
      }
      secureWarn('[openai-test] http error', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        statusCode: httpStatus,
        errorType: outcome,
        parseSuccess: false,
        timedOut: false,
      });
      return {
        outcome,
        messageJa: messageJaForOutcome(outcome, false),
        quotaNoteJa: null,
        pingSummaryJa: `HTTP ${httpStatus}`,
        parseSuccess: false,
        httpStatus,
        timedOut: false,
      };
    }

    const data = (await response.json()) as OpenAiErrorBody & Record<string, unknown>;
    if (data.status === 'failed' || data.status === 'cancelled' || data.error) {
      secureWarn('[openai-test] envelope failed', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        statusCode: httpStatus,
        errorType: 'response_failed',
        parseSuccess: false,
        timedOut: false,
      });
      return {
        outcome: 'connection_error',
        messageJa: '応答形式の解析に失敗しました',
        quotaNoteJa: null,
        pingSummaryJa: 'response envelope failed',
        parseSuccess: false,
        httpStatus,
        timedOut: false,
      };
    }

    const text = extractResponsesApiText(data);
    const parseSuccess = Boolean(text && text.length > 0);
    const outcome: ApiVerificationOutcome = parseSuccess ? 'success' : 'parse_error';

    secureLog('[openai-test] complete', {
      endpoint: 'responses',
      model: AI_API_MODEL,
      statusCode: httpStatus,
      errorType: parseSuccess ? 'none' : 'parse_error',
      parseSuccess,
      timedOut: false,
    });

    return {
      outcome,
      messageJa: messageJaForOutcome(outcome, parseSuccess),
      quotaNoteJa: null,
      pingSummaryJa: parseSuccess ? 'output_text OK' : 'output_text missing',
      parseSuccess,
      httpStatus,
      timedOut: false,
    };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError';
    const outcome: ApiVerificationOutcome = timedOut ? 'timeout' : 'connection_error';
    secureWarn('[openai-test] exception', {
      endpoint: 'responses',
      model: AI_API_MODEL,
      errorType: outcome,
      parseSuccess: false,
      timedOut,
    });
    return {
      outcome,
      messageJa: messageJaForOutcome(outcome, false),
      quotaNoteJa: null,
      pingSummaryJa: null,
      parseSuccess: false,
      httpStatus: null,
      timedOut,
    };
  } finally {
    clearTimeout(timer);
  }
}
