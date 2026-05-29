/**
 * AI trade queue — single source of truth (OpenAI → cache → mock fallback).
 */
import { AI_API_CHAT_URL, AI_API_MODEL } from '../constants/aiStrategy';
import { AI_SAFE_ACTION_LABEL } from '../constants/aiStrategyBriefing';
import {
  buildMockAiStrategyBriefing,
  getMockAiTradeQueue,
} from '../data/mockAiStrategyBriefing';
import type { MarketRegimeResult } from '../types/marketRegime';
import type { AiStrategyBriefing, AiTradeQueueItem } from '../types/aiStrategyBriefing';
import type { Market } from '../types';
import { loadAiApiKey } from './aiApiKey';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { parseAiApiJsonContent } from './aiResponseSanitizer';
import { secureLog, secureWarn } from './secureLogger';

export const AI_TRADE_QUEUE_TTL_MS = 15 * 60 * 1000;

/** OpenAI response cache — same build input skips API for this TTL. */
export const AI_OPENAI_RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;

const OPENAI_RETRY_DELAYS_MS = [500, 1000, 2000] as const;
const OPENAI_MAX_ATTEMPTS = OPENAI_RETRY_DELAYS_MS.length + 1;

/** Trade-queue OpenAI fetch only (was AI_API_TIMEOUT_MS 20s; isolated to avoid widening all AI callers). */
const AI_TRADE_QUEUE_OPENAI_TIMEOUT_MS = 30_000;
const AI_TRADE_QUEUE_MAX_ITEMS = 3;
const AI_TRADE_QUEUE_MAX_OUTPUT_TOKENS = 300;
const AI_TRADE_QUEUE_TEMPERATURE = 0.3;

export type AiTradeQueueSource = 'openai' | 'cache' | 'mock_fallback';

export type AiTradeQueueSnapshot = {
  queue: AiTradeQueueItem[];
  briefing: AiStrategyBriefing;
  source: AiTradeQueueSource;
  fetchedAt: string;
};

export type AiTradeQueueBuildInput = {
  marketRegime?: MarketRegimeResult;
  holdings: Array<{
    symbol: string;
    market: Market;
    shares: number;
    isStale?: boolean;
  }>;
  degradedMode?: boolean;
};

type RefreshOptions = {
  force?: boolean;
};

type OpenAiCacheEntry = {
  snapshot: AiTradeQueueSnapshot;
  fetchedAt: string;
};

let cache: AiTradeQueueSnapshot | null = null;
let inflight: Promise<AiTradeQueueSnapshot> | null = null;
const openAiResponseCache = new Map<string, OpenAiCacheEntry>();

let ensureQueueCallCount = 0;
let refreshQueueCallCount = 0;
let openAiFetchCallCount = 0;

let perfOpenAiMs = 0;
let perfCacheHit = false;
let perfNetworkRetries = 0;

function logDevMetrics(label: string, extra?: Record<string, unknown>) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[ai-trade-queue-metrics]', label, {
    ensureQueue: ensureQueueCallCount,
    refreshQueue: refreshQueueCallCount,
    openAiFetch: openAiFetchCallCount,
    ...extra,
  });
}

function logFallbackSource(source: 'cache' | 'mock_fallback') {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[ai-trade-queue] openai failed, fallback', { source });
}

export function logAppPerf(startupMs: number) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.log('[APP PERF]', {
    startupMs,
    openAiMs: perfOpenAiMs,
    cacheHit: perfCacheHit,
    networkRetries: perfNetworkRetries,
  });
}

function recordPerf(partial: {
  openAiMs?: number;
  cacheHit?: boolean;
  networkRetries?: number;
}) {
  if (partial.openAiMs !== undefined) perfOpenAiMs = partial.openAiMs;
  if (partial.cacheHit !== undefined) perfCacheHit = partial.cacheHit;
  if (partial.networkRetries !== undefined) perfNetworkRetries = partial.networkRetries;
}

