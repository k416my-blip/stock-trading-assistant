/**
 * Phase B — OpenAI 第二評価者（Buy / Reduce / Hold / Watch + confidence）
 * 既存ルールエンジンは維持し、スコア統合は hybridStrategyScoreFusion で実施。
 */
import { AI_API_CHAT_URL, AI_API_MODEL } from '../constants/aiStrategy';
import {
  AI_SECOND_EVALUATOR_CACHE_TTL_MS,
  AI_SECOND_EVALUATOR_CHUNK_SIZE,
  AI_SECOND_EVALUATOR_MAX_SYMBOLS,
  AI_SECOND_EVALUATOR_TIMEOUT_MS,
  aiSecondEvaluatorOutputTokensForChunk,
} from '../constants/hybridStrategyScore';
import { getSamplePriceHistory } from '../data/sampleStocks';
import { analyzeTechnicals } from './technicalAnalysis';
import { buildEnrichedAiSecondEvaluatorInputs } from './aiSecondEvaluatorDataEnrichment';
import { loadAiApiKey } from './aiApiKey';
import { isUsableApiKey } from './apiKeyValidation';
import { parseAiApiJsonContent } from './aiResponseSanitizer';
import { shouldPreferRealApiOverDegraded, logRealApiMode } from '../constants/realApiMode';
import { shouldPauseConciergeAi } from './productionStability/productionStabilityRuntime';
import { shouldPauseApiRequests } from './performanceCostRuntime';
import { secureWarn } from './secureLogger';
import {
  actionConfidenceToDirectionScore,
  normalizeAiSecondEvaluatorAction,
} from './hybridStrategyScoreFusion';
import {
  logAiEvalEnd,
  logAiEvalOpenAiSkipped,
  logAiEvalPrompt,
  logAiEvalResponse,
  logAiEvalStart,
  type AiEvalSkipReason,
  type AiEvalTokenUsage,
} from './aiSecondEvaluatorLog';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type {
  AiSecondEvaluatorBatchResult,
  AiSecondEvaluatorSymbolInput,
  AiSecondEvaluatorSymbolResult,
} from '../types/aiSecondEvaluator';

const OPENAI_RETRY_DELAYS_MS = [500, 1000] as const;

type CacheEntry = {
  result: AiSecondEvaluatorBatchResult;
  fetchedAt: string;
};

let cache: CacheEntry | null = null;
const responseCache = new Map<string, CacheEntry>();

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(KL|HK)$/i, '');
}

function isFresh(fetchedAt: string, ttlMs: number, nowMs = Date.now()): boolean {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return false;
  return nowMs - t < ttlMs;
}

function buildCacheKey(symbols: AiSecondEvaluatorSymbolInput[]): string {
  return symbols
    .map(
      (s) =>
        `${s.symbol}:${s.currentPrice ?? 'n'}:${s.rsi14 ?? 'n'}:${s.rsiSource}:${s.volumeSurgeRatio ?? 'n'}:${s.portfolioHolding?.shares ?? 0}:${s.newsCount}:${s.xPostCount}`,
    )
    .join('|');
}

function resolveNewsZeroReason(sym: ConciergeSymbolEvidence): string {
  const gap = sym.dataGapsJa.find((g) => /ニュース|news/i.test(g));
  if (gap) return gap;
  const summary = sym.newsSummaryJa?.trim();
  if (summary) {
    return `newsSource=${sym.newsSource} — 見出し0件（要約のみあり）`;
  }
  return `newsSource=${sym.newsSource} — 見出し・要約なし`;
}

function resolveXPostZeroReason(sym: ConciergeSymbolEvidence): string {
  if (!sym.xSentiment) {
    const gap = sym.dataGapsJa.find((g) => /X|Twitter|センチメント|SNS/i.test(g));
    return gap ?? 'xSentiment=null — X分析未実行または未取得';
  }
  if (sym.xSentiment.fromCache && sym.xSentiment.postCount === 0) {
    return `analysisBasis=${sym.xSentiment.analysisBasis} — キャッシュ空`;
  }
  const gap = sym.dataGapsJa.find((g) => /X|Twitter|センチメント/i.test(g));
  if (gap) return gap;
  return `analysisBasis=${sym.xSentiment.analysisBasis} — postCount=0`;
}

