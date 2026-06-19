import {
  AI_API_CHAT_URL,
  AI_API_MIN_INTERVAL_MS,
  AI_API_MODEL,
  AI_API_MAX_OUTPUT_TOKENS,
  AI_API_MAX_OUTPUT_TOKENS_ANALYSIS,
  AI_API_TIMEOUT_MS,
  AI_BOOT_CHECK_TIMEOUT_MS,
  AI_ERROR_API_KEY_LOAD_FAILED,
  AI_ERROR_API_KEY_MISSING,
  AI_ERROR_HTTP_400,
  AI_ERROR_HTTP_401,
  AI_ERROR_HTTP_429,
  AI_ERROR_INVALID_RESPONSE,
  AI_ERROR_NETWORK_FALLBACK,
  AI_ERROR_PARSE_FAILED,
  AI_ERROR_TIMEOUT,
} from '../constants/aiStrategy';
import {
  buildEphemeralApiUserPayload,
  buildConciergeChatInstructions,
  buildFixedAiInstructions,
  containsHypeOrCertaintyLanguage,
  validateDisclosureCompliance,
} from './aiPersonalityGuard';
import { createAssistantChatMessage } from '../data/mockAiChat';
import type { AiChatStructuredReply } from '../types/aiChat';
import type {
  AiConnectionProbeResult,
  AiPreferences,
  AiRequestStatus,
  AiStrategyChatResult,
  AiStrategyContextPayload,
} from '../types/aiStrategy';
import { loadAiApiKeyWithTimeout } from './aiApiKey';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import {
  fallbackReasonJaAfterRetry,
  fallbackReasonJaFromAiApiError,
  isRetryableAiApiError,
  statusLabelJa,
} from './apiConnectionStatusMapper';
import { loadApiHealthSnapshot, updateProviderHealth } from './apiHealthStorage';
import { createDefaultProviderHealth } from './apiHealthDashboard';
import { testOpenAiResponsesConnection } from './openAiConnectionTest';
import type { ApiConnectionStatus } from '../types/apiConnection';
import type { ApiProviderHealth } from '../types/apiSetup';
import type { AiApiConnectionTestResult } from '../types/aiStrategy';
import { assertAiPayloadSafe, buildAiStrategyContext, type BuildAiStrategyContextInput } from './aiContextBuilder';
import { compressAiStrategyContextForApi } from './aiContextCompressor';
import {
  noteNetworkFailure,
  noteNetworkSuccess,
  shouldPauseApiRequests,
} from './performanceCostRuntime';
import { isCircuitOpen, recordApiFailure, recordApiSuccess } from './productionStability/apiCircuitBreaker';
import { recordApiLatencyMs } from './productionStability/productionProfiler';
import {
  shouldAllowOpenAiRequest,
  shouldPauseConciergeAi,
} from './productionStability/productionStabilityRuntime';
import { nextAsyncGeneration, isStaleAsyncGeneration } from './productionStability/asyncRaceGuard';
import { resolveAiTemperature } from './aiDeterministicMode';
import { evaluateHallucinationBlock } from './aiHallucinationBlocker';
import { ANALYSIS_BLOCKED_LABEL_JA } from '../constants/aiRiskControl';
import { saveConciergePromptDebug } from './conciergePromptDebug';
import {
  buildDisplayText,
  containsForbiddenExpression,
  parseAiApiJsonContent,
  toStructuredReply,
} from './aiResponseSanitizer';
import { recordOpenAiTokenEstimate } from './apiCostTracker';
import { recordDiagnosticEvent } from './structuredDiagnostics';
import { secureLog, secureWarn } from './secureLogger';
import { markConciergeChatPerf } from './conciergeChatPerfLog';

let lastApiCallAt = 0;

export function resetAiStrategyServiceForTest(): void {
  lastApiCallAt = 0;
}

export type SendAiStrategyChatInput = {
  userMessage: string;
  context: AiStrategyContextPayload;
  preferences: AiPreferences;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  onRequestStatus?: (status: AiRequestStatus) => void;
};

export type ProbeAiApiConnectionInput = {
  preferences: AiPreferences;
  apiKey?: string;
  signal?: AbortSignal;
  onRequestStatus?: (status: AiRequestStatus) => void;
};