function isFresh(fetchedAt: string, ttlMs: number, nowMs = Date.now()): boolean {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return false;
  return nowMs - t < ttlMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (err.name === 'AbortError' && msg.includes('abort')) return true;
  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed') ||
    msg.includes('timeout') ||
    msg.includes('connection')
  );
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function buildOpenAiCacheKey(input: AiTradeQueueBuildInput): string {
  const holdings = [...input.holdings]
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .map((h) => `${h.symbol}:${h.market}:${h.shares}:${h.isStale ? 1 : 0}`)
    .join('|');
  return `${input.degradedMode ? 1 : 0}|${input.marketRegime?.labelJa ?? ''}|${holdings}`;
}

function getOpenAiCachedSnapshot(
  key: string,
  allowStale: boolean,
): AiTradeQueueSnapshot | null {
  const entry = openAiResponseCache.get(key);
  if (!entry) return null;
  const fresh = isFresh(entry.fetchedAt, AI_OPENAI_RESPONSE_CACHE_TTL_MS);
  if (!fresh && !allowStale) return null;
  return {
    ...entry.snapshot,
    source: 'cache',
    fetchedAt: entry.fetchedAt,
  };
}

function setOpenAiCachedSnapshot(key: string, snapshot: AiTradeQueueSnapshot): void {
  openAiResponseCache.set(key, {
    snapshot: { ...snapshot, source: 'openai' },
    fetchedAt: snapshot.fetchedAt,
  });
}

function buildBriefingFromQueue(
  queue: AiTradeQueueItem[],
  regime?: MarketRegimeResult,
): AiStrategyBriefing {
  const base = buildMockAiStrategyBriefing(regime);
  if (queue.length === 0) return base;
  return {
    ...base,
    marketRegimeLabel: regime?.labelJa ?? base.marketRegimeLabel,
    topSuggestions: queue.slice(0, 4).map(
      (q) => `${AI_SAFE_ACTION_LABEL[q.suggestedAction]} — ${q.name || q.ticker}`,
    ),
    riskMode: regime && regime.riskScore >= 60 ? '守り' : base.riskMode,
  };
}