function formatXSentimentDisplay(sym: ConciergeSymbolEvidence): string | null {
  const x = sym.xSentiment;
  if (!x) return null;
  return `${x.summaryJa} (bull=${x.bullishPct}% bear=${x.bearishPct}% posts=${x.postCount})`;
}

export function buildAiSecondEvaluatorInputs(
  evidenceSymbols: ConciergeSymbolEvidence[],
): AiSecondEvaluatorSymbolInput[] {
  return evidenceSymbols.slice(0, AI_SECOND_EVALUATOR_MAX_SYMBOLS).map((sym) => {
    const bars = getSamplePriceHistory(normalizeSymbol(sym.symbol));
    const tech = analyzeTechnicals(bars);
    const newsCount = sym.latestFinancialNews.length;
    const xPostCount = sym.xSentiment?.postCount ?? 0;
    return {
      symbol: sym.symbol,
      market: sym.market,
      displayLabelJa: sym.displayLabelJa,
      currentPrice: sym.currentPrice,
      portfolioHolding: sym.portfolioHolding,
      rsi14: Number.isFinite(tech.rsi14) ? Math.round(tech.rsi14) : null,
      rsiSource: 'local_price_history' as const,
      priceHistoryBars: bars.length,
      volume: sym.volume,
      volumeSurgeRatio: sym.volumeSurgeRatio,
      volumeSource: 'local_price_history',
      quoteSource: null,
      priceAgeSeconds: sym.quoteAgeSeconds,
      quoteIsStale: sym.quoteIsStale,
      newsSummaryJa: sym.newsSummaryJa,
      newsHeadlines: sym.latestFinancialNews.slice(0, 3).map((n) => n.title),
      newsCount,
      newsSource: sym.newsSource,
      newsApiCount: 0,
      newsApiTitles: [],
      newsZeroReason: newsCount === 0 ? resolveNewsZeroReason(sym) : undefined,
      xSentimentSummaryJa: sym.xSentiment?.summaryJa ?? 'Xセンチメント未取得',
      xBullishPct: sym.xSentiment?.bullishPct ?? 0,
      xBearishPct: sym.xSentiment?.bearishPct ?? 0,
      xPostCount,
      xSentimentDisplay: formatXSentimentDisplay(sym),
      xPostZeroReason: xPostCount === 0 ? resolveXPostZeroReason(sym) : undefined,
      xFetchSource: sym.xSentiment ? 'evidence' : 'none',
    };
  });
}

