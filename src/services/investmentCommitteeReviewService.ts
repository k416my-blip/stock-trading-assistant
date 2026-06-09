/**
 * 投資委員会レビュー — 賛成/反対/リスク アナリスト（判定権なし・24h キャッシュ）
 */
import { AI_API_CHAT_URL, AI_API_MODEL } from '../constants/aiStrategy';
import {
  COMMITTEE_NARRATIVE_OPENAI_TIMEOUT_MS,
  COMMITTEE_REVIEW_SYSTEM_INSTRUCTION_JA,
} from '../constants/investmentCommitteeNarrative';
import type { AdoptionVerdict } from '../types/investmentCharter';
import type {
  CommitteeReview,
  CommitteeReviewFetchResult,
} from '../types/investmentCommitteeNarrative';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import { loadAiApiKey } from './aiApiKey';
import { isUsableApiKey, normalizeStoredApiKey } from './apiKeyValidation';
import { parseAiApiJsonContent } from './aiResponseSanitizer';
import {
  buildCommitteeNarrativeCacheKey,
  getCommitteeNarrativeFromMemoryCache,
  getCommitteeNarrativeFromPersistentCache,
  setCommitteeNarrativeCache,
} from './committeeNarrativeCache';
import { shouldPauseApiRequests } from './performanceCostRuntime';
import { shouldPauseConciergeAi } from './productionStability/productionStabilityRuntime';
import { secureWarn } from './secureLogger';
import { buildFallbackCommitteeReview } from './investmentCommitteeReviewFallback';

const ALLOWED_REVIEW_KEYS = new Set(['bullCaseJa', 'bearCaseJa', 'riskFactorsJa']);

export const FORBIDDEN_REVIEW_KEYS = new Set([
  'verdict',
  'adoptionverdict',
  'buyallowed',
  'recommendationscore',
  'confidencepct',
  'decision',
  'buy',
  'sell',
  'reject',
  'adopt',
  'hold',
]);

export type CommitteeReviewInput = {
  symbol: string;
  name?: string;
  lockedVerdict: AdoptionVerdict;
  lockedVerdictLabelJa: string;
  recommendationScore: number;
  confidencePct: number;
  charterApprovalReasonsJa: string[];
  charterOppositionReasonsJa: string[];
  qualitySignalsSummaryJa: string[];
  evidence?: ConciergeSymbolEvidence;
};

function extractResponsesText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
}

/** JSON Schema: bullCaseJa / bearCaseJa / riskFactorsJa のみ許可 */
export function validateNarrativeResponse(parsed: unknown): CommitteeReview | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_REVIEW_KEYS.has(key.toLowerCase())) return null;
    if (!ALLOWED_REVIEW_KEYS.has(key)) return null;
  }

  const bullCaseJa = parseStringArray(obj.bullCaseJa);
  const bearCaseJa = parseStringArray(obj.bearCaseJa);
  const riskFactorsJa = parseStringArray(obj.riskFactorsJa);

  if (bullCaseJa.length === 0 || bearCaseJa.length === 0 || riskFactorsJa.length === 0) return null;

  return {
    bullCaseJa,
    bearCaseJa,
    riskFactorsJa,
    generatedAt: new Date().toISOString(),
  };
}

function buildReviewPrompt(input: CommitteeReviewInput): string {
  const evidenceLines: string[] = [];
  const ev = input.evidence;
  if (ev) {
    if (ev.intradayChangePct != null) {
      evidenceLines.push(`intradayChangePct=${ev.intradayChangePct}`);
    }
    if (ev.volumeSurgeRatio != null) {
      evidenceLines.push(`volumeSurgeRatio=${ev.volumeSurgeRatio}`);
    }
    if (ev.dataGapsJa.length) {
      evidenceLines.push(`dataGaps=${ev.dataGapsJa.join('; ')}`);
    }
    const news = ev.latestFinancialNews.slice(0, 2).map((n) => n.title);
    if (news.length) evidenceLines.push(`news=${news.join(' | ')}`);
  }

  return [
    COMMITTEE_REVIEW_SYSTEM_INSTRUCTION_JA,
    'JSON only. Allowed keys: bullCaseJa, bearCaseJa, riskFactorsJa (string arrays).',
    'Do NOT output verdict, adoptionVerdict, buyAllowed, recommendationScore, confidencePct.',
    'Role 1 — 賛成アナリスト: bullCaseJa (3-5 items)',
    'Role 2 — 反対アナリスト: bearCaseJa (2-5 items)',
    'Role 3 — リスクアナリスト: riskFactorsJa (2-4 items)',
    `lockedVerdict=${input.lockedVerdict} (${input.lockedVerdictLabelJa}) — immutable.`,
    `symbol=${input.symbol} name=${input.name ?? '-'}`,
    `recommendationScore=${input.recommendationScore} confidencePct=${input.confidencePct} (reference only, do not output)`,
    `charterApproval=${input.charterApprovalReasonsJa.join('; ')}`,
    `charterOpposition=${input.charterOppositionReasonsJa.join('; ')}`,
    `qualitySignals=${input.qualitySignalsSummaryJa.join('; ')}`,
    evidenceLines.length ? `evidence=${evidenceLines.join(' · ')}` : '',
    'Write Japanese. Do not change the investment decision.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function fetchReviewFromOpenAiOnce(
  input: CommitteeReviewInput,
  fetchImpl: typeof fetch,
): Promise<CommitteeReview | null> {
  const rawKey = await loadAiApiKey();
  const apiKey = normalizeStoredApiKey(rawKey);
  if (!isUsableApiKey(apiKey)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMMITTEE_NARRATIVE_OPENAI_TIMEOUT_MS);

  try {
    const response = await fetchImpl(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        temperature: 0.2,
        max_output_tokens: 720,
        text: { format: { type: 'json_object' } },
        input: buildReviewPrompt(input),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      secureWarn('[committee-review] OpenAI HTTP', response.status);
      return null;
    }

    const data = await response.json();
    const text = extractResponsesText(data);
    if (!text) return null;
    const parsed = parseAiApiJsonContent(text);
    return validateNarrativeResponse(parsed);
  } catch (err) {
    secureWarn('[committee-review] fetch failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type FetchCommitteeReviewOptions = {
  fetchImpl?: typeof fetch;
  /** テスト専用 — キャッシュをスキップして API を強制 */
  forceApi?: boolean;
};

/**
 * キャッシュ優先。ヒット時 apiCalled=false（OpenAI 再実行なし）。
 */
export async function fetchCommitteeReview(
  input: CommitteeReviewInput,
  options: FetchCommitteeReviewOptions = {},
): Promise<CommitteeReviewFetchResult | null> {
  const cacheKey = buildCommitteeNarrativeCacheKey({
    symbol: input.symbol,
    lockedVerdict: input.lockedVerdict,
    recommendationScore: input.recommendationScore,
    confidencePct: input.confidencePct,
  });

  if (!options.forceApi) {
    const memHit = getCommitteeNarrativeFromMemoryCache(cacheKey);
    if (memHit) {
      return { review: memHit, cacheStatus: 'hit', apiCalled: false };
    }
    const persisted = await getCommitteeNarrativeFromPersistentCache(cacheKey);
    if (persisted) {
      return { review: persisted, cacheStatus: 'hit', apiCalled: false };
    }
  }

  if (shouldPauseApiRequests() || shouldPauseConciergeAi()) {
    return null;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const review = await fetchReviewFromOpenAiOnce(input, fetchImpl);
  if (!review) return null;

  await setCommitteeNarrativeCache(cacheKey, review);
  return { review, cacheStatus: 'miss', apiCalled: true };
}