function mockSnapshot(regime?: MarketRegimeResult): AiTradeQueueSnapshot {
  const queue = getMockAiTradeQueue();
  return {
    queue,
    briefing: buildMockAiStrategyBriefing(regime),
    source: 'mock_fallback',
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeAction(raw: string): AiTradeQueueItem['suggestedAction'] {
  const v = raw.trim().toLowerCase();
  if (v === 'suggested_buy' || v.includes('buy')) return 'suggested_buy';
  if (v === 'suggested_reduce' || v.includes('reduce') || v.includes('sell')) {
    return 'suggested_reduce';
  }
  if (v === 'watch_closely' || v.includes('watch')) return 'watch_closely';
  return 'suggested_hold';
}

function normalizeUrgency(raw: string): AiTradeQueueItem['urgency'] {
  const v = raw.trim().toLowerCase();
  if (v === 'critical' || v === '緊急') return 'critical';
  if (v === 'high' || v === '高') return 'high';
  if (v === 'medium' || v === '中') return 'medium';
  return 'low';
}

function normalizeMarket(raw: string): Market {
  const v = raw.trim().toLowerCase();
  if (v === 'us' || v === 'ny' || v === 'nasdaq') return 'us';
  if (v === 'hk') return 'hk';
  return 'bursa';
}

function coerceQueueItem(raw: Record<string, unknown>, index: number): AiTradeQueueItem | null {
  const ticker = String(raw.ticker ?? raw.symbol ?? '').trim().toUpperCase();
  if (!ticker) return null;
  const now = Date.now();
  const occurredAt =
    typeof raw.occurredAt === 'string' && raw.occurredAt
      ? raw.occurredAt
      : new Date(now - (index + 1) * 60_000).toISOString();
  const deadlineRaw = raw.responseDeadlineAt;
  const responseDeadlineAt =
    typeof deadlineRaw === 'string' && deadlineRaw ? deadlineRaw : undefined;
  const explanation = (raw.explanation ?? {}) as Record<string, unknown>;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  return {
    id: String(raw.id ?? `ai-q-${ticker.toLowerCase()}-${index}`),
    ticker,
    name: String(raw.name ?? ticker),
    market: normalizeMarket(String(raw.market ?? 'bursa')),
    suggestedAction: normalizeAction(String(raw.suggestedAction ?? 'suggested_hold')),
    urgency: normalizeUrgency(String(raw.urgency ?? 'medium')),
    confidence: Math.max(0, Math.min(100, Number(raw.confidence) || 50)),
    rationaleSummary: String(raw.rationaleSummary ?? 'AI生成の参考情報です。'),
    occurredAt,
    responseDeadlineAt,
    explanation: {
      technicalReasons: strArr(explanation.technicalReasons).slice(0, 1),
      macroReasons: strArr(explanation.macroReasons).slice(0, 1),
      riskReasons: strArr(explanation.riskReasons).slice(0, 1),
      dataFreshnessNote: String(
        explanation.dataFreshnessNote ??
          '実行前に端末の株価更新時刻を確認してください。',
      ),
    },
  };
}

function parseQueuePayload(data: unknown): AiTradeQueueItem[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const items = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.queue)
      ? root.queue
      : null;
  if (!items) return [];
  const out: AiTradeQueueItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    if (!row || typeof row !== 'object') continue;
    const item = coerceQueueItem(row as Record<string, unknown>, i);
    if (item) out.push(item);
  }
  return out.slice(0, AI_TRADE_QUEUE_MAX_ITEMS);
}

function extractResponsesText(data: unknown): string | null {
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
      if (part.type === 'output_text' || part.type === 'text') return text;
    }
  }
  return null;
}