function buildEvidenceBasedRationale(s: AiSecondEvaluatorSymbolInput): string {
  const parts: string[] = [];
  if (s.rsi14 != null) {
    parts.push(`RSI14=${s.rsi14}（${s.rsiSource}）`);
  }
  if (s.newsHeadlines.length > 0) {
    parts.push(`ニュース: ${s.newsHeadlines.slice(0, 2).join(' / ')}`);
  } else if (s.newsSummaryJa?.trim()) {
    parts.push(s.newsSummaryJa.trim().slice(0, 140));
  }
  if (s.xPostCount > 0 && s.xSentimentSummaryJa?.trim()) {
    parts.push(`X: ${s.xSentimentSummaryJa.trim().slice(0, 80)}`);
  }
  if ((s.volumeSurgeRatio ?? 1) >= 1.4) {
    parts.push(`出来高急増比 ${(s.volumeSurgeRatio ?? 1).toFixed(2)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '指標・ニュース不足 — ルールベース参考';
}

function mockResults(inputs: AiSecondEvaluatorSymbolInput[]): AiSecondEvaluatorSymbolResult[] {
  return inputs.map((s) => {
    const rsi = s.rsi14 ?? 50;
    let action: AiSecondEvaluatorSymbolResult['action'] = 'hold';
    let confidence = 52;
    if (rsi >= 70) {
      action = 'reduce';
      confidence = 58;
    } else if (rsi <= 30) {
      action = 'buy';
      confidence = 56;
    } else if ((s.volumeSurgeRatio ?? 1) >= 1.5) {
      action = 'watch';
      confidence = 50;
    }
    return {
      symbol: s.symbol,
      action,
      confidence,
      rationaleJa: buildEvidenceBasedRationale(s),
    };
  });
}

function coerceSymbolResult(
  raw: Record<string, unknown>,
  fallbackSymbol: string,
): AiSecondEvaluatorSymbolResult | null {
  const symbol = String(raw.symbol ?? raw.ticker ?? fallbackSymbol).trim().toUpperCase();
  if (!symbol) return null;
  const action = normalizeAiSecondEvaluatorAction(String(raw.action ?? raw.recommendation ?? 'hold'));
  const confidence = clamp(Number(raw.confidence ?? raw.confidencePct ?? 50));
  const rationaleJa = String(raw.rationaleJa ?? raw.rationale ?? raw.reason ?? 'AI第二評価（参考）');
  return { symbol, action, confidence, rationaleJa };
}

function parseBatchPayload(data: unknown, inputs: AiSecondEvaluatorSymbolInput[]): AiSecondEvaluatorSymbolResult[] {
  if (!data || typeof data !== 'object') return [];
  const root = data as Record<string, unknown>;
  const rows = Array.isArray(root.symbols)
    ? root.symbols
    : Array.isArray(root.evaluations)
      ? root.evaluations
      : Array.isArray(root.items)
        ? root.items
        : null;
  if (!rows) return [];

  const bySymbol = new Map<string, AiSecondEvaluatorSymbolResult>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== 'object') continue;
    const parsed = coerceSymbolResult(row as Record<string, unknown>, inputs[i]?.symbol ?? '');
    if (parsed) bySymbol.set(parsed.symbol.toUpperCase(), parsed);
  }

  return inputs.map((input) => {
    const hit = bySymbol.get(input.symbol.toUpperCase());
    if (hit) return hit;
    return {
      symbol: input.symbol,
      action: 'hold',
      confidence: 50,
      rationaleJa: 'AI応答に銘柄なし — 保留',
    };
  });
}

function extractResponsesText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
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

export function buildAiSecondEvaluatorPrompt(inputs: AiSecondEvaluatorSymbolInput[]): string {
  const payload = inputs.map((s) => ({
    symbol: s.symbol,
    market: s.market,
    labelJa: s.displayLabelJa,
    currentPrice: s.currentPrice,
    holding: s.portfolioHolding
      ? {
          shares: s.portfolioHolding.shares,
          avgPrice: s.portfolioHolding.averageBuyPrice,
          unrealizedPnlPct: s.portfolioHolding.unrealizedPnlPct,
        }
      : null,
    rsi14: s.rsi14,
    rsiSource: s.rsiSource,
    volume: s.volume,
    volumeSurgeRatio: s.volumeSurgeRatio,
    newsSummaryJa: s.newsSummaryJa,
    newsHeadlines: s.newsHeadlines,
    newsCount: s.newsCount,
    newsSource: s.newsSource,
    newsApiCount: s.newsApiCount,
    newsApiTitles: s.newsApiTitles,
    xPostCount: s.xPostCount,
    xSentimentSummaryJa: s.xSentimentSummaryJa,
    xBullishPct: s.xBullishPct,
    xBearishPct: s.xBearishPct,
  }));

  return [
    'You are a second opinion evaluator for a portfolio concierge.',
    'For EACH symbol, output JSON only with key "symbols": array of objects.',
    'Each object: symbol (string), action (buy|reduce|hold|watch), confidence (0-100 integer), rationaleJa (short Japanese, reference only, no auto-trade).',
    'Use inputs: currentPrice, holdings, RSI, volume, news, X sentiment.',
    'Be conservative when data is stale or missing.',
    'Input symbols JSON:',
    JSON.stringify(payload),
  ].join('\n');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTokenUsage(data: unknown): AiEvalTokenUsage | null {
  const usage = (data as { usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } })
    ?.usage;
  if (!usage) return null;
  const input = Number(usage.input_tokens ?? 0);
  const output = Number(usage.output_tokens ?? 0);
  const total = Number(usage.total_tokens ?? input + output);
  if (!Number.isFinite(total) || total <= 0) return null;
  return { input, output, total };
}

async function fetchFromOpenAi(
  inputs: AiSecondEvaluatorSymbolInput[],
  apiKey: string,
): Promise<{ batch: AiSecondEvaluatorBatchResult; tokens: AiEvalTokenUsage | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_SECOND_EVALUATOR_TIMEOUT_MS);
  const prompt = buildAiSecondEvaluatorPrompt(inputs);
  logAiEvalPrompt(prompt);
  try {
    const res = await fetch(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        temperature: 0.2,
        max_output_tokens: aiSecondEvaluatorOutputTokensForChunk(inputs.length),
        text: { format: { type: 'json_object' } },
        input: prompt,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      secureWarn('[ai-second-evaluator] OpenAI HTTP', res.status);
      return null;
    }

    const data = await res.json();
    const tokens = extractTokenUsage(data);
    const text = extractResponsesText(data);
    if (!text) return null;
    const parsed = parseAiApiJsonContent(text);
    const symbols = parseBatchPayload(parsed, inputs);
    if (symbols.length === 0) return null;

    return {
      batch: {
        symbols,
        source: 'openai',
        fetchedAt: new Date().toISOString(),
        tokenUsage: tokens ?? undefined,
      },
      tokens,
    };
  } catch (err) {
    secureWarn('[ai-second-evaluator] fetch failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type FetchAiSecondEvaluatorOptions = {
  force?: boolean;
  degradedMode?: boolean;
  /** 監査用 — enrichment をスキップし OpenAI のみ（日次 RSI/価格差し替え済み inputs） */
  prebuiltInputs?: AiSecondEvaluatorSymbolInput[];
  /** ルール方向スコア（symbol 大文字キー）— [AI_EVAL_START] 用 */
  ruleScoresBySymbol?: Record<string, number>;
  quoteMetaBySymbol?: Record<
    string,
    {
      quoteSource?: string | null;
      priceAgeSeconds?: number | null;
      quoteIsStale?: boolean;
    }
  >;
};

function ruleScoreForSymbol(
  symbol: string,
  ruleScoresBySymbol: Record<string, number> | undefined,
): number | null {
  if (!ruleScoresBySymbol) return null;
  const hit = ruleScoresBySymbol[symbol.toUpperCase()];
  return hit == null ? null : hit;
}

function logBatchEvalRun(input: {
  inputs: AiSecondEvaluatorSymbolInput[];
  results: AiSecondEvaluatorSymbolResult[];
  ruleScoresBySymbol?: Record<string, number>;
  tokens: AiEvalTokenUsage | null;
  latencyMs: number;
  source: AiSecondEvaluatorBatchResult['source'];
  openAiSkippedReason?: AiEvalSkipReason;
  openAiSkippedDetail?: string;
}): void {
  for (const symInput of input.inputs) {
    logAiEvalStart(
      symInput.symbol,
      ruleScoreForSymbol(symInput.symbol, input.ruleScoresBySymbol),
      symInput,
    );
  }

  if (input.openAiSkippedReason) {
    logAiEvalOpenAiSkipped(input.openAiSkippedReason, input.openAiSkippedDetail);
  }

  const resultBySymbol = new Map(
    input.results.map((r) => [r.symbol.toUpperCase(), r] as const),
  );
  for (const symInput of input.inputs) {
    const hit =
      resultBySymbol.get(symInput.symbol.toUpperCase()) ??
      input.results.find((r) => r.symbol.toUpperCase() === symInput.symbol.toUpperCase());
    if (hit) {
      logAiEvalResponse(hit, input.tokens);
    }
  }

  logAiEvalEnd(input.latencyMs, {
    source: input.source,
    symbolCount: input.inputs.length,
    ...(input.openAiSkippedReason ? { openAiSkipped: input.openAiSkippedReason } : {}),
  });
}

function finishBatch(
  batch: AiSecondEvaluatorBatchResult,
  meta: {
    inputs: AiSecondEvaluatorSymbolInput[];
    startedAt: number;
    ruleScoresBySymbol?: Record<string, number>;
    tokens?: AiEvalTokenUsage | null;
    openAiSkippedReason?: AiEvalSkipReason;
    openAiSkippedDetail?: string;
  },
): AiSecondEvaluatorBatchResult {
  const latencyMs = Date.now() - meta.startedAt;
  const withMeta: AiSecondEvaluatorBatchResult = {
    ...batch,
    latencyMs,
    tokenUsage: meta.tokens ?? batch.tokenUsage,
    openAiSkippedReason: meta.openAiSkippedReason ?? batch.openAiSkippedReason,
  };
  logBatchEvalRun({
    inputs: meta.inputs,
    results: withMeta.symbols,
    ruleScoresBySymbol: meta.ruleScoresBySymbol,
    tokens: meta.tokens ?? null,
    latencyMs,
    source: withMeta.source,
    openAiSkippedReason: meta.openAiSkippedReason,
    openAiSkippedDetail: meta.openAiSkippedDetail,
  });
  return withMeta;
}

/** OpenAI 第二評価（失敗時 mock、API pause 時 skipped） */
export async function fetchAiSecondEvaluatorBatch(
  evidenceSymbols: ConciergeSymbolEvidence[],
  options: FetchAiSecondEvaluatorOptions = {},
): Promise<AiSecondEvaluatorBatchResult> {
  const startedAt = Date.now();
  const inputs =
    options.prebuiltInputs ??
    (await buildEnrichedAiSecondEvaluatorInputs(evidenceSymbols, {
      degradedMode: options.degradedMode,
      forceRefresh: options.force,
      quoteMetaBySymbol: options.quoteMetaBySymbol,
    }));
  if (inputs.length === 0) {
    return finishBatch(
      { symbols: [], source: 'skipped', fetchedAt: new Date().toISOString() },
      {
        inputs: [],
        startedAt,
        ruleScoresBySymbol: options.ruleScoresBySymbol,
        openAiSkippedReason: 'empty_inputs',
        openAiSkippedDetail: 'evidenceSymbols が空',
      },
    );
  }

  const degradedRequested = Boolean(options.degradedMode);
  const useDegraded =
    degradedRequested &&
    !shouldPreferRealApiOverDegraded();

  if (useDegraded || shouldPauseApiRequests() || shouldPauseConciergeAi()) {
    const reason: AiEvalSkipReason = useDegraded
      ? 'degraded_mode'
      : shouldPauseConciergeAi()
        ? 'concierge_ai_paused'
        : 'api_requests_paused';
    logRealApiMode('ai_second_eval_skipped_openai', { reason, symbolCount: inputs.length });
    const mock = {
      symbols: mockResults(inputs),
      source: 'mock_fallback' as const,
      fetchedAt: new Date().toISOString(),
    };
    return finishBatch(mock, {
      inputs,
      startedAt,
      ruleScoresBySymbol: options.ruleScoresBySymbol,
      openAiSkippedReason: reason,
    });
  }

  logRealApiMode('ai_second_eval_openai', { symbolCount: inputs.length });

  const cacheKey = buildCacheKey(inputs);
  if (!options.force) {
    const memHit = responseCache.get(cacheKey);
    if (memHit && isFresh(memHit.fetchedAt, AI_SECOND_EVALUATOR_CACHE_TTL_MS)) {
      return finishBatch(
        { ...memHit.result, source: 'cache' },
        {
          inputs,
          startedAt,
          ruleScoresBySymbol: options.ruleScoresBySymbol,
          openAiSkippedReason: 'memory_cache_hit',
        },
      );
    }
    if (cache && isFresh(cache.fetchedAt, AI_SECOND_EVALUATOR_CACHE_TTL_MS)) {
      return finishBatch(
        { ...cache.result, source: 'cache' },
        {
          inputs,
          startedAt,
          ruleScoresBySymbol: options.ruleScoresBySymbol,
          openAiSkippedReason: 'cache_hit',
        },
      );
    }
  }

  const key = await loadAiApiKey();
  if (!isUsableApiKey(key)) {
    const mock = {
      symbols: mockResults(inputs),
      source: 'mock_fallback' as const,
      fetchedAt: new Date().toISOString(),
    };
    cache = { result: mock, fetchedAt: mock.fetchedAt };
    return finishBatch(mock, {
      inputs,
      startedAt,
      ruleScoresBySymbol: options.ruleScoresBySymbol,
      openAiSkippedReason: 'no_api_key',
    });
  }

  let openAiResult: { batch: AiSecondEvaluatorBatchResult; tokens: AiEvalTokenUsage | null } | null =
    null;
  if (inputs.length <= AI_SECOND_EVALUATOR_CHUNK_SIZE) {
    for (let attempt = 0; attempt <= OPENAI_RETRY_DELAYS_MS.length; attempt++) {
      openAiResult = await fetchFromOpenAi(inputs, key.trim());
      if (openAiResult) break;
      if (attempt < OPENAI_RETRY_DELAYS_MS.length) {
        await sleep(OPENAI_RETRY_DELAYS_MS[attempt]);
      }
    }
  } else {
    const mergedSymbols: AiSecondEvaluatorSymbolResult[] = [];
    let totalTokens: AiEvalTokenUsage | null = null;
    let chunkFailed = false;
    for (let i = 0; i < inputs.length; i += AI_SECOND_EVALUATOR_CHUNK_SIZE) {
      const chunk = inputs.slice(i, i + AI_SECOND_EVALUATOR_CHUNK_SIZE);
      let chunkResult: { batch: AiSecondEvaluatorBatchResult; tokens: AiEvalTokenUsage | null } | null =
        null;
      for (let attempt = 0; attempt <= OPENAI_RETRY_DELAYS_MS.length; attempt++) {
        chunkResult = await fetchFromOpenAi(chunk, key.trim());
        if (chunkResult) break;
        if (attempt < OPENAI_RETRY_DELAYS_MS.length) {
          await sleep(OPENAI_RETRY_DELAYS_MS[attempt]);
        }
      }
      if (!chunkResult) {
        mergedSymbols.push(...mockResults(chunk));
        chunkFailed = true;
      } else {
        mergedSymbols.push(...chunkResult.batch.symbols);
        if (chunkResult.tokens) {
          totalTokens = totalTokens
            ? {
                input: totalTokens.input + chunkResult.tokens.input,
                output: totalTokens.output + chunkResult.tokens.output,
                total: totalTokens.total + chunkResult.tokens.total,
              }
            : chunkResult.tokens;
        }
      }
    }
    openAiResult = {
      batch: {
        symbols: mergedSymbols,
        source: chunkFailed ? 'mock_fallback' : 'openai',
        fetchedAt: new Date().toISOString(),
        tokenUsage: totalTokens ?? undefined,
      },
      tokens: totalTokens,
    };
  }

  if (!openAiResult) {
    const mock = {
      symbols: mockResults(inputs),
      source: 'mock_fallback' as const,
      fetchedAt: new Date().toISOString(),
    };
    cache = { result: mock, fetchedAt: mock.fetchedAt };
    return finishBatch(mock, {
      inputs,
      startedAt,
      ruleScoresBySymbol: options.ruleScoresBySymbol,
      openAiSkippedReason: 'openai_fetch_failed',
      openAiSkippedDetail: 'HTTP/parse/timeout — mock_fallback',
    });
  }

  const result = openAiResult.batch;
  cache = { result, fetchedAt: result.fetchedAt };
  responseCache.set(cacheKey, { result, fetchedAt: result.fetchedAt });
  return finishBatch(result, {
    inputs,
    startedAt,
    ruleScoresBySymbol: options.ruleScoresBySymbol,
    tokens: openAiResult.tokens,
  });
}

/** テスト用 — AI 方向スコア */
export function aiResultToDirectionScore(result: AiSecondEvaluatorSymbolResult): number {
  return actionConfidenceToDirectionScore(result.action, result.confidence);
}

export function resetAiSecondEvaluatorCacheForTest(): void {
  cache = null;
  responseCache.clear();
}