function emitStatus(
  onRequestStatus: SendAiStrategyChatInput['onRequestStatus'],
  status: AiRequestStatus,
): void {
  onRequestStatus?.(status);
}

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true;
  if (e instanceof Error && e.name === 'AbortError') return true;
  const msg = e instanceof Error ? e.message : String(e);
  return msg.toLowerCase().includes('abort');
}

function linkAbortSignals(timeoutMs: number, external?: AbortSignal): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener('abort', onExternalAbort);
    }
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function resolveApiKey(
  provided: string | undefined,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ key: string; loadFailed: boolean; invalidKey: boolean }> {
  if (provided != null && provided.trim().length > 0) {
    if (!isUsableApiKey(provided)) {
      return { key: '', loadFailed: false, invalidKey: true };
    }
    return { key: normalizeStoredApiKey(provided), loadFailed: false, invalidKey: false };
  }
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const loaded = await loadAiApiKeyWithTimeout(timeoutMs);
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  if (loaded.failed) {
    return { key: '', loadFailed: true, invalidKey: false };
  }
  const key = normalizeStoredApiKey(loaded.key);
  if (!key) {
    return { key: '', loadFailed: false, invalidKey: false };
  }
  if (!isUsableApiKey(key)) {
    return { key: '', loadFailed: false, invalidKey: true };
  }
  return { key, loadFailed: false, invalidKey: false };
}

async function resolveOpenAiConnectionStatus(hasKey: boolean): Promise<ApiConnectionStatus> {
  if (!hasKey) return 'not_configured';
  const snapshot = await loadApiHealthSnapshot();
  const row = snapshot.providers.openai;
  if (!row.lastCheckedAt) return 'key_saved_unverified';
  if (row.outcome === 'success') return 'connected';
  if (row.outcome === 'invalid_key') return 'auth_error';
  if (row.outcome === 'rate_limited') return 'rate_limited';
  if (row.outcome === 'timeout') return 'timeout';
  if (row.outcome === 'parse_error') return 'parse_error';
  if (row.outcome === 'connection_error') return 'network_error';
  return 'key_saved_unverified';
}