async function fetchQueueFromOpenAiOnce(
  input: AiTradeQueueBuildInput,
): Promise<AiTradeQueueSnapshot | null> {
  const startMs = Date.now();
  const timeoutMs = AI_TRADE_QUEUE_OPENAI_TIMEOUT_MS;
  const modelName = AI_API_MODEL;
  const rawKey = await loadAiApiKey();
  const apiKey = normalizeStoredApiKey(rawKey);
  const apiKeyExists = isUsableApiKey(apiKey);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[OPENAI DEBUG]', {
      start: startMs,
      apiKeyExists,
      timeoutMs,
      model: modelName,
    });
  }

  if (!apiKeyExists) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[OPENAI DEBUG]', {
        start: startMs,
        apiKeyExists: false,
        apiKeyFormatInvalid: Boolean(rawKey?.trim()),
        timeoutMs,
        model: modelName,
      });
    }
    return null;
  }

  const holdingsLines =
    input.holdings.length > 0
      ? input.holdings
          .slice(0, 8)
          .map((h) => `${h.symbol}(${h.market})${h.shares}${h.isStale ? '*' : ''}`)
          .join(',')
      : 'none';

  const prompt = [
    'JSON only: {"items":[{"ticker","name","market","suggestedAction","urgency","confidence","rationaleSummary"}]}',
    'suggestedAction:suggested_buy|suggested_reduce|suggested_hold|watch_closely',
    'urgency:low|medium|high|critical market:bursa|us|hk',
    `max ${AI_TRADE_QUEUE_MAX_ITEMS} items. rationaleSummary<=80chars. reference only.`,
    `regime:${input.marketRegime?.labelJa ?? '-'}`,
    `holdings:${holdingsLines}`,
  ].join(' ');

  const controller = new AbortController();
  const timer = setTimeout(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[OPENAI DEBUG]', {
        abortReason: 'AbortController.timeout',
        elapsedMs: Date.now() - startMs,
        timeoutMs,
      });
    }
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        input: prompt,
        max_output_tokens: AI_TRADE_QUEUE_MAX_OUTPUT_TOKENS,
        temperature: AI_TRADE_QUEUE_TEMPERATURE,
        text: { format: { type: 'json_object' } },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[OPENAI ERROR]', {
          message: `HTTP ${response.status}`,
          name: 'OpenAiHttpError',
          elapsedMs: Date.now() - startMs,
          contentLength: response.headers.get('content-length'),
        });
      }
      secureWarn('[ai-trade-queue] openai http error', { status: response.status });
      if (isRetryableHttpStatus(response.status)) {
        throw new Error(`OpenAI HTTP ${response.status}`);
      }
      return null;
    }

    const data = (await response.json()) as unknown;
    const responseBytes = JSON.stringify(data).length;
    const text = extractResponsesText(data);
    if (!text) return null;

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = parseAiApiJsonContent(text);
    }

    const queue = parseQueuePayload(parsed);
    if (queue.length === 0) return null;

    const elapsedMs = Date.now() - startMs;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[OPENAI PERF]', {
        elapsedMs,
        responseBytes,
        items: queue.length,
      });
    }

    const fetchedAt = new Date().toISOString();
    secureLog('[ai-trade-queue] openai ok', { items: queue.length, elapsedMs });
    recordPerf({ openAiMs: elapsedMs });
    return {
      queue,
      briefing: buildBriefingFromQueue(queue, input.marketRegime),
      source: 'openai',
      fetchedAt,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('[OPENAI ERROR]', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        aborted: controller.signal.aborted,
        elapsedMs: Date.now() - startMs,
        timeoutMs,
      });
    }
    secureWarn('[ai-trade-queue] openai exception', {
      message: err.message,
      aborted: controller.signal.aborted,
    });
    if (isRetryableNetworkError(err)) {
      throw err;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchQueueFromOpenAi(
  input: AiTradeQueueBuildInput,
): Promise<AiTradeQueueSnapshot | null> {
  openAiFetchCallCount += 1;
  logDevMetrics('openAiFetch');

  let networkRetries = 0;
  for (let attempt = 0; attempt < OPENAI_MAX_ATTEMPTS; attempt++) {
    try {
      const snap = await fetchQueueFromOpenAiOnce(input);
      recordPerf({ networkRetries });
      return snap;
    } catch (e) {
      if (attempt >= OPENAI_MAX_ATTEMPTS - 1) break;
      if (!isRetryableNetworkError(e)) break;
      networkRetries += 1;
      await sleep(OPENAI_RETRY_DELAYS_MS[attempt] ?? 2000);
    }
  }

  recordPerf({ networkRetries });
  return null;
}

async function fetchQueueInternal(input?: AiTradeQueueBuildInput): Promise<AiTradeQueueSnapshot> {
  const buildInput: AiTradeQueueBuildInput = input ?? { holdings: [] };
  const cacheKey = buildOpenAiCacheKey(buildInput);

  const openAiCached = getOpenAiCachedSnapshot(cacheKey, false);
  if (openAiCached) {
    recordPerf({ cacheHit: true, openAiMs: 0, networkRetries: 0 });
    cache = openAiCached;
    return openAiCached;
  }

  recordPerf({ cacheHit: false });
  const fromApi = await fetchQueueFromOpenAi(buildInput);
  if (fromApi) {
    setOpenAiCachedSnapshot(cacheKey, fromApi);
    cache = fromApi;
    return fromApi;
  }

  const staleOpenAi = getOpenAiCachedSnapshot(cacheKey, true);
  if (staleOpenAi) {
    logFallbackSource('cache');
    cache = staleOpenAi;
    return staleOpenAi;
  }

  if (cache && isFresh(cache.fetchedAt, AI_TRADE_QUEUE_TTL_MS)) {
    const fromMainCache: AiTradeQueueSnapshot = { ...cache, source: 'cache' };
    logFallbackSource('cache');
    cache = fromMainCache;
    return fromMainCache;
  }

  logFallbackSource('mock_fallback');
  const fallback = mockSnapshot(buildInput.marketRegime);
  cache = fallback;
  return fallback;
}

/** Synchronous read of last cached snapshot (may be null before first ensure). */
export function getAiTradeQueueSnapshot(): AiTradeQueueSnapshot | null {
  if (!cache) return null;
  if (!isFresh(cache.fetchedAt, AI_TRADE_QUEUE_TTL_MS)) return null;
  return cache;
}

/** Alias for consumers that expect getQueue naming. */
export function getQueue(): AiTradeQueueSnapshot | null {
  return getAiTradeQueueSnapshot();
}

export async function ensureQueue(
  input?: AiTradeQueueBuildInput,
): Promise<AiTradeQueueSnapshot> {
  ensureQueueCallCount += 1;
  logDevMetrics('ensureQueue.enter');
  if (cache && isFresh(cache.fetchedAt, AI_TRADE_QUEUE_TTL_MS)) {
    const hit = { ...cache, source: cache.source === 'mock_fallback' ? 'mock_fallback' : 'cache' };
    recordPerf({ cacheHit: true, openAiMs: 0 });
    logDevMetrics('ensureQueue.cache_hit', { source: hit.source });
    return hit as AiTradeQueueSnapshot;
  }
  if (inflight) {
    logDevMetrics('ensureQueue.join_inflight');
    return inflight;
  }
  return refreshQueue(input);
}

export async function refreshQueue(
  input?: AiTradeQueueBuildInput,
  options?: RefreshOptions,
): Promise<AiTradeQueueSnapshot> {
  refreshQueueCallCount += 1;
  logDevMetrics('refreshQueue.enter', { force: Boolean(options?.force) });

  const buildInput: AiTradeQueueBuildInput = input ?? { holdings: [] };
  const cacheKey = buildOpenAiCacheKey(buildInput);

  if (!options?.force) {
    const openAiHit = getOpenAiCachedSnapshot(cacheKey, false);
    if (openAiHit) {
      recordPerf({ cacheHit: true, openAiMs: 0, networkRetries: 0 });
      cache = openAiHit;
      logDevMetrics('refreshQueue.openai_cache_hit', { source: 'cache' });
      return openAiHit;
    }
  }

  if (!options?.force && cache && isFresh(cache.fetchedAt, AI_TRADE_QUEUE_TTL_MS)) {
    const hit = { ...cache, source: 'cache' as const };
    recordPerf({ cacheHit: true });
    logDevMetrics('refreshQueue.cache_hit', { source: hit.source });
    return hit;
  }
  if (inflight) {
    logDevMetrics('refreshQueue.join_inflight');
    return inflight;
  }

  const run = fetchQueueInternal(input).finally(() => {
    inflight = null;
  });
  inflight = run;
  return run.then((snap) => {
    logDevMetrics('refreshQueue.done', { source: snap.source, items: snap.queue.length });
    return snap;
  });
}

/** Test-only reset. */
export function resetAiTradeQueueServiceForTest(): void {
  cache = null;
  inflight = null;
  openAiResponseCache.clear();
  ensureQueueCallCount = 0;
  refreshQueueCallCount = 0;
  openAiFetchCallCount = 0;
  perfOpenAiMs = 0;
  perfCacheHit = false;
  perfNetworkRetries = 0;
}

/** Dev / verification only — call counts since last reset or app load. */
export function getAiTradeQueueDevMetrics(): {
  ensureQueue: number;
  refreshQueue: number;
  openAiFetch: number;
} {
  return {
    ensureQueue: ensureQueueCallCount,
    refreshQueue: refreshQueueCallCount,
    openAiFetch: openAiFetchCallCount,
  };
}