export async function testAiApiConnection(input?: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<AiApiConnectionTestResult> {
  const { key, loadFailed, invalidKey } = await resolveApiKey(
    input?.apiKey,
    AI_BOOT_CHECK_TIMEOUT_MS,
  );
  if (loadFailed || invalidKey || !key) {
    return {
      ok: false,
      connectionStatus: invalidKey ? 'auth_error' : 'not_configured',
      messageJa: invalidKey ? 'APIキーが無効です' : AI_ERROR_API_KEY_MISSING,
      statusJa: invalidKey ? '認証エラー' : 'APIキー未設定',
    };
  }

  const tested = await testOpenAiResponsesConnection(key, {
    fetchImpl: input?.fetchImpl,
  });
  const now = new Date().toISOString();
  const outcome: ApiProviderHealth['outcome'] =
    tested.outcome === 'connection_error' && !tested.parseSuccess ? 'parse_error' : tested.outcome;
  const health: ApiProviderHealth = {
    ...createDefaultProviderHealth('openai'),
    status: outcome === 'success' ? 'ok' : outcome === 'rate_limited' ? 'rate_limited' : 'error',
    outcome,
    lastCheckedAt: now,
    lastSuccessAt: outcome === 'success' ? now : null,
    lastErrorType: outcome === 'success' ? null : outcome,
    usesMockFallback: outcome !== 'success',
    messageJa: tested.messageJa,
    pingSummaryJa: tested.pingSummaryJa,
    quotaNoteJa: tested.quotaNoteJa,
    staleNoteJa: null,
  };
  await updateProviderHealth('openai', health);

  const connectionStatus: ApiConnectionStatus =
    tested.outcome === 'success' ? 'connected' : tested.outcome === 'invalid_key'
      ? 'auth_error'
      : tested.outcome === 'rate_limited'
        ? 'rate_limited'
        : tested.outcome === 'timeout'
          ? 'timeout'
          : !tested.parseSuccess
            ? 'parse_error'
            : 'network_error';

  return {
    ok: tested.outcome === 'success' && tested.parseSuccess,
    connectionStatus,
    messageJa: tested.messageJa,
    statusJa: statusLabelJa(connectionStatus),
  };
}

type OpenAiErrorBody = {
  error?: { message?: string; type?: string; code?: string };
  status?: string;
};

function mapHttpError(status: number): string {
  if (status === 401) return 'http_401';
  if (status === 429) return 'http_429';
  if (status === 400) return 'http_400';
  return `HTTP ${status}`;
}

function mapResponseEnvelopeError(data: OpenAiErrorBody): string {
  const apiError = data.error;
  if (apiError?.code === 'invalid_api_key' || apiError?.type === 'invalid_request_error') {
    const msg = (apiError.message ?? '').toLowerCase();
    if (msg.includes('api key') || msg.includes('incorrect api key')) {
      return 'http_401';
    }
    return 'http_400';
  }
  if (data.status === 'failed' || data.status === 'cancelled') {
    return 'response_failed';
  }
  return 'response_failed';
}

export async function probeAiApiConnection(
  input: ProbeAiApiConnectionInput,
): Promise<AiConnectionProbeResult> {
  const emit = (status: AiRequestStatus) => emitStatus(input.onRequestStatus, status);

  try {
    emit('checking_api_key');

    if (!input.preferences.aiEnabled) {
      return {
        requestStatus: 'idle',
        statusJa: 'AI機能オフ — モック応答',
        errorJa: null,
        apiConnected: false,
        isLoading: false,
        hasApiKey: false,
        connectionStatus: 'disabled',
      };
    }

    if (input.preferences.mockOnly) {
      return {
        requestStatus: 'idle',
        statusJa: 'モックのみ — 外部API未使用',
        errorJa: null,
        apiConnected: false,
        isLoading: false,
        hasApiKey: Boolean(input.apiKey?.trim()),
        connectionStatus: 'mock_fallback',
      };
    }

    const { key, loadFailed, invalidKey } = await resolveApiKey(
      input.apiKey,
      AI_BOOT_CHECK_TIMEOUT_MS,
      input.signal,
    );

    if (loadFailed) {
      emit('error');
      return {
        requestStatus: 'error',
        statusJa: 'エラー',
        errorJa: AI_ERROR_API_KEY_LOAD_FAILED,
        apiConnected: false,
        isLoading: false,
        hasApiKey: false,
        connectionStatus: 'network_error',
      };
    }

    if (invalidKey || !key) {
      emit('api_key_missing');
      return {
        requestStatus: 'api_key_missing',
        statusJa: invalidKey ? '認証エラー' : 'APIキー未設定',
        errorJa: invalidKey ? 'APIキーが無効です' : AI_ERROR_API_KEY_MISSING,
        apiConnected: false,
        isLoading: false,
        hasApiKey: false,
        connectionStatus: invalidKey ? 'auth_error' : 'not_configured',
      };
    }

    const connectionStatus = await resolveOpenAiConnectionStatus(true);
    const apiConnected = connectionStatus === 'connected';
    emit('idle');
    return {
      requestStatus: apiConnected ? 'success' : 'idle',
      statusJa: statusLabelJa(connectionStatus),
      errorJa: null,
      apiConnected,
      isLoading: false,
      hasApiKey: true,
      connectionStatus,
    };
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    return {
      requestStatus: 'error',
      statusJa: 'エラー',
      errorJa: AI_ERROR_API_KEY_LOAD_FAILED,
      apiConnected: false,
      isLoading: false,
      hasApiKey: false,
      connectionStatus: 'network_error',
    };
  }
}

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

function withContextArtifacts(
  result: AiStrategyChatResult,
  context: AiStrategyContextPayload,
): AiStrategyChatResult {
  return {
    ...result,
    evidenceData: context.evidenceData,
    globalMarketAnalysis: context.globalMarketAnalysis,
    portfolioIntelligence: context.portfolioIntelligence,
  };
}

function mockResult(
  userMessage: string,
  source: 'mock' | 'mock_fallback',
  statusJa: string,
  errorJa: string | null,
  staleHoldingsCount: number,
  requestStatus: AiRequestStatus,
  explanationLevel: AiPreferences['aiExplanationLevel'],
  fallbackReasonJa: string | null = null,
  connectionStatus: ApiConnectionStatus = 'mock_fallback',
): AiStrategyChatResult {
  const mockMsg = createAssistantChatMessage(userMessage, explanationLevel);
  const banner =
    source === 'mock_fallback' && fallbackReasonJa
      ? `AI API接続に失敗したため、モック応答に切り替えました。理由: ${fallbackReasonJa}`
      : errorJa;
  return {
    source,
    text: mockMsg.text,
    structured: mockMsg.structured ?? {
      reason: '—',
      risk: '—',
      market: '—',
      urgency: '—',
      confidence: '—',
      dataFreshness: '—',
    },
    apiConnected: false,
    usedMockFallback: source === 'mock_fallback',
    isLoading: false,
    errorJa: banner,
    statusJa,
    fallbackReasonJa,
    connectionStatus,
    staleHoldingsCount,
    requestStatus,
  };
}

function rateLimited(): boolean {
  const now = Date.now();
  if (now - lastApiCallAt < AI_API_MIN_INTERVAL_MS) return true;
  lastApiCallAt = now;
  return false;
}

function errorJaForApiFailure(error: string): string {
  if (error === 'timeout') return AI_ERROR_TIMEOUT;
  if (error === 'http_401') return AI_ERROR_HTTP_401;
  if (error === 'http_429') return AI_ERROR_HTTP_429;
  if (error === 'http_400') return AI_ERROR_HTTP_400;
  if (error === 'empty response' || error === 'response_failed') return AI_ERROR_INVALID_RESPONSE;
  if (error === 'invalid json') return AI_ERROR_PARSE_FAILED;
  if (error === 'network') return AI_ERROR_NETWORK_FALLBACK;
  return AI_ERROR_NETWORK_FALLBACK;
}

function requestStatusForApiFailure(error: string): AiRequestStatus {
  if (error === 'timeout') return 'timeout';
  return 'fallback_mock';
}

function logConciergeOpenAi(payload: Record<string, unknown>): void {
  console.warn('[CONCIERGE_OPENAI]', JSON.stringify(payload));
}

async function callAiApi(
  apiKey: string,
  userMessage: string,
  context: AiStrategyContextPayload,
  explanationLevel: AiPreferences['aiExplanationLevel'],
  fetchImpl: typeof fetch,
  externalSignal?: AbortSignal,
): Promise<
  | { ok: true; structured: AiChatStructuredReply; text: string }
  | { ok: false; error: string; aborted?: boolean }
> {
  assertAiPayloadSafe(context);
  const apiContext = compressAiStrategyContextForApi(context);

  const userPayload = buildEphemeralApiUserPayload(userMessage, apiContext);
  const instructions = buildConciergeChatInstructions(explanationLevel, context.analysisMode);
  const userPayloadJson = JSON.stringify(userPayload, null, 2);
  void saveConciergePromptDebug(instructions, userPayloadJson);

  const maxOutputTokens =
    context.concierge.conversationMode === 'analysis'
      ? AI_API_MAX_OUTPUT_TOKENS_ANALYSIS
      : AI_API_MAX_OUTPUT_TOKENS;

  const { signal, dispose } = linkAbortSignals(AI_API_TIMEOUT_MS, externalSignal);
  const started = Date.now();
  const requestStart = new Date(started).toISOString();
  markConciergeChatPerf('openai_send');
  logConciergeOpenAi({
    phase: 'request_start',
    requestStart,
    instructionsChars: instructions.length,
    userPayloadChars: userPayloadJson.length,
    totalPromptChars: instructions.length + userPayloadJson.length,
    maxOutputTokens,
    model: AI_API_MODEL,
    timeoutMs: AI_API_TIMEOUT_MS,
  });

  try {
    if (signal.aborted) {
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeout: false,
        aborted: true,
        parseResult: 'aborted_before_send',
      });
      return { ok: false, error: 'aborted', aborted: true };
    }
    if (isCircuitOpen('openai')) {
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeout: false,
        parseResult: 'circuit_open',
      });
      return { ok: false, error: 'circuit_open' };
    }

    const response = await fetchImpl(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        temperature: resolveAiTemperature(
          context.analysisMode,
          context.concierge.conversationMode,
        ),
        instructions,
        max_output_tokens: maxOutputTokens,
        input: [
          {
            role: 'user',
            content: userPayloadJson,
          },
        ],
      }),
      signal,
    });

    const elapsedAfterFetch = Date.now() - started;
    const requestEndFetch = new Date().toISOString();
    const contentLengthHeader = response.headers.get('content-length');
    const rawBody = await response.text();
    const responseSize =
      rawBody.length > 0
        ? rawBody.length
        : contentLengthHeader
          ? Number(contentLengthHeader)
          : 0;

    logConciergeOpenAi({
      phase: 'response_received',
      requestStart,
      requestEnd: requestEndFetch,
      elapsedMs: elapsedAfterFetch,
      httpStatus: response.status,
      responseSize,
      timeout: false,
    });

    if (!response.ok) {
      let errorCode = mapHttpError(response.status);
      try {
        const errBody = JSON.parse(rawBody) as OpenAiErrorBody;
        if (response.status === 401) {
          errorCode = 'http_401';
        } else if (response.status === 429) {
          errorCode = 'http_429';
        } else if (response.status === 400) {
          errorCode = mapResponseEnvelopeError(errBody) === 'http_401' ? 'http_401' : 'http_400';
        }
      } catch {
        // ignore JSON parse errors on error responses
      }
      recordApiFailure('openai');
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        responseSize,
        parseResult: errorCode,
        timeout: false,
      });
      secureWarn('[ai-strategy] api http error', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        statusCode: response.status,
        errorType: errorCode,
        parseSuccess: false,
        timedOut: false,
        responseSize,
      });
      return { ok: false, error: errorCode };
    }

    let data: OpenAiErrorBody & Record<string, unknown>;
    try {
      data = JSON.parse(rawBody) as OpenAiErrorBody & Record<string, unknown>;
    } catch (parseErr) {
      const parseMsg = parseErr instanceof Error ? parseErr.message : 'invalid json envelope';
      recordApiFailure('openai');
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        responseSize,
        parseResult: 'invalid_json_envelope',
        timeout: false,
        error: parseMsg,
      });
      secureWarn('[ai-strategy] api envelope json parse failed', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        errorType: 'invalid_json',
        parseSuccess: false,
        timedOut: false,
        responseSize,
        error: parseMsg,
      });
      return { ok: false, error: 'invalid json' };
    }

    if (data.status === 'failed' || data.status === 'cancelled' || data.error) {
      const envelopeError = mapResponseEnvelopeError(data);
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        responseSize,
        parseResult: envelopeError,
        timeout: false,
        envelopeStatus: data.status ?? null,
      });
      secureWarn('[ai-strategy] api envelope failed', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        errorType: 'response_failed',
        parseSuccess: false,
        timedOut: false,
        responseSize,
      });
      return { ok: false, error: envelopeError };
    }

    const content = extractResponsesApiText(data);
    if (!content) {
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        responseSize,
        parseResult: 'empty_response',
        timeout: false,
      });
      secureWarn('[ai-strategy] api parse failed', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        errorType: 'empty_response',
        parseSuccess: false,
        timedOut: false,
        responseSize,
      });
      return { ok: false, error: 'empty response' };
    }

    const parsed = parseAiApiJsonContent(content);
    if (!parsed) {
      logConciergeOpenAi({
        phase: 'request_end',
        requestStart,
        requestEnd: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        responseSize,
        parseResult: 'invalid_json_content',
        contentChars: content.length,
        timeout: false,
      });
      secureWarn('[ai-strategy] api json parse failed', {
        endpoint: 'responses',
        model: AI_API_MODEL,
        errorType: 'invalid_json',
        parseSuccess: false,
        timedOut: false,
        responseSize,
        contentChars: content.length,
      });
      return { ok: false, error: 'invalid json' };
    }

    logConciergeOpenAi({
      phase: 'request_end',
      requestStart,
      requestEnd: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      httpStatus: response.status,
      responseSize,
      parseResult: 'ok',
      contentChars: content.length,
      timeout: false,
    });

    secureLog('[ai-strategy] api parse ok', {
      endpoint: 'responses',
      model: AI_API_MODEL,
      parseSuccess: true,
      timedOut: false,
    });

    const combined = JSON.stringify(parsed);
    if (containsForbiddenExpression(combined) || containsHypeOrCertaintyLanguage(combined)) {
      return { ok: false, error: 'forbidden expression' };
    }

    const disclosure = validateDisclosureCompliance(parsed, context);
    if (!disclosure.ok) {
      return { ok: false, error: `disclosure_missing:${disclosure.missing.join(',')}` };
    }

    const structured = toStructuredReply(parsed, context.marketRegimeLabel);
    const text = buildDisplayText(parsed, structured, context.concierge.conversationMode);

    const hallucination = evaluateHallucinationBlock(parsed, text, context);
    if (hallucination.blocked) {
      secureWarn('[ai-strategy] hallucination block', {
        reason: hallucination.reasonJa,
        mismatches: hallucination.validationMismatches,
      });
      return { ok: false, error: 'hallucination_blocked' };
    }

    recordApiSuccess('openai');
    markConciergeChatPerf('openai_response');
    void import('./twelveHourTestMonitor').then(({ noteTwelveHourAiResponse, isTwelveHourTestMonitorActive }) => {
      if (isTwelveHourTestMonitorActive()) {
        noteTwelveHourAiResponse({ source: 'ai_strategy_chat' });
      }
    });
    return { ok: true, structured, text };
  } catch (e) {
    recordApiFailure('openai');
    const elapsedMs = Date.now() - started;
    const timedOut = isAbortError(e) || signal.aborted;
    const errName = e instanceof Error ? e.name : 'unknown';
    const errMsg = e instanceof Error ? e.message : 'unknown';
    const errStack = e instanceof Error ? e.stack?.split('\n').slice(0, 4).join(' | ') : undefined;
    logConciergeOpenAi({
      phase: 'request_end',
      requestStart,
      requestEnd: new Date().toISOString(),
      elapsedMs,
      timeout: timedOut && !externalSignal?.aborted,
      aborted: timedOut && Boolean(externalSignal?.aborted),
      parseResult: timedOut ? 'timeout' : 'network_or_throw',
      errorName: errName,
      error: errMsg,
      errorStack: errStack,
    });
    secureWarn('[ai-strategy] api call exception', {
      endpoint: 'responses',
      model: AI_API_MODEL,
      timedOut,
      aborted: externalSignal?.aborted ?? false,
      errorName: errName,
      error: errMsg,
      elapsedMs,
    });
    if (timedOut) {
      if (externalSignal?.aborted) {
        return { ok: false, error: 'aborted', aborted: true };
      }
      return { ok: false, error: 'timeout' };
    }
    const msg = errMsg;
    if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
      return { ok: false, error: 'network' };
    }
    return { ok: false, error: msg };
  } finally {
    recordApiLatencyMs(Date.now() - started);
    dispose();
  }
}

type CallAiApiOutcome =
  | { ok: true; structured: AiChatStructuredReply; text: string }
  | { ok: false; error: string; aborted?: boolean };

async function callAiApiWithSingleRetry(
  apiKey: string,
  userMessage: string,
  context: AiStrategyContextPayload,
  explanationLevel: AiPreferences['aiExplanationLevel'],
  fetchImpl: typeof fetch,
  externalSignal: AbortSignal | undefined,
  emit: (status: AiRequestStatus) => void,
): Promise<{ result: CallAiApiOutcome; retried: boolean; firstError: string | null }> {
  const first = await callAiApi(
    apiKey,
    userMessage,
    context,
    explanationLevel,
    fetchImpl,
    externalSignal,
  );
  if (first.ok || first.aborted || !isRetryableAiApiError(first.error)) {
    return { result: first, retried: false, firstError: null };
  }

  secureWarn('[ai-strategy] api retry after temporary failure', {
    errorType: first.error,
    endpoint: 'responses',
    model: AI_API_MODEL,
  });
  emit('reconnecting');
  emit('retrying');
  emit('waiting_response');

  const second = await callAiApi(
    apiKey,
    userMessage,
    context,
    explanationLevel,
    fetchImpl,
    externalSignal,
  );
  return { result: second, retried: true, firstError: first.error };
}

export async function sendAiStrategyChat(input: SendAiStrategyChatInput): Promise<AiStrategyChatResult> {
  const staleCount = input.context.staleHoldingsCount;
  const emit = (status: AiRequestStatus) => emitStatus(input.onRequestStatus, status);
  const attach = (result: AiStrategyChatResult) => withContextArtifacts(result, input.context);
  const chatGeneration = nextAsyncGeneration('ai-chat');

  try {
    if (
      (shouldPauseApiRequests() || shouldPauseConciergeAi()) &&
      input.preferences.aiEnabled &&
      !input.preferences.mockOnly
    ) {
      emit('degraded');
      return attach(
        mockResult(
          input.userMessage,
          'mock',
          '通信一時停止',
          'バックグラウンドまたはオフラインのためAPIを停止しています。最後のキャッシュ表示をご利用ください。',
          staleCount,
          'degraded',
          input.preferences.aiExplanationLevel,
        ),
      );
    }

    emit('checking_api_key');

    if (input.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const { key: apiKey, loadFailed, invalidKey } = await resolveApiKey(
      input.apiKey,
      AI_BOOT_CHECK_TIMEOUT_MS,
      input.signal,
    );

    if (!input.preferences.aiEnabled) {
      emit('fallback_mock');
      return attach(
        mockResult(
        input.userMessage,
        'mock',
        'AI機能オフ — モック応答',
        null,
        staleCount,
        'fallback_mock',
        input.preferences.aiExplanationLevel,
        ),
      );
    }

    if (input.preferences.mockOnly) {
      emit('fallback_mock');
      return attach(
        mockResult(
        input.userMessage,
        'mock',
        'モックのみモード',
        null,
        staleCount,
        'fallback_mock',
        input.preferences.aiExplanationLevel,
        ),
      );
    }

    if (loadFailed) {
      emit('error');
      return attach(
        mockResult(
        input.userMessage,
        'mock_fallback',
        'エラー',
        AI_ERROR_API_KEY_LOAD_FAILED,
        staleCount,
        'error',
        input.preferences.aiExplanationLevel,
        'APIキーの読み込みに失敗',
        'network_error',
        ),
      );
    }

    if (invalidKey) {
      emit('fallback_mock');
      return attach(
        mockResult(
        input.userMessage,
        'mock_fallback',
        '認証エラー',
        'APIキーが無効です',
        staleCount,
        'fallback_mock',
        input.preferences.aiExplanationLevel,
        'マスク済みまたは無効なAPIキー',
        'auth_error',
        ),
      );
    }

    if (!apiKey) {
      emit('api_key_missing');
      return attach(
        mockResult(
        input.userMessage,
        'mock',
        'APIキー未設定',
        AI_ERROR_API_KEY_MISSING,
        staleCount,
        'api_key_missing',
        input.preferences.aiExplanationLevel,
        null,
        'not_configured',
        ),
      );
    }

    markConciergeChatPerf('api_key_load');

    if (!shouldAllowOpenAiRequest(1200)) {
      emit('degraded');
      return attach(
        mockResult(
          input.userMessage,
          'mock_fallback',
          'AI負荷抑制 — モックに切替',
          'トークン予算・サーキット・バックグラウンドのいずれかによりAPIを停止しています。',
          staleCount,
          'degraded',
          input.preferences.aiExplanationLevel,
          'production_stability_gate',
        ),
      );
    }

    if (rateLimited()) {
      emit('fallback_mock');
      return attach(
        mockResult(
        input.userMessage,
        'mock_fallback',
        '送信間隔制限 — モックに切替',
        '短時間に連続送信できません。しばらく待ってから再試行してください。',
        staleCount,
        'fallback_mock',
        input.preferences.aiExplanationLevel,
        ),
      );
    }

    if (!input.context.evidenceData.riskControl.allowSpeculativeAi) {
      emit('degraded');
      const blockedJa =
        input.context.evidenceData.riskControl.analysisBlockedJa ?? ANALYSIS_BLOCKED_LABEL_JA;
      return attach({
        source: 'mock',
        text: `${blockedJa}。推測回答と行動提案は抑制されています。根拠データを更新してから再質問してください。`,
        structured: {
          reason: blockedJa,
          risk: 'データ品質不足',
          market: input.context.marketRegimeLabel,
          urgency: '低',
          confidence: `${input.context.evidenceData.riskControl.overallConfidencePct}%`,
          dataFreshness: input.context.evidenceData.riskControl.globalStaleWarningJa ?? '要確認',
          conclusion: blockedJa,
        },
        apiConnected: false,
        usedMockFallback: false,
        isLoading: false,
        errorJa: null,
        statusJa: '確信度ゲート — 分析抑制',
        fallbackReasonJa: null,
        connectionStatus: 'connected',
        staleHoldingsCount: staleCount,
        requestStatus: 'degraded',
      });
    }

    if (input.context.operations.degradedMode) {
      emit('degraded');
    } else {
      emit('thinking');
    }
    emit('waiting_response');

    const fetchImpl = input.fetchImpl ?? fetch;
    const attempt = await callAiApiWithSingleRetry(
      apiKey,
      input.userMessage,
      input.context,
      input.preferences.aiExplanationLevel,
      fetchImpl,
      input.signal,
      emit,
    );
    const apiResult = attempt.result;

    if (isStaleAsyncGeneration('ai-chat', chatGeneration)) {
      throw new DOMException('Stale AI response', 'AbortError');
    }

    if (!apiResult.ok && apiResult.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (apiResult.ok) {
      noteNetworkSuccess();
      recordOpenAiTokenEstimate(900);
      emit('success');
      recordDiagnosticEvent({
        type: 'ai_chat',
        severity: 'info',
        module: 'aiStrategyService',
        message: 'AI chat completed via API',
        metadata: {
          holdingCount: input.context.holdings.length,
          staleCount: input.context.staleHoldingsCount,
        },
      });
      secureLog('[ai-strategy] chat ok', {
        holdings: input.context.holdings.length,
        stale: input.context.staleHoldingsCount,
      });
      return attach({
        source: 'api',
        text: apiResult.text,
        structured: apiResult.structured,
        apiConnected: true,
        usedMockFallback: false,
        isLoading: false,
        errorJa: null,
        statusJa: '実API接続成功',
        fallbackReasonJa: null,
        connectionStatus: 'connected',
        staleHoldingsCount: staleCount,
        requestStatus: 'success',
      });
    }

    noteNetworkFailure();
    const failureStatus = requestStatusForApiFailure(apiResult.error);
    const errorJa = errorJaForApiFailure(apiResult.error);
    const fallbackReasonJa =
      attempt.retried && attempt.firstError
        ? fallbackReasonJaAfterRetry(attempt.firstError, apiResult.error)
        : fallbackReasonJaFromAiApiError(apiResult.error);

    secureWarn('[ai-strategy] API failed, mock fallback', {
      errorType: apiResult.error,
      retried: attempt.retried,
      endpoint: 'responses',
      model: AI_API_MODEL,
    });
    recordDiagnosticEvent({
      type: 'ai_chat',
      severity: 'warning',
      module: 'aiStrategyService',
      message: `AI API fallback: ${apiResult.error}`,
      metadata: { reason: 'fallback' },
    });

    emit(failureStatus === 'timeout' ? 'timeout' : 'fallback_mock');
    if (apiResult.error === 'timeout') {
      return attach({
        source: 'mock',
        text: AI_ERROR_TIMEOUT,
        structured: {
          reason: AI_ERROR_TIMEOUT,
          risk: '—',
          market: input.context.marketRegimeLabel,
          urgency: '—',
          confidence: '—',
          dataFreshness: '—',
        },
        apiConnected: true,
        usedMockFallback: false,
        isLoading: false,
        errorJa: AI_ERROR_TIMEOUT,
        statusJa: 'タイムアウト',
        fallbackReasonJa: null,
        connectionStatus: 'timeout',
        staleHoldingsCount: staleCount,
        requestStatus: 'timeout',
      });
    }
    const failStatus: ApiConnectionStatus =
      apiResult.error === 'http_401'
        ? 'auth_error'
        : apiResult.error === 'http_429'
          ? 'rate_limited'
          : apiResult.error === 'timeout'
            ? 'timeout'
            : apiResult.error === 'invalid json' || apiResult.error === 'empty response'
              ? 'parse_error'
              : 'network_error';
    return attach(
      mockResult(
      input.userMessage,
      'mock_fallback',
      statusLabelJa(failStatus),
      errorJa,
      staleCount,
      failureStatus,
      input.preferences.aiExplanationLevel,
      fallbackReasonJa,
      failStatus,
      ),
    );
  } catch (e) {
    if (isAbortError(e)) {
      throw e;
    }
    emit('error');
    return attach(
      mockResult(
      input.userMessage,
      'mock_fallback',
      'エラー',
      AI_ERROR_NETWORK_FALLBACK,
      staleCount,
      'error',
      input.preferences.aiExplanationLevel,
      ),
    );
  }
}

export { buildAiStrategyContext, type BuildAiStrategyContextInput };
